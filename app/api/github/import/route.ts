import { type NextRequest } from "next/server";
import { getGithubAccessToken, githubFetch } from "@/lib/github";
import { currentUser } from "@/features/auth/actions";
import { db } from "@/lib/db";

// Skip these folders entirely.
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  "coverage",
]);

// Skip binary / non-text files by extension.
const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff",
  "woff", "woff2", "ttf", "eot", "otf",
  "mp3", "mp4", "mov", "avi", "webm", "wav", "ogg",
  "zip", "tar", "gz", "rar", "7z",
  "pdf", "exe", "dll", "so", "dylib", "wasm",
  "jar", "class", "lock",
]);

const MAX_FILE_BYTES = 1024 * 1024; // 1 MB per file (covers most images)
const MAX_FILES = 500;

// MIME types for binary assets we keep as base64 data URIs.
function mimeForExtension(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    webp: "image/webp", ico: "image/x-icon", bmp: "image/bmp", tiff: "image/tiff",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
    eot: "application/vnd.ms-fontobject",
    mp3: "audio/mpeg", mp4: "video/mp4", wav: "audio/wav", ogg: "audio/ogg",
    webm: "video/webm", mov: "video/quicktime", pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

interface TemplateFileNode {
  filename: string;
  fileExtension: string;
  content: string;
}
interface TemplateFolderNode {
  folderName: string;
  items: (TemplateFileNode | TemplateFolderNode)[];
}

// Split a basename into filename + extension (mirrors node's path.parse).
function splitName(base: string): { filename: string; fileExtension: string } {
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0) return { filename: base, fileExtension: "" }; // dotfile or no ext
  return {
    filename: base.slice(0, lastDot),
    fileExtension: base.slice(lastDot + 1),
  };
}

// Heuristic: a file is binary if it contains a NUL byte.
function looksBinary(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const token = await getGithubAccessToken();
  if (!token) {
    return Response.json({ error: "GitHub not connected" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repo?: string; branch?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const repo = body.repo; // "owner/name"
  const branch = body.branch;
  if (!repo || !branch) {
    return Response.json({ error: "Missing repo or branch" }, { status: 400 });
  }

  try {
    // 1) Get the full file tree for the branch.
    const treeRes = await githubFetch(
      token,
      `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
    );
    if (!treeRes.ok) {
      return Response.json(
        { error: `Failed to read repo tree (${treeRes.status})` },
        { status: 502 }
      );
    }
    const treeData = (await treeRes.json()) as {
      tree: { path: string; type: string; sha: string; size?: number }[];
      truncated: boolean;
    };

    // 2) Filter to blobs we want to import (text + reasonably-sized binaries).
    const blobs = treeData.tree.filter((node) => {
      if (node.type !== "blob") return false;
      const parts = node.path.split("/");
      if (parts.some((p) => IGNORED_DIRS.has(p))) return false;
      if ((node.size ?? 0) > MAX_FILE_BYTES) return false;
      return true;
    });

    if (blobs.length === 0) {
      return Response.json(
        { error: "No importable text files found in this branch" },
        { status: 422 }
      );
    }

    const limitedBlobs = blobs.slice(0, MAX_FILES);

    // 3) Fetch file contents (blobs are base64-encoded).
    const results = await Promise.all(
      limitedBlobs.map(async (blob) => {
        const res = await githubFetch(token, `/repos/${repo}/git/blobs/${blob.sha}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { content: string; encoding: string };
        const base = blob.path.split("/").pop()!;
        const { fileExtension } = splitName(base);

        // Binary assets (images, fonts, media): keep as a base64 data URI so
        // they survive import and can be rendered/served in the preview.
        if (BINARY_EXTS.has(fileExtension.toLowerCase())) {
          const b64 = (data.content || "").replace(/\s/g, "");
          if (!b64) return null;
          const mime = mimeForExtension(fileExtension.toLowerCase());
          return { path: blob.path, content: `data:${mime};base64,${b64}` };
        }

        // Text files: decode to UTF-8.
        let content =
          data.encoding === "base64"
            ? Buffer.from(data.content, "base64").toString("utf-8")
            : data.content ?? "";
        if (looksBinary(content)) return null;
        return { path: blob.path, content };
      })
    );

    // 4) Build the nested template folder structure.
    const root: TemplateFolderNode = { folderName: "Root", items: [] };
    for (const file of results) {
      if (!file) continue;
      const parts = file.path.split("/");
      const base = parts.pop()!;
      let folder = root;
      for (const part of parts) {
        let next = folder.items.find(
          (i): i is TemplateFolderNode =>
            "folderName" in i && i.folderName === part
        );
        if (!next) {
          next = { folderName: part, items: [] };
          folder.items.push(next);
        }
        folder = next;
      }
      const { filename, fileExtension } = splitName(base);
      folder.items.push({ filename, fileExtension, content: file.content });
    }

    // 5) Persist as a new playground.
    const repoName = repo.split("/")[1] ?? repo;
    const playground = await db.playground.create({
      data: {
        title: repoName,
        description: `Imported from ${repo} (${branch})`,
        template: "REACT",
        userId: user.id,
        githubRepo: repo,
        githubBranch: branch,
        templateFiles: {
          create: { content: JSON.stringify(root) },
        },
      },
    });

    return Response.json({ success: true, playgroundId: playground.id });
  } catch (error) {
    console.error("GitHub import error:", error);
    return Response.json({ error: "Failed to import repository" }, { status: 500 });
  }
}

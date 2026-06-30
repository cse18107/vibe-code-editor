import { TemplateFile, TemplateFolder } from "./path-to-json";

export function findFilePath(
  file: TemplateFile,
  folder: TemplateFolder,
  pathSoFar: string[] = []
): string | null {
  // Resolve in two passes. First match by exact object identity so that
  // duplicate filenames (e.g. several app/**/page.tsx in a Next.js project)
  // resolve to the SPECIFIC file that was clicked, not just the first one with
  // that name. Then fall back to filename + extension for callers that pass a
  // copied/equivalent object instead of the original tree node.
  const search = (
    current: TemplateFolder,
    prefix: string[],
    matches: (item: TemplateFile) => boolean
  ): string | null => {
    for (const item of current.items) {
      if ("folderName" in item) {
        const res = search(item, [...prefix, item.folderName], matches);
        if (res) return res;
      } else if (matches(item)) {
        return [
          ...prefix,
          item.filename + (item.fileExtension ? "." + item.fileExtension : ""),
        ].join("/");
      }
    }
    return null;
  };

  return (
    search(folder, pathSoFar, (item) => item === file) ??
    search(
      folder,
      pathSoFar,
      (item) =>
        item.filename === file.filename &&
        item.fileExtension === file.fileExtension
    )
  );
}


export async function longPoll<T>(
  url: string,
  options: RequestInit,
  checkCondition: (response: T) => boolean,
  interval: number = 1000, // Poll every 1 second
  timeout: number = 10000 // Timeout after 10 seconds
): Promise<T> {
  const startTime = Date.now();

  while (true) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: T = await response.json();

      // Check if the condition is met
      if (checkCondition(data)) {
        return data;
      }

      // Check if the timeout has been reached
      if (Date.now() - startTime >= timeout) {
        throw new Error("Long polling timed out");
      }

      // Wait for the specified interval before the next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("Error during long polling:", error);
      throw error;
    }
  }
}

  // Helper function to generate unique file ID
/**
 * Generates a unique file ID based on file location in folder structure
 * @param file The template file
 * @param rootFolder The root template folder containing all files
 * @returns A unique file identifier including full path
 */
export const generateFileId = (file: TemplateFile, rootFolder: TemplateFolder): string => {
  // The resolved path already includes the filename + extension, so it IS the
  // unique id (e.g. "app/user/page.tsx"). This keeps every file distinct even
  // when several share a name across folders.
  const path = findFilePath(file, rootFolder)?.replace(/^\/+/, '');
  if (path) return path;

  // Fallback: file isn't in the tree yet (e.g. freshly created) — use the bare
  // name so it still has a stable id.
  const extension = file.fileExtension?.trim();
  return `${file.filename}${extension ? `.${extension}` : ''}`;
}
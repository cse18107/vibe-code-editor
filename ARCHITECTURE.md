# VibeCode — Codebase Walkthrough (by flow)

A browser-based AI code editor: Next.js 15 (App Router) + MongoDB/Prisma +
NextAuth + WebContainers + Monaco + Liveblocks + a pluggable AI layer
(OpenAI / Gemini).

This document walks the code in the order things actually happen, from app boot
to each major feature.

---

## 0. App bootstrap & cross-cutting config

These load on every request before any page.

- **`next.config.ts`** — Next config. Sets the `Cross-Origin-Opener-Policy` /
  `Cross-Origin-Embedder-Policy` headers that WebContainers require, and allows
  remote images.
- **`middleware.ts`** + **`routes.ts`** — Route protection. `routes.ts` lists
  public vs. auth-protected routes; `middleware.ts` runs on each navigation and
  redirects unauthenticated users to sign-in.
- **`auth.config.ts`** — NextAuth providers (Google + GitHub) and their scopes
  (`repo` for GitHub). `allowDangerousEmailAccountLinking` lets the two link by
  email.
- **`auth.ts`** — Main NextAuth setup: Prisma adapter, JWT session strategy, and
  the `signIn` / `jwt` / `session` callbacks that create/link users and put the
  user id + role on the session.
- **`next-auth.d.ts`** — TypeScript augmentation adding `id`/`role` to the
  session user type.
- **`lib/db.ts`** — The singleton Prisma client used everywhere for DB access.
- **`prisma/schema.prisma`** — Data model: `User` (with `username`), `Account`,
  `Playground`, `TemplateFile` (stores the file tree JSON), `StarMark`,
  `ChatMessage`, and the collaboration models `PlaygroundMember` + `Invitation`.
- **`app/layout.tsx`** — Root layout. Loads the **Geist** font, wraps the app in
  `SessionProvider`, `ThemeProvider`, and the toast `Toaster`.
- **`components/providers/theme-providers.tsx`** — next-themes dark/light wrapper.
- **`lib/utils.ts`** — `cn()` class-merge helper used by all components.
- **`components/logo.tsx`** — The themeable `>_` logo mark used in the nav,
  sidebar, footer, and sign-in.

---

## 1. Landing page

URL `/` → the marketing page.

- **`app/(root)/layout.tsx`** — Wraps landing pages with the header + footer.
- **`features/home/header.tsx`** — Top nav (logo, links, theme toggle, account).
- **`app/(root)/page.tsx`** — The hero + feature grid (Start coding / GitHub).
- **`features/home/footer.tsx`** — Footer.

---

## 2. Authentication

Clicking "Start coding" / a protected route sends you here.

- **`app/(auth)/auth/layout.tsx`** — Auth section layout.
- **`app/(auth)/auth/sign-in/page.tsx`** — Centered sign-in screen.
- **`features/auth/components/sign-in-form-client.tsx`** — The Google/GitHub
  buttons; each calls a server action that runs NextAuth `signIn(...)`.
- **`app/api/auth/[...nextauth]/route.ts`** — NextAuth's catch-all handler that
  processes the OAuth callbacks.
- **`features/auth/actions/index.ts`** — Server helpers: `currentUser()`,
  `getUserById()`, `getAccountByUserId()` (used across the app to know who's
  logged in).
- **`features/auth/components/user-button.tsx`** / **`logout-button.tsx`** —
  Avatar menu + sign-out.
- **`features/auth/hooks/use-current-user.ts`** — Client hook for the session.

---

## 3. Dashboard

URL `/dashboard` after login.

- **`app/dashboard/layout.tsx`** — Wraps the dashboard with the sidebar
  (`SidebarProvider`).
- **`features/dashboard/dashboard-sidebar.tsx`** — Left sidebar (logo, nav,
  recent/starred playgrounds).
- **`app/dashboard/page.tsx`** — Server component. Fetches the user's owned
  playgrounds (`getAllPlaygroundForUser`) and shared ones
  (`getSharedPlaygrounds`), and renders the cards, the collaboration bar, the
  project table, and a "Shared with me" table.
- **`features/collaboration/components/collaboration-bar.tsx`** — Username setup
  prompt + pending invitations (accept/decline).
- **`features/dashboard/components/add-new-btn.tsx`** — "Add New" card → opens
  the template modal.
- **`components/modal/template-selector-modal.tsx`** — Pick a template
  (React/Next/Express/Vue/Hono/Angular) + name → creates the playground.
- **`features/dashboard/components/add-repo.tsx`** — "Open GitHub Repository"
  card → connect GitHub, list repos, pick a branch, import.
- **`features/dashboard/components/project-table.tsx`** + **`project-card.tsx`**
  / **`project-list.tsx`** / **`cell-action.tsx`** / **`toggle-star.tsx`** — The
  list of projects with edit / delete / duplicate / star actions.
- **`features/playground/actions/index.ts`** — Server actions backing all of the
  above: `createPlayground`, `getAllPlaygroundForUser`, `getPlaygroundById`,
  `SaveUpdatedCode`, `deleteProjectById` (owner-guarded), `editProjectById`,
  `duplicateProjectById`, `toggleStarMarked`.

---

## 4. GitHub import (from the dashboard)

- **`lib/github.ts`** — Reads the user's stored GitHub token; GitHub REST
  helpers (`listUserRepos`, `listRepoBranches`, `githubFetch`).
- **`app/api/github/connect/route.ts`** — Starts a dedicated GitHub OAuth flow
  (separate from login) to get a repo-scoped token.
- **`app/api/github/callback/route.ts`** — Exchanges the OAuth code for a token
  and attaches it to the current user.
- **`app/api/github/repos/route.ts`** — Lists the user's repos.
- **`app/api/github/branches/route.ts`** — Lists a repo's branches.
- **`app/api/github/import/route.ts`** — Fetches the repo tree + file contents
  (text as-is, binaries as base64 data URIs), builds the template-folder JSON,
  and creates a `Playground` + `TemplateFile`.
- **`features/github/actions.ts`** — `connectGithub()` server action.

---

## 5. Opening a playground (the editor)

URL `/playground/[id]` — the heart of the app.

- **`app/playground/[id]/layout.tsx`** — Editor shell (file-explorer sidebar).
- **`app/playground/[id]/page.tsx`** — The main orchestrator. Wires together the
  file tree, editor, AI, WebContainer preview, save logic (`Cmd/Ctrl+S`), the
  Share dialog, the presence bar, and wraps everything in the Liveblocks
  `CollabRoom`.

**Loading the project's files:**
- **`features/playground/hooks/usePlayground.tsx`** — Loads the playground:
  reads saved `TemplateFile.content` JSON, or falls back to `/api/template/[id]`
  for fresh templates. Exposes `saveTemplateData`.
- **`app/api/template/[id]/route.ts`** — For new playgrounds, reads the starter
  files from `vibecode-starters/<template>/` off disk and returns them as JSON.
- **`lib/template.ts`** — Maps template enum → starter folder path.
- **`features/playground/libs/path-to-json.ts`** — Defines `TemplateFile` /
  `TemplateFolder` types and converts a directory ⇆ the nested JSON the editor
  uses.
- **`features/playground/libs/index.ts`** / **`file-utils.tsx`** — Tree helpers
  like `findFilePath`.

**The file tree (sidebar):**
- **`features/playground/components/playground-explorer.tsx`** — The file tree
  UI (open/select files, right-click add/rename/delete).
- **`features/playground/hooks/useFileExplorer.tsx`** — **Zustand store** holding
  `templateData`, open files, the active file, and all file operations
  (`handleAddFile`, `handleAddFolder`, `updateFileContent`, rename/delete…).
- **`features/playground/components/dialogs/*.tsx`** — New/rename/delete
  file/folder + confirmation dialogs.

**The editor:**
- **`features/playground/components/playground-editor.tsx`** — The Monaco editor.
  Handles content changes, the AI inline-suggestion provider, `Tab`-to-accept,
  exposes the editor instance, and wires the real-time collab binding.
- **`features/playground/libs/editor-config.ts`** — Monaco language detection +
  default options.

---

## 6. AI features (autocomplete + chat)

- **`lib/ai.ts`** — The **pluggable AI layer**. `AI_PROVIDER` (openai|gemini) +
  `AI_CHAT_MODEL` / `AI_COMPLETION_MODEL` env vars pick the model. Exposes
  `generateChat()` and `generateInlineCompletion()`.

**Inline autocomplete:**
- **`features/playground/hooks/useAISuggestion.tsx`** — Triggers suggestions on
  typing/`Ctrl+Space`, calls the API, manages accept/reject.
- **`app/api/code-suggestion/route.ts`** — Splits the file at the cursor into
  prefix/suffix and asks `generateInlineCompletion()` for just the insertion.
- **`features/playground/components/toggle-ai.tsx`** — The "AI" toolbar button +
  opens the chat panel; passes the active file as context.

**Chat assistant:**
- **`features/ai-chat/components/ai-chat-sidepanel.tsx`** — The chat UI
  (messages, Review/Fix/Optimize modes, markdown rendering, insert-into-editor).
- **`features/ai-chat/components/ai-chat-code-blocks.tsx`** — Renders code blocks
  with copy/insert/run.
- **`features/ai-chat/components/file-attachment.tsx`** / **`file-preview.tsx`** —
  Attach files as chat context.
- **`app/api/chat/route.ts`** — The chat endpoint; builds the system prompt and
  calls `generateChat()`. Also handles prompt "enhance".

---

## 7. Live preview (WebContainers)

- **`features/webcontainers/hooks/useWebContainer.ts`** — Boots a **single**
  WebContainer instance (singleton) for the page and exposes `writeFileSync`.
- **`features/webcontainers/hooks/transformer.ts`** — Converts the template JSON
  into WebContainer's mount format (decodes base64 binaries back to bytes).
- **`features/webcontainers/components/webcontainer-preveiw.tsx`** — Mounts the
  files, then hands control to the user: a command bar (`npm install`,
  `npm run dev`, `npx serve`…), the preview iframe (with a Fullscreen toggle),
  and detects the dev server to show the preview.
- **`features/webcontainers/components/terminal.tsx`** — The xterm terminal that
  streams command output.

---

## 8. Real-time collaboration (Liveblocks)

- **`liveblocks.config.ts`** — Type augmentation for presence + user metadata.
- **`app/api/liveblocks-auth/route.ts`** — Authorizes a user into a project's
  room — only if they own or are a member of it — and attaches their username +
  color.
- **`features/collaboration/components/collab-room.tsx`** — Wraps the playground
  in the Liveblocks room (`playground:<id>`).
- **`features/collaboration/hooks/useMonacoCollab.ts`** — Binds the active file's
  Monaco model to a shared Yjs doc (live edits) and draws remote cursors with
  each person's username/color.
- **`features/collaboration/components/presence-bar.tsx`** — Avatar stack of
  who's in the room + which file they're on.
- **`features/collaboration/components/share-dialog.tsx`** — Invite by username,
  see members, remove people.
- **`features/collaboration/actions.ts`** — Server actions: `setUsername`,
  `inviteByUsername`, `respondInvitation`, `listMembers`, `removeMember`,
  `getSharedPlaygrounds`, `hasPlaygroundAccess`.

---

## 9. Shared UI & misc

- **`components/ui/*.tsx`** — shadcn/ui primitives (button, dialog, sidebar,
  tabs, tooltip, resizable, etc.) used throughout.
- **`hooks/use-mobile.ts`** — Responsive helper.
- **`lib/syntax-highlighter.tsx`** — Code highlighting for chat blocks.

---

## Note on duplicate / legacy files

Several files appear to be earlier iterations that aren't on the active path
(e.g. `features/playground/components/code-editor.tsx`,
`playground-client.tsx`, `playground-editor-client.tsx`,
`playground-layout.tsx`, `playground-header.tsx`, `file-tree.tsx`,
`ai-setting-dropdown.tsx` vs `ai-settings-dropdown.tsx`). The live editor flow
goes through **`app/playground/[id]/page.tsx`** → `playground-explorer.tsx` +
`playground-editor.tsx`. If you're cleaning up, those are safe candidates to
verify-and-remove.

---

## Quick mental model

```
Request
  → middleware (auth gate)
  → app/layout (font, providers)
  → page (landing / dashboard / playground)

Playground page
  → usePlayground (load files: DB or /api/template)
  → useFileExplorer (Zustand: tree + open files)
  → playground-explorer (tree UI)
  → playground-editor (Monaco)
        ├─ useAISuggestion → /api/code-suggestion → lib/ai
        └─ useMonacoCollab → Liveblocks/Yjs (live edits + cursors)
  → toggle-ai → ai-chat-sidepanel → /api/chat → lib/ai
  → webcontainer-preveiw (run + preview)
  → ShareDialog / PresenceBar (collaboration)
```

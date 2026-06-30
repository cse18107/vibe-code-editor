# VibeCode — AI-Powered Web IDE

VibeCode is a browser-based code editor for building, running, and collaborating
on projects without any local setup. It pairs a Monaco editor with in-browser
execution (WebContainers), AI assistance from your choice of provider, GitHub
import, and real-time multiplayer editing.

> Built with Next.js 15 (App Router), TypeScript, Prisma + MongoDB, NextAuth,
> Liveblocks, and Tailwind.

---

## Features

- **AI autocomplete & chat** — context-aware inline completions and an in-editor
  assistant. Pluggable provider: **OpenAI** or **Gemini**, switchable via env
  (no code changes).
- **Run in the browser** — frontend and backend projects boot instantly with
  **WebContainers**; an embedded terminal lets you run any command (`npm install`,
  `npm run dev`, `npx serve`, …) and a live preview appears automatically.
- **Import from GitHub** — connect your account, browse your repos, pick a branch,
  and start editing in seconds.
- **Real-time collaboration** — invite up to 5 people by username and edit
  together live, with shared cursors, presence, and instant sync (Liveblocks +
  Yjs).
- **Project workspaces** — create playgrounds from templates, a full file
  explorer (create / rename / delete files & folders), and autosave to the DB.
- **OAuth auth** — sign in with Google or GitHub (NextAuth).
- **Polished UI** — clean, minimal design with light/dark mode.

---

## Tech stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Framework        | Next.js 15 (App Router), React 19           |
| Language         | TypeScript                                  |
| Styling          | Tailwind CSS, shadcn/ui, Geist              |
| Auth             | NextAuth (Google + GitHub OAuth)            |
| Database         | MongoDB via Prisma                          |
| Editor           | Monaco Editor                               |
| In-browser runtime | WebContainers + xterm.js                  |
| AI               | OpenAI / Google Gemini (pluggable)          |
| Collaboration    | Liveblocks + Yjs (`y-monaco`)               |

---

## Getting started

### Prerequisites

- **Node.js 22 LTS**
- A **MongoDB** database (e.g. MongoDB Atlas)
- API keys: Google/GitHub OAuth, an AI provider (OpenAI or Gemini), and Liveblocks

### 1. Install

```bash
git clone https://github.com/cse18107/vibe-code-editor.git
cd vibe-code-editor
npm install
```

### 2. Environment variables

Create a `.env.local` in the project root:

```env
# Auth
AUTH_SECRET=                # `npx auth secret`
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Database (MongoDB)
DATABASE_URL=

# AI provider (openai | gemini)
AI_PROVIDER=gemini
AI_CHAT_MODEL=gemini-2.5-pro
AI_COMPLETION_MODEL=gemini-2.5-flash
GEMINI_API_KEY=
# OPENAI_API_KEY=          # if AI_PROVIDER=openai

# Real-time collaboration
LIVEBLOCKS_SECRET_KEY=
```

### 3. Generate the Prisma client

```bash
npx prisma generate
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it fits together

A high-level, file-by-file walkthrough of the codebase lives in
[`ARCHITECTURE.md`](./ARCHITECTURE.md). In short:

```
Request → middleware (auth) → layout → page (landing / dashboard / playground)

Playground
  ├─ usePlayground / useFileExplorer  → load & manage the file tree
  ├─ playground-editor (Monaco)
  │    ├─ useAISuggestion → /api/code-suggestion → lib/ai
  │    └─ useMonacoCollab → Liveblocks/Yjs (live edits + cursors)
  ├─ ai-chat-sidepanel → /api/chat → lib/ai
  └─ webcontainer-preview → run & preview
```

---

## Deployment

The app is set up for **Vercel**: `prisma generate` runs on install, the
WebContainer cross-origin-isolation headers are configured, and the template
route writes to the OS temp dir. Set the same environment variables in your host,
point your OAuth callback URLs at the production domain, and set
`AUTH_TRUST_HOST=true`.

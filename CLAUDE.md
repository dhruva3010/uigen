# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # Install deps, generate Prisma client, run migrations (first-time setup)
npm run dev          # Start dev server (custom dev-server.cjs wrapping Next.js)
npm run build        # Production build
npm run lint         # ESLint (run after completing any task)
npm test             # Run all tests with Vitest
npx vitest run src/path/to/__tests__/file.test.tsx  # Run a single test file
npm run db:reset     # Reset the SQLite database (destructive)
```

Set `ANTHROPIC_API_KEY` in `.env` to use the real Claude API. Without it, a `MockLanguageModel` is used that returns static component demos.

## Architecture

### AI Generation Flow
The core loop: user sends a chat message → `POST /api/chat` → Vercel AI SDK `streamText` with two tools → tool calls update the virtual file system in real-time → preview iframe re-renders.

- **Model**: `claude-haiku-4-5` (configured in `src/lib/provider.ts`). Falls back to `MockLanguageModel` when no API key.
- **Tools exposed to the AI**:
  - `str_replace_editor` — create/edit files (view, create, str_replace, insert commands). Built in `src/lib/tools/str-replace.ts`.
  - `file_manager` — rename/delete files. Built in `src/lib/tools/file-manager.ts`.
- **Prompt**: `src/lib/prompts/generation.tsx` — injected as the system message with Anthropic cache control.

### Virtual File System
All generated files live in memory, never on disk. `VirtualFileSystem` (`src/lib/file-system.ts`) is a tree-structured in-memory FS with CRUD and rename operations. It serializes to/from plain `Record<string, FileNode>` for sending over the wire and storing in the DB.

`FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) wraps the VFS in React state, exposes `handleToolCall` which processes AI tool calls to mutate the FS, and increments `refreshTrigger` to notify the preview.

### Live Preview
`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an `<iframe srcdoc>`. On each `refreshTrigger`:
1. `createImportMap` (in `src/lib/transform/jsx-transformer.ts`) transforms all JS/TS/JSX/TSX files via `@babel/standalone` and creates Blob URLs.
2. Third-party imports are resolved through `esm.sh`; missing local imports get placeholder modules.
3. `createPreviewHTML` builds the HTML with an import map, Tailwind CDN, and a React ErrorBoundary that dynamically imports the entry point (auto-detected: `/App.jsx` → `/App.tsx` → `/index.jsx` → etc.).

### Authentication
Custom JWT-based auth using `jose` — no NextAuth. Sessions are stored in an `auth-token` HttpOnly cookie (7-day expiry). `src/lib/auth.ts` handles session creation/verification. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes.

Anonymous users can generate components without signing in; their work is tracked via `src/lib/anon-work-tracker.ts` (localStorage) and can be saved upon sign-up.

### Data Persistence
Prisma with SQLite (`prisma/dev.db`). The generated client is output to `src/generated/prisma/`.

- `Project.messages` — JSON-stringified array of AI SDK `Message` objects
- `Project.data` — JSON-stringified `Record<string, FileNode>` (the VFS snapshot)

Projects are loaded in `src/app/[projectId]/page.tsx` and passed as `initialMessages`/`initialData` to the context providers.

### Context Hierarchy
```
FileSystemProvider  (VFS state + tool call handler)
  └── ChatProvider  (wraps useAIChat, sends VFS snapshot with each request)
        └── UI components
```
`ChatProvider` (`src/lib/contexts/chat-context.tsx`) wires `onToolCall` from Vercel AI SDK to `handleToolCall` from `FileSystemContext`.

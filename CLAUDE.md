# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server

# Setup (first time)
npm run setup        # Install deps + Prisma generate + run migrations

# Testing & Quality
npm test             # Run Vitest tests
npm run lint         # Run ESLint

# Database
npm run db:reset     # Reset database (destructive)
```

Environment: Requires `ANTHROPIC_API_KEY` in `.env` for real AI responses. Without it, a `MockLanguageModel` fallback is used that generates static placeholder components.

## Architecture

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates the code via tool calls, and a sandboxed iframe renders the result in real-time.

### Core Data Flow

1. User sends message in `ChatInterface` → dispatched via `ChatContext` (wraps Vercel AI SDK's `useChat`)
2. `POST /api/chat` receives message + current virtual file system state
3. Server calls Claude (`src/lib/provider.ts`) with system prompt (`src/lib/prompts/generation.tsx`) and two tools
4. Claude calls tools to create/modify files:
   - `str_replace_editor` (`src/lib/tools/str-replace.ts`) — edits existing file content
   - `file_manager` (`src/lib/tools/file-manager.ts`) — creates or deletes files
5. Tool call results update `FileSystemContext` (in-memory virtual file system)
6. `PreviewFrame` watches the file system, runs Babel (in-browser) to transform JSX → JS, and re-renders in the iframe
7. If authenticated, the project (messages + VFS) is persisted to SQLite via Prisma

### Key Architectural Decisions

**Virtual File System**: All generated files exist only in memory (`src/lib/file-system.ts`). They're serialized to JSON for Prisma storage and passed to the iframe for execution — nothing is ever written to disk.

**Babel in the Browser**: `src/lib/transform/jsx-transformer.ts` uses `@babel/standalone` inside the preview iframe to transform JSX at runtime. This enables instant preview without a build step.

**Streaming + Tool Calls**: The `/api/chat` route uses Vercel AI SDK's `streamText()`. Claude's tool calls are streamed back to the client and the file system is updated incrementally as each tool call resolves.

**Provider Abstraction**: `src/lib/provider.ts` returns either an Anthropic model or a `MockLanguageModel`. The mock enables the app to function without an API key.

### Directory Structure

```
src/
  app/
    page.tsx                 # Home: redirects auth users to project, shows demo for anon
    [projectId]/page.tsx     # Per-user project workspace
    main-content.tsx         # Root UI: resizable panels (chat | preview+code)
    api/chat/route.ts        # Streaming AI endpoint (120s timeout)
  components/
    chat/                    # ChatInterface, MessageList, MarkdownRenderer
    editor/                  # CodeEditor (Monaco), FileTree
    preview/PreviewFrame.tsx # Sandboxed iframe with Babel transformer
    HeaderActions.tsx        # Export + auth buttons
  lib/
    contexts/
      chat-context.tsx       # useChat wrapper, tool call dispatch
      file-system-context.tsx# VFS state + CRUD
    tools/                   # str_replace_editor and file_manager implementations
    prompts/generation.tsx   # System prompt for Claude
    file-system.ts           # VirtualFileSystem class
    transform/               # JSX transformer (Babel)
    auth.ts                  # JWT auth (jose + bcrypt)
    provider.ts              # LLM provider selection
  actions/                   # Next.js server actions (user/project CRUD)
prisma/
  schema.prisma              # User + Project models (SQLite, CUIDs)
```

### Database Schema

- **User**: `id`, `email` (unique), `password` (bcrypt), timestamps, projects relation
- **Project**: `id`, `name`, `userId` (nullable for anon), `messages` (JSON), `data` (JSON — serialized VFS), timestamps

Anonymous users can use the app without signing in; their work is tracked in localStorage. Authenticated users get persistent projects.

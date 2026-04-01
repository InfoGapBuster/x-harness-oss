# Contributing to X Harness

## Development Setup

```bash
pnpm install
pnpm dev:worker    # Start worker on :8787
cd apps/web && pnpm dev  # Start dashboard on :3000
```

## Project Structure

```
apps/worker/     - Cloudflare Workers API (Hono)
apps/web/        - Next.js 15 admin dashboard
packages/db/     - D1 schema & queries
packages/x-sdk/  - X API v2 client
packages/sdk/    - TypeScript client SDK
packages/mcp/    - MCP Server for Claude Code
packages/shared/ - Shared types
```

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `pnpm build` and `pnpm typecheck`
5. Submit a PR with a clear description

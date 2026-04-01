# X Harness OSS

> Open-source X (Twitter) marketing automation — the self-hosted alternative to XTEP

## Features

- **Engagement Gate** — Reply + Like/RT/Follow detection with auto DM/mention delivery
- **Reply Trigger Architecture** — Cost-efficient `since_id` polling (~$3-5/mo vs $86/mo)
- **LINE Harness Integration** — Verify API for cross-platform campaigns
- **Scheduled Posts** — Queue and auto-publish tweets
- **Step Sequences** — Multi-step DM automation
- **Follower Management** — Sync, tag, and segment your audience
- **Dashboard** — Next.js admin UI
- **MCP Server** — Claude Code native integration
- **Stealth Design** — Jitter, rate limiting, template variation

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Cloudflare account (free tier works)
- X API access (Pay-Per-Use plan recommended)

### Setup

```bash
git clone https://github.com/Shudesu/x-harness.git
cd x-harness
pnpm install

# Configure environment
cp .dev.vars.example apps/worker/.dev.vars
# Edit .dev.vars with your API keys

# Create D1 database
npx wrangler d1 create x-harness
# Update wrangler.toml with your database ID

# Run migrations
pnpm db:migrate

# Start development
pnpm dev:worker  # API on :8787
cd apps/web && pnpm dev  # Dashboard on :3000
```

## Architecture

```
X Platform (API v2) <-> CF Workers (Hono) -> D1
                              |
                        Cron (*/5 * * * *)
                              |
                   Reply detection (since_id)
                   + Cached condition verification

Next.js 15 (Dashboard) -> Workers API -> D1
TypeScript SDK -> Workers API -> D1
MCP Server -> Workers API -> D1
LINE Harness -> Verify API -> D1
```

## Cost

| Usage | Monthly Cost |
|-------|-------------|
| 1-2 active gates (normal) | **$3-5** |
| Viral post (5000+ likes) | $20-45 |
| Infrastructure (CF free tier) | **$0** |

X API Pay-Per-Use plan recommended. Reply-trigger architecture minimizes API calls by using `since_id` differential fetching.

## LINE Harness Integration

X Harness provides a verify API for cross-platform campaigns:

```
GET /api/engagement-gates/:id/verify?username=johndoe

{
  "eligible": true,
  "conditions": {
    "reply": true,
    "like": true,
    "repost": true,
    "follow": true
  }
}
```

Configure LINE Harness webhook to call this endpoint when a user submits their X username.

## API

See [docs/SPEC.md](docs/SPEC.md) for full API documentation.

## License

MIT

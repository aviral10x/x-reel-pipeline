# X Bookmarks → Instagram Reel Script Pipeline

## Project Overview
A local pipeline that polls your X (Twitter) bookmarks every N minutes,
detects new ones tagged with 🎬 or #reel, and auto-generates Instagram
Reel scripts using Claude (Hook → Story → CTA format).

## Stack
- Runtime: Node.js + TypeScript (via `tsx`)
- X API: OAuth 2.0 User Context, free tier (`GET /2/users/:id/bookmarks`)
- AI: Anthropic Claude API (`claude-sonnet-4-20250514`)
- DB: SQLite via `better-sqlite3`
- Dashboard: Vanilla HTML served by a local HTTP server

## Key Commands
```bash
npm install                  # install deps
npm run auth                 # one-time OAuth flow to get user token
npm run start                # start pipeline + API server
npm run dashboard            # open dashboard in browser
npm run dev                  # start with auto-reload (tsx watch)
```

## Architecture
1. `xClient.ts`   — handles X API auth (OAuth 2.0 PKCE) and bookmark fetching
2. `db.ts`        — SQLite wrapper: store processed tweet IDs + generated scripts
3. `scriptGen.ts` — Claude API call with Hook→Story→CTA system prompt
4. `pipeline.ts`  — main polling loop: fetch → filter new → generate → store
5. `server.ts`    — tiny HTTP server exposing `/api/scripts` and `/api/stats`
6. `dashboard/`   — frontend that polls the local API every 30s

## Trigger Logic (free tier workaround)
Since X free tier doesn't support bookmark folders, we use a keyword filter:
- Pipeline only processes bookmarks whose tweet text contains `🎬` OR `#reel`
- You bookmark a tweet on X, then (if needed) reply/quote with 🎬 — OR
- We track ALL new bookmarks and you set FILTER_KEYWORD='' to process everything

## Environment Variables (see .env.example)
- X_CLIENT_ID, X_CLIENT_SECRET — from developer.twitter.com app
- X_REFRESH_TOKEN — obtained via `npm run auth`
- X_USER_ID — your numeric X user ID
- ANTHROPIC_API_KEY — from console.anthropic.com
- POLL_INTERVAL_MINUTES — default 15
- FILTER_KEYWORD — default '🎬' (set to '' to process all bookmarks)
- PORT — API server port, default 8787

## Important Notes
- X free tier: 1 request/15 min for bookmarks endpoint — matches our poll interval
- OAuth tokens expire; pipeline auto-refreshes using refresh token
- SQLite DB is local: `pipeline.db` in project root
- Never commit `.env` — it contains secrets

# 🎬 X Bookmarks → Instagram Reel Pipeline

Automatically turns your X (Twitter) bookmarks into Instagram Reel scripts using Claude AI.

Bookmark a tweet with 🎬 → get a Hook → Story → CTA script generated and ready to use.

## How it works

1. You bookmark a tweet on X containing 🎬
2. The pipeline polls your bookmarks every 15 minutes (X free tier rate limit)
3. New bookmarks are sent to Claude, which generates a 30–60s Reel script
4. Scripts appear in a local dashboard with one-click copy

## Stack

- **Runtime**: Node.js + TypeScript
- **X API**: OAuth 2.0 User Context (free tier)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **DB**: SQLite via `better-sqlite3`
- **Dashboard**: Vanilla HTML/JS served locally

## Setup

### 1. X Developer App
- Go to [developer.twitter.com](https://developer.twitter.com) and create a free app
- Enable **OAuth 2.0**, set type to **Native App**
- Set callback URL to `http://localhost:3456/callback`
- Copy your **Client ID** and **Client Secret**

### 2. Configure
```bash
cp .env.example .env
# Fill in: X_CLIENT_ID, X_CLIENT_SECRET, X_USER_ID, ANTHROPIC_API_KEY
```

Find your numeric X user ID at [tweeterid.com](https://tweeterid.com).

### 3. Authenticate (one-time)
```bash
npm install
npm run auth
# Opens browser → log in → tokens auto-saved to .env
```

### 4. Run
```bash
npm start
# Open dashboard/index.html in your browser
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `FILTER_KEYWORD` | `🎬` | Only process bookmarks containing this. Set to `""` for all |
| `POLL_INTERVAL_MINUTES` | `15` | How often to poll (X free tier = 1 req/15min) |
| `PORT` | `8787` | Local API server port |

## Project Structure

```
src/
├── index.ts       # Entry point
├── auth.ts        # One-time OAuth 2.0 PKCE flow
├── xClient.ts     # X API client with auto token refresh
├── pipeline.ts    # Core polling loop
├── scriptGen.ts   # Claude script generation
├── db.ts          # SQLite wrapper
└── server.ts      # Local API server
dashboard/
└── index.html     # Frontend dashboard
```

## Dashboard

Open `dashboard/index.html` in your browser after starting the pipeline. It auto-refreshes every 30 seconds and shows:
- Original tweet alongside the generated script
- Hook / Story / CTA sections with visual cue highlights
- One-click copy to clipboard

## Free Tier Notes

X's free API tier supports `GET /2/users/:id/bookmarks` at 1 request per 15 minutes — which is exactly what this pipeline uses. Bookmark folders require the Basic plan ($100/mo), so we use a keyword filter (🎬) as a free alternative.

## License

MIT

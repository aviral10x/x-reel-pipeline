/**
 * X API client — bookmark fetching with auto token refresh.
 * Uses OAuth 2.0 User Context (free tier compatible).
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH  = path.resolve(__dirname, '../.env');

export interface Tweet {
  id:        string;
  text:      string;
  authorId:  string;
  username:  string;
  name:      string;
  createdAt: string;
}

// ── Token management ──────────────────────────────────────────────────────────

let accessToken  = process.env.X_ACCESS_TOKEN  || '';
let refreshToken = process.env.X_REFRESH_TOKEN || '';

const CLIENT_ID     = process.env.X_CLIENT_ID!;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const USER_ID       = process.env.X_USER_ID!;

function persistTokens(access: string, refresh: string) {
  accessToken  = access;
  refreshToken = refresh;
  process.env.X_ACCESS_TOKEN  = access;
  process.env.X_REFRESH_TOKEN = refresh;

  // Update .env file in-place so tokens survive restarts
  if (fs.existsSync(ENV_PATH)) {
    let content = fs.readFileSync(ENV_PATH, 'utf8');
    content = content
      .replace(/^X_ACCESS_TOKEN=.*$/m,  `X_ACCESS_TOKEN=${access}`)
      .replace(/^X_REFRESH_TOKEN=.*$/m, `X_REFRESH_TOKEN=${refresh}`);
    fs.writeFileSync(ENV_PATH, content);
  }
}

async function refreshAccessToken(): Promise<void> {
  console.log('🔄 Refreshing X access token...');

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  const data = await res.json() as any;
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description}`);

  persistTokens(data.access_token, data.refresh_token ?? refreshToken);
  console.log('✅ Token refreshed');
}

// ── API helper ────────────────────────────────────────────────────────────────

async function xGet(url: string, params: Record<string, string> = {}, retry = true): Promise<any> {
  const fullUrl = new URL(url);
  for (const [k, v] of Object.entries(params)) fullUrl.searchParams.set(k, v);

  const res = await fetch(fullUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    await refreshAccessToken();
    return xGet(url, params, false);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API error ${res.status}: ${err}`);
  }

  return res.json();
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export async function fetchBookmarks(paginationToken?: string): Promise<{
  tweets: Tweet[];
  nextToken?: string;
}> {
  const params: Record<string, string> = {
    'tweet.fields':  'text,author_id,created_at',
    'expansions':    'author_id',
    'user.fields':   'username,name',
    'max_results':   '100',
  };
  if (paginationToken) params['pagination_token'] = paginationToken;

  const data = await xGet(
    `https://api.twitter.com/2/users/${USER_ID}/bookmarks`,
    params
  );

  const usersMap: Record<string, { username: string; name: string }> = {};
  for (const u of data.includes?.users ?? []) {
    usersMap[u.id] = { username: u.username, name: u.name };
  }

  const tweets: Tweet[] = (data.data ?? []).map((t: any) => ({
    id:        t.id,
    text:      t.text,
    authorId:  t.author_id,
    username:  usersMap[t.author_id]?.username ?? 'unknown',
    name:      usersMap[t.author_id]?.name ?? '',
    createdAt: t.created_at ?? new Date().toISOString(),
  }));

  return {
    tweets,
    nextToken: data.meta?.next_token,
  };
}

/** Fetch ALL bookmarks (handles pagination) */
export async function fetchAllBookmarks(): Promise<Tweet[]> {
  const all: Tweet[] = [];
  let nextToken: string | undefined;

  do {
    const { tweets, nextToken: nt } = await fetchBookmarks(nextToken);
    all.push(...tweets);
    nextToken = nt;
    if (nextToken) await sleep(500); // be gentle with rate limits
  } while (nextToken);

  return all;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

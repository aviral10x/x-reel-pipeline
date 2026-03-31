/**
 * One-time OAuth 2.0 PKCE auth flow.
 * Run: npm run auth
 * Paste the resulting tokens into your .env file.
 */

import 'dotenv/config';
import * as http from 'http';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const CLIENT_ID     = process.env.X_CLIENT_ID!;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const REDIRECT_URI  = 'http://localhost:3456/callback';
const SCOPES        = ['tweet.read', 'users.read', 'bookmark.read', 'offline.access'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌  Set X_CLIENT_ID and X_CLIENT_SECRET in .env first');
  process.exit(1);
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────
function base64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const codeVerifier  = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
const state         = base64url(crypto.randomBytes(16));

// ── Build auth URL ────────────────────────────────────────────────────────────
const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
authUrl.searchParams.set('response_type',         'code');
authUrl.searchParams.set('client_id',             CLIENT_ID);
authUrl.searchParams.set('redirect_uri',          REDIRECT_URI);
authUrl.searchParams.set('scope',                 SCOPES.join(' '));
authUrl.searchParams.set('state',                 state);
authUrl.searchParams.set('code_challenge',        codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

console.log('\n🔐  X OAuth 2.0 Authorization\n');
console.log('Opening browser... if it doesn\'t open, paste this URL manually:\n');
console.log(authUrl.toString(), '\n');

try { execSync(`open "${authUrl.toString()}"`); } catch {}
try { execSync(`xdg-open "${authUrl.toString()}"`); } catch {}

// ── Local callback server ─────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url!, 'http://localhost:3456');
  const code   = url.searchParams.get('code');
  const cbState = url.searchParams.get('state');

  if (!code || cbState !== state) {
    res.end('❌ Auth failed — state mismatch or missing code.');
    return;
  }

  // Exchange code for tokens
  const body = new URLSearchParams({
    code,
    grant_type:    'authorization_code',
    redirect_uri:  REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  const tokens = await tokenRes.json() as any;

  if (tokens.error) {
    res.end(`❌ Token exchange failed: ${tokens.error_description}`);
    console.error('Token error:', tokens);
    server.close();
    return;
  }

  res.end(`
    <html><body style="font-family:monospace;padding:40px;background:#0a0a0a;color:#0f0">
    <h2>✅ Auth successful!</h2>
    <p>Close this tab and check your terminal.</p>
    </body></html>
  `);

  console.log('\n✅  Auth successful! Add these to your .env:\n');
  console.log(`X_ACCESS_TOKEN=${tokens.access_token}`);
  console.log(`X_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('\nAlso add your numeric user ID to X_USER_ID');
  console.log('Find it at: https://tweeterid.com\n');

  server.close();
  process.exit(0);
});

server.listen(3456, () => {
  console.log('Waiting for OAuth callback on http://localhost:3456/callback ...\n');
});

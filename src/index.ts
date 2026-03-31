/**
 * Entry point — starts API server + pipeline concurrently.
 * Run: npm start
 */

import 'dotenv/config';
import { startServer } from './server.js';
import { startPipeline } from './pipeline.js';

// Validate required env vars
const required = ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_ACCESS_TOKEN', 'X_USER_ID', 'ANTHROPIC_API_KEY'];
const missing  = required.filter(k => !process.env[k]);

if (missing.length) {
  console.error('\n❌  Missing environment variables:');
  missing.forEach(k => console.error(`   • ${k}`));
  console.error('\n   → Copy .env.example to .env and fill in the values');
  console.error('   → Run `npm run auth` to get your X tokens\n');
  process.exit(1);
}

startServer();
await startPipeline();

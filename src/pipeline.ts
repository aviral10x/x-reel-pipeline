/**
 * Core pipeline: polls X bookmarks → filters → generates scripts → stores.
 */

import 'dotenv/config';
import { fetchAllBookmarks, type Tweet } from './xClient.js';
import { isProcessed, insertTweet, markDone, markError, setMeta } from './db.js';
import { generateReelScript } from './scriptGen.js';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MINUTES ?? '15') * 60 * 1000;
const FILTER_KEYWORD   = process.env.FILTER_KEYWORD ?? '🎬';

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function shouldProcess(tweet: Tweet): boolean {
  if (!FILTER_KEYWORD) return true; // process everything
  return tweet.text.toLowerCase().includes(FILTER_KEYWORD.toLowerCase());
}

async function processTweet(tweet: Tweet) {
  log(`  ✨ New: @${tweet.username} — "${tweet.text.slice(0, 60)}..."`);
  insertTweet({ id: tweet.id, text: tweet.text, username: tweet.username, name: tweet.name });

  try {
    const script = await generateReelScript(tweet);
    markDone(tweet.id, script);
    log(`  ✅ Script generated for ${tweet.id}`);
  } catch (err: any) {
    markError(tweet.id, err.message);
    log(`  ❌ Script failed for ${tweet.id}: ${err.message}`);
  }
}

export async function runOnce() {
  log('🔍 Polling X bookmarks...');
  setMeta('last_poll', new Date().toISOString());

  let tweets: Tweet[];
  try {
    tweets = await fetchAllBookmarks();
  } catch (err: any) {
    log(`❌ Failed to fetch bookmarks: ${err.message}`);
    return;
  }

  log(`   Found ${tweets.length} bookmarks total`);

  const toProcess = tweets.filter(t => !isProcessed(t.id) && shouldProcess(t));
  log(`   ${toProcess.length} new + matching filter`);

  for (const tweet of toProcess) {
    await processTweet(tweet);
    await sleep(1000); // small gap between Claude calls
  }

  log(`✔ Cycle complete.`);
}

export async function startPipeline() {
  const filterMsg = FILTER_KEYWORD
    ? `keyword filter: "${FILTER_KEYWORD}"`
    : 'no filter (processing ALL bookmarks)';

  log(`🚀 Pipeline started — polling every ${POLL_INTERVAL_MS / 60000}min, ${filterMsg}`);
  log(`   Tip: bookmark a tweet containing ${FILTER_KEYWORD || 'anything'} on X to trigger a script`);

  // Run immediately on start
  await runOnce();

  // Then poll on interval
  setInterval(runOnce, POLL_INTERVAL_MS);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

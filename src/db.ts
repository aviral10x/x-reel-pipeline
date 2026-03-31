/**
 * SQLite database layer using better-sqlite3 (sync API — no async footguns).
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.resolve(__dirname, '../pipeline.db');

export interface ScriptRecord {
  tweet_id:   string;
  tweet_text: string;
  username:   string;
  name:       string;
  script:     string | null;
  status:     'pending' | 'done' | 'error';
  created_at: string;
  error_msg:  string | null;
}

let _db: ReturnType<typeof Database> | null = null;

function db() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS scripts (
        tweet_id   TEXT PRIMARY KEY,
        tweet_text TEXT NOT NULL,
        username   TEXT NOT NULL,
        name       TEXT NOT NULL DEFAULT '',
        script     TEXT,
        status     TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        error_msg  TEXT
      );

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }
  return _db;
}

export function isProcessed(tweetId: string): boolean {
  const row = db().prepare('SELECT 1 FROM scripts WHERE tweet_id = ?').get(tweetId);
  return !!row;
}

export function insertTweet(tweet: {
  id: string; text: string; username: string; name: string;
}) {
  db().prepare(`
    INSERT OR IGNORE INTO scripts (tweet_id, tweet_text, username, name)
    VALUES (@id, @text, @username, @name)
  `).run(tweet);
}

export function markDone(tweetId: string, script: string) {
  db().prepare(`
    UPDATE scripts SET script = ?, status = 'done' WHERE tweet_id = ?
  `).run(script, tweetId);
}

export function markError(tweetId: string, msg: string) {
  db().prepare(`
    UPDATE scripts SET status = 'error', error_msg = ? WHERE tweet_id = ?
  `).run(msg, tweetId);
}

export function getAllScripts(): ScriptRecord[] {
  return db().prepare(`
    SELECT * FROM scripts ORDER BY created_at DESC
  `).all() as ScriptRecord[];
}

export function getStats() {
  const total   = (db().prepare('SELECT COUNT(*) as n FROM scripts').get() as any).n;
  const done    = (db().prepare("SELECT COUNT(*) as n FROM scripts WHERE status='done'").get() as any).n;
  const pending = (db().prepare("SELECT COUNT(*) as n FROM scripts WHERE status='pending'").get() as any).n;
  const errors  = (db().prepare("SELECT COUNT(*) as n FROM scripts WHERE status='error'").get() as any).n;
  return { total, done, pending, errors };
}

/** Track last poll time */
export function setMeta(key: string, value: string) {
  db().prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

export function getMeta(key: string): string | null {
  const row = db().prepare('SELECT value FROM meta WHERE key = ?').get(key) as any;
  return row?.value ?? null;
}

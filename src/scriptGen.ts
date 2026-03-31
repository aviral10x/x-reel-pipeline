/**
 * Generates Instagram Reel scripts from tweet text using Claude.
 * Format: Hook → Story → CTA (30–60 seconds)
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an elite Instagram Reels scriptwriter who turns social media content into viral short-form video scripts.

Your scripts are for 30–60 second Reels and ALWAYS follow this exact structure:

---
HOOK (0–3s)
One line. Stops the scroll cold. Use curiosity gaps, bold claims, or shocking facts. No fluff, no "hey guys".

STORY (4–45s)
Build the narrative with punchy, visual sentences. Write for someone speaking on camera.
- Max 8–10 words per beat
- Add [VISUAL: description] tags for b-roll/screen recording suggestions
- Short paragraphs. White space. Easy to read off a teleprompter.
- Keep energy building. No filler sentences.

CTA (46–60s)
One clear, specific action. Conversational tone. Never say "like and subscribe" or "smash the bell".
Make it feel like a friend telling you what to do next.
---

Tone: smart, direct, slightly edgy, conversational. Never corporate.
Output ONLY the script with the section labels (HOOK, STORY, CTA). No preamble, no meta-commentary, no "here's your script:".`;

export async function generateReelScript(tweet: {
  text: string;
  username: string;
  name: string;
}): Promise<string> {
  const prompt = `Turn this tweet into an Instagram Reel script:

Tweet by @${tweet.username} (${tweet.name}):
"""
${tweet.text}
"""

Write the full 30–60s Reel script now.`;

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: prompt }],
  });

  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in Claude response');
  return block.text.trim();
}

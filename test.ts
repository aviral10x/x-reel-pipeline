/**
 * Pipeline test — bypasses X API and SQLite, tests Claude script generation directly.
 * Usage: ANTHROPIC_API_KEY=xxx tsx test.ts
 */

import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌ Set ANTHROPIC_API_KEY env var');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an elite Instagram Reels scriptwriter who turns social media content into viral short-form video scripts.

Your scripts are for 30–60 second Reels and ALWAYS follow this exact structure:

---
HOOK (0–3s)
One line. Stops the scroll cold. Use curiosity gaps, bold claims, or shocking facts. No fluff, no "hey guys".

STORY (4–45s)
Build the narrative with punchy, visual sentences. Write for someone speaking on camera.
- Max 8–10 words per beat
- Add [VISUAL: description] tags for b-roll suggestions
- Short paragraphs. White space. Easy to read off a teleprompter.

CTA (46–60s)
One clear, specific action. Conversational. Never say "like and subscribe."
---

Output ONLY the script with section labels. No preamble.`;

// Sample tweets to test with
const TEST_TWEETS = [
  {
    username: 'sama',
    name: 'Sam Altman',
    text: 'the thing that surprised me most about building AI: the models are way more capable than most people realize, but also way more limited in specific weird ways. both things are true simultaneously.',
  },
  {
    username: 'naval',
    name: 'Naval Ravikant',
    text: 'Arm yourself with specific knowledge, accountability, and leverage. Specific knowledge: found by pursuing your genuine curiosity and passion rather than whatever is hot right now.',
  },
  {
    username: 'paulg',
    name: 'Paul Graham',
    text: 'The best startups are usually built by people who were trying to solve a problem they had themselves. Not people who were trying to build a startup.',
  },
];

async function generateScript(tweet: typeof TEST_TWEETS[0]): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Turn this tweet into an Instagram Reel script:\n\nTweet by @${tweet.username} (${tweet.name}):\n"""\n${tweet.text}\n"""\n\nWrite the full 30–60s Reel script now.`,
    }],
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in response');
  return block.text.trim();
}

function divider(label: string) {
  console.log('\n' + '─'.repeat(60));
  console.log(`  ${label}`);
  console.log('─'.repeat(60));
}

async function runTests() {
  console.log('\n🎬 X Reel Pipeline — Script Generation Test');
  console.log('Testing Claude API connection + script quality...\n');

  let passed = 0;
  let failed = 0;

  for (const tweet of TEST_TWEETS) {
    divider(`@${tweet.username}: "${tweet.text.slice(0, 50)}..."`);
    try {
      const t0 = Date.now();
      const script = await generateScript(tweet);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

      // Validate structure
      const hasHook  = /HOOK/i.test(script);
      const hasStory = /STORY/i.test(script);
      const hasCta   = /CTA/i.test(script);
      const wordCount = script.split(/\s+/).length;

      console.log(`\n${script}\n`);
      console.log(`✅ Generated in ${elapsed}s | ${wordCount} words`);
      console.log(`   Structure: HOOK=${hasHook} STORY=${hasStory} CTA=${hasCta}`);

      if (hasHook && hasStory && hasCta) {
        passed++;
      } else {
        console.log('⚠️  Missing sections!');
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }

    // Small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }

  divider('Test Results');
  console.log(`  ✅ Passed: ${passed}/${TEST_TWEETS.length}`);
  console.log(`  ❌ Failed: ${failed}/${TEST_TWEETS.length}`);
  console.log(`\n  Pipeline is ${passed === TEST_TWEETS.length ? '🟢 READY' : '🔴 NOT READY'}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);

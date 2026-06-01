/**
 * Review and (selectively) rewrite a word list against fixed quality rules,
 * using the Claude Agent SDK as the reviewer.
 *
 * Why this exists: the lists are ~1k+ entries — too big to hand-edit or to ask
 * the editor agent to rewrite in one shot. This script feeds the list to Claude
 * in small batches (100 by default), each batch judged against the RULES below,
 * and writes the approved result back to the JSON in place.
 *
 * Auth: runs through the Agent SDK, which reuses your existing Claude Code
 * login — no ANTHROPIC_API_KEY needed.
 *
 * Run (German list, default):
 *   npx vite-node scripts/review-words.ts
 *
 * Useful flags:
 *   --dry-run            don't write the file; print the proposed changes
 *   --limit=200          only process the first N entries (smoke test)
 *   --start=300          skip the first N entries (resume / spot-check)
 *   --batch=100          entries per Claude call (default 100)
 *   --model=claude-opus-4-8   default is claude-sonnet-4-6; Opus auto-enables thinking
 *   path/to/list.json    target file (default src/content/words.de.seed.json)
 *
 * Examples:
 *   npx vite-node scripts/review-words.ts --dry-run --limit=100
 *   npx vite-node scripts/review-words.ts --model=claude-opus-4-8
 *
 * The rules live in RULES below — edit that string to tune the editor's taste.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { query } from '@anthropic-ai/claude-agent-sdk'

type Difficulty = 'easy' | 'medium'

interface WordEntry {
  word: string
  hint: string
  difficulty: Difficulty
}

type Action = 'keep' | 'rewrite' | 'drop'

interface Decision {
  index: number
  action: Action
  word: string
  hint: string
  difficulty: Difficulty
  reason: string
}

// ---------------------------------------------------------------------------
// The rules. This is the whole point — tune freely; it's plain prose handed to
// the reviewer verbatim each batch. Calibrated with the user (German list).
// ---------------------------------------------------------------------------
const RULES = `
You are editing the word pool for a German "find the imposter" party game. Every
round, all honest players see a secret WORD plus a vague HINT; the lone imposter
sees only the HINT and must bluff. The pool must be fun, fair, and unambiguous.

You will receive a batch of entries: { word, hint, difficulty }. For EACH entry,
decide one action and return the final values:

- "keep"    — already good; return the original word/hint/difficulty unchanged.
- "rewrite" — fix it: return a better word and/or hint and/or difficulty.
- "drop"    — unsalvageable; nothing common fits. Only when rewrite can't save it.

== WORD RULES ==
The PRIMARY lens is CEFR difficulty. First estimate the word's CEFR level, then:

1. Map difficulty strictly to CEFR:
     - B2 and easier (A1–B2)  → "easy"
     - C1                     → "medium"
     - C2 and above — rare, literary, archaic, specialist/trade vocabulary →
       does NOT belong in the game. DROP it (unless rule 2 can reduce it to a
       common ≤C1 word).
   Re-tier freely between easy and medium; never invent a third tier.
   Examples:  Hund/Berg/Apfel/Drache/Fee/Badewanne → easy (≤B2);
              Vampir/Werwolf/Prophezeiung → medium (C1);
              Trank/Kobold/Mumie/Schraubstock/Meißel → drop (C2+/specialist).

2. Simplify by COMMONNESS, comparing the compound to its parts. For a compound,
   look at each part (head and modifier) as a standalone word and ask which is
   the most common everyday word:
   - If a PART is at least as common as the whole compound, reduce to that part —
     pick the common one, never the rare one:
        Briefumschlag → Brief,  Kerzenständer → Kerze,  Zaubertrank → Zauber,
        Hexenkessel → Hexe   (Hexe is common; "Kessel" is NOT — never → Kessel).
   - If NO part is as common as the compound, keep the compound — it's the word
     people actually say:
        Badewanne (stays — "Wanne" is rarer),  Bushaltestelle, Zahnbürste,
        Klassenzimmer, Hausaufgabe.
   - If the word is C2+/obscure and no part is common either, drop it
        (Schraubstock → Schraube if useful, else drop).
   Frequency wins, not morphology.

3. Use the most common STANDARD German term. Fix non-standard, regional, or
   less-common variants to the word people actually say:
        Klassenraum → Klassenzimmer.
   Never introduce a rarer synonym than the original.

4. No proper nouns, no brand names, no abbreviations, no multi-word phrases.
   Singular, lowercase-meaning common nouns (keep normal German capitalisation).
5. Keep it concrete and picturable — a thing you could point at or mime.

== HINT RULES ==
The hint should point to the WORD's domain or setting — one step up — broad
enough that many different words could fit, so the imposter can't pin it down.
  GOOD:  Brot → "Küche",  Hammer → "Heimwerken",  Vampir → "Fantasy",
         Quadrat → "Mathematik".
  TOO NARROW / gives it away:  Brot → "Backen",  Hammer → "Werkzeug",
     Quadrat → "Geometrie"  (the sub-field/category the word is the prototype of
     — basically names it; step up one level to the broader domain).
  TOO BROAD / useless:  Brot → "Objekt",  Hammer → "Ding".
Rules:
6. One or two words, a place/activity/domain — not the word's defining action and
   not its immediate category when the word is the obvious member of it.
7. The hint must NOT contain the word, share its stem, or be a synonym.
8. If the existing hint is fine, KEEP it. Broad is good, not a flaw — do not
   narrow a hint that already works. Only act on the two real failures: widen a
   give-away hint, and replace a uselessly-generic one ("Objekt", "Ding").
9. For fictional / imaginary things (creatures, magic, monsters) there is no real
   place, so the hint must stay broad and abstract: "Imaginär", "Fantasie",
   "Fiktion", "Erfunden", "Film". A plain "Fantasy" is perfectly fine — keep it.
   Do NOT pin them to a specific genre or medium: never "Märchen", "Gruselfilm",
   "Sage", "Mythologie" — those point too directly at the kind of word.

Return EXACTLY one decision per input entry, with the same "index" you were given.
Keep "reason" to a short phrase (German or English) so a human can scan it.
`.trim()

const DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decisions'],
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'action', 'word', 'hint', 'difficulty', 'reason'],
        properties: {
          index: { type: 'integer' },
          action: { type: 'string', enum: ['keep', 'rewrite', 'drop'] },
          word: { type: 'string' },
          hint: { type: 'string' },
          difficulty: { type: 'string', enum: ['easy', 'medium'] },
          reason: { type: 'string' },
        },
      },
    },
  },
}

interface Args {
  path: string
  batch: number
  start: number
  limit: number
  model: string
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    path: 'src/content/words.de.seed.json',
    batch: 100,
    start: 0,
    limit: Infinity,
    model: 'claude-sonnet-4-6',
    dryRun: false,
  }
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true
    else if (a.startsWith('--batch=')) args.batch = Number(a.slice(8))
    else if (a.startsWith('--start=')) args.start = Number(a.slice(8))
    else if (a.startsWith('--limit=')) args.limit = Number(a.slice(8))
    else if (a.startsWith('--model=')) args.model = a.slice(8)
    else if (!a.startsWith('--')) args.path = a
    else throw new Error(`Unknown flag: ${a}`)
  }
  return args
}

const MAX_ATTEMPTS = 3

/** One shot at Claude for a batch; returns the raw decisions array (any length). */
async function reviewOnce(prompt: string, model: string): Promise<Decision[]> {
  // Opus thinks adaptively; lighter models skip thinking to stay fast/cheap.
  const isOpus = /opus/i.test(model)

  const response = query({
    prompt,
    options: {
      model,
      allowedTools: [],
      // Structured-output enforcement can take an extra turn beyond the first
      // assistant reply, so give it a little headroom (no tools run anyway).
      maxTurns: 4,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      thinking: isOpus ? { type: 'adaptive' } : { type: 'disabled' },
      outputFormat: { type: 'json_schema', schema: DECISION_SCHEMA },
    },
  })

  for await (const message of response) {
    if (message.type !== 'result') continue
    if (message.subtype !== 'success') {
      throw new Error(`Claude review failed: ${message.subtype}`)
    }
    const out = (message.structured_output ?? JSON.parse(message.result)) as {
      decisions: Decision[]
    }
    if (!Array.isArray(out?.decisions)) throw new Error('no decisions array in result')
    return out.decisions
  }
  throw new Error('Claude returned no result message')
}

/**
 * Review one batch, retrying a few times on hard failures. The returned array
 * may not be exactly batch.length — the caller maps decisions by `index`, so an
 * off-by-one count (the model occasionally emits one extra/fewer) is tolerated.
 */
async function reviewBatch(batch: WordEntry[], model: string): Promise<Decision[]> {
  const numbered = batch.map((e, i) => ({ index: i, ...e }))
  const prompt = `${RULES}

Here is the batch (${batch.length} entries) as JSON:
${JSON.stringify(numbered, null, 2)}`

  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await reviewOnce(prompt, model)
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      process.stderr.write(
        `(attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}` +
          `${attempt < MAX_ATTEMPTS ? '; retrying' : ''}) `,
      )
    }
  }
  throw lastErr
}

function applyDecision(original: WordEntry, d: Decision): WordEntry | null {
  if (d.action === 'drop') return null
  if (d.action === 'keep') return original
  return { word: d.word.trim(), hint: d.hint.trim(), difficulty: d.difficulty }
}

/** Remove later entries whose word (trimmed, case-insensitive) repeats. */
function dedupe(entries: WordEntry[]): { kept: WordEntry[]; removed: number } {
  const seen = new Set<string>()
  const kept: WordEntry[] = []
  let removed = 0
  for (const e of entries) {
    const key = e.word.trim().toLowerCase()
    if (seen.has(key)) {
      removed++
      continue
    }
    seen.add(key)
    kept.push(e)
  }
  return { kept, removed }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const all = JSON.parse(readFileSync(args.path, 'utf-8')) as WordEntry[]

  const end = args.limit === Infinity ? all.length : Math.min(all.length, args.start + args.limit)
  const head = all.slice(0, args.start)
  const target = all.slice(args.start, end)
  const tail = all.slice(end)

  console.warn(
    `${args.path}: ${all.length} entries; reviewing ${target.length} ` +
      `[${args.start}..${end}) in batches of ${args.batch} with ${args.model}` +
      (args.dryRun ? ' (dry run)' : ''),
  )

  const reviewed: WordEntry[] = []
  let kept = 0
  let rewritten = 0
  let dropped = 0
  let missing = 0
  const changes: string[] = []

  for (let i = 0; i < target.length; i += args.batch) {
    const batch = target.slice(i, i + args.batch)
    const batchNo = Math.floor(i / args.batch) + 1
    const batchTotal = Math.ceil(target.length / args.batch)
    process.stderr.write(`  batch ${batchNo}/${batchTotal} (${batch.length})… `)

    const decisions = await reviewBatch(batch, args.model)

    // Map by index so an off-by-one count is harmless: first decision per valid
    // index wins, out-of-range indices are ignored, and any index the model
    // skipped falls back to keeping the original entry untouched.
    const byIndex = new Map<number, Decision>()
    for (const d of decisions) {
      if (d.index >= 0 && d.index < batch.length && !byIndex.has(d.index)) {
        byIndex.set(d.index, d)
      }
    }

    let bk = 0
    let br = 0
    let bd = 0
    let bm = 0
    for (let j = 0; j < batch.length; j++) {
      const original = batch[j]
      const d = byIndex.get(j)
      if (!d) {
        bm++
        bk++
        reviewed.push(original)
        continue
      }
      const result = applyDecision(original, d)
      if (result === null) {
        bd++
        changes.push(`  DROP    ${original.word} (${original.hint}) — ${d.reason}`)
        continue
      }
      const changedWord =
        result.word !== original.word ||
        result.hint !== original.hint ||
        result.difficulty !== original.difficulty
      if (d.action === 'rewrite' && changedWord) {
        br++
        changes.push(
          `  REWRITE ${original.word} (${original.hint}, ${original.difficulty}) → ` +
            `${result.word} (${result.hint}, ${result.difficulty}) — ${d.reason}`,
        )
      } else {
        bk++
      }
      reviewed.push(result)
    }
    kept += bk
    rewritten += br
    dropped += bd
    missing += bm
    console.warn(
      `kept ${bk}, rewrote ${br}, dropped ${bd}` + (bm ? `, ${bm} missing→kept` : ''),
    )

    // Checkpoint after every batch (un-deduped): the file always stays a
    // complete list, so a later crash can't discard the batches already done.
    if (!args.dryRun) {
      const remaining = target.slice(i + args.batch)
      writeFileSync(
        args.path,
        JSON.stringify([...head, ...reviewed, ...remaining, ...tail], null, 2) + '\n',
        'utf-8',
      )
    }
  }

  const merged = [...head, ...reviewed, ...tail]
  const { kept: deduped, removed } = dedupe(merged)

  console.warn(
    `\nReviewed ${target.length}: kept ${kept}, rewrote ${rewritten}, dropped ${dropped}` +
      (missing ? ` (${missing} skipped by model → kept)` : '') +
      `. Dedupe removed ${removed} (rewrites can collide). ` +
      `Final: ${all.length} → ${deduped.length} entries.`,
  )

  if (args.dryRun) {
    console.warn(`\n--- proposed changes (${changes.length}) ---`)
    for (const c of changes) console.warn(c)
    console.warn('\nDry run: no file written.')
    return
  }

  writeFileSync(args.path, JSON.stringify(deduped, null, 2) + '\n', 'utf-8')
  console.warn(`\nWrote ${args.path}.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

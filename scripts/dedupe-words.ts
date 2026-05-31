/**
 * Remove duplicate entries (by `word`) from the seed word lists, in place.
 *
 * Keeps the first occurrence of each word. Matching is case-insensitive and
 * whitespace-trimmed, so "Apfel" and "apfel " collapse to one entry. Original
 * ordering is otherwise preserved.
 *
 * Run with:  npx vite-node scripts/dedupe-words.ts
 * Optionally pass explicit paths: npx vite-node scripts/dedupe-words.ts a.json b.json
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface WordEntry {
  word: string
  hint: string
  difficulty: string
}

function dedupe(path: string): void {
  const entries = JSON.parse(readFileSync(path, 'utf-8')) as WordEntry[]

  const seen = new Set<string>()
  const unique: WordEntry[] = []
  let duplicates = 0

  for (const entry of entries) {
    const key = entry.word.trim().toLowerCase()
    if (seen.has(key)) {
      duplicates++
      continue
    }
    seen.add(key)
    unique.push(entry)
  }

  writeFileSync(path, JSON.stringify(unique, null, 2) + '\n', 'utf-8')
  console.warn(
    `${path}: ${entries.length} -> ${unique.length} entries (${duplicates} duplicates removed)`,
  )
}

const paths =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ['src/content/words.de.seed.json', 'src/content/words.en.seed.json']

for (const p of paths) dedupe(p)

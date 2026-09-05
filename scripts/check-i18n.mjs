#!/usr/bin/env node
/**
 * check:i18n — static consistency guard for the multilingual rollout.
 * No dependencies, no build needed. Run: `npm run check:i18n`
 *
 * Errors (exit 1):
 *  - a `<slug>.<locale>.md` sibling with no base `<slug>.md` (orphan)
 *  - a blogMeta row for a slug with no base post (dead row)
 *  - `/blog` missing from LOCALIZED_ROUTES (index cluster anchor)
 * Warnings (exit 0):
 *  - a base post with no blogMeta row in some locale (EN-data fallback
 *    renders instead of transcreated meta — works, but translate it)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl'];
const errors = [];
const warnings = [];

// --- 1. content inventory -------------------------------------------------
const files = readdirSync(join(ROOT, 'src/content/blog')).filter((f) => f.endsWith('.md'));
const base = new Set();
const siblings = [];
for (const f of files) {
  const m = f.match(/^(.+)\.([a-z]{2})\.md$/);
  if (m && LOCALES.includes(m[2]) && f !== `${m[1]}.md`) {
    siblings.push({ slug: m[1], locale: m[2], file: f });
  } else if (f.endsWith('.md')) {
    base.add(f.slice(0, -3));
  }
}
for (const s of siblings) {
  if (!base.has(s.slug)) errors.push(`orphan sibling ${s.file} (no base ${s.slug}.md)`);
}

// --- 2. blogMeta rows ------------------------------------------------------
const metaSrc = readFileSync(join(ROOT, 'src/i18n/blogMeta.ts'), 'utf8');
const rows = {}; // locale -> Set(slug)
let current = null;
for (const line of metaSrc.split('\n')) {
  const loc = line.match(/^  ([a-z]{2}): \{$/);
  if (loc && LOCALES.includes(loc[1])) {
    current = loc[1];
    rows[current] = new Set();
    continue;
  }
  const row = line.match(/^    '([a-z0-9-]+)': \{$/);
  if (row && current) rows[current].add(row[1]);
}
for (const loc of LOCALES) {
  if (!rows[loc]) {
    errors.push(`blogMeta: locale block '${loc}' not found`);
    continue;
  }
  for (const slug of base) {
    if (!rows[loc].has(slug)) warnings.push(`blogMeta[${loc}] missing row for '${slug}' (fallback meta renders)`);
  }
  for (const slug of rows[loc]) {
    if (!base.has(slug)) errors.push(`blogMeta[${loc}] dead row for unknown slug '${slug}'`);
  }
}

// --- 3. LOCALIZED_ROUTES anchor ---------------------------------------------
const siteSrc = readFileSync(join(ROOT, 'src/config/site.ts'), 'utf8');
if (!siteSrc.includes("'/blog',") && !siteSrc.includes('"/blog",')) {
  errors.push(`LOCALIZED_ROUTES missing '/blog' index anchor`);
}
if (!siteSrc.includes('hasFullHreflangCluster')) {
  errors.push(`site.ts missing hasFullHreflangCluster() prefix rule`);
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(
  `check:i18n: ${base.size} base posts, ${siblings.length} siblings, ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length > 0 ? 1 : 0);

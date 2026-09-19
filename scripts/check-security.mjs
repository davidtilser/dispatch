// GetItDone — security audit script
// Fails (exit 1) when unsafe patterns are detected in source files or build output.
// Run: node scripts/check-security.mjs

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

let failures = 0;

function fail(msg) {
  console.error(`[SECURITY FAIL] ${msg}`);
  failures++;
}

function info(msg) {
  console.log(`[check:security] ${msg}`);
}

// ── Collect all relevant source/config files ─────────────────────────────────
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json']);
const SOURCE_DIRS = ['client', 'server', 'shared'];

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // Never walk node_modules, dist, or coverage
    if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (SOURCE_EXTENSIONS.has(extname(entry)) || entry.endsWith('.example')) {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = SOURCE_DIRS.flatMap(d => walk(join(ROOT, d)));

info(`Scanning ${sourceFiles.length} source/config files…`);

// Strip both // line comments and /* */ block comments before pattern matching.
// This prevents comments documenting the security rules from triggering false positives.
function stripComments(content) {
  // Remove /* ... */ block comments (including JSDoc /** ... */)
  let stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // line comments
  stripped = stripped
    .split('\n')
    .map(line => {
      const commentIdx = line.indexOf('//');
      return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    })
    .join('\n');
  return stripped;
}


// ── Rule 1: No 0.0.0.0 in actual code (not comments) ─────────────────────────
// ── Rule 2: No host: true or --host in actual code ───────────────────────────
const BANNED_PATTERNS = [
  // Only match assignment contexts, not comments
  { pattern: /(?:host|HOST|listen|bind)[^\n'"]*0\.0\.0\.0/i, label: 'binding to 0.0.0.0' },
  { pattern: /host\s*:\s*true/, label: 'host: true' },
  // --host as a CLI flag value (not a comment explaining it's banned)
  { pattern: /"[^"]*--host[^"]*"/, label: '--host in script string' },
];

for (const file of sourceFiles) {
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const stripped = stripComments(content);
  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(stripped)) {
      fail(`Found "${label}" in ${rel}`);
    }
  }
}

// ── Rule 3: No VITE_ env vars whose name contains KEY, SECRET, or TOKEN ──────
const envExamplePath = join(ROOT, 'server', '.env.example');
if (existsSync(envExamplePath)) {
  const envContent = readFileSync(envExamplePath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.trimStart().startsWith('#')) continue; // skip comments
    const match = line.match(/^(VITE_[A-Z0-9_]+)/);
    if (match) {
      const name = match[1];
      if (/(KEY|SECRET|TOKEN)/.test(name)) {
        fail(`Found sensitive VITE_ var "${name}" in server/.env.example — secrets must never be VITE_-prefixed`);
      }
    }
  }
}

// Also scan all TS/JS source for VITE_*KEY/SECRET/TOKEN string patterns
for (const file of sourceFiles) {
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const stripped = stripComments(content);
  const matches = stripped.match(/VITE_[A-Z0-9_]*(KEY|SECRET|TOKEN)[A-Z0-9_]*/g);
  if (matches) {
    for (const m of matches) {
      fail(`Found sensitive VITE_ var reference "${m}" in ${rel}`);
    }
  }
}

// ── Rule 4: After build, check client/dist for leaked API keys ───────────────
const clientDist = join(ROOT, 'client', 'dist');
if (existsSync(clientDist)) {
  info('Checking client/dist for leaked secrets…');

  function walkAll(dir, files = []) {
    if (!existsSync(dir)) return files;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walkAll(full, files);
      } else {
        files.push(full);
      }
    }
    return files;
  }

  const distFiles = walkAll(clientDist);
  for (const file of distFiles) {
    const rel = file.replace(ROOT, '').replace(/\\/g, '/');
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (content.includes('xi-api-key')) {
      fail(`Found "xi-api-key" in built client bundle ${rel} — secret leaked to frontend!`);
    }
  }
} else {
  info('client/dist does not exist yet — skipping post-build bundle check (run npm run build first).');
}

// ── Result ────────────────────────────────────────────────────────────────────
if (failures === 0) {
  console.log(`\n✓ check:security passed — no violations found.\n`);
  process.exit(0);
} else {
  console.error(`\n✗ check:security failed — ${failures} violation(s) found.\n`);
  process.exit(1);
}

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
const tag = (process.env.CHANGELOG_TAG || '').trim();
const body = (process.env.CHANGELOG_BODY || '').trim();
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date());

if (!tag) {
  throw new Error('CHANGELOG_TAG is required.');
}

const current = await readFile(changelogPath, 'utf8');
const entryHeader = `## ${tag} - ${date}`;

if (current.includes(entryHeader)) {
  console.log(`Changelog entry already exists for ${tag}.`);
  process.exit(0);
}

const entryBody = body || 'Sin notas.';
const changelogHeader = /^# Changelog\r?\n\r?\n/;

if (!changelogHeader.test(current)) {
  throw new Error('CHANGELOG.md does not start with the expected header.');
}

const updated = current.replace(
  changelogHeader,
  `# Changelog\n\n${entryHeader}\n\n${entryBody}\n\n`,
);

await writeFile(changelogPath, updated, 'utf8');
console.log(`Changelog updated for ${tag}.`);

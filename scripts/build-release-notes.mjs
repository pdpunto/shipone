import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

function extractUnreleasedSection(changelog) {
  const match = changelog.match(/## Unreleased\s*\n([\s\S]*?)(?=\n## |\s*$)/);

  if (!match) {
    return 'No release notes were found.';
  }

  const content = match[1].trim();
  return content || 'No release notes were found.';
}

async function main() {
  const changelog = await readFile(changelogPath, 'utf8');
  const notes = extractUnreleasedSection(changelog);

  if (process.argv[2] === '--write') {
    const outputPath = path.resolve(process.cwd(), process.argv[3] || 'release-notes.md');
    await writeFile(outputPath, `${notes}\n`, 'utf8');
    return;
  }

  console.log(notes);
}

await main();

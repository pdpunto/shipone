import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(changelog, heading) {
  const lines = changelog.split(/\r?\n/);
  const headingPattern = new RegExp(`^## ${escapeRegExp(heading)}(?:\\s*-.*)?$`);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex === -1) {
    return 'No release notes were found.';
  }

  const contentLines = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().startsWith('## ')) {
      break;
    }

    contentLines.push(line);
  }

  const content = contentLines.join('\n').trim();
  return content || 'No release notes were found.';
}

function parseArgs(argv) {
  const args = { section: 'Unreleased', write: false, outputPath: 'release-notes.md' };

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === '--section') {
      args.section = (argv[index + 1] || 'Unreleased').trim();
      index += 1;
      continue;
    }

    if (current === '--write') {
      args.write = true;
      args.outputPath = (argv[index + 1] || 'release-notes.md').trim();
      index += 1;
    }
  }

  return args;
}

async function main() {
  const changelog = await readFile(changelogPath, 'utf8');
  const { section, write, outputPath } = parseArgs(process.argv);
  const notes = extractSection(changelog, section);

  if (write) {
    await writeFile(path.resolve(process.cwd(), outputPath), `${notes}\n`, 'utf8');
    return;
  }

  console.log(notes);
}

await main();

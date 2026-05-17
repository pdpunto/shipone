import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

async function readJson(relativePath) {
  const content = await readFile(path.resolve(root, relativePath), 'utf8');
  return JSON.parse(content);
}

async function main() {
  const packageJson = await readJson('package.json');
  const vscodeIgnore = await readFile(path.resolve(root, '.vscodeignore'), 'utf8');

  const requiredFields = ['icon', 'galleryBanner', 'keywords', 'categories', 'repository', 'homepage', 'bugs', 'license', 'publisher'];

  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`package.json is missing required field: ${field}`);
    }
  }

  if (!Array.isArray(packageJson.keywords) || packageJson.keywords.length === 0) {
    throw new Error('package.json must include keywords.');
  }

  if (!Array.isArray(packageJson.categories) || packageJson.categories.length === 0) {
    throw new Error('package.json must include categories.');
  }

  for (const requiredEntry of ['src/**', 'test/**', 'docs/**', '!media/**']) {
    if (!vscodeIgnore.includes(requiredEntry)) {
      throw new Error(`.vscodeignore is missing required entry: ${requiredEntry}`);
    }
  }

  if (packageJson.main !== './out/extension.js') {
    throw new Error('package.json main entry must point to out/extension.js.');
  }

  console.log('Package validation passed.');
}

await main();

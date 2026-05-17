import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const semverPattern =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+([0-9A-Za-z-.]+))?$/;

function parseVersion(version) {
  const match = semverPattern.exec(version);

  if (!match) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || '',
    build: match[5] || '',
  };
}

function formatVersion(version) {
  const prerelease = version.prerelease ? `-${version.prerelease}` : '';
  const build = version.build ? `+${version.build}` : '';

  return `${version.major}.${version.minor}.${version.patch}${prerelease}${build}`;
}

function bumpVersion(version, level) {
  const next = { ...version, prerelease: '', build: '' };

  if (level === 'major') {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
    return next;
  }

  if (level === 'minor') {
    next.minor += 1;
    next.patch = 0;
    return next;
  }

  next.patch += 1;
  return next;
}

async function readPackageVersion() {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  return packageJson.version;
}

async function writePackageVersion(version) {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  packageJson.version = version;
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

async function main() {
  const command = (process.argv[2] || 'current').trim();
  const version = parseVersion(await readPackageVersion());

  if (command === 'current') {
    console.log(formatVersion(version));
    return;
  }

  if (command === 'tag') {
    console.log(`v${formatVersion(version)}`);
    return;
  }

  if (command === 'validate-tag') {
    const tag = (process.argv[3] || process.env.RELEASE_TAG || '').trim();

    if (!tag) {
      throw new Error('Release tag is required.');
    }

    const expectedTag = `v${formatVersion(version)}`;

    if (tag !== expectedTag) {
      throw new Error(`Tag ${tag} does not match package version ${expectedTag}.`);
    }

    console.log(expectedTag);
    return;
  }

  if (command === 'bump') {
    const level = (process.argv[3] || 'patch').trim();

    if (!['major', 'minor', 'patch'].includes(level)) {
      throw new Error(`Invalid bump level: ${level}`);
    }

    const nextVersion = formatVersion(bumpVersion(version, level));
    await writePackageVersion(nextVersion);
    console.log(nextVersion);
    return;
  }

  if (command === 'create-tag') {
    const expectedTag = `v${formatVersion(version)}`;

    try {
      execFileSync('git', ['tag', '-a', expectedTag, '-m', `Release ${expectedTag}`], {
        stdio: 'pipe',
      });
    } catch (error) {
      throw new Error(`Unable to create tag ${expectedTag}.`);
    }

    console.log(expectedTag);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

await main();

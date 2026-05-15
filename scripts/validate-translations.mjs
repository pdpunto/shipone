import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..");

const basePath = path.join(root, "package.nls.json");
const esPath = path.join(root, "package.nls.es.json");

const base = readJson(basePath);
const es = readJson(esPath);

const missingKeys = Object.keys(base).filter((key) => !(key in es));
const extraKeys = Object.keys(es).filter((key) => !(key in base));

if (missingKeys.length > 0 || extraKeys.length > 0) {
  console.error("Translation validation failed.");

  if (missingKeys.length > 0) {
    console.error(`Missing keys in package.nls.es.json: ${missingKeys.join(", ")}`);
  }

  if (extraKeys.length > 0) {
    console.error(`Extra keys in package.nls.es.json: ${extraKeys.join(", ")}`);
  }

  process.exitCode = 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

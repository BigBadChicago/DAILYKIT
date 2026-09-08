import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(root, "src");

const layerByDirectory: Record<string, number> = {
  core: 0,
  engine: 1,
  ui: 2,
  contract: 3,
  games: 4,
  shell: 5,
  hub: 5,
};

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (extname(entry.name) === ".ts") {
      files.push(path);
    }
  }

  return files;
}

function sourceLayer(path: string): number | null {
  const relativePath = relative(sourceRoot, path).replaceAll("\\", "/");
  const [directory] = relativePath.split("/");
  return directory ? (layerByDirectory[directory] ?? null) : null;
}

function gameName(path: string): string | null {
  const relativePath = relative(sourceRoot, path).replaceAll("\\", "/");
  const parts = relativePath.split("/");
  return parts[0] === "games" ? (parts[1] ?? null) : null;
}

function resolveImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;

  const base = resolve(dirname(importer), specifier.replace(/\.js$/, ".ts"));
  return base.endsWith(".ts") ? base : `${base}.ts`;
}

const importPattern = /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
const violations: string[] = [];

for (const file of await sourceFiles(sourceRoot)) {
  const fileText = await readFile(file, "utf8");
  const importerLayer = sourceLayer(file);
  const importerGame = gameName(file);

  if (importerLayer === null) continue;

  for (const match of fileText.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier) continue;
    const target = resolveImport(file, specifier);
    if (!target || !target.startsWith(sourceRoot)) continue;

    const targetLayer = sourceLayer(target);
    const targetGame = gameName(target);
    if (targetLayer !== null && targetLayer > importerLayer) {
      violations.push(`${relative(root, file)} imports higher layer ${relative(root, target)}`);
    }
    if (importerGame && targetGame && importerGame !== targetGame) {
      violations.push(`${relative(root, file)} imports another game ${relative(root, target)}`);
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("dependency layers verified");
}

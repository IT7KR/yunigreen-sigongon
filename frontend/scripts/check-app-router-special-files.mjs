import { readdirSync } from "node:fs";
import { join } from "node:path";

const appDir = new URL("../app/", import.meta.url);
const specialFileNames = new Set([
  "default",
  "error",
  "global-error",
  "layout",
  "loading",
  "not-found",
  "page",
  "route",
  "template",
]);
const supportedExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(directoryPath) {
  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const matchesByBaseName = new Map();

  for (const entry of entries) {
    if (entry.isDirectory()) {
      walk(join(directoryPath, entry.name));
      continue;
    }

    const extension = supportedExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")))
      ? entry.name.slice(entry.name.lastIndexOf("."))
      : null;

    if (!extension) {
      continue;
    }

    const baseName = entry.name.slice(0, -extension.length);
    if (!specialFileNames.has(baseName)) {
      continue;
    }

    const existing = matchesByBaseName.get(baseName) ?? [];
    existing.push(entry.name);
    matchesByBaseName.set(baseName, existing);
  }

  const duplicates = [...matchesByBaseName.entries()].filter(([, files]) => files.length > 1);
  if (duplicates.length === 0) {
    return;
  }

  const detailLines = duplicates.map(
    ([baseName, files]) => `  - ${join(directoryPath, baseName)}: ${files.join(", ")}`,
  );

  throw new Error(
    [
      "Duplicate Next.js App Router special files detected.",
      "Keep only one supported extension per special file in the same route segment.",
      ...detailLines,
    ].join("\n"),
  );
}

walk(appDir.pathname);

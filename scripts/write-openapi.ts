import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { openApiDocument } from "../src/openapi";

async function main() {
  const outputPath = path.resolve(process.cwd(), "docs", "openapi.json");

  await mkdir(path.dirname(outputPath), {
    recursive: true
  });
  await writeFile(outputPath, `${JSON.stringify(openApiDocument, null, 2)}\n`);

  process.stdout.write(`Wrote ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});

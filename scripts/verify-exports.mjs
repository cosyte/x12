// ESM-side resolution smoke. Imports the built ESM artifact via the package name
// through Node's self-referencing rule (Node 14+: a package may import itself by
// name when "name" and "exports" are set in its package.json). If this script
// exits 0, the "import" condition and the "module" entry are correctly wired.
import { VERSION } from "@cosyte/x12";
if (typeof VERSION !== "string") {
  console.error(`ESM resolution failed: VERSION is ${typeof VERSION}`);
  process.exit(1);
}
console.log(`ESM OK: VERSION=${VERSION}`);

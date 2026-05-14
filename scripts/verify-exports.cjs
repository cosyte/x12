// CJS-side resolution smoke. Requires the built CJS artifact via the package
// name using Node's self-referencing rule. If this script exits 0, the
// "require" condition and the "main" entry are correctly wired.
const { VERSION } = require("@cosyte/x12");
if (typeof VERSION !== "string") {
  console.error(`CJS resolution failed: VERSION is ${typeof VERSION}`);
  process.exit(1);
}
console.log(`CJS OK: VERSION=${VERSION}`);

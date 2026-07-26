import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Build once, before any test file is collected.
//
// test/dist-contract.spec.ts imports the built artifacts directly, and Vite resolves
// those imports at collection time, which happens before any per-file beforeAll. So
// building inside a spec is too late on a clean tree: the imports fail to resolve and
// the assertions never run.
export default function setup(): void {
  execSync("node scripts/build.mjs", { cwd: fileURLToPath(new URL("..", import.meta.url)), stdio: "inherit" });
}

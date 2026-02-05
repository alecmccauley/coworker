import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
const distDir = path.join(rootDir, "coworker-app/dist");

const resolveArch = (): "arm64" | "x64" => {
  const raw = process.argv.find((arg) => arg === "arm64" || arg === "x64");
  if (raw === "arm64" || raw === "x64") return raw;
  throw new Error(
    "Missing arch argument. Use: pnpm dist:rename-latest-mac-yml -- arm64|x64",
  );
};

const main = (): void => {
  const arch = resolveArch();
  const source = path.join(distDir, "latest-mac.yml");
  if (!existsSync(source)) {
    throw new Error(`Missing ${source}`);
  }

  const target = path.join(distDir, `latest-mac-${arch}.yml`);
  renameSync(source, target);
  console.log(`Renamed latest-mac.yml -> latest-mac-${arch}.yml`);
};

main();

import { list } from "@vercel/blob";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

type ListBlob = {
  pathname?: string;
  path?: string;
  key?: string;
  url: string;
};

type ListResult = {
  blobs: ListBlob[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(rootDir, ".env.distribution") });

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("Missing BLOB_READ_WRITE_TOKEN in .env.distribution");
}

const envPath = path.join(rootDir, "coworker-app/.env.production");
if (!existsSync(envPath)) {
  throw new Error(`Missing ${envPath}`);
}

const getBlobBaseUrl = async (): Promise<string> => {
  const result = (await list({ limit: 1 })) as ListResult;
  const blob = result.blobs[0];
  if (!blob) {
    throw new Error(
      "No blobs found. Upload at least one file to Blob before setting COWORKER_UPDATES_URL.",
    );
  }
  return new URL(blob.url).origin;
};

const setEnvValue = (contents: string, key: string, value: string): string => {
  const lines = contents.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => line.startsWith(`${key}=`));
  const nextLine = `${key}=${value}`;

  if (lineIndex >= 0) {
    lines[lineIndex] = nextLine;
  } else {
    if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
      lines.push("");
    }
    lines.push(nextLine);
  }

  return lines.join("\n");
};

const main = async (): Promise<void> => {
  const baseUrl = await getBlobBaseUrl();
  const updatesUrl = `${baseUrl}/updates/macos/stable`;

  const envRaw = readFileSync(envPath, "utf-8");
  const updated = setEnvValue(envRaw, "COWORKER_UPDATES_URL", updatesUrl);
  writeFileSync(envPath, updated, "utf-8");

  console.log(`Set COWORKER_UPDATES_URL=${updatesUrl}`);
};

await main();

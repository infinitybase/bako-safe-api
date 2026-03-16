import fs from "fs";
import path from "path";
import { VaultConfigFile } from "@/queues/generateTestTx/types";
import { QUEUE_TRANSACTION } from "@/queues/generateTestTx/constants";

const CONFIGS_DIR = path.resolve(__dirname, "../config");

export function loadVaultConfig(): VaultConfigFile {
  if (!fs.existsSync(CONFIGS_DIR)) {
    throw new Error(
      `[${QUEUE_TRANSACTION}] configs/ directory not found at: ${CONFIGS_DIR}`
    );
  }

  const files = fs.readdirSync(CONFIGS_DIR).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    throw new Error(
      `[${QUEUE_TRANSACTION}] No JSON files found in: ${CONFIGS_DIR}`
    );
  }

  const selected = files[Math.floor(Math.random() * files.length)];
  const fullPath = path.join(CONFIGS_DIR, selected);

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  } catch {
    throw new Error(
      `[${QUEUE_TRANSACTION}] Failed to parse ${selected} — invalid JSON.`
    );
  }

  console.log(`[${QUEUE_TRANSACTION}] Selected vault config: ${selected}`);
  return raw as VaultConfigFile;
}

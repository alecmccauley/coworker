import { safeStorage, app } from "electron";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from "fs";
import { join } from "path";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

interface EncryptedTokens {
  accessToken: string; // Base64 encoded encrypted buffer
  refreshToken: string; // Base64 encoded encrypted buffer
}

/**
 * Get the path to the tokens file
 */
function getTokensPath(): string {
  const secureDir = join(app.getPath("userData"), "secure");
  if (!existsSync(secureDir)) {
    mkdirSync(secureDir, { recursive: true });
  }
  return join(secureDir, "auth-tokens.json");
}

/**
 * Check if secure storage is available
 * On Linux without a secret store, encryption may not be available
 */
export function isSecureStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

/**
 * Get the selected storage backend (Linux only)
 * Returns 'basic_text' if encryption is NOT secure
 */
export function getStorageBackend(): string {
  if (process.platform === "linux") {
    return safeStorage.getSelectedStorageBackend();
  }
  return "system"; // macOS/Windows use system keychain
}

/**
 * Save tokens securely using OS-level encryption
 */
export function saveTokens(accessToken: string, refreshToken: string): boolean {
  if (!isSecureStorageAvailable()) {
    console.warn("[AUTH] Secure storage unavailable. Tokens will not persist.");
    return false;
  }

  try {
    const encryptedAccess = safeStorage.encryptString(accessToken);
    const encryptedRefresh = safeStorage.encryptString(refreshToken);

    const data: EncryptedTokens = {
      accessToken: encryptedAccess.toString("base64"),
      refreshToken: encryptedRefresh.toString("base64"),
    };

    writeFileSync(getTokensPath(), JSON.stringify(data), "utf-8");
    return true;
  } catch (error) {
    console.error("[AUTH] Failed to save tokens:", error);
    return false;
  }
}

/**
 * Get tokens from secure storage
 * Returns null if tokens don't exist or can't be decrypted
 */
export function getTokens(): StoredTokens | null {
  if (!isSecureStorageAvailable()) {
    return null;
  }

  try {
    const tokensPath = getTokensPath();
    if (!existsSync(tokensPath)) {
      return null;
    }

    const data = JSON.parse(
      readFileSync(tokensPath, "utf-8"),
    ) as EncryptedTokens;

    const accessBuffer = Buffer.from(data.accessToken, "base64");
    const refreshBuffer = Buffer.from(data.refreshToken, "base64");

    const accessToken = safeStorage.decryptString(accessBuffer);
    const refreshToken = safeStorage.decryptString(refreshBuffer);

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("[AUTH] Failed to get tokens:", error);
    // Clear corrupted tokens
    clearTokens();
    return null;
  }
}

/**
 * Clear all stored tokens
 */
export function clearTokens(): void {
  try {
    const tokensPath = getTokensPath();
    if (existsSync(tokensPath)) {
      unlinkSync(tokensPath);
    }
  } catch (error) {
    console.error("[AUTH] Failed to clear tokens:", error);
  }
}

/**
 * Auth storage API for use in main process
 */
export const authStorage = {
  isAvailable: isSecureStorageAvailable,
  getBackend: getStorageBackend,
  saveTokens,
  getTokens,
  clearTokens,
};

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type UpdatePreferences = {
  autoDownload: boolean;
};

const DEFAULT_PREFERENCES: UpdatePreferences = {
  autoDownload: true,
};

const getPreferencesPath = (): string =>
  join(app.getPath("userData"), "update-preferences.json");

export function loadUpdatePreferences(): UpdatePreferences {
  try {
    const prefsPath = getPreferencesPath();
    if (!existsSync(prefsPath)) {
      return { ...DEFAULT_PREFERENCES };
    }
    const raw = readFileSync(prefsPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<UpdatePreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch (error) {
    console.error("[Updates] Failed to load preferences:", error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveUpdatePreferences(preferences: UpdatePreferences): void {
  try {
    const prefsPath = getPreferencesPath();
    const dir = dirname(prefsPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(prefsPath, JSON.stringify(preferences, null, 2), "utf-8");
  } catch (error) {
    console.error("[Updates] Failed to save preferences:", error);
  }
}

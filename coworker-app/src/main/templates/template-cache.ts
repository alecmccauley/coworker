import { app } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import type {
  CoworkerTemplatePublic,
  TemplateVersionInfo,
} from "@coworker/shared-services";

/**
 * Cache file structure
 */
interface TemplateCacheData {
  templates: CoworkerTemplatePublic[];
  versionInfo: TemplateVersionInfo;
  cachedAt: string; // ISO timestamp
}

/**
 * Get the path to the templates cache file
 */
function getCachePath(): string {
  const userDataPath = app.getPath("userData");
  const cacheDir = join(userDataPath, "cache");

  // Ensure cache directory exists
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  return join(cacheDir, "templates.json");
}

/**
 * Read cached templates from disk
 */
export function readTemplateCache(): TemplateCacheData | null {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const data = readFileSync(cachePath, "utf-8");
    return JSON.parse(data) as TemplateCacheData;
  } catch (error) {
    console.error("[TemplateCache] Failed to read cache:", error);
    return null;
  }
}

/**
 * Write templates to cache
 */
export function writeTemplateCache(
  templates: CoworkerTemplatePublic[],
  versionInfo: TemplateVersionInfo,
): void {
  const cachePath = getCachePath();

  const cacheData: TemplateCacheData = {
    templates,
    versionInfo,
    cachedAt: new Date().toISOString(),
  };

  try {
    writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), "utf-8");
    console.log(
      "[TemplateCache] Cache updated with",
      templates.length,
      "templates",
    );
  } catch (error) {
    console.error("[TemplateCache] Failed to write cache:", error);
  }
}

/**
 * Get cached templates (returns empty array if no cache)
 */
export function getCachedTemplates(): CoworkerTemplatePublic[] {
  const cache = readTemplateCache();
  return cache?.templates ?? [];
}

/**
 * Get cached version info (returns null if no cache)
 */
export function getCachedVersionInfo(): TemplateVersionInfo | null {
  const cache = readTemplateCache();
  return cache?.versionInfo ?? null;
}

/**
 * Check if cache is stale (older than maxAge hours)
 */
export function isCacheStale(maxAgeHours: number = 24): boolean {
  const cache = readTemplateCache();

  if (!cache) {
    return true;
  }

  const cachedAt = new Date(cache.cachedAt);
  const now = new Date();
  const ageHours = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

  return ageHours > maxAgeHours;
}

/**
 * Clear the template cache
 */
export function clearTemplateCache(): void {
  const cachePath = getCachePath();

  if (existsSync(cachePath)) {
    try {
      writeFileSync(
        cachePath,
        JSON.stringify({ templates: [], versionInfo: null, cachedAt: null }),
        "utf-8",
      );
      console.log("[TemplateCache] Cache cleared");
    } catch (error) {
      console.error("[TemplateCache] Failed to clear cache:", error);
    }
  }
}

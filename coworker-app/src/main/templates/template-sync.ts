import type {
  CoworkerSdk,
  CoworkerTemplatePublic,
  TemplateVersionInfo,
} from "@coworker/shared-services";
import {
  writeTemplateCache,
  getCachedTemplates,
  getCachedVersionInfo,
  isCacheStale,
} from "./template-cache";

/**
 * Sync result
 */
export interface TemplateSyncResult {
  success: boolean;
  templates: CoworkerTemplatePublic[];
  versionInfo: TemplateVersionInfo | null;
  fromCache: boolean;
  error?: string;
}

/**
 * Sync templates from the cloud API
 * Uses cache as fallback if network fails
 */
export async function syncTemplates(
  sdk: CoworkerSdk,
): Promise<TemplateSyncResult> {
  try {
    // Fetch fresh templates from API
    const [templates, versionInfo] = await Promise.all([
      sdk.templates.list(),
      sdk.templates.checkVersion(),
    ]);

    // Update cache
    writeTemplateCache(templates, versionInfo);

    console.log(
      "[TemplateSync] Synced",
      templates.length,
      "templates from cloud",
    );

    return {
      success: true,
      templates,
      versionInfo,
      fromCache: false,
    };
  } catch (error) {
    console.warn(
      "[TemplateSync] Failed to sync from cloud, using cache:",
      error,
    );

    // Fall back to cache
    const cachedTemplates = getCachedTemplates();
    const cachedVersionInfo = getCachedVersionInfo();

    return {
      success: false,
      templates: cachedTemplates,
      versionInfo: cachedVersionInfo,
      fromCache: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync templates only if cache is stale or empty
 */
export async function syncTemplatesIfNeeded(
  sdk: CoworkerSdk,
  maxAgeHours: number = 24,
): Promise<TemplateSyncResult> {
  if (!isCacheStale(maxAgeHours)) {
    const cachedTemplates = getCachedTemplates();
    const cachedVersionInfo = getCachedVersionInfo();

    console.log(
      "[TemplateSync] Cache is fresh, using",
      cachedTemplates.length,
      "cached templates",
    );

    return {
      success: true,
      templates: cachedTemplates,
      versionInfo: cachedVersionInfo,
      fromCache: true,
    };
  }

  return syncTemplates(sdk);
}

/**
 * Check if templates need update (compare version with cloud)
 */
export async function checkForTemplateUpdates(
  sdk: CoworkerSdk,
): Promise<boolean> {
  const cachedVersionInfo = getCachedVersionInfo();

  if (!cachedVersionInfo) {
    return true; // No cache, need to sync
  }

  try {
    const cloudVersionInfo = await sdk.templates.checkVersion();

    // Check if cloud has newer templates
    const cloudUpdated = new Date(cloudVersionInfo.lastUpdated);
    const cachedUpdated = new Date(cachedVersionInfo.lastUpdated);

    return (
      cloudUpdated > cachedUpdated ||
      cloudVersionInfo.templateCount !== cachedVersionInfo.templateCount
    );
  } catch {
    // Network error, assume no updates
    return false;
  }
}

/**
 * Get templates (from cache, syncing if needed)
 */
export async function getTemplates(
  sdk: CoworkerSdk,
): Promise<CoworkerTemplatePublic[]> {
  const result = await syncTemplatesIfNeeded(sdk);
  return result.templates;
}

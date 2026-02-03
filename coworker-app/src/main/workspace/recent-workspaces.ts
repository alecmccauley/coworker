import { app } from "electron";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/**
 * Recent workspace entry
 */
export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string; // ISO timestamp
}

const MAX_RECENT_WORKSPACES = 10;

/**
 * Get the path to the recent workspaces file
 */
function getRecentWorkspacesPath(): string {
  return join(app.getPath("userData"), "recent-workspaces.json");
}

/**
 * Load recent workspaces from disk
 */
export function loadRecentWorkspaces(): RecentWorkspace[] {
  try {
    const filePath = getRecentWorkspacesPath();
    if (!existsSync(filePath)) {
      return [];
    }
    const data = readFileSync(filePath, "utf-8");
    return JSON.parse(data) as RecentWorkspace[];
  } catch (error) {
    console.error("[RecentWorkspaces] Failed to load:", error);
    return [];
  }
}

/**
 * Save recent workspaces to disk
 */
function saveRecentWorkspaces(workspaces: RecentWorkspace[]): void {
  try {
    const filePath = getRecentWorkspacesPath();
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(filePath, JSON.stringify(workspaces, null, 2), "utf-8");
  } catch (error) {
    console.error("[RecentWorkspaces] Failed to save:", error);
  }
}

/**
 * Add or update a workspace in the recent list
 * Moves it to the top if it already exists
 */
export function addRecentWorkspace(path: string, name: string): void {
  const workspaces = loadRecentWorkspaces();

  // Remove existing entry if present
  const filtered = workspaces.filter((w) => w.path !== path);

  // Add to the beginning
  const newEntry: RecentWorkspace = {
    path,
    name,
    lastOpened: new Date().toISOString(),
  };

  const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_WORKSPACES);
  saveRecentWorkspaces(updated);
}

/**
 * Remove a workspace from the recent list
 */
export function removeRecentWorkspace(path: string): void {
  const workspaces = loadRecentWorkspaces();
  const filtered = workspaces.filter((w) => w.path !== path);
  saveRecentWorkspaces(filtered);
}

/**
 * Clear all recent workspaces
 */
export function clearRecentWorkspaces(): void {
  saveRecentWorkspaces([]);
}

/**
 * List recent workspaces, filtering out any that no longer exist
 */
export function listRecentWorkspaces(): RecentWorkspace[] {
  const workspaces = loadRecentWorkspaces();

  // Filter out workspaces that no longer exist
  const valid = workspaces.filter((w) => existsSync(w.path));

  // Save the filtered list if any were removed
  if (valid.length !== workspaces.length) {
    saveRecentWorkspaces(valid);
  }

  return valid;
}

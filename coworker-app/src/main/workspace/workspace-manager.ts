import { app, dialog, BrowserWindow } from "electron";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, basename, dirname } from "path";
import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";
import {
  openDatabase,
  closeDatabase,
  runMigrations,
  type WorkspaceDatabase,
} from "../database";
import { addRecentWorkspace } from "./recent-workspaces";

/**
 * Workspace manifest stored in manifest.json
 */
export interface WorkspaceManifest {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  schemaVersion: number;
}

/**
 * Full workspace info including path
 */
export interface WorkspaceInfo {
  path: string;
  manifest: WorkspaceManifest;
}

// Current workspace state
let currentWorkspace: WorkspaceInfo | null = null;
let currentDb: WorkspaceDatabase | null = null;
let currentSqlite: Database.Database | null = null;

const SCHEMA_VERSION = 1;
const WORKSPACE_EXTENSION = ".cowork";

/**
 * Get the current workspace info
 */
export function getCurrentWorkspace(): WorkspaceInfo | null {
  return currentWorkspace;
}

/**
 * Get the current workspace database
 */
export function getCurrentDatabase(): WorkspaceDatabase | null {
  return currentDb;
}

/**
 * Get the raw SQLite database instance for atomic transactions
 */
export function getCurrentSqlite(): Database.Database | null {
  return currentSqlite;
}

/**
 * Create a new workspace at the specified path
 */
export async function createWorkspace(
  name: string,
  folderPath: string,
): Promise<WorkspaceInfo> {
  // Close any open workspace first
  await closeWorkspace();

  // Create workspace folder with .cowork extension
  const workspacePath = folderPath.endsWith(WORKSPACE_EXTENSION)
    ? folderPath
    : `${folderPath}${WORKSPACE_EXTENSION}`;

  if (existsSync(workspacePath)) {
    throw new Error(`Workspace already exists at ${workspacePath}`);
  }

  // Create workspace directory structure
  mkdirSync(workspacePath, { recursive: true });
  mkdirSync(join(workspacePath, "blobs"), { recursive: true });

  // Create manifest
  const manifest: WorkspaceManifest = {
    id: createId(),
    name,
    createdAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };

  writeFileSync(
    join(workspacePath, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8",
  );

  // Create and initialize database
  const dbPath = join(workspacePath, "workspace.db");
  const { db, sqlite } = openDatabase(dbPath);

  // Run migrations to create tables
  runMigrations(sqlite);

  // Set as current workspace
  currentWorkspace = { path: workspacePath, manifest };
  currentDb = db;
  currentSqlite = sqlite;

  // Add to recent workspaces
  addRecentWorkspace(workspacePath, name);

  console.log("[Workspace] Created workspace:", name, "at", workspacePath);

  return currentWorkspace;
}

/**
 * Open an existing workspace
 */
export async function openWorkspace(
  workspacePath: string,
): Promise<WorkspaceInfo> {
  // Close any open workspace first
  await closeWorkspace();

  // Validate workspace exists
  if (!existsSync(workspacePath)) {
    throw new Error(`Workspace not found at ${workspacePath}`);
  }

  // Read manifest
  const manifestPath = join(workspacePath, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Invalid workspace: missing manifest.json at ${workspacePath}`,
    );
  }

  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf-8"),
  ) as WorkspaceManifest;

  // Open database
  const dbPath = join(workspacePath, "workspace.db");
  if (!existsSync(dbPath)) {
    throw new Error(
      `Invalid workspace: missing workspace.db at ${workspacePath}`,
    );
  }

  const { db, sqlite } = openDatabase(dbPath);

  // Run any pending migrations
  runMigrations(sqlite);

  // Set as current workspace
  currentWorkspace = { path: workspacePath, manifest };
  currentDb = db;
  currentSqlite = sqlite;

  // Update recent workspaces
  addRecentWorkspace(workspacePath, manifest.name);

  console.log(
    "[Workspace] Opened workspace:",
    manifest.name,
    "at",
    workspacePath,
  );

  return currentWorkspace;
}

/**
 * Close the current workspace
 */
export async function closeWorkspace(): Promise<void> {
  if (currentSqlite) {
    closeDatabase(currentSqlite);
    currentSqlite = null;
  }
  currentDb = null;
  currentWorkspace = null;

  console.log("[Workspace] Closed workspace");
}

/**
 * Show native save dialog to create a new workspace
 * Returns the workspace info if created, null if cancelled
 */
export async function showCreateWorkspaceDialog(
  parentWindow: BrowserWindow | null,
): Promise<WorkspaceInfo | null> {
  const result = await dialog.showSaveDialog(
    parentWindow ?? BrowserWindow.getFocusedWindow()!,
    {
      title: "Create New Workspace",
      defaultPath: join(
        app.getPath("documents"),
        `My Workspace${WORKSPACE_EXTENSION}`,
      ),
      buttonLabel: "Create Workspace",
      filters: [{ name: "Coworker Workspace", extensions: ["cowork"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    },
  );

  if (result.canceled || !result.filePath) {
    return null;
  }

  // Extract name from path (without extension)
  const name = basename(result.filePath, WORKSPACE_EXTENSION);

  return createWorkspace(name, result.filePath);
}

/**
 * Show native folder picker to open a workspace
 * Returns the workspace info if opened, null if cancelled
 */
export async function showOpenWorkspaceDialog(
  parentWindow: BrowserWindow | null,
): Promise<WorkspaceInfo | null> {
  const properties: NonNullable<Electron.OpenDialogOptions["properties"]> = [
    "openDirectory",
  ];
  if (process.platform === "darwin") {
    properties.push("openFile");
  }

  const result = await dialog.showOpenDialog(
    parentWindow ?? BrowserWindow.getFocusedWindow()!,
    {
      title: "Open Workspace",
      defaultPath: app.getPath("documents"),
      buttonLabel: "Open Workspace",
      properties,
      filters: [{ name: "Coworker Workspace", extensions: ["cowork"] }],
    },
  );

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const workspacePath = result.filePaths[0];

  // Validate it's a .cowork folder
  if (!workspacePath.endsWith(WORKSPACE_EXTENSION)) {
    throw new Error("Please select a .cowork workspace folder");
  }

  return openWorkspace(workspacePath);
}

/**
 * Get workspace display name from path
 */
export function getWorkspaceDisplayName(workspacePath: string): string {
  return basename(workspacePath, WORKSPACE_EXTENSION);
}

/**
 * Get workspace parent directory from path
 */
export function getWorkspaceParentDir(workspacePath: string): string {
  return dirname(workspacePath);
}

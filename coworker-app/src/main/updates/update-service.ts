import { app, BrowserWindow } from "electron";
import { autoUpdater, type ProgressInfo, type UpdateInfo } from "electron-updater";
import {
  loadUpdatePreferences,
  saveUpdatePreferences,
  type UpdatePreferences,
} from "./update-preferences";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export type UpdateProgress = {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
};

export type UpdateState = {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  progress?: UpdateProgress;
  lastCheckedAt?: string;
  error?: string;
  autoDownload: boolean;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let updateState: UpdateState = {
  status: "idle",
  currentVersion: app.getVersion(),
  autoDownload: true,
};

let mainWindowGetter: (() => BrowserWindow | null) | null = null;
let updateTimer: NodeJS.Timeout | null = null;

const notifyRenderer = (): void => {
  const window =
    mainWindowGetter?.() ?? BrowserWindow.getAllWindows().at(0) ?? null;
  if (!window) return;
  window.webContents.send("updates:state", updateState);
};

const setState = (patch: Partial<UpdateState>): void => {
  updateState = { ...updateState, ...patch };
  notifyRenderer();
};

const syncPreferences = (preferences: UpdatePreferences): void => {
  updateState = {
    ...updateState,
    autoDownload: preferences.autoDownload,
  };
  autoUpdater.autoDownload = preferences.autoDownload;
};

const handleUpdateAvailable = (info: UpdateInfo): void => {
  setState({
    status: "available",
    availableVersion: info.version,
    error: undefined,
  });
};

const handleUpdateNotAvailable = (): void => {
  setState({
    status: "not-available",
    availableVersion: undefined,
    progress: undefined,
    error: undefined,
  });
};

const handleDownloadProgress = (progress: ProgressInfo): void => {
  setState({
    status: "downloading",
    progress: {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    },
  });
};

const handleUpdateDownloaded = (info: UpdateInfo): void => {
  setState({
    status: "downloaded",
    availableVersion: info.version,
    progress: undefined,
    error: undefined,
  });
};

const handleUpdateError = (error: Error): void => {
  setState({
    status: "error",
    error: error.message || "Update failed.",
  });
};

export function initUpdates(getMainWindow: () => BrowserWindow | null): void {
  mainWindowGetter = getMainWindow;
  const preferences = loadUpdatePreferences();
  syncPreferences(preferences);

  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("checking-for-update", () => {
    setState({ status: "checking", error: undefined });
  });
  autoUpdater.on("update-available", handleUpdateAvailable);
  autoUpdater.on("update-not-available", handleUpdateNotAvailable);
  autoUpdater.on("download-progress", handleDownloadProgress);
  autoUpdater.on("update-downloaded", handleUpdateDownloaded);
  autoUpdater.on("error", handleUpdateError);

  notifyRenderer();
  void checkForUpdates();

  if (!updateTimer) {
    updateTimer = setInterval(() => {
      void checkForUpdates();
    }, ONE_DAY_MS);
  }
}

export async function checkForUpdates(): Promise<void> {
  setState({ status: "checking", lastCheckedAt: new Date().toISOString() });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    handleUpdateError(error as Error);
  }
}

export async function downloadUpdate(): Promise<void> {
  setState({ status: "downloading" });
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    handleUpdateError(error as Error);
  }
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall();
}

export function getUpdateState(): UpdateState {
  return updateState;
}

export function getCurrentVersion(): string {
  return app.getVersion();
}

export function setAutoDownload(nextValue: boolean): void {
  const preferences: UpdatePreferences = { autoDownload: nextValue };
  saveUpdatePreferences(preferences);
  syncPreferences(preferences);

  if (nextValue && updateState.status === "available") {
    void downloadUpdate();
  }
}

export function getAutoDownload(): boolean {
  return updateState.autoDownload;
}

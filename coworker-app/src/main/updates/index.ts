export {
  initUpdates,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
  getUpdateState,
  getAutoDownload,
  getCurrentVersion,
  setAutoDownload,
} from "./update-service";

export type { UpdateState, UpdateStatus, UpdateProgress } from "./update-service";

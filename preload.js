const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("launcherAPI", {
    selectFile: () => ipcRenderer.invoke("select-file"),
    selectFolder: () => ipcRenderer.invoke("select-folder"),
    selectImage: () => ipcRenderer.invoke("select-image"),
    getAppConfig: () => ipcRenderer.invoke("get-app-config"),
    saveAppConfig: (config) => ipcRenderer.invoke("save-app-config", config),
    setWindowLocked: (locked) => ipcRenderer.send("set-window-locked", locked),
    setWindowOpacity: (opacity) =>
        ipcRenderer.send("set-window-opacity", opacity),
    setStickerMode: (isSticker) =>
        ipcRenderer.send("set-sticker-mode", isSticker),
    runExeCustom: (data) => ipcRenderer.invoke("run-exe-custom", data),
    exportData: (dataStr) => ipcRenderer.invoke("export-data", dataStr),
    importData: () => ipcRenderer.invoke("import-data"),
    getPing: () => ipcRenderer.invoke("get-ping"),
    onUpdatePlaytime: (callback) => ipcRenderer.on("update-playtime", callback),
    setStartup: (enabled) => ipcRenderer.invoke("set-startup", enabled),
    getStartup: () => ipcRenderer.invoke("get-startup"),
    openFolder: (path) => ipcRenderer.invoke("open-folder", path),
    openUrl: (url) => ipcRenderer.invoke("open-url", url),
    sendNotification: (data) => ipcRenderer.invoke("send-notification", data),
    getSysInfo: () => ipcRenderer.invoke("get-sys-info"),
    extractExeIcon: (exePath) => ipcRenderer.invoke("extract-exe-icon", exePath),
    openTaskManager: () => ipcRenderer.invoke("open-task-manager"),
    openDownloadsFolder: () => ipcRenderer.invoke("open-downloads-folder"),
    openRecycleBin: () => ipcRenderer.invoke("open-recycle-bin"),
    emptyRecycleBin: () => ipcRenderer.invoke("empty-recycle-bin"),
    lockWindows: () => ipcRenderer.invoke("lock-windows"),
    sleepWindows: () => ipcRenderer.invoke("sleep-windows"),
    restartWindows: () => ipcRenderer.invoke("restart-windows"),
    shutdownWindows: () => ipcRenderer.invoke("shutdown-windows"),
    cleanTempFiles: () => ipcRenderer.invoke("clean-temp-files"),

    openDiskCleanup: () => ipcRenderer.invoke("open-disk-cleanup"),

    openStartupFolder: () => ipcRenderer.invoke("open-startup-folder"),

    onShowQuitConfirm: (callback) =>
        ipcRenderer.on("show-quit-confirm", callback),
    onSyncConfigUI: (callback) => ipcRenderer.on("sync-config-ui", callback),
    minimizeToTray: () => ipcRenderer.send("app-minimize-to-tray"),
    quitForce: () => ipcRenderer.send("app-quit-force"),

    onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on("update-downloaded", callback),
    downloadUpdate: () =>
        ipcRenderer.invoke(
            "download-update"
        ),

    installUpdate: () =>
        ipcRenderer.invoke(
            "install-update"
        ),

    onUpdateLog: (callback) =>
        ipcRenderer.on(
            "update-log",
            callback
        ),
    onUpdateProgress: (callback) =>
        ipcRenderer.on(
            "update-progress",
            callback
        ),



});

const {
    app,
    BrowserWindow,
    ipcMain,
    Notification,
    shell,
    Tray,
    Menu,
    globalShortcut,
    dialog,
    nativeImage,
    screen,
} = require("electron");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const fs = require("fs");
const { autoUpdater } =
    require("electron-updater");

let si = null;
try {
    si = require("systeminformation");
} catch (e) {
    console.log(
        "systeminformation 모듈이 설치되어 있지 않아 기본 os 모듈로 동작합니다."
    );
}

let mainWindow;
let tray = null;
let isQuitting = false;

const configPath = path.join(app.getPath("userData"), "config.json");
let config = {
    monitorIndex: 0,

    pinToDesktop: false,

    stickerAlwaysOnTop: true,

    width: 1100,
    height: 750,

    x: null,
    y: null,

    isLocked: false,
    opacity: 1.0,

    isSticker: false,
};

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, "utf-8");
            config = { ...config, ...JSON.parse(data) };
        } else {
            saveConfig();
        }
    } catch (e) {
        console.error("설정 파일 로드 실패:", e);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    } catch (e) {
        console.error("설정 파일 저장 실패:", e);
    }
}

function createWindow() {
    const displays = screen.getAllDisplays();
    const targetDisplay =
        displays[config.monitorIndex] || screen.getPrimaryDisplay();
    const workArea = targetDisplay.workArea;

    let winX =
        config.x !== null
            ? config.x
            : Math.round(workArea.x + (workArea.width - config.width) / 2);
    let winY =
        config.y !== null
            ? config.y
            : Math.round(workArea.y + (workArea.height - config.height) / 2);

    mainWindow = new BrowserWindow({
        x: winX,
        y: winY,
        width: config.isSticker ? 55 : config.width,
        height: config.isSticker ? 55 : config.height,
        frame: false,
        transparent: true,
        backgroundColor: "#00000000",
        alwaysOnTop: config.isSticker ? true : config.pinToDesktop,
        autoHideMenuBar: true,
        resizable: !config.isSticker && !config.isLocked,
        movable: true,
        opacity: config.opacity ?? 1.0,
        focusable: true,
        icon: path.join(__dirname, "assets", "icon.jpg"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile("index.html");

    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on("resize", () => {
        if (
            !mainWindow.isMaximized() &&
            !mainWindow.isMinimized() &&
            !config.isSticker
        ) {
            const bounds = mainWindow.getBounds();
            config.width = bounds.width;
            config.height = bounds.height;
            saveConfig();
        }
    });

    mainWindow.on("move", () => {
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            const bounds = mainWindow.getBounds();
            config.x = bounds.x;
            config.y = bounds.y;
            saveConfig();
        }
    });

    mainWindow.on("close", (event) => {
        if (isQuitting) return;
        event.preventDefault();
        mainWindow.webContents.send("show-quit-confirm");
    });
}

function updateTrayContextMenu() {
    if (!tray) return;
    const contextMenu = Menu.buildFromTemplate([
        { label: "런처 열기 / 숨기기 (Alt+Space)", click: toggleWindow },
        {
            label: "📌 항상 위에 고정",
            type: "checkbox",
            checked: !!config.stickerAlwaysOnTop,
            click: (menuItem) => {
                config.stickerAlwaysOnTop = menuItem.checked;
                saveConfig();
                if (mainWindow && config.isSticker) {
                    mainWindow.setAlwaysOnTop(config.stickerAlwaysOnTop);
                }
                if (mainWindow) {
                    mainWindow.webContents.send("sync-config-ui", config);
                }
            },
        },
        { type: "separator" },
        {
            label: "완전 종료",
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
}

function createTray() {
    const iconPath = path.join(__dirname, "icon.png");
    let trayIcon;

    try {
        if (fs.existsSync(iconPath)) {
            trayIcon = nativeImage.createFromPath(iconPath);
        } else {
            trayIcon = nativeImage.createEmpty();
        }
        tray = new Tray(path.join(__dirname, "assets", "icon.jpg"));
    } catch (e) {
        return;
    }

    tray.setToolTip("PC Room Ultimate Launcher Pro v1.1.0");
    updateTrayContextMenu();
    tray.on("click", toggleWindow);
    tray.on("double-click", toggleWindow);
}

function toggleWindow() {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
        mainWindow.hide();
    } else {
        mainWindow.show();
        mainWindow.focus();
    }
}

app.whenReady().then(() => {
    loadConfig();
    createWindow();
    createTray();
    autoUpdater.checkForUpdates();

    globalShortcut.register("Alt+Space", () => {
        toggleWindow();
    });
    globalShortcut.register("F12", () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    globalShortcut.register("CommandOrControl+Shift+I", () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });
});

app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

ipcMain.on("app-minimize-to-tray", () => {
    if (mainWindow) mainWindow.hide();
});

ipcMain.on("app-quit-force", () => {
    isQuitting = true;
    app.quit();
});

ipcMain.on("set-window-locked", (event, locked) => {
    config.isLocked = locked;
    saveConfig();
    if (mainWindow && !config.isSticker) {
        mainWindow.setResizable(!locked);
        mainWindow.setMovable(!locked);
    }
});

ipcMain.on("set-window-opacity", (event, opacity) => {
    config.opacity = opacity;
    saveConfig();
    if (mainWindow) {
        mainWindow.setOpacity(opacity);
    }
});

// 스티커 모드 처리
ipcMain.on("set-sticker-mode", (event, isSticker) => {
    if (!mainWindow) return;
    config.isSticker = isSticker;

    if (isSticker) {
        const bounds = mainWindow.getBounds();
        if (bounds.width > 100 && bounds.height > 100) {
            config.width = bounds.width;
            config.height = bounds.height;
        }
        saveConfig();

        mainWindow.setSize(65, 65);
        mainWindow.setAlwaysOnTop(!!config.stickerAlwaysOnTop);
        mainWindow.setResizable(false);
    } else {
        saveConfig();
        const restoreWidth = config.width || 1100;
        const restoreHeight = config.height || 750;

        mainWindow.setSize(restoreWidth, restoreHeight);
        mainWindow.setAlwaysOnTop(!!config.pinToDesktop);
        mainWindow.setResizable(!config.isLocked);

        mainWindow.show();
        mainWindow.focus();
    }
});

ipcMain.handle("get-app-config", () => {
    const displays = screen.getAllDisplays().map((d, index) => ({
        index,
        label: `모니터 ${index + 1} (${d.bounds.width}x${d.bounds.height})`,
    }));
    return { config, displays };
});

ipcMain.handle("extract-exe-icon", async (event, exePath) => {
    try {
        const icon = await app.getFileIcon(exePath, {
            size: "large",
        });

        const iconDir = path.join(app.getPath("userData"), "icons");

        if (!fs.existsSync(iconDir)) {
            fs.mkdirSync(iconDir, {
                recursive: true,
            });
        }

        const savePath = path.join(iconDir, `${Date.now()}.png`);

        fs.writeFileSync(savePath, icon.toPNG());

        return savePath;
    } catch (err) {
        console.error("아이콘 추출 실패:", err);

        return null;
    }
});
ipcMain.handle("set-startup", async (event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return true;
});

ipcMain.handle("get-startup", async () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle("save-app-config", (event, newConfig) => {
    config = { ...config, ...newConfig };
    saveConfig();
    if (mainWindow && !config.isSticker) {
        mainWindow.setAlwaysOnTop(!!config.pinToDesktop);
    }
    updateTrayContextMenu();
    return true;
});

ipcMain.handle(
    "run-exe-custom",
    async (event, { exePath, args, runAsAdmin, autoMinimize, appId }) => {
        if (!exePath) return false;
        const formattedArgs = args ? ` ${args}` : "";
        let command = `start "" "${exePath}"${formattedArgs}`;

        if (runAsAdmin) {
            command = `powershell -Command "Start-Process '${exePath}' -ArgumentList '${args || ""
                }' -Verb RunAs"`;
        }

        const startTime = Date.now();
        const child = exec(command, (error) => {
            if (error) console.error(`실행 실패: ${error.message}`);
        });

        if (appId && child.pid) {
            runningProcesses = runningProcesses || new Map();
            runningProcesses.set(child.pid, { appId, startTime });

            child.on("exit", () => {
                const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                if (mainWindow) {
                    mainWindow.webContents.send("update-playtime", {
                        appId,
                        elapsedSeconds,
                    });
                }
                runningProcesses.delete(child.pid);
            });
        }

        if (autoMinimize && mainWindow) mainWindow.hide();
        return true;
    }
);

let runningProcesses = new Map();

ipcMain.handle("export-data", async (event, dataString) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "런처 데이터 백업",
        defaultPath: "launcher_backup.json",
        filters: [{ name: "JSON 파일", extensions: ["json"] }],
    });

    if (filePath) {
        fs.writeFileSync(filePath, dataString, "utf-8");
        return true;
    }
    return false;
});

ipcMain.handle("import-data", async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: "런처 데이터 불러오기",
        properties: ["openFile"],
        filters: [{ name: "JSON 파일", extensions: ["json"] }],
    });

    if (filePaths && filePaths.length > 0) {
        const content = fs.readFileSync(filePaths[0], "utf-8");
        return JSON.parse(content);
    }
    return null;
});

ipcMain.handle("get-ping", async () => {
    if (si) {
        try {
            const res = await si.inetLatency("8.8.8.8");
            return Math.round(res);
        } catch (e) {
            return -1;
        }
    }
    return -1;
});

ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
            {
                name: "실행 파일 및 바로가기",
                extensions: ["exe", "lnk"],
            },
            {
                name: "모든 파일",
                extensions: ["*"],
            },
        ],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    return result.filePaths[0];
});

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle("select-image", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openFile"],
        filters: [
            {
                name: "이미지 파일",
                extensions: ["png", "jpg", "jpeg", "ico", "webp"],
            },
        ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle("open-folder", async (event, folderPath) => {
    if (!folderPath) return false;
    exec(`start "" "${folderPath}"`);
    return true;
});

ipcMain.handle("open-url", async (event, url) => {
    if (!url) return false;
    shell.openExternal(url);
    return true;
});

ipcMain.handle("send-notification", (event, { title, body }) => {
    if (Notification.isSupported()) {
        new Notification({ title, body }).show();
    }
});

ipcMain.handle("open-task-manager", async () => {
    exec("start taskmgr");
    return true;
});

ipcMain.handle("open-downloads-folder", async () => {
    shell.openPath(app.getPath("downloads"));
    return true;
});

ipcMain.handle("open-recycle-bin", async () => {
    exec("explorer.exe shell:RecycleBinFolder");
    return true;
});

ipcMain.handle("empty-recycle-bin", async () => {
    try {
        exec('powershell.exe -Command "Clear-RecycleBin -Force"');

        return true;
    } catch {
        return false;
    }
});

ipcMain.handle("lock-windows", async () => {
    exec("rundll32.exe user32.dll,LockWorkStation");
    return true;
});

ipcMain.handle("sleep-windows", async () => {
    exec("rundll32.exe powrprof.dll,SetSuspendState 0,1,0");
    return true;
});

ipcMain.handle("restart-windows", async () => {
    exec("shutdown /r /t 0");
    return true;
});

ipcMain.handle("shutdown-windows", async () => {
    exec("shutdown /s /t 0");
    return true;
});

ipcMain.handle("open-disk-cleanup", async () => {
    exec("cleanmgr");

    return true;
});

ipcMain.handle("open-startup-folder", async () => {
    exec("explorer shell:startup");

    return true;
});

ipcMain.handle("clean-temp-files", async () => {
    try {
        const tempPath = os.tmpdir();

        const files = fs.readdirSync(tempPath);

        files.forEach((file) => {
            const fullPath = path.join(tempPath, file);

            try {
                fs.rmSync(fullPath, {
                    recursive: true,
                    force: true,
                });
            } catch { }
        });

        return true;
    } catch (err) {
        console.error(err);

        return false;
    }
});

let prevNetworkStats = null;
ipcMain.handle("get-sys-info", async () => {
    if (si) {
        try {
            const [cpuLoadData, mem, fsSize, processes, netStats] = await Promise.all(
                [
                    si.currentLoad(),
                    si.mem(),
                    si.fsSize(),
                    si.processes(),
                    si.networkStats(),
                ]
            );

            const cpuUsage = Math.round(cpuLoadData.currentLoad || 0);
            const memUsage = Math.round((mem.active / mem.total) * 100);
            const mainDisk =
                fsSize.find((d) => d.mount.toLowerCase().startsWith("c")) || fsSize[0];
            const diskUsage = mainDisk ? Math.round(mainDisk.use) : 0;

            const diskList = fsSize.map((d) => {
                const totalGB = d.size / 1024 ** 3;
                const usedGB = d.used / 1024 ** 3;
                const usePercent = Math.round(d.use);
                const formatSize = (val) => val.toFixed(1);

                return {
                    mount: d.mount,
                    size: formatSize(totalGB),
                    used: formatSize(usedGB),
                    use: usePercent,
                };
            });

            const procList = processes.list || [];
            const topCpuList = [...procList]
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 5)
                .map((p) => ({ name: p.name, value: `${p.cpu.toFixed(1)}%` }));
            const topRamList = [...procList]
                .sort((a, b) => b.mem - a.mem)
                .slice(0, 5)
                .map((p) => ({
                    name: p.name,
                    value: `${(p.memRss / 1024).toFixed(1)} MB`,
                }));

            let downSpeed = "0.0";
            let upSpeed = "0.0";
            if (netStats && netStats.length > 0) {
                const currentNet = netStats[0];
                if (prevNetworkStats) {
                    const rxDiff = currentNet.rx_bytes - prevNetworkStats.rx_bytes;
                    const txDiff = currentNet.tx_bytes - prevNetworkStats.tx_bytes;
                    downSpeed = (Math.max(0, rxDiff) / (1024 * 1024) / 3).toFixed(1);
                    upSpeed = (Math.max(0, txDiff) / (1024 * 1024) / 3).toFixed(1);
                }
                prevNetworkStats = currentNet;
            }

            return {
                cpuLoad: cpuUsage,
                memUsage,
                diskUsage,
                downSpeed,
                upSpeed,
                topCpuList,
                topRamList,
                diskList,
            };
        } catch (err) { }
    }
    return {
        cpuLoad: 0,
        memUsage: 0,
        diskUsage: 0,
        downSpeed: "0.0",
        upSpeed: "0.0",
        topCpuList: [],
        topRamList: [],
        diskList: [],
    };

});

autoUpdater.on(
    "update-available",
    (info) => {

        if (mainWindow) {

            mainWindow.webContents.send(
                "update-available",
                info.version
            );

        }

    }
);

autoUpdater.on(
    "update-downloaded",
    () => {

        if (mainWindow) {

            mainWindow.webContents.send(
                "update-downloaded"
            );

        }

    }
);

ipcMain.handle(
    "download-update",
    async () => {

        autoUpdater.downloadUpdate();

        return true;

    }
);

ipcMain.handle(
    "install-update",
    async () => {

        isQuitting = true;

        autoUpdater.quitAndInstall(
            true,
            true
        );

        return true;

    }
);


autoUpdater.on("checking-for-update", () => {
    console.log("업데이트 확인 시작");
});

autoUpdater.on("update-available", (info) => {
    console.log("업데이트 발견:", info.version);
});

autoUpdater.on("update-not-available", () => {
    console.log("업데이트 없음");
});

autoUpdater.on("error", (err) => {
    console.error("업데이트 오류:", err);
});

autoUpdater.on("checking-for-update", () => {
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-log",
            "업데이트 확인 시작"
        );
    }
});

autoUpdater.on("update-not-available", () => {
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-log",
            "업데이트 없음"
        );
    }
});

autoUpdater.on("error", (err) => {
    if (mainWindow) {
        mainWindow.webContents.send(
            "update-log",
            `업데이트 오류: ${err}`
        );
    }
});

autoUpdater.on(
    "download-progress",
    (progress) => {

        const percent =
            Math.round(
                progress.percent
            );

        if (mainWindow) {

            mainWindow.webContents.send(
                "update-progress",
                percent
            );

            mainWindow.setProgressBar(
                percent / 100
            );

        }

    }
);


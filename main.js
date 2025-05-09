const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, nativeImage, Tray, Menu, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const applescript = require('applescript');
const fs = require('fs');

const store = new Store();
const settingsStore = new Store({ name: 'settings', defaults: { autoHide: true, hotkey: 'CommandOrControl+Shift+V' } });
const MAX_HISTORY = 100;
const appIconCache = {};
let mainWindow, tray, isWindowVisible = true, previewWindow = null;
app.isQuitting = false;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
        width: 500, height: 600, show: !settingsStore.get('autoHide'), frame: true, resizable: true,
        alwaysOnTop: false, skipTaskbar: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') }
    });
    mainWindow.loadFile('index.html').catch(err => console.error('加载 index.html 失败:', err));
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            isWindowVisible = false;
            updateTrayMenu();
        }
    });
    mainWindow.on('blur', () => {
        if (settingsStore.get('autoHide') && !mainWindow.isAlwaysOnTop()) {
            mainWindow.hide();
            isWindowVisible = false;
            updateTrayMenu();
        }
    });
    mainWindow.on('closed', () => mainWindow = null);
    isWindowVisible = mainWindow.isVisible();
}

function createPreviewWindow({ content, type }) {
    if (previewWindow) {
        previewWindow.close();
        previewWindow = null;
    }
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    let windowWidth, windowHeight;

    if (type === 'image') {
        try {
            const img = nativeImage.createFromDataURL(content);
            const { width: imgWidth, height: imgHeight } = img.getSize();
            // 自适应窗口，限制最大 80% 屏幕尺寸
            windowWidth = Math.min(imgWidth, screenWidth * 0.8);
            windowHeight = Math.min(imgHeight, screenHeight * 0.8);
            console.log(`图片尺寸: ${imgWidth}x${imgHeight}, 窗口尺寸: ${windowWidth}x${windowHeight}`);
        } catch (err) {
            console.error('解析图片尺寸失败:', err.message);
            windowWidth = 300;
            windowHeight = 300;
        }
    } else {
        windowWidth = 600; // 文本窗口放大
        windowHeight = 400;
    }

    previewWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: screenWidth / 2 - windowWidth / 2,
        y: screenHeight / 2 - windowHeight / 2,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        backgroundColor: '#ffffff',
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    const htmlContent = type === 'image' ?
        `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; background: #fff; }
                img { width: 100%; height: 100%; object-fit: contain; }
            </style>
        </head>
        <body>
            <img src="${content}" alt="Preview" onerror="console.error('图片加载失败')">
            <script>
                document.addEventListener('keydown', (e) => {
                    if (e.keyCode === 27) { // Esc 键
                        window.close();
                    }
                });
            </script>
        </body>
        </html>` :
        `<!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 20px; font-family: -apple-system, sans-serif; font-size: 14px; color: #333; white-space: pre-wrap; word-wrap: break-word; background: #fff; }
            </style>
        </head>
        <body>
            ${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            <script>
                document.addEventListener('keydown', (e) => {
                    if (e.keyCode === 27) { // Esc 键
                        window.close();
                    }
                });
            </script>
        </body>
        </html>`;

    previewWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(htmlContent)}`).catch(err => {
        console.error('加载预览窗口失败:', err.message);
    });

    previewWindow.on('closed', () => previewWindow = null);
    previewWindow.on('blur', () => {
        if (previewWindow) previewWindow.close();
    });
    console.log(`打开预览窗口: type=${type}, content=${content.substring(0, 50)}`);
}

function toggleWindow() {
    if (!mainWindow) {
        createWindow();
        isWindowVisible = true;
    } else if (mainWindow.isVisible()) {
        mainWindow.hide();
        isWindowVisible = false;
    } else {
        mainWindow.show();
        mainWindow.center();
        mainWindow.focus();
        isWindowVisible = true;
    }
    updateTrayMenu();
}

function toggleAlwaysOnTop() {
    if (!mainWindow) return false;
    const isPinned = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(isPinned);
    updateTrayMenu();
    return isPinned;
}

function createTray() {
    try {
        const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
        if (!fs.existsSync(iconPath)) {
            console.log('托盘图标文件缺失，使用文本图标');
            throw new Error('托盘图标文件缺失');
        }
        const trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) {
            console.error('托盘图标数据无效:', iconPath);
            throw new Error('无效托盘图标');
        }
        tray = new Tray(trayIcon);
    } catch (err) {
        console.error('托盘图标加载失败:', err.message);
        const textIcon = generateTextIcon('Clipboard');
        tray = new Tray(nativeImage.createFromDataURL(textIcon));
    }
    tray.setToolTip('剪贴板历史');
    updateTrayMenu();
    tray.on('click', toggleWindow);
}

function updateTrayMenu() {
    if (!tray) return;
    const contextMenu = Menu.buildFromTemplate([
        { label: isWindowVisible ? '隐藏窗口' : '显示窗口', click: toggleWindow },
        { type: 'separator' },
        {
            label: '设置', submenu: [
                { label: '自动隐藏', type: 'checkbox', checked: settingsStore.get('autoHide'), click: () => {
                    settingsStore.set('autoHide', !settingsStore.get('autoHide'));
                    updateTrayMenu();
                }},
                { label: '置顶窗口', type: 'checkbox', checked: mainWindow?.isAlwaysOnTop(), click: () => {
                    toggleAlwaysOnTop();
                }}
            ]
        },
        { type: 'separator' },
        { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

function registerGlobalShortcuts() {
    const toggleHotkey = settingsStore.get('hotkey') || 'CommandOrControl+Shift+V';
    try {
        globalShortcut.unregisterAll();
    } catch (err) {
        console.error('注销快捷键失败:', err);
    }
    if (!globalShortcut.register(toggleHotkey, toggleWindow)) {
        console.error('快捷键注册失败:', toggleHotkey);
    }
}

async function getAppIcon(appName) {
    if (!appName) {
        console.log('应用名为空，使用默认文本图标');
        return generateTextIcon('Unknown');
    }
    if (appIconCache[appName]) {
        console.log(`从缓存获取图标: ${appName}`);
        return appIconCache[appName];
    }
    const appPaths = {
        'Safari': '/Applications/Safari.app', 'Google Chrome': '/Applications/Google Chrome.app',
        'Firefox': '/Applications/Firefox.app', 'Finder': '/System/Library/CoreServices/Finder.app',
        'Notes': '/Applications/Notes.app', 'TextEdit': '/Applications/TextEdit.app',
        'Terminal': '/Applications/Utilities/Terminal.app', 'Visual Studio Code': '/Applications/Visual Studio Code.app',
        'GoLand': '/Applications/GoLand.app', 'IntelliJ IDEA': '/Applications/IntelliJ IDEA.app',
        'WebStorm': '/Applications/WebStorm.app', 'PyCharm': '/Applications/PyCharm.app',
        'Slack': '/Applications/Slack.app', 'Discord': '/Applications/Discord.app',
        'WeChat': '/Applications/WeChat.app', 'QQ': '/Applications/QQ.app',
        'iTerm': '/Applications/iTerm.app', 'Microsoft Edge': '/Applications/Microsoft Edge.app',
        'Microsoft Word': '/Applications/Microsoft Word.app', 'Microsoft Excel': '/Applications/Microsoft Excel.app',
        'Xcode': '/Applications/Xcode.app', 'Preview': '/Applications/Preview.app',
        'Calendar': '/Applications/Calendar.app', 'Mail': '/Applications/Mail.app'
    };
    try {
        const normalizedAppName = appName.replace(/\.app$/i, '').trim();
        console.log(`尝试获取图标: ${normalizedAppName}`);
        let appPath = appPaths[normalizedAppName];
        if (!appPath) {
            const script = `tell application "Finder"
                try
                    return POSIX path of (application file id "${normalizedAppName}" as alias)
                on error
                    try
                        return POSIX path of (application file id "${normalizedAppName.toLowerCase()}" as alias)
                    on error
                        return ""
                    end try
                end try
            end tell`;
            const result = await new Promise(resolve => applescript.execString(script, (err, res) => {
                if (err) {
                    console.error(`AppleScript 获取路径失败: ${normalizedAppName}`, err.message);
                    resolve('');
                } else {
                    resolve(res || '');
                }
            }));
            appPath = result.trim() || null;
            console.log(`AppleScript 路径结果: ${appPath || '无'}`);
        } else {
            console.log(`使用预定义路径: ${appPath}`);
        }
        if (!appPath) {
            const possiblePaths = [
                `/Applications/${normalizedAppName}.app`,
                `/Applications/${normalizedAppName.charAt(0).toUpperCase() + normalizedAppName.slice(1)}.app`,
                `/Applications/Utilities/${normalizedAppName}.app`,
                `/Applications/Utilities/${normalizedAppName.charAt(0).toUpperCase() + normalizedAppName.slice(1)}.app`
            ];
            appPath = possiblePaths.find(p => fs.existsSync(p)) || null;
            console.log(`尝试路径: ${possiblePaths}, 结果: ${appPath || '无'}`);
        }
        if (appPath && fs.existsSync(appPath)) {
            const resourcesPath = `${appPath}/Contents/Resources`;
            const possibleIconNames = ['AppIcon.icns', 'app.icns', 'icon.icns', 'Icon.icns', `${normalizedAppName}.icns`, `${normalizedAppName.toLowerCase()}.icns`];
            let iconPath = null;
            if (fs.existsSync(resourcesPath)) {
                iconPath = possibleIconNames.map(name => `${resourcesPath}/${name}`).find(p => fs.existsSync(p));
                if (!iconPath) {
                    const files = fs.readdirSync(resourcesPath);
                    iconPath = files.find(f => f.toLowerCase().endsWith('.icns')) ? `${resourcesPath}/${files.find(f => f.toLowerCase().endsWith('.icns'))}` : null;
                }
            }
            if (iconPath && fs.existsSync(iconPath)) {
                console.log(`找到图标: ${iconPath}`);
                const stats = fs.statSync(iconPath);
                if (stats.size < 1024) {
                    console.log(`图标文件过小: ${iconPath}, 大小: ${stats.size} 字节，使用文本图标`);
                    return generateTextIcon(normalizedAppName);
                }
                const iconData = fs.readFileSync(iconPath);
                const nativeImg = nativeImage.createFromBuffer(iconData);
                if (!nativeImg || nativeImg.isEmpty()) {
                    console.log(`图标数据无效: ${iconPath}, 使用文本图标`);
                    return generateTextIcon(normalizedAppName);
                }
                const dataUrl = nativeImg.resize({ width: 32, height: 32 }).toDataURL();
                console.log(`成功生成图标: ${normalizedAppName}, 数据长度: ${dataUrl.length}`);
                appIconCache[appName] = dataUrl;
                return dataUrl;
            }
            console.log(`未找到图标文件: ${resourcesPath}, 使用文本图标`);
        } else {
            console.log(`应用路径无效: ${appPath}, 使用文本图标`);
        }
        return generateTextIcon(normalizedAppName);
    } catch (err) {
        console.error(`获取图标失败: ${appName}, 错误: ${err.message}`);
        return generateTextIcon(appName);
    }
}

function generateTextIcon(appName) {
    const text = appName ? (appName.length > 1 ? appName[0].toUpperCase() + appName[1].toLowerCase() : appName[0].toUpperCase()) : '??';
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB', '#E74C3C', '#2ECC71'];
    const seed = appName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bgColor = colors[seed % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" ry="8" fill="${bgColor}"/><text x="16" y="20" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#FFF" text-anchor="middle" alignment-baseline="middle">${text}</text></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    console.log(`生成文本图标: ${appName}, 数据长度: ${dataUrl.length}`);
    return dataUrl;
}

async function getActiveAppName() {
    try {
        const script = `tell application "System Events" to return name of first process whose frontmost is true`;
        return new Promise(resolve => applescript.execString(script, (err, res) => {
            if (err) {
                console.error('获取活跃应用失败:', err.message);
                resolve('Unknown');
            } else {
                resolve(res || 'Unknown');
            }
        }));
    } catch (err) {
        console.error('获取活跃应用失败:', err.message);
        return 'Unknown';
    }
}

async function handleClipboardUpdate() {
    try {
        const image = clipboard.readImage();
        let content, fullImage, type;
        if (!image.isEmpty()) {
            content = image.resize({ width: 64, height: 64 }).toDataURL(); // 缩略图
            fullImage = image.toDataURL(); // 原始图片
            type = 'image';
            try {
                const imgSize = nativeImage.createFromDataURL(fullImage).getSize();
                console.log('检测到图片剪贴板内容', {
                    thumbnailLength: content.length,
                    fullImageLength: fullImage.length,
                    imageSize: `${imgSize.width}x${imgSize.height}`
                });
            } catch (err) {
                console.error('验证图片尺寸失败:', err.message);
            }
        } else {
            const text = clipboard.readText();
            if (!text || text.trim() === '') {
                console.log('剪贴板内容为空，跳过处理');
                return;
            }
            content = text;
            type = 'text';
        }
        let clipboardHistory = store.get('clipboardHistory', []);
        if (clipboardHistory[0]?.content === content && clipboardHistory[0]?.type === type) {
            console.log('重复的剪贴板内容，跳过处理');
            return;
        }
        const currentApp = await getActiveAppName();
        let source = currentApp;
        let iconDataUrl;
        const isOwnApp = currentApp.toLowerCase().includes('electron') || currentApp === 'electron-clipboard';
        if (isOwnApp) {
            const matchingItem = clipboardHistory.find(item => item.content === content && item.type === type);
            if (matchingItem) {
                source = matchingItem.source;
                iconDataUrl = matchingItem.iconDataUrl;
                console.log(`从本应用复制，保留原始 source: ${source}, type: ${type}`);
            }
        }
        const item = { content, fullImage: type === 'image' ? fullImage : undefined, source, timestamp: Date.now(), type };
        if (!iconDataUrl) {
            iconDataUrl = await getAppIcon(source);
        }
        item.iconDataUrl = iconDataUrl;
        console.log('添加剪贴板项:', { content: content.substring(0, 50), source, type, timestamp: item.timestamp });
        clipboardHistory = clipboardHistory.filter(i => i.content !== content || i.type !== type);
        clipboardHistory.unshift(item);
        if (clipboardHistory.length > MAX_HISTORY) clipboardHistory.pop();
        store.set('clipboardHistory', clipboardHistory);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('history-updated', clipboardHistory);
        }
    } catch (err) {
        console.error('处理剪贴板更新失败:', err.message);
    }
}

function startClipboardWatcher() {
    let lastText = clipboard.readText() || '';
    let lastImage = clipboard.readImage().toDataURL();
    const checkClipboard = async () => {
        try {
            const currentText = clipboard.readText() || '';
            const currentImage = clipboard.readImage().toDataURL();
            if ((currentText && currentText !== lastText) || currentImage !== lastImage) {
                console.log('检测到剪贴板变化:', { text: currentText.substring(0, 50), hasImage: !clipboard.readImage().isEmpty() });
                lastText = currentText;
                lastImage = currentImage;
                await handleClipboardUpdate();
            }
            setTimeout(checkClipboard, 500);
        } catch (err) {
            console.error('剪贴板监听失败:', err.message);
            setTimeout(checkClipboard, 1000);
        }
    };
    checkClipboard();
    app.on('will-quit', () => console.log('停止剪贴板监听'));
}

function setupIPC() {
    ipcMain.handle('get-clipboard-history', async () => {
        const history = store.get('clipboardHistory', []);
        for (const item of history) {
            if (!item.iconDataUrl) {
                item.iconDataUrl = await getAppIcon(item.source);
                console.log(`更新历史图标: ${item.source}`);
            }
        }
        return history;
    });
    ipcMain.handle('save-clipboard-item', async (event, item) => {
        let clipboardHistory = store.get('clipboardHistory', []);
        clipboardHistory = clipboardHistory.filter(i => i.content !== item.content || i.type !== item.type);
        if (!item.iconDataUrl) item.iconDataUrl = await getAppIcon(item.source);
        clipboardHistory.unshift(item);
        if (clipboardHistory.length > MAX_HISTORY) clipboardHistory.pop();
        store.set('clipboardHistory', clipboardHistory);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('history-updated', clipboardHistory);
        }
        return clipboardHistory;
    });
    ipcMain.handle('clear-clipboard-history', () => {
        store.set('clipboardHistory', []);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('history-updated', []);
        }
        return [];
    });
    ipcMain.handle('write-clipboard', (event, { content, type, fullImage }) => {
        try {
            if (type === 'image') {
                const image = nativeImage.createFromDataURL(fullImage || content);
                clipboard.writeImage(image);
                console.log('写入剪贴板图片:', (fullImage || content).substring(0, 50));
            } else {
                clipboard.writeText(content);
                console.log('写入剪贴板文本:', content.substring(0, 50));
            }
        } catch (err) {
            console.error('写入剪贴板失败:', err.message);
        }
    });
    ipcMain.handle('open-preview', (event, { content, type }) => {
        try {
            createPreviewWindow({ content, type });
            console.log('触发预览:', { type, content: content.substring(0, 50) });
        } catch (err) {
            console.error('打开预览失败:', err.message);
        }
    });
    ipcMain.handle('get-settings', () => ({
        autoHide: settingsStore.get('autoHide'),
        hotkey: settingsStore.get('hotkey')
    }));
    ipcMain.handle('update-settings', (event, settings) => {
        if (settings.autoHide !== undefined) settingsStore.set('autoHide', settings.autoHide);
        if (settings.hotkey) {
            const oldHotkey = settingsStore.get('hotkey');
            settingsStore.set('hotkey', settings.hotkey);
            try {
                globalShortcut.unregister(oldHotkey);
                if (!globalShortcut.register(settings.hotkey, toggleWindow)) {
                    globalShortcut.register(oldHotkey, toggleWindow);
                    settingsStore.set('hotkey', oldHotkey);
                    return { success: false, error: '快捷键注册失败' };
                }
            } catch (err) {
                console.error('更新快捷键失败:', err.message);
                return { success: false, error: err.message };
            }
        }
        updateTrayMenu();
        return { success: true };
    });
    ipcMain.handle('toggle-always-on-top', () => toggleAlwaysOnTop());
    ipcMain.handle('get-always-on-top', () => mainWindow ? mainWindow.isAlwaysOnTop() : false);
}

app.whenReady().then(() => {
    setupIPC();
    createWindow();
    createTray();
    registerGlobalShortcuts();
    startClipboardWatcher();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('before-quit', () => app.isQuitting = true);
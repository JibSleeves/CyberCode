const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const winston = require('winston');

// Initialize secure storage
const store = new Store({
  name: 'quonx-config',
  encryptionKey: 'quonx-secure-key-2024'
});

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class QuonxIDE {
  constructor() {
    this.mainWindow = null;
    this.serviceProcesses = new Map();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  async initialize() {
    try {
      await this.createMainWindow();
      await this.startBackendServices();
      this.setupIpcHandlers();
      this.setupMenus();
      this.setupAutoUpdater();
      
      logger.info('Quonx IDE initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Quonx IDE:', error);
      throw error;
    }
  }

  async createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false // For local model loading
      },
      icon: path.join(__dirname, '../assets/icons/quonx-icon.png'),
      titleBarStyle: 'hiddenInset',
      show: false
    });

    // Load the renderer
    if (this.isDevelopment) {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      // Focus on the window
      if (this.isDevelopment) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.cleanup();
    });
  }

  async startBackendServices() {
    const services = [
      { name: 'orchestrator', port: 8001, script: '../services/orchestrator/server.js' },
      { name: 'reasoner', port: 8002, script: '../services/reasoning/server.js' },
      { name: 'semantic', port: 8003, script: '../services/semantic/server.js' },
      { name: 'file-manager', port: 8004, script: '../services/file-manager/server.js' },
      { name: 'vector-store', port: 8005, script: '../services/vector-store/server.js' },
      { name: 'code-executor', port: 8006, script: '../services/code-executor/server.js' },
      { name: 'web-search', port: 8007, script: '../services/web-search/server.js' },
      { name: 'intent-inference', port: 8008, script: '../services/intent-inference/server.js' },
      { name: 'digital-twin', port: 8009, script: '../services/digital-twin/server.js' }
    ];

    for (const service of services) {
      try {
        await this.startService(service);
        logger.info(`Started service: ${service.name} on port ${service.port}`);
      } catch (error) {
        logger.error(`Failed to start service ${service.name}:`, error);
      }
    }
  }

  startService(service) {
    return new Promise((resolve, reject) => {
      const servicePath = path.join(__dirname, service.script);
      const process = spawn('node', [servicePath], {
        env: { ...process.env, PORT: service.port },
        stdio: 'pipe'
      });

      process.stdout.on('data', (data) => {
        logger.info(`[${service.name}] ${data.toString()}`);
      });

      process.stderr.on('data', (data) => {
        logger.error(`[${service.name}] ${data.toString()}`);
      });

      process.on('error', (error) => {
        logger.error(`Service ${service.name} error:`, error);
        reject(error);
      });

      // Wait for service to be ready
      setTimeout(() => {
        if (process.pid) {
          this.serviceProcesses.set(service.name, process);
          resolve();
        } else {
          reject(new Error(`Service ${service.name} failed to start`));
        }
      }, 2000);
    });
  }

  setupIpcHandlers() {
    // File operations
    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'Code Files', extensions: ['js', 'ts', 'py', 'java', 'cpp', 'c', 'go', 'rs'] },
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] }
        ]
      });
      return result;
    });

    ipcMain.handle('open-folder-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      return result;
    });

    // Settings management
    ipcMain.handle('get-setting', (event, key) => {
      return store.get(key);
    });

    ipcMain.handle('set-setting', (event, key, value) => {
      store.set(key, value);
      return true;
    });

    ipcMain.handle('get-all-settings', () => {
      return store.store;
    });

    // Service communication
    ipcMain.handle('service-request', async (event, serviceName, endpoint, data) => {
      try {
        const axios = require('axios');
        const servicePort = this.getServicePort(serviceName);
        const response = await axios.post(`http://localhost:${servicePort}${endpoint}`, data);
        return response.data;
      } catch (error) {
        logger.error(`Service request failed: ${serviceName}${endpoint}`, error);
        throw error;
      }
    });

    // External links
    ipcMain.handle('open-external', (event, url) => {
      shell.openExternal(url);
    });
  }

  getServicePort(serviceName) {
    const portMap = {
      'orchestrator': 8001,
      'reasoner': 8002,
      'semantic': 8003,
      'file-manager': 8004,
      'vector-store': 8005,
      'code-executor': 8006,
      'web-search': 8007,
      'intent-inference': 8008,
      'digital-twin': 8009
    };
    return portMap[serviceName] || 8000;
  }

  setupMenus() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Project',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.mainWindow.webContents.send('menu-new-project')
          },
          {
            label: 'Open Project',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.mainWindow.webContents.send('menu-open-project')
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.mainWindow.webContents.send('menu-settings')
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' }
        ]
      },
      {
        label: 'AI',
        submenu: [
          {
            label: 'Chat with AI',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => this.mainWindow.webContents.send('menu-ai-chat')
          },
          {
            label: 'Generate Code',
            accelerator: 'CmdOrCtrl+Shift+G',
            click: () => this.mainWindow.webContents.send('menu-generate-code')
          },
          {
            label: 'Explain Code',
            accelerator: 'CmdOrCtrl+Shift+E',
            click: () => this.mainWindow.webContents.send('menu-explain-code')
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About Quonx',
            click: () => this.mainWindow.webContents.send('menu-about')
          },
          {
            label: 'Documentation',
            click: () => shell.openExternal('https://github.com/quonx/docs')
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupAutoUpdater() {
    if (!this.isDevelopment) {
      autoUpdater.checkForUpdatesAndNotify();
      
      autoUpdater.on('update-available', () => {
        this.mainWindow.webContents.send('update-available');
      });

      autoUpdater.on('update-downloaded', () => {
        this.mainWindow.webContents.send('update-downloaded');
      });
    }
  }

  cleanup() {
    logger.info('Cleaning up Quonx IDE...');
    
    // Kill all service processes
    for (const [name, process] of this.serviceProcesses) {
      try {
        process.kill();
        logger.info(`Killed service: ${name}`);
      } catch (error) {
        logger.error(`Failed to kill service ${name}:`, error);
      }
    }
    
    this.serviceProcesses.clear();
  }
}

// Application event handlers
app.whenReady().then(async () => {
  const quonx = new QuonxIDE();
  try {
    await quonx.initialize();
  } catch (error) {
    logger.error('Failed to start Quonx IDE:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const quonx = new QuonxIDE();
    await quonx.initialize();
  }
});

// Handle certificate errors for local services
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith('http://localhost:')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
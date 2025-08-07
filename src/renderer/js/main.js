// Quonx IDE - Main Application Controller
class QuonxIDE {
  constructor() {
    this.initialized = false;
    this.services = new Map();
    this.currentProject = null;
    this.activeEditor = null;
    this.aiModels = new Map();
    this.conversations = new Map();
    
    // Core managers
    this.api = new APIManager();
    this.editor = new EditorManager();
    this.fileExplorer = new FileExplorerManager();
    this.aiChat = new AIChatManager();
    this.terminal = new TerminalManager();
    this.settings = new SettingsManager();
    
    // State management
    this.state = {
      theme: 'pixel-dark',
      currentFile: null,
      openFiles: new Map(),
      sidebarVisible: true,
      bottomPanelVisible: true,
      aiStatus: 'initializing'
    };

    // Event handlers
    this.setupEventHandlers();
  }

  async initialize() {
    try {
      this.showLoadingScreen();
      await this.loadConfiguration();
      await this.initializeServices();
      await this.setupUI();
      await this.loadSettings();
      this.hideLoadingScreen();
      this.initialized = true;
      
      console.log('🤖 Quonx IDE initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Quonx IDE:', error);
      this.showErrorScreen(error);
    }
  }

  showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainInterface = document.getElementById('main-interface');
    
    if (loadingScreen) loadingScreen.style.display = 'flex';
    if (mainInterface) mainInterface.style.display = 'none';
    
    this.updateLoadingProgress('Initializing AI Systems...', 10);
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const mainInterface = document.getElementById('main-interface');
    
    setTimeout(() => {
      if (loadingScreen) loadingScreen.style.display = 'none';
      if (mainInterface) mainInterface.style.display = 'block';
    }, 1000);
  }

  updateLoadingProgress(text, progress) {
    const loadingText = document.querySelector('.loading-text');
    const progressBar = document.querySelector('.loading-progress');
    
    if (loadingText) loadingText.textContent = text;
    if (progressBar) progressBar.style.width = `${progress}%`;
  }

  async loadConfiguration() {
    this.updateLoadingProgress('Loading Configuration...', 20);
    
    try {
      const config = await this.api.getConfiguration();
      this.config = config;
    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error);
      this.config = this.getDefaultConfiguration();
    }
  }

  getDefaultConfiguration() {
    return {
      theme: 'pixel-dark',
      models: {
        chat: 'local',
        code: 'local', 
        reasoning: 'local'
      },
      ui: {
        fontSize: 12,
        fontFamily: 'Press Start 2P',
        animations: true
      }
    };
  }

  async initializeServices() {
    this.updateLoadingProgress('Starting AI Services...', 40);
    
    const services = [
      'orchestrator',
      'reasoning', 
      'semantic',
      'file-manager',
      'vector-store'
    ];

    for (const service of services) {
      try {
        await this.api.checkServiceHealth(service);
        this.services.set(service, { status: 'healthy' });
      } catch (error) {
        console.warn(`Service ${service} not available:`, error);
        this.services.set(service, { status: 'unavailable', error });
      }
    }

    // Initialize AI models
    await this.initializeAIModels();
  }

  async initializeAIModels() {
    this.updateLoadingProgress('Loading AI Models...', 60);
    
    try {
      const models = await this.api.listModels();
      
      models.active.forEach(model => {
        this.aiModels.set(model.modelId || model.id, {
          ...model,
          status: 'ready'
        });
      });

      this.updateAIStatus('ready');
    } catch (error) {
      console.error('Failed to load AI models:', error);
      this.updateAIStatus('error');
    }
  }

  async setupUI() {
    this.updateLoadingProgress('Setting up Interface...', 80);
    
    // Initialize managers
    await this.editor.initialize(this);
    await this.fileExplorer.initialize(this);
    await this.aiChat.initialize(this);
    await this.terminal.initialize(this);
    await this.settings.initialize(this);
    
    // Setup tab system
    this.setupTabSystem();
    
    // Setup panels
    this.setupPanels();
    
    // Apply theme
    this.applyTheme(this.config.theme);
  }

  async loadSettings() {
    this.updateLoadingProgress('Loading User Settings...', 90);
    
    try {
      const userSettings = await this.settings.load();
      this.applySettings(userSettings);
    } catch (error) {
      console.warn('Failed to load user settings:', error);
    }
  }

  setupEventHandlers() {
    // Menu handlers
    window.electronAPI?.onMenuAction((action) => {
      this.handleMenuAction(action);
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });

    // File drag and drop
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleFileDrop(e);
    });
  }

  setupTabSystem() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = button.dataset.tab;
        this.switchTab(button.closest('.sidebar, .bottom-panel'), tabName);
      });
    });
  }

  switchTab(container, tabName) {
    // Hide all panels
    const panels = container.querySelectorAll('.tab-panel');
    panels.forEach(panel => panel.classList.remove('active'));
    
    // Hide all tab buttons
    const buttons = container.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected panel and button
    const targetPanel = container.querySelector(`#${tabName}-panel`);
    const targetButton = container.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetPanel) targetPanel.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
  }

  setupPanels() {
    // Setup resizable panels
    this.setupResizablePanels();
    
    // Setup welcome screen handlers
    this.setupWelcomeHandlers();
    
    // Setup status bar
    this.setupStatusBar();
  }

  setupResizablePanels() {
    const resizeHandles = document.querySelectorAll('.resize-handle');
    
    resizeHandles.forEach(handle => {
      let isResizing = false;
      let startX, startY, startWidth, startHeight;
      
      handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        
        const panel = handle.closest('.sidebar, .bottom-panel');
        const rect = panel.getBoundingClientRect();
        startWidth = rect.width;
        startHeight = rect.height;
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
      });
      
      const handleResize = (e) => {
        if (!isResizing) return;
        
        const panel = handle.closest('.sidebar, .bottom-panel');
        
        if (handle.classList.contains('horizontal')) {
          const deltaY = startY - e.clientY;
          const newHeight = Math.max(150, startHeight + deltaY);
          panel.style.height = `${newHeight}px`;
        } else {
          const deltaX = e.clientX - startX;
          const newWidth = Math.max(200, startWidth + deltaX);
          panel.style.width = `${newWidth}px`;
        }
      };
      
      const stopResize = () => {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      };
    });
  }

  setupWelcomeHandlers() {
    const welcomeButtons = {
      'welcome-new-project': () => this.createNewProject(),
      'welcome-open-project': () => this.openProject(),
      'welcome-clone-repo': () => this.cloneRepository(),
      'welcome-ai-chat': () => this.openAIChat(),
      'welcome-generate-project': () => this.generateProject(),
      'welcome-upload-docs': () => this.uploadDocuments()
    };

    Object.entries(welcomeButtons).forEach(([id, handler]) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
      }
    });
  }

  setupStatusBar() {
    this.updateStatusBar({
      branch: 'main',
      sync: 'Synced',
      position: 'Ln 1, Col 1',
      language: 'Plain Text',
      encoding: 'UTF-8',
      aiModel: 'Local Model'
    });
  }

  updateStatusBar(info) {
    const elements = {
      'current-branch': info.branch,
      'sync-status': info.sync,
      'cursor-position': info.position,
      'language-mode': info.language,
      'encoding': info.encoding,
      'ai-model-status': info.aiModel
    };

    Object.entries(elements).forEach(([id, text]) => {
      const element = document.getElementById(id);
      if (element) {
        const textElement = element.querySelector('.text');
        if (textElement) textElement.textContent = text;
      }
    });
  }

  handleMenuAction(action) {
    const actions = {
      'new-project': () => this.createNewProject(),
      'open-project': () => this.openProject(),
      'settings': () => this.openSettings(),
      'ai-chat': () => this.openAIChat(),
      'generate-code': () => this.generateCode(),
      'explain-code': () => this.explainCode(),
      'about': () => this.showAbout()
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  handleKeyboardShortcut(e) {
    const shortcuts = {
      'ctrl+n': () => this.createNewFile(),
      'ctrl+o': () => this.openProject(),
      'ctrl+s': () => this.saveCurrentFile(),
      'ctrl+shift+c': () => this.openAIChat(),
      'ctrl+shift+g': () => this.generateCode(),
      'ctrl+shift+e': () => this.explainCode(),
      'ctrl+`': () => this.toggleTerminal(),
      'f1': () => this.showCommandPalette()
    };

    const key = `${e.ctrlKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
    
    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key]();
    }
  }

  handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      if (file.type.startsWith('text/') || this.isCodeFile(file.name)) {
        this.openFile(file.path);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        this.uploadDocument(file);
      }
    });
  }

  isCodeFile(filename) {
    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  // Project Management
  async createNewProject() {
    try {
      const projectPath = await window.electronAPI?.showSaveDialog({
        title: 'Create New Project',
        defaultPath: 'new-project',
        properties: ['createDirectory']
      });

      if (projectPath) {
        await this.api.createProject(projectPath);
        await this.openProject(projectPath);
      }
    } catch (error) {
      this.showError('Failed to create project', error);
    }
  }

  async openProject(projectPath) {
    try {
      if (!projectPath) {
        const result = await window.electronAPI?.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Open Project'
        });
        projectPath = result?.filePaths?.[0];
      }

      if (projectPath) {
        const projectInfo = await this.api.openProject(projectPath);
        this.currentProject = projectInfo;
        
        await this.fileExplorer.loadProject(projectInfo);
        this.updateProjectName(projectInfo.name);
        this.hideWelcomeScreen();
      }
    } catch (error) {
      this.showError('Failed to open project', error);
    }
  }

  // File Management
  async openFile(filePath) {
    try {
      const fileContent = await this.api.readFile(filePath);
      await this.editor.openFile(filePath, fileContent);
      this.hideWelcomeScreen();
    } catch (error) {
      this.showError('Failed to open file', error);
    }
  }

  async saveCurrentFile() {
    if (this.editor.activeFile) {
      try {
        const content = this.editor.getContent();
        await this.api.writeFile(this.editor.activeFile.path, content);
        this.editor.markSaved();
      } catch (error) {
        this.showError('Failed to save file', error);
      }
    }
  }

  // AI Features
  async openAIChat() {
    this.switchTab(document.querySelector('.right-sidebar'), 'ai-chat');
    this.aiChat.focus();
  }

  async generateCode() {
    const selectedText = this.editor.getSelectedText();
    const prompt = selectedText || 'Generate code for the current context';
    
    try {
      const response = await this.api.generateCode(prompt, {
        context: this.getCurrentContext()
      });
      
      if (selectedText) {
        this.editor.replaceSelection(response.code);
      } else {
        this.editor.insertAtCursor(response.code);
      }
    } catch (error) {
      this.showError('Failed to generate code', error);
    }
  }

  async explainCode() {
    const selectedText = this.editor.getSelectedText();
    
    if (!selectedText) {
      this.showError('Please select code to explain');
      return;
    }

    try {
      const response = await this.api.explainCode(selectedText, {
        context: this.getCurrentContext()
      });
      
      this.aiChat.addMessage('assistant', response.explanation);
      this.openAIChat();
    } catch (error) {
      this.showError('Failed to explain code', error);
    }
  }

  getCurrentContext() {
    return {
      project: this.currentProject,
      currentFile: this.editor.activeFile,
      cursorPosition: this.editor.getCursorPosition(),
      selectedText: this.editor.getSelectedText()
    };
  }

  // UI Management
  hideWelcomeScreen() {
    const welcome = document.getElementById('editor-welcome');
    const mount = document.getElementById('editor-mount');
    
    if (welcome) welcome.style.display = 'none';
    if (mount) mount.style.display = 'block';
  }

  updateProjectName(name) {
    const projectElement = document.getElementById('current-project');
    if (projectElement) {
      projectElement.textContent = name || 'No Project';
    }
  }

  updateAIStatus(status) {
    this.state.aiStatus = status;
    
    const statusElement = document.getElementById('ai-status');
    const dot = statusElement?.querySelector('.status-dot');
    const text = statusElement?.querySelector('.status-text');
    
    if (dot && text) {
      dot.className = 'status-dot';
      
      switch (status) {
        case 'ready':
          dot.classList.add('active');
          text.textContent = 'AI Ready';
          break;
        case 'processing':
          dot.classList.add('warning');
          text.textContent = 'AI Processing...';
          break;
        case 'error':
          dot.classList.add('error');
          text.textContent = 'AI Error';
          break;
        default:
          text.textContent = 'AI Initializing...';
      }
    }
  }

  applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    this.state.theme = theme;
  }

  applySettings(settings) {
    if (settings.theme) {
      this.applyTheme(settings.theme);
    }
    
    if (settings.fontSize) {
      document.documentElement.style.setProperty('--pixel-font-size-base', `${settings.fontSize}px`);
    }
  }

  // Utility Methods
  showError(title, error) {
    console.error(title, error);
    
    // TODO: Implement proper error modal
    alert(`${title}: ${error?.message || error}`);
  }

  showErrorScreen(error) {
    const loadingScreen = document.getElementById('loading-screen');
    const content = loadingScreen?.querySelector('.loading-content');
    
    if (content) {
      content.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Failed to Initialize Quonx IDE</div>
          <div class="error-message">${error.message}</div>
          <button class="pixel-button" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  cleanup() {
    if (this.editor) this.editor.cleanup();
    if (this.terminal) this.terminal.cleanup();
    
    // Save current state
    this.settings.save(this.state);
  }

  // Development helpers
  getDebugInfo() {
    return {
      initialized: this.initialized,
      services: Object.fromEntries(this.services),
      models: Object.fromEntries(this.aiModels),
      state: this.state,
      currentProject: this.currentProject
    };
  }
}

// Initialize the IDE when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  window.quonx = new QuonxIDE();
  await window.quonx.initialize();
  
  // Expose for debugging
  if (process.env.NODE_ENV === 'development') {
    window.debugQuonx = () => window.quonx.getDebugInfo();
  }
});

// Handle hot reload in development
if (module.hot) {
  module.hot.accept();
}
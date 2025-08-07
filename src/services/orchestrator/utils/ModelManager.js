const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

class ModelManager {
  constructor() {
    this.models = new Map();
    this.providers = new Map();
    this.activeModels = new Map();
    this.config = {
      modelsDir: path.join(process.cwd(), 'models'),
      llamaCppPath: path.join(process.cwd(), 'bin', 'llama-cpp'),
      maxConcurrentModels: 3,
      defaultTimeout: 30000
    };
    
    this.initializeProviders();
  }

  async initialize() {
    try {
      // Ensure models directory exists
      await fs.mkdir(this.config.modelsDir, { recursive: true });
      
      // Scan for local models
      await this.scanLocalModels();
      
      // Initialize external providers
      await this.initializeExternalProviders();
      
      console.log('ModelManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ModelManager:', error);
      throw error;
    }
  }

  initializeProviders() {
    // Local llama.cpp provider
    this.providers.set('llamacpp', {
      type: 'local',
      loadModel: this.loadLlamaCppModel.bind(this),
      generate: this.generateLlamaCpp.bind(this),
      unload: this.unloadLlamaCppModel.bind(this)
    });

    // Ollama provider
    this.providers.set('ollama', {
      type: 'local',
      loadModel: this.loadOllamaModel.bind(this),
      generate: this.generateOllama.bind(this),
      unload: this.unloadOllamaModel.bind(this)
    });

    // OpenAI provider
    this.providers.set('openai', {
      type: 'api',
      loadModel: this.loadOpenAIModel.bind(this),
      generate: this.generateOpenAI.bind(this),
      unload: this.unloadOpenAIModel.bind(this)
    });

    // Google Gemini provider
    this.providers.set('gemini', {
      type: 'api',
      loadModel: this.loadGeminiModel.bind(this),
      generate: this.generateGemini.bind(this),
      unload: this.unloadGeminiModel.bind(this)
    });

    // Claude provider (via API)
    this.providers.set('claude', {
      type: 'api',
      loadModel: this.loadClaudeModel.bind(this),
      generate: this.generateClaude.bind(this),
      unload: this.unloadClaudeModel.bind(this)
    });

    // Hugging Face provider
    this.providers.set('huggingface', {
      type: 'api',
      loadModel: this.loadHuggingFaceModel.bind(this),
      generate: this.generateHuggingFace.bind(this),
      unload: this.unloadHuggingFaceModel.bind(this)
    });
  }

  async scanLocalModels() {
    try {
      const files = await fs.readdir(this.config.modelsDir);
      const modelFiles = files.filter(file => 
        file.endsWith('.gguf') || 
        file.endsWith('.bin') || 
        file.endsWith('.safetensors')
      );

      for (const file of modelFiles) {
        const modelPath = path.join(this.config.modelsDir, file);
        const stats = await fs.stat(modelPath);
        
        const modelInfo = {
          id: file.replace(/\.(gguf|bin|safetensors)$/, ''),
          name: file,
          path: modelPath,
          size: stats.size,
          provider: 'llamacpp',
          type: 'local',
          format: path.extname(file).slice(1),
          loaded: false,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };

        this.models.set(modelInfo.id, modelInfo);
      }

      console.log(`Found ${modelFiles.length} local models`);
    } catch (error) {
      console.error('Failed to scan local models:', error);
    }
  }

  async initializeExternalProviders() {
    // Initialize OpenAI if API key is provided
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      this.activeModels.set('openai-gpt-4', {
        client: openai,
        model: 'gpt-4',
        provider: 'openai',
        type: 'api'
      });
      
      this.activeModels.set('openai-gpt-3.5-turbo', {
        client: openai,
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        type: 'api'
      });
    }

    // Initialize Google Gemini if API key is provided
    const geminiKey = process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      this.activeModels.set('gemini-pro', {
        client: genAI.getGenerativeModel({ model: 'gemini-pro' }),
        model: 'gemini-pro',
        provider: 'gemini',
        type: 'api'
      });
    }

    // Initialize Claude if API key is provided
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (claudeKey) {
      this.activeModels.set('claude-3-opus', {
        client: { apiKey: claudeKey },
        model: 'claude-3-opus-20240229',
        provider: 'claude',
        type: 'api'
      });
    }

    // Check for Ollama availability
    try {
      const response = await axios.get('http://localhost:11434/api/tags');
      const ollamaModels = response.data.models || [];
      
      for (const model of ollamaModels) {
        this.activeModels.set(`ollama-${model.name}`, {
          model: model.name,
          provider: 'ollama',
          type: 'local',
          size: model.size,
          modifiedAt: model.modified_at
        });
      }
      
      console.log(`Found ${ollamaModels.length} Ollama models`);
    } catch (error) {
      console.log('Ollama not available');
    }
  }

  async loadModel(modelType, modelPath, config = {}) {
    const modelId = config.modelId || path.basename(modelPath, path.extname(modelPath));
    
    // Check if model is already loaded
    if (this.activeModels.has(modelId)) {
      return { modelId, status: 'already_loaded' };
    }

    // Check concurrent model limit
    const activeLocalModels = Array.from(this.activeModels.values())
      .filter(model => model.type === 'local').length;
    
    if (activeLocalModels >= this.config.maxConcurrentModels) {
      throw new Error('Maximum concurrent models limit reached');
    }

    const provider = this.providers.get(modelType);
    if (!provider) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    const result = await provider.loadModel(modelPath, config);
    result.modelId = modelId;
    
    this.activeModels.set(modelId, {
      ...result,
      modelId,
      provider: modelType,
      loadedAt: new Date().toISOString()
    });

    return result;
  }

  async unloadModel(modelId) {
    const model = this.activeModels.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const provider = this.providers.get(model.provider);
    if (provider.unload) {
      await provider.unload(model);
    }

    this.activeModels.delete(modelId);
    return { modelId, status: 'unloaded' };
  }

  async generate(modelId, prompt, options = {}) {
    const model = this.activeModels.get(modelId) || this.getDefaultModel(options.role);
    if (!model) {
      throw new Error(`Model not available: ${modelId}`);
    }

    const provider = this.providers.get(model.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${model.provider}`);
    }

    const startTime = Date.now();
    try {
      const result = await provider.generate(model, prompt, options);
      const endTime = Date.now();
      
      return {
        ...result,
        modelId: model.modelId || modelId,
        provider: model.provider,
        processingTime: endTime - startTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Generation failed for model ${modelId}:`, error);
      throw error;
    }
  }

  getDefaultModel(role) {
    // Return default models based on role
    const defaults = {
      chat: this.activeModels.get('openai-gpt-4') || 
            this.activeModels.get('gemini-pro') ||
            Array.from(this.activeModels.values()).find(m => m.provider === 'llamacpp'),
      code: this.activeModels.get('openai-gpt-4') ||
            Array.from(this.activeModels.values()).find(m => m.provider === 'llamacpp'),
      reasoning: this.activeModels.get('claude-3-opus') ||
                this.activeModels.get('openai-gpt-4') ||
                Array.from(this.activeModels.values()).find(m => m.provider === 'llamacpp')
    };

    return defaults[role] || Array.from(this.activeModels.values())[0];
  }

  // llama.cpp implementation
  async loadLlamaCppModel(modelPath, config) {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-c', config.contextSize || '4096',
        '-t', config.threads || '4',
        '--port', config.port || '8080',
        '--host', config.host || '127.0.0.1'
      ];

      if (config.gpuLayers) {
        args.push('-ngl', config.gpuLayers.toString());
      }

      const process = spawn(this.config.llamaCppPath, args);
      
      process.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('HTTP server listening')) {
          resolve({
            type: 'local',
            process: process,
            port: config.port || 8080,
            host: config.host || '127.0.0.1'
          });
        }
      });

      process.stderr.on('data', (data) => {
        console.error('llama.cpp stderr:', data.toString());
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to start llama.cpp: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!process.killed) {
          process.kill();
          reject(new Error('llama.cpp startup timeout'));
        }
      }, 30000);
    });
  }

  async generateLlamaCpp(model, prompt, options) {
    const response = await axios.post(`http://${model.host}:${model.port}/completion`, {
      prompt,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stop: options.stop || [],
      stream: false
    });

    return {
      text: response.data.content,
      usage: {
        promptTokens: response.data.tokens_evaluated,
        completionTokens: response.data.tokens_predicted,
        totalTokens: response.data.tokens_evaluated + response.data.tokens_predicted
      }
    };
  }

  async unloadLlamaCppModel(model) {
    if (model.process && !model.process.killed) {
      model.process.kill();
    }
  }

  // Ollama implementation
  async loadOllamaModel(modelName, config) {
    try {
      await axios.post('http://localhost:11434/api/pull', {
        name: modelName,
        stream: false
      });

      return {
        type: 'local',
        model: modelName,
        host: 'localhost',
        port: 11434
      };
    } catch (error) {
      throw new Error(`Failed to load Ollama model: ${error.message}`);
    }
  }

  async generateOllama(model, prompt, options) {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model.model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        num_predict: options.maxTokens || 1000
      }
    });

    return {
      text: response.data.response,
      usage: {
        promptTokens: response.data.prompt_eval_count || 0,
        completionTokens: response.data.eval_count || 0,
        totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      }
    };
  }

  async unloadOllamaModel(model) {
    // Ollama handles model lifecycle automatically
    return Promise.resolve();
  }

  // OpenAI implementation
  async loadOpenAIModel(modelName, config) {
    return {
      type: 'api',
      model: modelName,
      client: new OpenAI({ apiKey: config.apiKey || process.env.OPENAI_API_KEY })
    };
  }

  async generateOpenAI(model, prompt, options) {
    const messages = options.messages || [{ role: 'user', content: prompt }];
    
    const response = await model.client.chat.completions.create({
      model: model.model,
      messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stop: options.stop
    });

    return {
      text: response.choices[0].message.content,
      usage: response.usage,
      finishReason: response.choices[0].finish_reason
    };
  }

  async unloadOpenAIModel(model) {
    // API models don't need explicit unloading
    return Promise.resolve();
  }

  // Google Gemini implementation
  async loadGeminiModel(modelName, config) {
    const genAI = new GoogleGenerativeAI(config.apiKey || process.env.GOOGLE_API_KEY);
    return {
      type: 'api',
      model: modelName,
      client: genAI.getGenerativeModel({ model: modelName })
    };
  }

  async generateGemini(model, prompt, options) {
    const result = await model.client.generateContent(prompt);
    const response = await result.response;
    
    return {
      text: response.text(),
      usage: {
        promptTokens: response.promptTokenCount || 0,
        completionTokens: response.candidatesTokenCount || 0,
        totalTokens: (response.promptTokenCount || 0) + (response.candidatesTokenCount || 0)
      }
    };
  }

  async unloadGeminiModel(model) {
    return Promise.resolve();
  }

  // Claude implementation
  async loadClaudeModel(modelName, config) {
    return {
      type: 'api',
      model: modelName,
      client: { apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY }
    };
  }

  async generateClaude(model, prompt, options) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: model.model,
      max_tokens: options.maxTokens || 1000,
      messages: options.messages || [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${model.client.apiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': model.client.apiKey
      }
    });

    return {
      text: response.data.content[0].text,
      usage: response.data.usage,
      finishReason: response.data.stop_reason
    };
  }

  async unloadClaudeModel(model) {
    return Promise.resolve();
  }

  // Hugging Face implementation
  async loadHuggingFaceModel(modelName, config) {
    return {
      type: 'api',
      model: modelName,
      client: { apiKey: config.apiKey || process.env.HUGGINGFACE_API_KEY }
    };
  }

  async generateHuggingFace(model, prompt, options) {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model.model}`,
      { inputs: prompt, parameters: options },
      {
        headers: {
          'Authorization': `Bearer ${model.client.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      text: response.data[0].generated_text || response.data.generated_text,
      usage: {
        promptTokens: 0, // HF doesn't provide token counts
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }

  async unloadHuggingFaceModel(model) {
    return Promise.resolve();
  }

  // Utility methods
  async listModels() {
    const localModels = Array.from(this.models.values());
    const activeModels = Array.from(this.activeModels.values());
    
    return {
      local: localModels,
      active: activeModels,
      providers: Array.from(this.providers.keys())
    };
  }

  async getModelInfo(modelId) {
    return this.models.get(modelId) || this.activeModels.get(modelId);
  }

  async uploadModel(file, metadata = {}) {
    const filename = metadata.filename || file.originalname;
    const modelPath = path.join(this.config.modelsDir, filename);
    
    await fs.writeFile(modelPath, file.buffer);
    
    const modelInfo = {
      id: filename.replace(/\.(gguf|bin|safetensors)$/, ''),
      name: filename,
      path: modelPath,
      size: file.size,
      provider: 'llamacpp',
      type: 'local',
      format: path.extname(filename).slice(1),
      loaded: false,
      uploadedAt: new Date().toISOString(),
      metadata
    };

    this.models.set(modelInfo.id, modelInfo);
    return modelInfo;
  }

  async deleteModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Unload if active
    if (this.activeModels.has(modelId)) {
      await this.unloadModel(modelId);
    }

    // Delete file
    if (model.type === 'local' && model.path) {
      await fs.unlink(model.path);
    }

    this.models.delete(modelId);
    return { modelId, status: 'deleted' };
  }

  // Health check
  async checkHealth() {
    const health = {
      status: 'healthy',
      models: {
        total: this.models.size,
        active: this.activeModels.size,
        local: Array.from(this.models.values()).filter(m => m.type === 'local').length,
        api: Array.from(this.activeModels.values()).filter(m => m.type === 'api').length
      },
      providers: {
        available: Array.from(this.providers.keys()),
        active: [...new Set(Array.from(this.activeModels.values()).map(m => m.provider))]
      },
      resources: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    return health;
  }
}

module.exports = ModelManager;
class BaseAgent {
  constructor(type, modelManager, logger) {
    this.type = type;
    this.modelManager = modelManager;
    this.logger = logger;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    this.startTime = Date.now();
  }

  async process(request, requestId) {
    throw new Error('process() method must be implemented by subclass');
  }

  updateMetrics(processingTime, success = true) {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += processingTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      successRate: this.metrics.totalRequests > 0 
        ? this.metrics.successfulRequests / this.metrics.totalRequests 
        : 0
    };
  }

  async checkHealth() {
    return {
      status: 'healthy',
      type: this.type,
      metrics: this.getMetrics()
    };
  }

  log(level, message, meta = {}) {
    this.logger[level](message, {
      agent: this.type,
      ...meta
    });
  }

  // Common utility methods
  extractCodeBlocks(text) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }
    
    return blocks;
  }

  formatResponse(text, metadata = {}) {
    return {
      text: text.trim(),
      timestamp: new Date().toISOString(),
      agent: this.type,
      ...metadata
    };
  }

  validateRequest(request, requiredFields = []) {
    const errors = [];
    
    for (const field of requiredFields) {
      if (!(field in request)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid request: ${errors.join(', ')}`);
    }
  }

  async timeout(promise, ms) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return String(input);
    }
    
    // Remove potentially harmful content
    return input
      .replace(/\x00/g, '') // Remove null bytes
      .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  }

  truncateText(text, maxLength = 4000) {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }

  parseJsonSafely(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      this.log('warn', 'Failed to parse JSON', { jsonString, error: error.message });
      return null;
    }
  }

  async retry(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }
        
        this.log('warn', `Operation failed, retrying (${i + 1}/${maxRetries})`, {
          error: error.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  // Context management helpers
  buildContextSummary(context) {
    const summary = {
      hasProject: !!context.projectInfo,
      hasFile: !!context.currentFile,
      hasConversation: !!(context.conversationHistory && context.conversationHistory.length > 0),
      userExpertise: context.userProfile?.expertise || 'unknown'
    };
    
    return summary;
  }

  extractKeywords(text, maxKeywords = 10) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Error handling helpers
  createError(message, code = 'AGENT_ERROR', details = {}) {
    const error = new Error(message);
    error.code = code;
    error.agent = this.type;
    error.details = details;
    error.timestamp = new Date().toISOString();
    
    return error;
  }

  handleError(error, requestId, context = {}) {
    const errorInfo = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      agent: this.type,
      requestId,
      timestamp: new Date().toISOString(),
      context: this.buildContextSummary(context)
    };
    
    this.log('error', 'Agent processing error', errorInfo);
    this.updateMetrics(0, false);
    
    return errorInfo;
  }

  // Performance monitoring
  startTimer() {
    return Date.now();
  }

  endTimer(startTime) {
    return Date.now() - startTime;
  }

  measurePerformance(operation) {
    return async (...args) => {
      const startTime = this.startTimer();
      try {
        const result = await operation.apply(this, args);
        const duration = this.endTimer(startTime);
        this.updateMetrics(duration, true);
        return result;
      } catch (error) {
        const duration = this.endTimer(startTime);
        this.updateMetrics(duration, false);
        throw error;
      }
    };
  }

  // Memory management
  clearCache() {
    // Override in subclasses if they have caches to clear
    this.log('info', 'Cache cleared');
  }

  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024)
    };
  }

  // Configuration helpers
  getConfig(key, defaultValue = null) {
    return process.env[`${this.type.toUpperCase()}_${key.toUpperCase()}`] || defaultValue;
  }

  validateConfig(requiredKeys = []) {
    const missing = [];
    
    for (const key of requiredKeys) {
      if (!this.getConfig(key)) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  // Shutdown handling
  async shutdown() {
    this.log('info', 'Agent shutting down');
    this.clearCache();
    
    // Override in subclasses for cleanup
  }
}

module.exports = BaseAgent;
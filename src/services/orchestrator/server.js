const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Agent imports
const ChatAgent = require('./agents/ChatAgent');
const CodeAgent = require('./agents/CodeAgent');
const ReasoningAgent = require('./agents/ReasoningAgent');

// Utility imports
const ModelManager = require('./utils/ModelManager');
const ConversationManager = require('./utils/ConversationManager');
const ContextManager = require('./utils/ContextManager');

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/orchestrator-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/orchestrator.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

class OrchestratorService {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 8001;
    
    // Initialize managers
    this.modelManager = new ModelManager();
    this.conversationManager = new ConversationManager();
    this.contextManager = new ContextManager();
    
    // Initialize agents
    this.agents = {
      chat: new ChatAgent(this.modelManager, logger),
      code: new CodeAgent(this.modelManager, logger),
      reasoning: new ReasoningAgent(this.modelManager, logger)
    };
    
    // Active conversations
    this.conversations = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false
    }));
    
    // CORS
    this.app.use(cors({
      origin: ['http://localhost:3000', 'file://'],
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const requestId = uuidv4();
      req.requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      
      logger.info('Request received', {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      next();
    });
    
    // Rate limiting middleware
    this.app.use(async (req, res, next) => {
      try {
        await rateLimiter.consume(req.ip);
        next();
      } catch (rateLimiterRes) {
        logger.warn('Rate limit exceeded', { ip: req.ip });
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: rateLimiterRes.msBeforeNext
        });
      }
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../../../package.json').version
      });
    });

    // Model management
    this.app.get('/models', async (req, res) => {
      try {
        const models = await this.modelManager.listModels();
        res.json({ models });
      } catch (error) {
        logger.error('Failed to list models', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Failed to list models' });
      }
    });

    this.app.post('/models/load', async (req, res) => {
      try {
        const { modelType, modelPath, config } = req.body;
        const result = await this.modelManager.loadModel(modelType, modelPath, config);
        res.json({ success: true, modelId: result.modelId });
      } catch (error) {
        logger.error('Failed to load model', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Failed to load model' });
      }
    });

    // Conversation management
    this.app.post('/conversations', async (req, res) => {
      try {
        const conversationId = uuidv4();
        const conversation = this.conversationManager.createConversation(conversationId, req.body);
        this.conversations.set(conversationId, conversation);
        
        logger.info('Conversation created', { conversationId, requestId: req.requestId });
        res.json({ conversationId, conversation });
      } catch (error) {
        logger.error('Failed to create conversation', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Failed to create conversation' });
      }
    });

    this.app.get('/conversations/:id', (req, res) => {
      const conversation = this.conversations.get(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json({ conversation });
    });

    // Main orchestration endpoint
    this.app.post('/process', async (req, res) => {
      try {
        const { 
          input, 
          conversationId, 
          context = {}, 
          workflow = 'auto',
          models = {}
        } = req.body;

        if (!input) {
          return res.status(400).json({ error: 'Input is required' });
        }

        const result = await this.processRequest(input, conversationId, context, workflow, models, req.requestId);
        res.json(result);
      } catch (error) {
        logger.error('Failed to process request', { 
          error: error.message, 
          stack: error.stack,
          requestId: req.requestId 
        });
        res.status(500).json({ error: 'Failed to process request' });
      }
    });

    // Individual agent endpoints
    this.app.post('/agents/chat', async (req, res) => {
      try {
        const result = await this.agents.chat.process(req.body, req.requestId);
        res.json(result);
      } catch (error) {
        logger.error('Chat agent failed', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Chat agent failed' });
      }
    });

    this.app.post('/agents/code', async (req, res) => {
      try {
        const result = await this.agents.code.process(req.body, req.requestId);
        res.json(result);
      } catch (error) {
        logger.error('Code agent failed', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Code agent failed' });
      }
    });

    this.app.post('/agents/reasoning', async (req, res) => {
      try {
        const result = await this.agents.reasoning.process(req.body, req.requestId);
        res.json(result);
      } catch (error) {
        logger.error('Reasoning agent failed', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Reasoning agent failed' });
      }
    });

    // Context management
    this.app.post('/context/update', async (req, res) => {
      try {
        const { conversationId, context } = req.body;
        await this.contextManager.updateContext(conversationId, context);
        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to update context', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Failed to update context' });
      }
    });

    this.app.get('/context/:conversationId', async (req, res) => {
      try {
        const context = await this.contextManager.getContext(req.params.conversationId);
        res.json({ context });
      } catch (error) {
        logger.error('Failed to get context', { error: error.message, requestId: req.requestId });
        res.status(500).json({ error: 'Failed to get context' });
      }
    });

    // WebSocket endpoint for real-time communication
    this.app.get('/ws', (req, res) => {
      res.json({ message: 'WebSocket endpoint - upgrade required' });
    });
  }

  async processRequest(input, conversationId, context, workflow, models, requestId) {
    logger.info('Processing request', { 
      inputLength: input.length, 
      conversationId, 
      workflow, 
      requestId 
    });

    // Get or create conversation
    let conversation = this.conversations.get(conversationId);
    if (!conversation) {
      conversation = this.conversationManager.createConversation(conversationId, { context });
      this.conversations.set(conversationId, conversation);
    }

    // Update context
    await this.contextManager.updateContext(conversationId, context);

    // Determine workflow
    const actualWorkflow = workflow === 'auto' ? await this.determineWorkflow(input, context) : workflow;
    
    logger.info('Workflow determined', { workflow: actualWorkflow, requestId });

    // Execute workflow
    const result = await this.executeWorkflow(actualWorkflow, input, conversation, context, models, requestId);

    // Update conversation history
    this.conversationManager.addMessage(conversationId, {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    });

    this.conversationManager.addMessage(conversationId, {
      type: 'assistant',
      content: result.response,
      workflow: actualWorkflow,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    });

    return {
      response: result.response,
      workflow: actualWorkflow,
      conversationId,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    };
  }

  async determineWorkflow(input, context) {
    // Simple heuristics for workflow determination
    // In a full implementation, this would use a more sophisticated classifier
    
    const lowerInput = input.toLowerCase();
    
    // Code-related keywords
    if (lowerInput.includes('code') || lowerInput.includes('function') || 
        lowerInput.includes('class') || lowerInput.includes('bug') ||
        lowerInput.includes('debug') || lowerInput.includes('implement')) {
      return 'code-first';
    }
    
    // Reasoning-heavy keywords
    if (lowerInput.includes('analyze') || lowerInput.includes('explain') ||
        lowerInput.includes('why') || lowerInput.includes('how') ||
        lowerInput.includes('compare') || lowerInput.includes('evaluate')) {
      return 'reasoning-first';
    }
    
    // Default to chat-first for general queries
    return 'chat-first';
  }

  async executeWorkflow(workflow, input, conversation, context, models, requestId) {
    const workflowConfig = {
      chatModel: models.chat || 'default',
      codeModel: models.code || 'default',
      reasoningModel: models.reasoning || 'default'
    };

    switch (workflow) {
      case 'chat-first':
        return await this.executeChatFirstWorkflow(input, conversation, context, workflowConfig, requestId);
      
      case 'code-first':
        return await this.executeCodeFirstWorkflow(input, conversation, context, workflowConfig, requestId);
      
      case 'reasoning-first':
        return await this.executeReasoningFirstWorkflow(input, conversation, context, workflowConfig, requestId);
      
      case 'collaborative':
        return await this.executeCollaborativeWorkflow(input, conversation, context, workflowConfig, requestId);
      
      default:
        throw new Error(`Unknown workflow: ${workflow}`);
    }
  }

  async executeChatFirstWorkflow(input, conversation, context, config, requestId) {
    logger.info('Executing chat-first workflow', { requestId });

    // Step 1: Chat agent interprets the request
    const chatResult = await this.agents.chat.process({
      input,
      conversation: conversation.history,
      context,
      model: config.chatModel
    }, requestId);

    // If chat agent determines code is needed
    if (chatResult.needsCode) {
      const codeResult = await this.agents.code.process({
        input: chatResult.codeRequest || input,
        context: { ...context, chatContext: chatResult.context },
        model: config.codeModel
      }, requestId);

      // Optional reasoning validation
      if (codeResult.needsValidation) {
        const reasoningResult = await this.agents.reasoning.process({
          input: `Validate this code: ${codeResult.code}`,
          context: { ...context, codeContext: codeResult.context },
          model: config.reasoningModel
        }, requestId);

        return {
          response: this.combineResponses([chatResult, codeResult, reasoningResult]),
          metadata: {
            workflow: 'chat-first',
            steps: ['chat', 'code', 'reasoning'],
            agents: {
              chat: chatResult.metadata,
              code: codeResult.metadata,
              reasoning: reasoningResult.metadata
            }
          }
        };
      }

      return {
        response: this.combineResponses([chatResult, codeResult]),
        metadata: {
          workflow: 'chat-first',
          steps: ['chat', 'code'],
          agents: {
            chat: chatResult.metadata,
            code: codeResult.metadata
          }
        }
      };
    }

    return {
      response: chatResult.response,
      metadata: {
        workflow: 'chat-first',
        steps: ['chat'],
        agents: {
          chat: chatResult.metadata
        }
      }
    };
  }

  async executeCodeFirstWorkflow(input, conversation, context, config, requestId) {
    logger.info('Executing code-first workflow', { requestId });

    // Step 1: Code agent generates solution
    const codeResult = await this.agents.code.process({
      input,
      conversation: conversation.history,
      context,
      model: config.codeModel
    }, requestId);

    // Step 2: Reasoning agent validates and explains
    const reasoningResult = await this.agents.reasoning.process({
      input: `Analyze and explain this code solution: ${codeResult.code || codeResult.response}`,
      context: { ...context, codeContext: codeResult.context },
      model: config.reasoningModel
    }, requestId);

    // Step 3: Chat agent provides user-friendly explanation
    const chatResult = await this.agents.chat.process({
      input: `Explain this solution to the user: ${reasoningResult.response}`,
      context: { 
        ...context, 
        codeContext: codeResult.context,
        reasoningContext: reasoningResult.context
      },
      model: config.chatModel
    }, requestId);

    return {
      response: this.combineResponses([codeResult, reasoningResult, chatResult]),
      metadata: {
        workflow: 'code-first',
        steps: ['code', 'reasoning', 'chat'],
        agents: {
          code: codeResult.metadata,
          reasoning: reasoningResult.metadata,
          chat: chatResult.metadata
        }
      }
    };
  }

  async executeReasoningFirstWorkflow(input, conversation, context, config, requestId) {
    logger.info('Executing reasoning-first workflow', { requestId });

    // Step 1: Reasoning agent analyzes the problem
    const reasoningResult = await this.agents.reasoning.process({
      input,
      conversation: conversation.history,
      context,
      model: config.reasoningModel
    }, requestId);

    // Step 2: If implementation is needed, use code agent
    if (reasoningResult.needsImplementation) {
      const codeResult = await this.agents.code.process({
        input: reasoningResult.implementationRequest || input,
        context: { ...context, reasoningContext: reasoningResult.context },
        model: config.codeModel
      }, requestId);

      // Step 3: Chat agent synthesizes the final response
      const chatResult = await this.agents.chat.process({
        input: `Provide a comprehensive response based on this analysis and implementation`,
        context: { 
          ...context, 
          reasoningContext: reasoningResult.context,
          codeContext: codeResult.context
        },
        model: config.chatModel
      }, requestId);

      return {
        response: this.combineResponses([reasoningResult, codeResult, chatResult]),
        metadata: {
          workflow: 'reasoning-first',
          steps: ['reasoning', 'code', 'chat'],
          agents: {
            reasoning: reasoningResult.metadata,
            code: codeResult.metadata,
            chat: chatResult.metadata
          }
        }
      };
    }

    // Step 2: Chat agent makes the response user-friendly
    const chatResult = await this.agents.chat.process({
      input: `Make this analysis user-friendly: ${reasoningResult.response}`,
      context: { ...context, reasoningContext: reasoningResult.context },
      model: config.chatModel
    }, requestId);

    return {
      response: this.combineResponses([reasoningResult, chatResult]),
      metadata: {
        workflow: 'reasoning-first',
        steps: ['reasoning', 'chat'],
        agents: {
          reasoning: reasoningResult.metadata,
          chat: chatResult.metadata
        }
      }
    };
  }

  async executeCollaborativeWorkflow(input, conversation, context, config, requestId) {
    logger.info('Executing collaborative workflow', { requestId });

    // All agents work in parallel on different aspects
    const [chatResult, codeResult, reasoningResult] = await Promise.all([
      this.agents.chat.process({
        input,
        conversation: conversation.history,
        context,
        model: config.chatModel,
        role: 'interpreter'
      }, requestId),
      
      this.agents.code.process({
        input,
        conversation: conversation.history,
        context,
        model: config.codeModel,
        role: 'implementer'
      }, requestId),
      
      this.agents.reasoning.process({
        input,
        conversation: conversation.history,
        context,
        model: config.reasoningModel,
        role: 'analyzer'
      }, requestId)
    ]);

    // Synthesis step - reasoning agent combines all perspectives
    const synthesisResult = await this.agents.reasoning.process({
      input: `Synthesize these three perspectives into a comprehensive response`,
      context: {
        ...context,
        chatPerspective: chatResult.response,
        codePerspective: codeResult.response,
        reasoningPerspective: reasoningResult.response
      },
      model: config.reasoningModel,
      role: 'synthesizer'
    }, requestId);

    return {
      response: synthesisResult.response,
      metadata: {
        workflow: 'collaborative',
        steps: ['parallel-processing', 'synthesis'],
        agents: {
          chat: chatResult.metadata,
          code: codeResult.metadata,
          reasoning: reasoningResult.metadata,
          synthesis: synthesisResult.metadata
        }
      }
    };
  }

  combineResponses(results) {
    // Simple response combination - in a full implementation, this would be more sophisticated
    return results.map(result => result.response).join('\n\n');
  }

  setupErrorHandling() {
    // Handle 404
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        requestId: req.requestId,
        url: req.url,
        method: req.method
      });

      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        requestId: req.requestId
      });
    });
  }

  async start() {
    try {
      // Initialize model manager
      await this.modelManager.initialize();
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Orchestrator service started on port ${this.port}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      logger.error('Failed to start orchestrator service', { error: error.message });
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('Shutting down orchestrator service...');
    
    if (this.server) {
      this.server.close(() => {
        logger.info('Orchestrator service stopped');
        process.exit(0);
      });
    }
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new OrchestratorService();
  service.start();
}

module.exports = OrchestratorService;
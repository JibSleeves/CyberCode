const BaseAgent = require('./BaseAgent');

class ChatAgent extends BaseAgent {
  constructor(modelManager, logger) {
    super('chat', modelManager, logger);
    
    this.systemPrompts = {
      default: `You are Quonx, an advanced AI coding assistant with deep understanding of software development, architecture, and best practices. You are part of a multi-agent system where you handle conversational interactions and user communication.

Your role is to:
- Interpret user requests and provide clear, helpful responses
- Communicate technical concepts in an accessible way
- Coordinate with other specialized agents (Code and Reasoning) when needed
- Maintain context across conversations
- Provide guidance on software development practices

Guidelines:
- Be conversational but professional
- Ask clarifying questions when requests are ambiguous
- Suggest improvements and best practices
- Explain complex concepts clearly
- Indicate when you need to involve other agents for specialized tasks`,

      interpreter: `You are the interpreter agent in a multi-agent system. Your role is to understand user intent, clarify requirements, and translate complex technical requests into actionable tasks.

Focus on:
- Understanding what the user really wants to achieve
- Identifying ambiguities and asking clarifying questions
- Breaking down complex requests into manageable parts
- Providing context for other agents`,

      synthesizer: `You are the synthesis agent responsible for combining multiple perspectives into a coherent response. Take the different viewpoints from specialized agents and create a unified, comprehensive answer.

Your tasks:
- Integrate different perspectives harmoniously
- Resolve any conflicts between agent responses
- Ensure the final response is clear and actionable
- Maintain the user's original intent throughout`
    };

    this.conversationContext = new Map();
    this.userProfiles = new Map();
  }

  async process(request, requestId) {
    const startTime = Date.now();
    
    try {
      const {
        input,
        conversation = [],
        context = {},
        model = 'default',
        role = 'default',
        options = {}
      } = request;

      this.logger.info('Chat agent processing request', {
        requestId,
        inputLength: input.length,
        role,
        model
      });

      // Build context
      const enhancedContext = await this.buildContext(input, conversation, context, requestId);
      
      // Determine response strategy
      const strategy = this.determineResponseStrategy(input, enhancedContext, role);
      
      // Generate response
      const response = await this.generateResponse(input, enhancedContext, strategy, model, options, requestId);
      
      // Update conversation context
      await this.updateConversationContext(input, response, enhancedContext, requestId);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.info('Chat agent completed processing', {
        requestId,
        processingTime,
        strategy: strategy.type
      });

      return {
        response: response.text,
        context: enhancedContext,
        strategy: strategy.type,
        needsCode: strategy.needsCode,
        needsReasoning: strategy.needsReasoning,
        codeRequest: strategy.codeRequest,
        reasoningRequest: strategy.reasoningRequest,
        metadata: {
          processingTime,
          model: response.modelId || model,
          usage: response.usage,
          strategy: strategy.type,
          confidence: strategy.confidence
        }
      };

    } catch (error) {
      this.logger.error('Chat agent processing failed', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async buildContext(input, conversation, context, requestId) {
    const enhancedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      requestId
    };

    // Add conversation history
    enhancedContext.conversationHistory = conversation.slice(-10); // Last 10 messages

    // Extract user profile information
    const userId = context.userId || 'anonymous';
    let userProfile = this.userProfiles.get(userId);
    
    if (!userProfile) {
      userProfile = {
        preferences: {},
        expertise: 'beginner',
        interests: [],
        previousQuestions: []
      };
      this.userProfiles.set(userId, userProfile);
    }

    // Update user profile based on current input
    this.updateUserProfile(userProfile, input, conversation);
    enhancedContext.userProfile = userProfile;

    // Add project context if available
    if (context.projectInfo) {
      enhancedContext.projectContext = this.analyzeProjectContext(context.projectInfo);
    }

    // Add current file context if available
    if (context.currentFile) {
      enhancedContext.fileContext = this.analyzeFileContext(context.currentFile);
    }

    // Add semantic context from previous interactions
    const conversationId = context.conversationId;
    if (conversationId && this.conversationContext.has(conversationId)) {
      const prevContext = this.conversationContext.get(conversationId);
      enhancedContext.semanticContext = prevContext.topics || [];
      enhancedContext.ongoingTasks = prevContext.tasks || [];
    }

    return enhancedContext;
  }

  determineResponseStrategy(input, context, role) {
    const lowerInput = input.toLowerCase();
    const strategy = {
      type: 'conversational',
      confidence: 0.8,
      needsCode: false,
      needsReasoning: false,
      codeRequest: null,
      reasoningRequest: null
    };

    // Code-related indicators
    const codeKeywords = [
      'code', 'function', 'class', 'method', 'variable', 'algorithm',
      'implement', 'debug', 'fix', 'refactor', 'optimize', 'write',
      'create', 'build', 'develop', 'program'
    ];

    // Reasoning-related indicators
    const reasoningKeywords = [
      'explain', 'why', 'how', 'analyze', 'compare', 'evaluate',
      'pros and cons', 'best practice', 'recommend', 'suggest',
      'architecture', 'design pattern', 'trade-off'
    ];

    const codeScore = this.calculateKeywordScore(lowerInput, codeKeywords);
    const reasoningScore = this.calculateKeywordScore(lowerInput, reasoningKeywords);

    // Determine strategy based on role and content
    if (role === 'interpreter') {
      strategy.type = 'interpretation';
      strategy.confidence = 0.9;
    } else if (role === 'synthesizer') {
      strategy.type = 'synthesis';
      strategy.confidence = 0.9;
    } else {
      // Analyze content for multi-agent needs
      if (codeScore > 0.3) {
        strategy.needsCode = true;
        strategy.codeRequest = this.extractCodeRequest(input, context);
        strategy.type = 'code-assisted';
      }

      if (reasoningScore > 0.3) {
        strategy.needsReasoning = true;
        strategy.reasoningRequest = this.extractReasoningRequest(input, context);
        strategy.type = strategy.needsCode ? 'multi-agent' : 'reasoning-assisted';
      }

      // Check for questions that need deep analysis
      if (this.needsDeepAnalysis(input, context)) {
        strategy.needsReasoning = true;
        strategy.reasoningRequest = `Provide deep analysis for: ${input}`;
        strategy.type = 'analysis-assisted';
      }
    }

    // Adjust confidence based on context
    if (context.userProfile.expertise === 'expert') {
      strategy.confidence += 0.1;
    }

    return strategy;
  }

  async generateResponse(input, context, strategy, model, options, requestId) {
    const systemPrompt = this.systemPrompts[strategy.type] || this.systemPrompts.default;
    
    // Build the prompt
    const prompt = this.buildPrompt(input, context, strategy, systemPrompt);
    
    // Prepare generation options
    const generationOptions = {
      ...options,
      role: 'chat',
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      messages: this.buildMessages(prompt, context.conversationHistory)
    };

    // Generate response using model manager
    const response = await this.modelManager.generate(model, prompt, generationOptions);
    
    // Post-process response
    const processedResponse = await this.postProcessResponse(response, strategy, context);
    
    return processedResponse;
  }

  buildPrompt(input, context, strategy, systemPrompt) {
    let prompt = systemPrompt + '\n\n';

    // Add user profile context
    if (context.userProfile) {
      prompt += `User Profile: ${context.userProfile.expertise} level, `;
      if (context.userProfile.interests.length > 0) {
        prompt += `interested in: ${context.userProfile.interests.join(', ')}`;
      }
      prompt += '\n\n';
    }

    // Add project context
    if (context.projectContext) {
      prompt += `Project Context: ${context.projectContext.summary}\n`;
      if (context.projectContext.technologies) {
        prompt += `Technologies: ${context.projectContext.technologies.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Add file context
    if (context.fileContext) {
      prompt += `Current File: ${context.fileContext.name} (${context.fileContext.language})\n`;
      if (context.fileContext.summary) {
        prompt += `File Summary: ${context.fileContext.summary}\n`;
      }
      prompt += '\n';
    }

    // Add strategy-specific context
    if (strategy.type === 'synthesis' && context.agentResponses) {
      prompt += 'Agent Responses to Synthesize:\n';
      Object.entries(context.agentResponses).forEach(([agent, response]) => {
        prompt += `${agent}: ${response}\n`;
      });
      prompt += '\n';
    }

    // Add the user's input
    prompt += `User Query: ${input}\n\n`;
    
    // Add specific instructions based on strategy
    switch (strategy.type) {
      case 'code-assisted':
        prompt += 'Note: You may need to coordinate with the Code agent for implementation details.\n';
        break;
      case 'reasoning-assisted':
        prompt += 'Note: You may need to coordinate with the Reasoning agent for deep analysis.\n';
        break;
      case 'multi-agent':
        prompt += 'Note: This query may require coordination with both Code and Reasoning agents.\n';
        break;
    }

    return prompt;
  }

  buildMessages(prompt, conversationHistory) {
    const messages = [{ role: 'system', content: prompt }];
    
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    return messages;
  }

  async postProcessResponse(response, strategy, context) {
    let processedText = response.text;

    // Clean up common issues
    processedText = this.cleanupResponse(processedText);
    
    // Add contextual enhancements
    processedText = await this.addContextualEnhancements(processedText, context);
    
    // Format code blocks if present
    processedText = this.formatCodeBlocks(processedText);
    
    return {
      ...response,
      text: processedText
    };
  }

  cleanupResponse(text) {
    // Remove excessive whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Fix common formatting issues
    text = text.replace(/```(\w+)?\n\n/g, '```$1\n');
    text = text.replace(/\n\n```/g, '\n```');
    
    // Ensure proper sentence spacing
    text = text.replace(/([.!?])\s+([A-Z])/g, '$1 $2');
    
    return text.trim();
  }

  async addContextualEnhancements(text, context) {
    // Add relevant links or references if appropriate
    if (context.projectContext && context.projectContext.documentation) {
      // Could add references to project documentation
    }
    
    // Add helpful tips based on user expertise level
    if (context.userProfile.expertise === 'beginner') {
      text = this.addBeginnerTips(text);
    }
    
    return text;
  }

  addBeginnerTips(text) {
    // Add helpful explanations for beginners
    const codeBlockRegex = /```[\s\S]*?```/g;
    return text.replace(codeBlockRegex, (match) => {
      return match + '\n\n💡 *Tip: This code block shows...*';
    });
  }

  formatCodeBlocks(text) {
    // Ensure proper syntax highlighting hints
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    return text.replace(codeBlockRegex, (match, lang, code) => {
      const detectedLang = lang || this.detectLanguage(code);
      return `\`\`\`${detectedLang}\n${code.trim()}\n\`\`\``;
    });
  }

  detectLanguage(code) {
    // Simple language detection
    if (code.includes('function') && code.includes('{')) return 'javascript';
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('class ') && code.includes('public')) return 'java';
    if (code.includes('#include')) return 'cpp';
    if (code.includes('SELECT') || code.includes('FROM')) return 'sql';
    return 'text';
  }

  calculateKeywordScore(text, keywords) {
    const words = text.split(/\s+/);
    const matches = keywords.filter(keyword => 
      words.some(word => word.includes(keyword))
    );
    return matches.length / keywords.length;
  }

  extractCodeRequest(input, context) {
    // Extract specific code-related requests
    const patterns = [
      /write (?:a |an |some )?(.+)/i,
      /create (?:a |an |some )?(.+)/i,
      /implement (?:a |an |the )?(.+)/i,
      /build (?:a |an |the )?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return `Code request: ${match[1]}`;
      }
    }

    return `Generate code for: ${input}`;
  }

  extractReasoningRequest(input, context) {
    // Extract specific reasoning requests
    if (input.toLowerCase().includes('explain')) {
      return `Explain: ${input}`;
    }
    if (input.toLowerCase().includes('analyze')) {
      return `Analyze: ${input}`;
    }
    if (input.toLowerCase().includes('compare')) {
      return `Compare: ${input}`;
    }
    
    return `Provide reasoning for: ${input}`;
  }

  needsDeepAnalysis(input, context) {
    const analysisIndicators = [
      'architecture', 'design pattern', 'best practice', 'performance',
      'scalability', 'security', 'maintainability', 'trade-off',
      'pros and cons', 'advantages', 'disadvantages'
    ];

    return analysisIndicators.some(indicator => 
      input.toLowerCase().includes(indicator)
    );
  }

  updateUserProfile(profile, input, conversation) {
    // Extract expertise indicators
    const expertTerms = ['optimize', 'performance', 'architecture', 'scalability'];
    const beginnerTerms = ['how to', 'what is', 'tutorial', 'example'];

    if (expertTerms.some(term => input.toLowerCase().includes(term))) {
      if (profile.expertise === 'beginner') profile.expertise = 'intermediate';
      else if (profile.expertise === 'intermediate') profile.expertise = 'expert';
    } else if (beginnerTerms.some(term => input.toLowerCase().includes(term))) {
      // Keep as beginner or intermediate
    }

    // Extract interests
    const techKeywords = [
      'javascript', 'python', 'java', 'react', 'node.js', 'docker',
      'kubernetes', 'aws', 'machine learning', 'ai', 'database'
    ];

    techKeywords.forEach(tech => {
      if (input.toLowerCase().includes(tech) && !profile.interests.includes(tech)) {
        profile.interests.push(tech);
        if (profile.interests.length > 10) {
          profile.interests = profile.interests.slice(-10); // Keep last 10
        }
      }
    });

    // Track previous questions
    profile.previousQuestions.push({
      question: input,
      timestamp: new Date().toISOString()
    });
    
    if (profile.previousQuestions.length > 20) {
      profile.previousQuestions = profile.previousQuestions.slice(-20);
    }
  }

  analyzeProjectContext(projectInfo) {
    return {
      summary: projectInfo.name || 'Unknown project',
      technologies: projectInfo.technologies || [],
      structure: projectInfo.structure || 'Unknown',
      size: projectInfo.fileCount || 0
    };
  }

  analyzeFileContext(fileInfo) {
    return {
      name: fileInfo.name || 'Unknown file',
      language: fileInfo.language || 'text',
      summary: fileInfo.summary || 'No summary available',
      size: fileInfo.size || 0
    };
  }

  async updateConversationContext(input, response, context, requestId) {
    const conversationId = context.conversationId;
    if (!conversationId) return;

    let convContext = this.conversationContext.get(conversationId) || {
      topics: [],
      tasks: [],
      lastUpdated: new Date().toISOString()
    };

    // Extract topics from the conversation
    const topics = this.extractTopics(input + ' ' + response.text);
    convContext.topics = [...new Set([...convContext.topics, ...topics])].slice(-20);

    // Update tasks if any were mentioned
    const tasks = this.extractTasks(input);
    if (tasks.length > 0) {
      convContext.tasks = [...convContext.tasks, ...tasks].slice(-10);
    }

    convContext.lastUpdated = new Date().toISOString();
    this.conversationContext.set(conversationId, convContext);
  }

  extractTopics(text) {
    // Simple topic extraction - in a full implementation, this would use NLP
    const topics = [];
    const techTerms = [
      'javascript', 'python', 'react', 'node.js', 'database', 'api',
      'frontend', 'backend', 'testing', 'deployment', 'security'
    ];

    techTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        topics.push(term);
      }
    });

    return topics;
  }

  extractTasks(input) {
    // Extract actionable tasks from user input
    const tasks = [];
    const taskPatterns = [
      /need to (.+)/gi,
      /want to (.+)/gi,
      /should (.+)/gi,
      /will (.+)/gi
    ];

    taskPatterns.forEach(pattern => {
      const matches = input.matchAll(pattern);
      for (const match of matches) {
        tasks.push({
          description: match[1],
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      }
    });

    return tasks;
  }

  // Health check
  async checkHealth() {
    return {
      status: 'healthy',
      conversations: this.conversationContext.size,
      userProfiles: this.userProfiles.size,
      systemPrompts: Object.keys(this.systemPrompts).length
    };
  }
}

module.exports = ChatAgent;
# Quonx IDE - Autonomous Multi-Agent AI Coding Environment

<div align="center">
  <h1>🤖 QUONX</h1>
  <p><strong>The Future of Autonomous AI-Powered Development</strong></p>
  <p>A cutting-edge, self-contained Windows desktop IDE with multi-agent AI architecture</p>
</div>

## 🌟 Features

### Core AI & Reasoning
- **Multi-Agent Architecture**: Specialized Chat, Code, and Reasoning agents working in harmony
- **Deep Reasoning Model**: Advanced problem-solving with logical deduction and hypothesis generation
- **Semantic Reasoning**: Understanding complex relationships between concepts and code entities
- **Autonomous Web Search**: RAG-powered knowledge augmentation from online sources

### Development Environment
- **Retro Pixel-Art UI**: Nostalgic 8-bit themed interface with modern functionality
- **Monaco Editor Integration**: Full-featured code editor with syntax highlighting
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C++, and more
- **Intelligent Code Generation**: Context-aware code creation and optimization
- **Real-time Code Analysis**: Instant feedback on code quality and potential issues

### AI Model Management
- **Local Model Support**: GGUF, GGML, and Safetensors format compatibility
- **External API Integration**: OpenAI, Google Gemini, Claude, Hugging Face support
- **CUDA Acceleration**: GPU-optimized inference with CPU fallback
- **Ollama Integration**: Seamless local model management
- **Hot-swappable Models**: Switch between models without restarting

### Advanced Capabilities
- **Project Context Indexing**: Vector-based project understanding with Tree-sitter
- **Long-term Memory**: Git history integration for persistent context
- **Document RAG**: Upload and query PDFs, Word docs, and other documents
- **Screen Observation**: Learn from user interactions (with consent)
- **Intent Inference**: Predictive assistance based on development patterns
- **Digital Twin**: Full-stack application simulation and "what-if" analysis

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ (for AI models)
- **Git** for version control
- **Windows 10/11** (primary target, Linux/Mac experimental)
- **NVIDIA GPU** (optional, for CUDA acceleration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/quonx-ide.git
   cd quonx-ide
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up AI models directory**
   ```bash
   mkdir models
   mkdir bin
   ```

4. **Configure environment variables** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Start the IDE**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys (optional - for external models)
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_claude_key
HUGGINGFACE_API_KEY=your_hf_key

# Local Model Configuration
MODELS_DIR=./models
LLAMA_CPP_PATH=./bin/llama-cpp-server
MAX_CONCURRENT_MODELS=3

# Service Ports
ORCHESTRATOR_PORT=8001
REASONING_PORT=8002
SEMANTIC_PORT=8003
FILE_MANAGER_PORT=8004

# Logging
LOG_LEVEL=info
```

### Model Setup

#### Local Models (GGUF)

1. Download GGUF models from Hugging Face:
   ```bash
   # Example: Download a coding model
   wget https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.q4_k_m.gguf -O models/codellama-7b.gguf
   ```

2. Install llama.cpp:
   ```bash
   # Clone and build llama.cpp
   git clone https://github.com/ggerganov/llama.cpp.git
   cd llama.cpp
   make LLAMA_CUDA=1  # For CUDA support
   cp server ../bin/llama-cpp-server
   ```

#### Ollama Integration

1. Install Ollama:
   ```bash
   # Windows (via installer)
   # Download from https://ollama.ai
   
   # Or via package manager
   winget install Ollama.Ollama
   ```

2. Pull models:
   ```bash
   ollama pull codellama:7b
   ollama pull mistral:7b
   ```

## 🏗️ Architecture

### Multi-Agent System

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat Agent    │    │   Code Agent    │    │ Reasoning Agent │
│                 │    │                 │    │                 │
│ • Conversation  │    │ • Code Gen      │    │ • Deep Analysis │
│ • User Intent   │    │ • Debugging     │    │ • Validation    │
│ • Coordination  │    │ • Refactoring   │    │ • Architecture  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Orchestrator   │
                    │                 │
                    │ • Workflow Mgmt │
                    │ • Model Routing │
                    │ • Context Sync  │
                    └─────────────────┘
```

### Service Architecture

- **Main Process** (Electron): UI and system integration
- **Orchestrator Service**: Multi-agent coordination
- **Reasoning Service**: Deep analysis and validation
- **Semantic Service**: Knowledge graph and context
- **File Manager Service**: Project indexing and file operations
- **Vector Store Service**: Embeddings and similarity search
- **Web Search Service**: Autonomous knowledge retrieval

## 🎮 Usage Guide

### Getting Started

1. **Launch Quonx**: The retro pixel-art interface will appear
2. **Open/Create Project**: Use File → Open Project or create new
3. **Configure Models**: Go to Settings → AI Models to set up your preferred models
4. **Start Coding**: The AI will provide context-aware assistance

### Key Features

#### Multi-Model Chat
- Select different models for different roles (Chat/Code/Reasoning)
- Switch models mid-conversation
- Compare responses from different models

#### Intelligent Code Generation
```
User: "Create a REST API for user management with authentication"

Quonx: 
1. Chat Agent interprets requirements
2. Code Agent generates the API structure
3. Reasoning Agent validates security and architecture
4. Integrated response with complete, production-ready code
```

#### Project Understanding
- Automatic project indexing with Tree-sitter
- Context-aware suggestions based on existing code
- Cross-file relationship understanding

#### Document Integration
- Drag-and-drop PDF/Word documents
- Query documentation during development
- Context-aware code generation based on specs

### Workflow Examples

#### Code-First Workflow
1. User requests code implementation
2. Code Agent generates solution
3. Reasoning Agent validates and explains
4. Chat Agent provides user-friendly summary

#### Reasoning-First Workflow  
1. User asks architectural question
2. Reasoning Agent analyzes problem
3. Code Agent implements if needed
4. Chat Agent synthesizes response

#### Collaborative Workflow
1. All agents work in parallel
2. Each provides different perspective
3. Reasoning Agent synthesizes final response

## 🔌 Extending Quonx

### Adding New AI Providers

1. Create provider in `src/services/orchestrator/utils/ModelManager.js`:
   ```javascript
   this.providers.set('custom-provider', {
     type: 'api',
     loadModel: this.loadCustomModel.bind(this),
     generate: this.generateCustom.bind(this),
     unload: this.unloadCustomModel.bind(this)
   });
   ```

2. Implement the provider methods
3. Update UI model selection

### Creating Custom Agents

1. Extend BaseAgent:
   ```javascript
   const BaseAgent = require('./BaseAgent');
   
   class CustomAgent extends BaseAgent {
     async process(request, requestId) {
       // Your custom logic
     }
   }
   ```

2. Register in Orchestrator
3. Update workflow definitions

### Adding New Tools

1. Create tool service in `src/services/`
2. Register in main orchestrator
3. Add UI integration

## 🐛 Troubleshooting

### Common Issues

**Models not loading**
- Check GGUF file integrity
- Verify sufficient RAM/VRAM
- Check llama.cpp compilation

**Service connection errors**
- Ensure all services are running
- Check port conflicts
- Verify firewall settings

**Performance issues**
- Reduce model size or quantization
- Enable GPU acceleration
- Adjust concurrent model limit

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

Check service logs:
```bash
tail -f logs/orchestrator.log
tail -f logs/reasoning.log
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork and clone the repository
2. Install development dependencies:
   ```bash
   npm install
   npm run dev
   ```
3. Run tests:
   ```bash
   npm test
   ```
4. Submit pull requests with clear descriptions

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **llama.cpp** for efficient local inference
- **Tree-sitter** for code parsing
- **Monaco Editor** for code editing
- **Electron** for desktop framework
- **Open source AI community** for models and tools

## 📞 Support

- **Documentation**: [docs.quonx.ai](https://docs.quonx.ai)
- **Discord**: [Join our community](https://discord.gg/quonx)
- **Issues**: [GitHub Issues](https://github.com/your-org/quonx-ide/issues)
- **Email**: support@quonx.ai

---

<div align="center">
  <p><strong>Built with ❤️ by the Quonx team</strong></p>
  <p>Transforming the future of software development, one AI agent at a time.</p>
</div>

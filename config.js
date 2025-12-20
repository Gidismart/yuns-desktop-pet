// 配置文件 - 多卡片配置系统，使用最新模型
module.exports = {
  // 预定义的 API 提供商模板
  providerTemplates: {
    deepseek: {
      name: 'DeepSeek',
      icon: '🔷',
      defaultApiUrl: 'https://api.deepseek.com/v1/chat/completions',
      models: [
        { 
          id: 'deepseek-chat', 
          name: 'DeepSeek-V3.2 Chat', 
          description: '最新版本，支持多模态视觉，128K上下文',
          contextLength: '128K',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'deepseek-reasoner', 
          name: 'DeepSeek-V3.2 Reasoner', 
          description: '思考模式，支持视觉推理，128K上下文',
          contextLength: '128K',
          maxOutput: '64K',
          isReasoner: true,
          supportsVision: true  // ✅ 支持视觉
        }
      ],
      defaultModel: 'deepseek-chat',
      authType: 'bearer', // Bearer Token
      pricing: {
        input: '2元/百万tokens',
        inputCache: '0.2元/百万tokens（缓存命中）',
        output: '3元/百万tokens'
      }
    },
    gemini: {
      name: 'Gemini',
      icon: '🔶',
      defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: [
        { 
          id: 'gemini-2.0-flash-exp', 
          name: 'Gemini 2.0 Flash Exp', 
          description: '最新实验版本，支持视觉，快速响应',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gemini-2.5-flash', 
          name: 'Gemini 2.5 Flash', 
          description: '均衡模型，支持视觉，100万tokens上下文',
          contextLength: '1M',
          maxOutput: '8K',
          recommended: true,
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gemini-2.5-flash-lite', 
          name: 'Gemini 2.5 Flash Lite', 
          description: '最快速、最具成本效益，支持视觉',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gemini-2.5-pro', 
          name: 'Gemini 2.5 Pro', 
          description: '强大推理，支持视觉，擅长编码和复杂任务',
          contextLength: '2M',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gemini-1.5-flash', 
          name: 'Gemini 1.5 Flash', 
          description: '稳定版本，支持视觉理解',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gemini-1.5-pro', 
          name: 'Gemini 1.5 Pro', 
          description: '上一代Pro模型，支持视觉',
          contextLength: '2M',
          maxOutput: '8K',
          supportsVision: true  // ✅ 支持视觉
        }
      ],
      defaultModel: 'gemini-2.5-flash',
      authType: 'query', // API Key in query parameter
      pricing: {
        note: '请查看 Google AI Studio 获取最新价格'
      }
    },
    openai: {
      name: 'OpenAI 兼容',
      icon: '🤖',
      defaultApiUrl: 'https://api.openai.com/v1/chat/completions',
      models: [
        { 
          id: 'gpt-4o', 
          name: 'GPT-4o', 
          description: 'OpenAI 多模态模型，支持视觉',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gpt-4-turbo', 
          name: 'GPT-4 Turbo', 
          description: 'GPT-4 Turbo，支持视觉',
          supportsVision: true  // ✅ 支持视觉
        },
        { 
          id: 'gpt-4', 
          name: 'GPT-4', 
          description: 'OpenAI GPT-4'
          // ❌ 不支持视觉
        },
        { 
          id: 'gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          description: '快速高效'
          // ❌ 不支持视觉
        }
      ],
      defaultModel: 'gpt-4o',
      authType: 'bearer'
    },
    custom: {
      name: '自定义',
      icon: '⚙️',
      defaultApiUrl: 'https://your-api-endpoint.com/v1/chat/completions',
      models: [
        { 
          id: 'custom-model', 
          name: '自定义模型', 
          description: '请配置您的模型ID，如支持视觉请在编辑后手动测试'
          // 自定义模型默认不支持视觉，用户可自行测试
        }
      ],
      defaultModel: 'custom-model',
      authType: 'bearer'
    }
  },
  
  // Markdown 保存路径配置（使用相对路径，用户可自行修改）
  markdown: {
    savePath: './conversations',  // 默认保存到项目目录下的 conversations 文件夹
  },
  
  // 窗口配置
  window: {
    petWidth: 200,
    petHeight: 200,
    chatWidth: 900,      // 增大宽度：600 -> 900
    chatHeight: 950,     // 增大高度：750 -> 950
    settingsWidth: 900,
    settingsHeight: 650
  }
};

// 配置文件 - 多卡片配置系统，支持最新AI模型 (2025年12月更新)
// 参考文档: https://ai.google.dev/gemini-api/docs/models
module.exports = {
  // 预定义的 API 提供商模板
  providerTemplates: {
    // ========== DeepSeek ==========
    deepseek: {
      name: 'DeepSeek',
      icon: 'deepseek',
      brandColor: '#0066FF',
      defaultApiUrl: 'https://api.deepseek.com/v1/chat/completions',
      models: [
        { 
          id: 'deepseek-chat', 
          name: 'DeepSeek-V3 Chat', 
          description: '最新版本，支持多模态视觉，128K上下文',
          contextLength: '128K',
          maxOutput: '8K',
          supportsVision: true,
          recommended: true
        },
        { 
          id: 'deepseek-reasoner', 
          name: 'DeepSeek-R1', 
          description: 'R1推理模型，深度思考，128K上下文',
          contextLength: '128K',
          maxOutput: '64K',
          isReasoner: true,
          supportsVision: true
        },
        { 
          id: 'deepseek-coder', 
          name: 'DeepSeek-Coder', 
          description: '代码专用模型，擅长编程任务',
          contextLength: '64K',
          maxOutput: '8K',
          supportsVision: false
        }
      ],
      defaultModel: 'deepseek-chat',
      authType: 'bearer',
      pricing: {
        input: '2元/百万tokens',
        inputCache: '0.2元/百万tokens（缓存命中）',
        output: '8元/百万tokens'
      }
    },

    // ========== Google Gemini (2025年12月最新) ==========
    gemini: {
      name: 'Google Gemini',
      icon: 'gemini',
      brandColor: '#4285F4',
      defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      models: [
        // ===== Gemini 3 系列 (最新) =====
        { 
          id: 'gemini-3-pro-preview', 
          name: '⭐ Gemini 3 Pro', 
          description: '最强大的多模态模型，支持文本/图片/视频/音频',
          contextLength: '1M',
          maxOutput: '64K',
          supportsVision: true,
          supportsAudio: true,
          supportsVideo: true,
          recommended: true,
          isNew: true
        },
        { 
          id: 'gemini-3-flash-preview', 
          name: '⚡ Gemini 3 Flash', 
          description: '最智能的快速模型，速度与智能兼备',
          contextLength: '1M',
          maxOutput: '64K',
          supportsVision: true,
          supportsAudio: true,
          isNew: true
        },
        { 
          id: 'gemini-3-pro-image-preview', 
          name: '🎨 Gemini 3 Pro Image', 
          description: '图像生成专用，支持高质量图片输出',
          contextLength: '64K',
          maxOutput: '32K',
          supportsVision: true,
          supportsImageGen: true,
          isNew: true
        },

        // ===== Gemini 2.5 系列 =====
        { 
          id: 'gemini-2.5-flash', 
          name: 'Gemini 2.5 Flash', 
          description: '均衡模型，100万tokens上下文，支持视觉',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'gemini-2.5-flash-lite', 
          name: 'Gemini 2.5 Flash Lite', 
          description: '轻量版，最快速最具成本效益',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'gemini-2.5-pro', 
          name: 'Gemini 2.5 Pro', 
          description: '强大推理，200万tokens上下文，擅长编码',
          contextLength: '2M',
          maxOutput: '8K',
          supportsVision: true
        },

        // ===== Gemini 2.0 系列 =====
        { 
          id: 'gemini-2.0-flash', 
          name: 'Gemini 2.0 Flash', 
          description: '快速稳定，支持多模态',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'gemini-2.0-flash-lite', 
          name: 'Gemini 2.0 Flash Lite', 
          description: '高性价比，适合大规模调用',
          contextLength: '1M',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'gemini-2.0-flash-thinking-exp', 
          name: 'Gemini 2.0 Flash Thinking', 
          description: '思考模式，复杂推理任务专用',
          contextLength: '1M',
          maxOutput: '64K',
          supportsVision: true,
          isReasoner: true
        }
      ],
      defaultModel: 'gemini-2.5-flash',
      authType: 'query',
      pricing: {
        note: '免费额度：每分钟15次请求，付费后无限制',
        free: '每分钟15请求 (RPM)',
        paid: '查看 Google AI Studio'
      }
    },

    // ========== OpenAI ==========
    openai: {
      name: 'OpenAI',
      icon: 'openai',
      brandColor: '#10A37F',
      defaultApiUrl: 'https://api.openai.com/v1/chat/completions',
      models: [
        // ===== GPT-4o 系列 =====
        { 
          id: 'gpt-4o', 
          name: '⭐ GPT-4o', 
          description: '最新旗舰模型，多模态，128K上下文',
          contextLength: '128K',
          maxOutput: '16K',
          supportsVision: true,
          recommended: true
        },
        { 
          id: 'gpt-4o-mini', 
          name: 'GPT-4o Mini', 
          description: '快速高效，128K上下文，性价比高',
          contextLength: '128K',
          maxOutput: '16K',
          supportsVision: true
        },
        { 
          id: 'chatgpt-4o-latest', 
          name: 'ChatGPT-4o Latest', 
          description: '最新ChatGPT版本，持续更新',
          contextLength: '128K',
          maxOutput: '16K',
          supportsVision: true
        },

        // ===== o1/o3 推理系列 =====
        { 
          id: 'o1', 
          name: '🧠 o1', 
          description: '深度推理模型，擅长复杂问题分析',
          contextLength: '200K',
          maxOutput: '100K',
          supportsVision: true,
          isReasoner: true,
          isNew: true
        },
        { 
          id: 'o1-mini', 
          name: 'o1 Mini', 
          description: '快速推理，性价比高',
          contextLength: '128K',
          maxOutput: '64K',
          supportsVision: true,
          isReasoner: true
        },
        { 
          id: 'o3-mini', 
          name: '⚡ o3 Mini', 
          description: '最新推理模型，速度更快',
          contextLength: '200K',
          maxOutput: '100K',
          supportsVision: true,
          isReasoner: true,
          isNew: true
        },

        // ===== GPT-4 系列 =====
        { 
          id: 'gpt-4-turbo', 
          name: 'GPT-4 Turbo', 
          description: 'GPT-4增强版，支持视觉',
          contextLength: '128K',
          maxOutput: '4K',
          supportsVision: true
        },
        { 
          id: 'gpt-4', 
          name: 'GPT-4', 
          description: 'GPT-4基础版',
          contextLength: '8K',
          maxOutput: '4K'
        },

        // ===== GPT-3.5 系列 =====
        { 
          id: 'gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          description: '经济实惠，快速响应',
          contextLength: '16K',
          maxOutput: '4K'
        }
      ],
      defaultModel: 'gpt-4o',
      authType: 'bearer',
      pricing: {
        'gpt-4o': '输入 $2.5/M, 输出 $10/M',
        'gpt-4o-mini': '输入 $0.15/M, 输出 $0.6/M',
        'o1': '输入 $15/M, 输出 $60/M'
      }
    },

    // ========== Anthropic Claude ==========
    claude: {
      name: 'Anthropic Claude',
      icon: 'claude',
      brandColor: '#D97706',
      defaultApiUrl: 'https://api.anthropic.com/v1/messages',
      models: [
        { 
          id: 'claude-sonnet-4-20250514', 
          name: '⭐ Claude Sonnet 4', 
          description: '最新版本，强大推理能力',
          contextLength: '200K',
          maxOutput: '64K',
          supportsVision: true,
          recommended: true,
          isNew: true
        },
        { 
          id: 'claude-3-5-sonnet-20241022', 
          name: 'Claude 3.5 Sonnet', 
          description: '均衡模型，智能与速度兼备',
          contextLength: '200K',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'claude-3-5-haiku-20241022', 
          name: 'Claude 3.5 Haiku', 
          description: '最快速的Claude，适合实时交互',
          contextLength: '200K',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'claude-3-opus-20240229', 
          name: 'Claude 3 Opus', 
          description: '最强大的Claude 3，复杂任务专用',
          contextLength: '200K',
          maxOutput: '4K',
          supportsVision: true
        }
      ],
      defaultModel: 'claude-sonnet-4-20250514',
      authType: 'anthropic', // 特殊认证方式
      pricing: {
        'claude-sonnet-4': '输入 $3/M, 输出 $15/M',
        'claude-3-5-sonnet': '输入 $3/M, 输出 $15/M',
        'claude-3-5-haiku': '输入 $0.25/M, 输出 $1.25/M'
      }
    },

    // ========== 硅基流动 (SiliconFlow) ==========
    siliconflow: {
      name: '硅基流动',
      icon: 'siliconflow',
      brandColor: '#8B5CF6',
      defaultApiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
      models: [
        { 
          id: 'Qwen/Qwen2.5-72B-Instruct', 
          name: 'Qwen2.5 72B', 
          description: '通义千问最新版本，中文能力强',
          contextLength: '32K',
          maxOutput: '8K',
          supportsVision: false,
          recommended: true
        },
        { 
          id: 'Qwen/Qwen2.5-Coder-32B-Instruct', 
          name: 'Qwen2.5 Coder 32B', 
          description: '代码专用模型',
          contextLength: '32K',
          maxOutput: '8K'
        },
        { 
          id: 'deepseek-ai/DeepSeek-V3', 
          name: 'DeepSeek-V3', 
          description: 'DeepSeek V3 托管版',
          contextLength: '64K',
          maxOutput: '8K',
          supportsVision: true
        },
        { 
          id: 'THUDM/glm-4-9b-chat', 
          name: 'GLM-4 9B', 
          description: '智谱GLM-4，均衡实用',
          contextLength: '128K',
          maxOutput: '4K'
        }
      ],
      defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
      authType: 'bearer',
      pricing: {
        note: '查看硅基流动官网获取最新定价'
      }
    },

    // ========== 零一万物 (Yi) ==========
    yi: {
      name: '零一万物 Yi',
      icon: 'yi',
      brandColor: '#0EA5E9',
      defaultApiUrl: 'https://api.lingyiwanwu.com/v1/chat/completions',
      models: [
        { 
          id: 'yi-lightning', 
          name: 'Yi Lightning', 
          description: '最快速的Yi模型，实时响应',
          contextLength: '16K',
          maxOutput: '4K',
          recommended: true
        },
        { 
          id: 'yi-large', 
          name: 'Yi Large', 
          description: '大规模模型，复杂任务',
          contextLength: '32K',
          maxOutput: '8K'
        },
        { 
          id: 'yi-medium', 
          name: 'Yi Medium', 
          description: '均衡模型，通用任务',
          contextLength: '16K',
          maxOutput: '4K'
        }
      ],
      defaultModel: 'yi-lightning',
      authType: 'bearer'
    },

    // ========== 月之暗面 (Moonshot/Kimi) ==========
    moonshot: {
      name: '月之暗面 Kimi',
      icon: 'moonshot',
      brandColor: '#6366F1',
      defaultApiUrl: 'https://api.moonshot.cn/v1/chat/completions',
      models: [
        { 
          id: 'moonshot-v1-128k', 
          name: 'Moonshot v1 128K', 
          description: '超长上下文，128K tokens',
          contextLength: '128K',
          maxOutput: '8K',
          recommended: true
        },
        { 
          id: 'moonshot-v1-32k', 
          name: 'Moonshot v1 32K', 
          description: '均衡模型，32K上下文',
          contextLength: '32K',
          maxOutput: '8K'
        },
        { 
          id: 'moonshot-v1-8k', 
          name: 'Moonshot v1 8K', 
          description: '快速响应，8K上下文',
          contextLength: '8K',
          maxOutput: '4K'
        }
      ],
      defaultModel: 'moonshot-v1-128k',
      authType: 'bearer'
    },

    // ========== 智谱 (Zhipu) ==========
    zhipu: {
      name: '智谱 GLM',
      icon: 'zhipu',
      brandColor: '#2563EB',
      defaultApiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      models: [
        { 
          id: 'glm-4-plus', 
          name: 'GLM-4 Plus', 
          description: '最新版本，综合能力强',
          contextLength: '128K',
          maxOutput: '8K',
          supportsVision: true,
          recommended: true
        },
        { 
          id: 'glm-4-0520', 
          name: 'GLM-4', 
          description: '智谱旗舰模型',
          contextLength: '128K',
          maxOutput: '4K',
          supportsVision: true
        },
        { 
          id: 'glm-4-flash', 
          name: 'GLM-4 Flash', 
          description: '免费版，快速响应',
          contextLength: '128K',
          maxOutput: '4K'
        },
        { 
          id: 'glm-4v-plus', 
          name: 'GLM-4V Plus', 
          description: '视觉增强版',
          contextLength: '8K',
          maxOutput: '4K',
          supportsVision: true
        }
      ],
      defaultModel: 'glm-4-plus',
      authType: 'bearer'
    },

    // ========== Groq ==========
    groq: {
      name: 'Groq',
      icon: 'groq',
      brandColor: '#F55036',
      defaultApiUrl: 'https://api.groq.com/openai/v1/chat/completions',
      models: [
        { 
          id: 'llama-3.3-70b-versatile', 
          name: 'Llama 3.3 70B', 
          description: '最新Llama，极速响应',
          contextLength: '128K',
          maxOutput: '32K',
          recommended: true,
          isNew: true
        },
        { 
          id: 'llama-3.1-70b-versatile', 
          name: 'Llama 3.1 70B', 
          description: '强大的开源模型',
          contextLength: '128K',
          maxOutput: '8K'
        },
        { 
          id: 'mixtral-8x7b-32768', 
          name: 'Mixtral 8x7B', 
          description: 'MoE模型，高效推理',
          contextLength: '32K',
          maxOutput: '4K'
        },
        { 
          id: 'gemma2-9b-it', 
          name: 'Gemma 2 9B', 
          description: 'Google Gemma，轻量高效',
          contextLength: '8K',
          maxOutput: '4K'
        }
      ],
      defaultModel: 'llama-3.3-70b-versatile',
      authType: 'bearer',
      pricing: {
        note: 'Groq 提供免费 API，速度极快'
      }
    },

    // ========== 自定义 API / 中转站 ==========
    custom: {
      name: '自定义 API',
      icon: 'custom',
      brandColor: '#6B7280',
      defaultApiUrl: 'https://your-api-endpoint.com/v1/chat/completions',
      models: [
        // ===== OpenAI 系列（中转站最常用）=====
        { 
          id: 'gpt-4o', 
          name: '⭐ GPT-4o', 
          description: 'OpenAI 最新旗舰，中转站最常用',
          recommended: true
        },
        { 
          id: 'gpt-4o-mini', 
          name: 'GPT-4o Mini', 
          description: '性价比高，速度快'
        },
        { 
          id: 'gpt-4-turbo', 
          name: 'GPT-4 Turbo', 
          description: 'GPT-4 增强版'
        },
        { 
          id: 'gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          description: '经济实惠'
        },
        // ===== Claude 系列 =====
        { 
          id: 'claude-3-5-sonnet-20241022', 
          name: 'Claude 3.5 Sonnet', 
          description: 'Anthropic 均衡模型'
        },
        { 
          id: 'claude-3-5-haiku-20241022', 
          name: 'Claude 3.5 Haiku', 
          description: '快速响应'
        },
        // ===== DeepSeek 系列 =====
        { 
          id: 'deepseek-chat', 
          name: 'DeepSeek Chat', 
          description: 'DeepSeek V3 对话模型'
        },
        { 
          id: 'deepseek-reasoner', 
          name: 'DeepSeek R1', 
          description: '深度推理'
        },
        // ===== 其他常用 =====
        { 
          id: 'qwen-turbo', 
          name: '通义千问 Turbo', 
          description: '阿里云通义千问'
        },
        { 
          id: 'glm-4', 
          name: 'GLM-4', 
          description: '智谱 GLM-4'
        },
        // ===== 自定义输入 =====
        { 
          id: '__custom_input__', 
          name: '📝 手动输入模型 ID...', 
          description: '输入中转站支持的任意模型',
          isCustomInput: true
        }
      ],
      defaultModel: 'gpt-4o',
      authType: 'bearer',
      allowCustomModel: true
    }
  },
  
  // Markdown 保存路径配置
  markdown: {
    savePath: './conversations',
  },
  
  // 窗口配置
  window: {
    petWidth: 200,
    petHeight: 200,
    chatWidth: 900,
    chatHeight: 950,
    settingsWidth: 950,  // 稍微增大以容纳更多内容
    settingsHeight: 700
  },

  // 模型能力标签
  modelTags: {
    supportsVision: '👁️ 视觉',
    supportsAudio: '🎵 音频',
    supportsVideo: '🎬 视频',
    supportsImageGen: '🖼️ 图像生成',
    isReasoner: '🧠 推理',
    isNew: '🆕 新',
    recommended: '⭐ 推荐'
  }
};

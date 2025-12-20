// 友好的提示信息系统 - 柴犬助手风格 🐕

const FriendlyMessages = {
  // ============ 通用错误 ============
  
  noInput: {
    text: '汪~ 主人还没输入问题呢 🐕',
    type: 'info'
  },
  
  noConfig: {
    text: '汪汪~ 还没配置 API 呢！让我们去设置页面添加一个吧 🔧',
    type: 'info'
  },
  
  noConversation: {
    text: '嗯...好像还没有对话记录呢 🤔\n\n试试问我点什么吧~',
    type: 'info'
  },
  
  // ============ API 相关 ============
  
  apiCallFailed: (details) => ({
    text: `哎呀~ 和 AI 小伙伴通信时出了点小问题 😅\n\n${details}\n\n💡 小提示：\n• 检查一下网络连接\n• 确认 API Key 是否正确\n• 看看配额是否用完了`,
    type: 'warning'
  }),
  
  apiKeyMissing: {
    text: '汪~ 还没有 API 密钥呢！🔑\n\n去设置页面添加一个吧，我会等你回来的~',
    type: 'info'
  },
  
  providerUnknown: {
    text: '咦？这个提供商我还不认识呢 🤔\n\n试试选择 DeepSeek、Gemini 或 OpenAI 兼容的吧~',
    type: 'warning'
  },
  
  testSuccess: {
    text: '✅ 耶！连接成功啦~ 可以开始对话了！',
    type: 'success'
  },
  
  testFailed: (reason) => ({
    text: `😔 连接测试没有成功呢...\n\n原因：${reason}\n\n💡 试试这些：\n• 检查 API 地址是否正确\n• 确认密钥是否有效\n• 看看网络是否畅通`,
    type: 'warning'
  }),
  
  // ============ 截图分析 ============
  
  noVisionSupport: (currentModel, suggestions) => ({
    text: `🎨 当前模型 "${currentModel}" 还不会看图片呢~\n\n${suggestions}\n\n💡 切换到支持视觉的模型就可以啦！`,
    type: 'info'
  }),
  
  screenshotCapturing: {
    text: '📸 柴柴正在截屏~ 对话窗口会暂时隐藏哦！',
    type: 'info'
  },
  
  screenshotAnalyzing: {
    text: '🔍 让我仔细看看这张图片...',
    type: 'info'
  },
  
  screenshotSuccess: {
    text: '✅ 看明白了！希望我的分析对你有帮助~ 🎯',
    type: 'success'
  },
  
  screenshotFailed: (reason) => ({
    text: `📸 哎呀，截图时遇到了小问题...\n\n${reason}\n\n💡 可以试试：\n• 确认屏幕访问权限\n• 重新点击截图按钮\n• 换个支持视觉的模型`,
    type: 'warning'
  }),
  
  // ============ 配置管理 ============
  
  configSaved: {
    text: '✅ 配置保存成功！可以开始使用啦~ 🎉',
    type: 'success'
  },
  
  configUpdated: {
    text: '✅ 配置更新完成！现在更好用了~ ⚙️',
    type: 'success'
  },
  
  configDeleted: {
    text: '✅ 配置已删除~ 拜拜啦！👋',
    type: 'success'
  },
  
  configActivated: {
    text: '✅ 配置已切换！准备好和新伙伴聊天了~ 💬',
    type: 'success'
  },
  
  configIncomplete: {
    text: '📝 嗯...还有一些必填项没填呢~\n\n请把所有带 * 号的项目都填上吧！',
    type: 'info'
  },
  
  configDeleteConfirm: {
    text: '确定要删除这个配置吗？\n\n删除后就找不回来了哦~ 🗑️',
    type: 'confirm'
  },
  
  // ============ 保存对话 ============
  
  savingConversation: {
    text: '💾 正在保存对话记录...',
    type: 'info'
  },
  
  saveSuccess: (filename) => ({
    text: `✅ 保存成功！\n\n文件名：${filename}\n\n下次想回顾就去 Markdown 目录看看吧~ 📝`,
    type: 'success'
  }),
  
  saveFailed: (reason) => ({
    text: `💾 保存时遇到了一点小问题...\n\n${reason}\n\n💡 可能是：\n• 保存路径不存在\n• 文件被占用\n• 权限不足`,
    type: 'warning'
  }),
  
  // ============ 网络相关 ============
  
  networkError: {
    text: '🌐 嗯...好像网络有点不稳定呢\n\n💡 试试：\n• 检查网络连接\n• 等一会儿再试\n• 看看 VPN 是否正常',
    type: 'warning'
  },
  
  timeout: {
    text: '⏱️ 等待时间太长啦，对方可能太忙了~\n\n要不要再试一次？',
    type: 'warning'
  },
  
  // ============ 权限相关 ============
  
  permissionDenied: {
    text: '🔒 哎呀，权限不够呢...\n\n可能需要在系统设置中允许：\n• 屏幕录制权限\n• 文件访问权限',
    type: 'warning'
  },
  
  // ============ 设置相关 ============
  
  settingsSaved: {
    text: '✅ 设置已保存！生效啦~ ⚙️',
    type: 'success'
  },
  
  settingsReset: {
    text: '✅ 已重置为默认设置！焕然一新~ 🔄',
    type: 'success'
  },
  
  // ============ 欢迎和帮助 ============
  
  welcome: {
    text: '🐕 你好呀！我是柴柴 AI 助手~\n\n我能做什么？\n• 💬 聊天对话\n• 📸 分析截图\n• 🛠️ 调用 MCP 工具\n• 💾 保存记录\n\n快捷键：Ctrl+Enter 发送\n\n问我点什么吧！',
    type: 'success'
  },
  
  // ============ 其他 ============
  
  thinking: {
    text: '🤔 让我想想...',
    type: 'info'
  },
  
  processing: {
    text: '⚙️ 正在处理中...',
    type: 'info'
  },
  
  comingSoon: {
    text: '🚀 这个功能正在开发中，敬请期待！',
    type: 'info'
  },
  
  unknown: (message) => ({
    text: `🤔 遇到了一个意外情况...\n\n${message}\n\n试试刷新页面或重启应用？`,
    type: 'warning'
  })
};

// 获取友好的错误消息
function getFriendlyMessage(key, ...args) {
  const message = FriendlyMessages[key];
  
  if (!message) {
    return FriendlyMessages.unknown('未知的消息类型');
  }
  
  if (typeof message === 'function') {
    return message(...args);
  }
  
  return message;
}

// 格式化 API 错误
function formatApiError(error) {
  // 常见错误的友好提示
  const errorPatterns = {
    'API key': '🔑 API 密钥好像不对呢~',
    'quota': '💰 配额用完啦！需要充值或等待重置~',
    'rate limit': '🚦 请求太频繁啦，休息一下再试吧~',
    'timeout': '⏱️ 等待时间太长了，网络可能有点慢~',
    'network': '🌐 网络连接似乎有点问题呢~',
    '401': '🔐 认证失败，检查一下 API 密钥吧~',
    '403': '🚫 没有访问权限哦~',
    '404': '🔍 找不到这个地址呢，确认 API URL 是否正确~',
    '429': '🚦 请求太多啦，稍后再试吧~',
    '500': '💥 服务器那边出了点问题，过会儿再试试~',
    '503': '🔧 服务暂时不可用，可能在维护中~'
  };
  
  const errorStr = error.toString().toLowerCase();
  
  for (const [pattern, friendlyMsg] of Object.entries(errorPatterns)) {
    if (errorStr.includes(pattern.toLowerCase())) {
      return friendlyMsg;
    }
  }
  
  return `遇到了一点小问题：${error}`;
}

// 生成视觉支持建议
function generateVisionSuggestions(visionModels = [], allVisionConfigs = []) {
  let suggestions = '';
  
  if (visionModels.length > 0) {
    suggestions += '可以试试这些支持视觉的模型：\n';
    visionModels.forEach(m => {
      suggestions += `  • ${m.name}\n`;
    });
    suggestions += '\n在设置中修改模型就可以啦~';
  } else if (allVisionConfigs.length > 0) {
    suggestions += '可以切换到这些支持视觉的配置：\n';
    allVisionConfigs.forEach(cfg => {
      suggestions += `  • ${cfg.name}\n`;
    });
  } else {
    suggestions += '推荐添加这些支持视觉的模型：\n';
    suggestions += '  • DeepSeek-V3.2 Chat\n';
    suggestions += '  • Gemini 2.5 Flash\n';
    suggestions += '  • GPT-4o\n';
    suggestions += '\n去设置页面添加吧~';
  }
  
  return suggestions;
}

// 导出为全局变量（浏览器环境）
window.FriendlyMessages = FriendlyMessages;
window.getFriendlyMessage = getFriendlyMessage;
window.formatApiError = formatApiError;
window.generateVisionSuggestions = generateVisionSuggestions;


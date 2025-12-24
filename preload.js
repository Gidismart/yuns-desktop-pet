const { contextBridge, ipcRenderer } = require('electron');

// 将安全的API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  openChat: () => {
    ipcRenderer.send('open-chat');
  },
  
  openSettings: () => {
    ipcRenderer.send('open-settings');
  },
  
  // 退出应用
  quitApp: () => {
    ipcRenderer.send('quit-app');
  },
  
  // AI 对话
  sendMessage: async (messages) => {
    return await ipcRenderer.invoke('send-message', { messages });
  },
  
  // 保存对话
  saveConversation: async (conversation) => {
    return await ipcRenderer.invoke('save-conversation', { conversation });
  },
  
  // 屏幕截图分析
  captureScreen: async () => {
    return await ipcRenderer.invoke('capture-screen');
  },
  
  analyzeScreenshot: async (base64Image) => {
    return await ipcRenderer.invoke('analyze-screenshot', { base64Image });
  },
  
  // API 配置管理
  getConfig: async () => {
    return await ipcRenderer.invoke('get-config');
  },
  
  getApiConfigs: async () => {
    return await ipcRenderer.invoke('get-api-configs');
  },
  
  getActiveConfig: async () => {
    return await ipcRenderer.invoke('get-active-config');
  },
  
  addApiConfig: async (config) => {
    return await ipcRenderer.invoke('add-api-config', { config });
  },
  
  updateApiConfig: async (id, updates) => {
    return await ipcRenderer.invoke('update-api-config', { id, updates });
  },
  
  deleteApiConfig: async (id) => {
    return await ipcRenderer.invoke('delete-api-config', { id });
  },
  
  setActiveConfig: async (id) => {
    return await ipcRenderer.invoke('set-active-config', { id });
  },
  
  testApiConfig: async (apiConfig) => {
    return await ipcRenderer.invoke('test-api-config', { apiConfig });
  },
  
  // Store 操作
  storeGet: async (key) => {
    return await ipcRenderer.invoke('store-get', key);
  },
  
  storeSet: async (key, value) => {
    return await ipcRenderer.invoke('store-set', key, value);
  },
  
  storeDelete: async (key) => {
    return await ipcRenderer.invoke('store-delete', key);
  },
  
  // ========== MCP 相关 API ==========
  
  // MCP 服务器管理
  getMcpServers: async () => {
    return await ipcRenderer.invoke('get-mcp-servers');
  },
  
  addMcpServer: async (serverConfig) => {
    return await ipcRenderer.invoke('add-mcp-server', { serverConfig });
  },
  
  updateMcpServer: async (id, updates) => {
    return await ipcRenderer.invoke('update-mcp-server', { id, updates });
  },
  
  deleteMcpServer: async (id) => {
    return await ipcRenderer.invoke('delete-mcp-server', { id });
  },
  
  // MCP 连接管理
  connectMcpServer: async (serverConfig) => {
    return await ipcRenderer.invoke('connect-mcp-server', { serverConfig });
  },
  
  disconnectMcpServer: async (serverId) => {
    return await ipcRenderer.invoke('disconnect-mcp-server', { serverId });
  },
  
  getConnectedMcpServers: async () => {
    return await ipcRenderer.invoke('get-connected-mcp-servers');
  },
  
  getMcpTools: async () => {
    return await ipcRenderer.invoke('get-mcp-tools');
  },
  
  // MCP 功能开关
  toggleMcp: async (enabled) => {
    return await ipcRenderer.invoke('toggle-mcp', { enabled });
  },
  
  // 带工具调用的消息发送
  sendMessageWithTools: async (messages) => {
    return await ipcRenderer.invoke('send-message-with-tools', { messages });
  },
  
  // 监听工具调用更新
  onToolCallUpdate: (callback) => {
    ipcRenderer.on('tool-call-update', (event, data) => callback(data));
  },
  
  removeToolCallUpdateListener: () => {
    ipcRenderer.removeAllListeners('tool-call-update');
  },
  
  // ========== Gemini API 中转站相关 API ==========
  
  // 获取中转站配置
  getProxyConfig: async () => {
    return await ipcRenderer.invoke('get-proxy-config');
  },
  
  // 获取所有 Gemini Keys（包括 API 配置中同步的）
  getAllGeminiKeys: async () => {
    return await ipcRenderer.invoke('get-all-gemini-keys');
  },
  
  // 启动中转站
  startProxyServer: async () => {
    return await ipcRenderer.invoke('start-proxy-server');
  },
  
  // 停止中转站
  stopProxyServer: async () => {
    return await ipcRenderer.invoke('stop-proxy-server');
  },
  
  // 获取中转站状态
  getProxyStatus: async () => {
    return await ipcRenderer.invoke('get-proxy-status');
  },
  
  // 添加额外的 Gemini Key（手动添加）
  addProxyKey: async (key) => {
    return await ipcRenderer.invoke('add-proxy-key', { key });
  },
  
  // 删除手动添加的 Key
  removeProxyKey: async (keyId) => {
    return await ipcRenderer.invoke('remove-proxy-key', { keyId });
  },
  
  // 切换 Key 启用状态
  toggleProxyKey: async (keyId, enabled) => {
    return await ipcRenderer.invoke('toggle-proxy-key', { keyId, enabled });
  },
  
  // 设置中转站端口
  setProxyPort: async (port) => {
    return await ipcRenderer.invoke('set-proxy-port', { port });
  },
  
  // 设置是否自动同步 API 配置
  setAutoSyncApiConfigs: async (enabled) => {
    return await ipcRenderer.invoke('set-auto-sync-api-configs', { enabled });
  },
  
  // 刷新中转站 Keys
  refreshProxyKeys: async () => {
    return await ipcRenderer.invoke('refresh-proxy-keys');
  },
  
  // 测试中转站连接
  testProxyConnection: async () => {
    return await ipcRenderer.invoke('test-proxy-connection');
  },
  
  // 测试单个 Key
  testProxyKey: async (keyIndex) => {
    return await ipcRenderer.invoke('test-proxy-key', { keyIndex });
  },
  
  // 重置单个 Key
  resetProxyKey: async (keyIndex) => {
    return await ipcRenderer.invoke('reset-proxy-key', { keyIndex });
  },
  
  // 重置所有 Key
  resetAllProxyKeys: async () => {
    return await ipcRenderer.invoke('reset-all-proxy-keys');
  },
  
  // ========== 网络代理配置 ==========
  
  // 获取网络代理配置
  getNetworkProxy: async () => {
    return await ipcRenderer.invoke('get-network-proxy');
  },
  
  // 设置网络代理配置
  setNetworkProxy: async (proxyConfig) => {
    return await ipcRenderer.invoke('set-network-proxy', proxyConfig);
  },
  
  // 测试网络代理
  testNetworkProxy: async (proxyConfig) => {
    return await ipcRenderer.invoke('test-network-proxy', proxyConfig);
  },
  
  // ========== 宠物相关 API ==========
  
  // 更新宠物图片
  updatePetImage: (imagePath) => {
    ipcRenderer.send('update-pet-image', imagePath);
  },
  
  // 更新宠物大小
  updatePetSize: (size) => {
    ipcRenderer.send('update-pet-size', size);
  },
  
  // 监听宠物图片更新
  onPetImageUpdated: (callback) => {
    ipcRenderer.on('pet-image-updated', (event, imagePath) => callback(imagePath));
  },
  
  // 监听宠物大小更新
  onPetSizeUpdated: (callback) => {
    ipcRenderer.on('pet-size-updated', (event, size) => callback(size));
  },
  
  // ========== 文件/目录选择 API ==========
  
  // 选择目录
  selectDirectory: async () => {
    return await ipcRenderer.invoke('select-directory');
  },
  
  // ========== 对话界面设置 API ==========
  
  // 更新聊天主题色
  updateChatTheme: (theme) => {
    ipcRenderer.send('update-chat-theme', theme);
  },
  
  // 更新聊天字体大小
  updateChatFontSize: (fontSize) => {
    ipcRenderer.send('update-chat-font-size', fontSize);
  },
  
  // 监听聊天主题更新
  onChatThemeUpdated: (callback) => {
    ipcRenderer.on('chat-theme-updated', (event, theme) => callback(theme));
  },
  
  // 监听聊天字体大小更新
  onChatFontSizeUpdated: (callback) => {
    ipcRenderer.on('chat-font-size-updated', (event, fontSize) => callback(fontSize));
  },
  
  // ========== 主题相关 API ==========
  
  // 广播主题变化
  broadcastThemeChange: (isDarkMode) => {
    ipcRenderer.send('theme-changed', isDarkMode);
  },
  
  // 监听主题变化
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, isDarkMode) => callback(isDarkMode));
  },
  
  // 移除主题变化监听
  removeThemeChangedListener: () => {
    ipcRenderer.removeAllListeners('theme-changed');
  },
  
  // ========== 提示词模板相关 API ==========
  
  // 获取预设模板配置
  getBuiltinTemplates: async () => {
    return await ipcRenderer.invoke('get-builtin-templates');
  },
  
  // 获取用户自定义模板
  getCustomTemplates: async () => {
    return await ipcRenderer.invoke('get-custom-templates');
  },
  
  // 添加自定义模板
  addCustomTemplate: async (template) => {
    return await ipcRenderer.invoke('add-custom-template', { template });
  },
  
  // 更新自定义模板
  updateCustomTemplate: async (id, updates) => {
    return await ipcRenderer.invoke('update-custom-template', { id, updates });
  },
  
  // 删除自定义模板
  deleteCustomTemplate: async (id) => {
    return await ipcRenderer.invoke('delete-custom-template', { id });
  },
  
  // 获取快捷访问模板列表
  getQuickAccessTemplates: async () => {
    return await ipcRenderer.invoke('get-quick-access-templates');
  },
  
  // 设置快捷访问模板列表
  setQuickAccessTemplates: async (templateIds) => {
    return await ipcRenderer.invoke('set-quick-access-templates', { templateIds });
  },
  
});

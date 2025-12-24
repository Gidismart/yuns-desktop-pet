// 使用 electron-store 管理配置 - 支持多卡片配置
const Store = require('electron-store');

// 简单的UUID生成函数
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const store = new Store({
  // 固定存储名称，防止应用名更改后丢失数据
  name: 'yuns-desktop-pet-config',
  defaults: {
    // 宠物配置
    petImagePath: null,
    alwaysOnTop: false,
    
    // 主题配置
    darkMode: false,
    themeColor: 'shiba',
    
    // API 配置卡片列表（默认为空，用户自行添加）
    apiConfigs: [],
    
    // 当前激活的配置ID（默认无）
    activeConfigId: null,
    
    // MCP 服务器配置列表
    mcpServers: [
      // 示例配置（默认禁用）
      // {
      //   id: 'filesystem',
      //   name: '文件系统',
      //   command: 'npx',
      //   args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/'],
      //   env: {},
      //   enabled: false
      // }
    ],
    
    // MCP 功能开关
    mcpEnabled: false,
    
    // API 中转站配置（仅 Gemini，自动同步 API 配置）
    proxyConfig: {
      enabled: false,
      port: 3001,
      // Gemini Keys 池（额外手动添加的 Key）
      geminiKeys: [],
      // 是否自动同步 API 配置中的 Gemini Key
      autoSyncApiConfigs: true
    }
  }
});

// 辅助方法
store.getActiveConfig = function() {
  const activeId = this.get('activeConfigId');
  const configs = this.get('apiConfigs', []);
  return configs.find(c => c.id === activeId) || configs[0];
};

store.addConfig = function(config) {
  const configs = this.get('apiConfigs', []);
  const newConfig = {
    id: generateId(),
    enabled: true,
    isDefault: false,
    ...config
  };
  configs.push(newConfig);
  this.set('apiConfigs', configs);
  return newConfig;
};

store.updateConfig = function(id, updates) {
  const configs = this.get('apiConfigs', []);
  const index = configs.findIndex(c => c.id === id);
  if (index !== -1) {
    configs[index] = { ...configs[index], ...updates };
    this.set('apiConfigs', configs);
    return configs[index];
  }
  return null;
};

store.deleteConfig = function(id) {
  const configs = this.get('apiConfigs', []);
  const filtered = configs.filter(c => c.id !== id);
  this.set('apiConfigs', filtered);
  
  // 如果删除的是当前激活的配置，切换到第一个
  if (this.get('activeConfigId') === id && filtered.length > 0) {
    this.set('activeConfigId', filtered[0].id);
  }
};

store.setActiveConfig = function(id) {
  const configs = this.get('apiConfigs', []);
  if (configs.find(c => c.id === id)) {
    this.set('activeConfigId', id);
    return true;
  }
  return false;
};

// ========== MCP 服务器管理方法 ==========

store.getMcpServers = function() {
  return this.get('mcpServers', []);
};

store.addMcpServer = function(serverConfig) {
  const servers = this.get('mcpServers', []);
  const newServer = {
    id: generateId(),
    enabled: false,
    ...serverConfig
  };
  servers.push(newServer);
  this.set('mcpServers', servers);
  return newServer;
};

store.updateMcpServer = function(id, updates) {
  const servers = this.get('mcpServers', []);
  const index = servers.findIndex(s => s.id === id);
  if (index !== -1) {
    servers[index] = { ...servers[index], ...updates };
    this.set('mcpServers', servers);
    return servers[index];
  }
  return null;
};

store.deleteMcpServer = function(id) {
  const servers = this.get('mcpServers', []);
  const filtered = servers.filter(s => s.id !== id);
  this.set('mcpServers', filtered);
};

store.toggleMcpServer = function(id, enabled) {
  const servers = this.get('mcpServers', []);
  const index = servers.findIndex(s => s.id === id);
  if (index !== -1) {
    servers[index].enabled = enabled;
    this.set('mcpServers', servers);
    return servers[index];
  }
  return null;
};

// ========== API 中转站管理方法（仅 Gemini）==========

store.getProxyConfig = function() {
  return this.get('proxyConfig', {
    enabled: false,
    port: 3001,
    geminiKeys: [],
    autoSyncApiConfigs: true
  });
};

store.setProxyEnabled = function(enabled) {
  const config = this.getProxyConfig();
  config.enabled = enabled;
  this.set('proxyConfig', config);
};

store.setProxyPort = function(port) {
  const config = this.getProxyConfig();
  config.port = port;
  this.set('proxyConfig', config);
};

// 添加额外的 Gemini Key（手动添加）
store.addProxyKey = function(key) {
  const config = this.getProxyConfig();
  const keyObj = {
    id: generateId(),
    key: key,
    addedAt: Date.now(),
    enabled: true,
    source: 'manual' // 标记为手动添加
  };
  
  config.geminiKeys.push(keyObj);
  this.set('proxyConfig', config);
  return keyObj;
};

// 删除手动添加的 Key
store.removeProxyKey = function(keyId) {
  const config = this.getProxyConfig();
  config.geminiKeys = config.geminiKeys.filter(k => k.id !== keyId);
  this.set('proxyConfig', config);
};

// 切换 Key 启用状态
store.toggleProxyKey = function(keyId, enabled) {
  const config = this.getProxyConfig();
  const index = config.geminiKeys.findIndex(k => k.id === keyId);
  if (index !== -1) {
    config.geminiKeys[index].enabled = enabled;
    this.set('proxyConfig', config);
  }
};

// 获取所有可用的 Gemini Keys（合并 API 配置 + 手动添加）
store.getAllGeminiKeys = function() {
  const proxyConfig = this.getProxyConfig();
  const allKeys = [];
  
  // 1. 从 API 配置中获取 Gemini Keys（如果启用自动同步）
  if (proxyConfig.autoSyncApiConfigs) {
    const apiConfigs = this.get('apiConfigs', []);
    apiConfigs
      .filter(c => c.provider === 'gemini' && c.apiKey && c.enabled)
      .forEach(c => {
        allKeys.push({
          id: 'api-' + c.id,
          key: c.apiKey,
          source: 'api-config',
          configName: c.name,
          enabled: true
        });
      });
  }
  
  // 2. 添加手动添加的 Keys
  proxyConfig.geminiKeys
    .filter(k => k.enabled)
    .forEach(k => {
      allKeys.push({
        ...k,
        source: k.source || 'manual'
      });
    });
  
  return allKeys;
};

// 设置是否自动同步 API 配置
store.setAutoSyncApiConfigs = function(enabled) {
  const config = this.getProxyConfig();
  config.autoSyncApiConfigs = enabled;
  this.set('proxyConfig', config);
};

// ========== 网络代理配置方法 ==========

store.getNetworkProxy = function() {
  return this.get('networkProxy', {
    enabled: false,
    host: '127.0.0.1',
    port: 7890
  });
};

store.setNetworkProxy = function(proxyConfig) {
  this.set('networkProxy', {
    enabled: proxyConfig.enabled || false,
    host: proxyConfig.host || '127.0.0.1',
    port: proxyConfig.port || 7890
  });
};

store.setNetworkProxyEnabled = function(enabled) {
  const config = this.getNetworkProxy();
  config.enabled = enabled;
  this.set('networkProxy', config);
};

store.getProxyUrl = function() {
  const config = this.getNetworkProxy();
  if (config.enabled) {
    return `http://${config.host}:${config.port}`;
  }
  return null;
};

// ========== 提示词模板管理方法 ==========

// 获取用户自定义模板
store.getCustomTemplates = function() {
  return this.get('customTemplates', []);
};

// 添加自定义模板
store.addCustomTemplate = function(template) {
  const templates = this.getCustomTemplates();
  const newTemplate = {
    id: 'custom-' + generateId(),
    isBuiltin: false,
    category: '自定义',
    ...template
  };
  templates.push(newTemplate);
  this.set('customTemplates', templates);
  return newTemplate;
};

// 更新自定义模板
store.updateCustomTemplate = function(id, updates) {
  const templates = this.getCustomTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...updates };
    this.set('customTemplates', templates);
    return templates[index];
  }
  return null;
};

// 删除自定义模板
store.deleteCustomTemplate = function(id) {
  const templates = this.getCustomTemplates();
  const filtered = templates.filter(t => t.id !== id);
  this.set('customTemplates', filtered);
};

// 获取快捷访问模板列表
store.getQuickAccessTemplates = function() {
  return this.get('quickAccessTemplates', null); // null 表示使用默认配置
};

// 设置快捷访问模板列表
store.setQuickAccessTemplates = function(templateIds) {
  this.set('quickAccessTemplates', templateIds);
};

module.exports = store;

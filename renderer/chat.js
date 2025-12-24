// 对话管理 - 支持多配置切换、智能视觉分析和消息编辑
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const saveBtn = document.getElementById('save-btn');
const screenshotBtn = document.getElementById('screenshot-btn');
const settingsBtn = document.getElementById('settings-btn');
const statusDiv = document.getElementById('status');
const configSelect = document.getElementById('config-select');
const configInfo = document.getElementById('config-info');
const stopBtn = document.getElementById('stop-btn');

// 编辑模态框相关
const editModal = document.getElementById('edit-modal');
const editInput = document.getElementById('edit-input');
const editConfirmBtn = document.getElementById('edit-confirm');
const editCancelBtn = document.getElementById('edit-cancel');
const editModalClose = document.getElementById('edit-modal-close');

// 模板相关
const templateBar = document.getElementById('template-bar');
const quickTemplates = document.getElementById('quick-templates');

// 友好消息模块已通过 <script> 标签加载为全局变量
// window.FriendlyMessages, window.getFriendlyMessage, window.formatApiError, window.generateVisionSuggestions

// 对话历史
let conversationHistory = [];
let apiMessages = [];
let apiConfigs = [];
let appConfig = null;
let mcpEnabled = false;

// 生成控制
let isGenerating = false;
let stopGeneration = false;
let editingMessageIndex = -1; // 正在编辑的消息索引

// 模板数据
let builtinTemplatesConfig = null;
let allTemplates = [];

// 智能滚动控制 - 用户手动滚动时不自动滚动
let userScrolled = false;
let programmaticScroll = false; // 标记是否是程序触发的滚动

// 初始化
async function initializeApp() {
  appConfig = await window.electronAPI.getConfig();
  await loadConfigs();
  await loadMcpStatus();
  
  // 加载并应用主题
  await loadTheme();
  
  // 监听夜间模式变化
  window.electronAPI.onThemeChanged(applyDarkMode);
  
  // 监听主题色变化
  window.electronAPI.onChatThemeUpdated(applyChatTheme);
  
  // 监听字体大小变化
  window.electronAPI.onChatFontSizeUpdated(applyFontSize);
  
  // 监听 MCP 工具调用更新
  window.electronAPI.onToolCallUpdate(handleToolCallUpdate);
  
  // 添加欢迎消息
  const welcomeMsg = window.getFriendlyMessage('welcome');
  addMessage('assistant', welcomeMsg.text, 'Yuns助手');
  
  // 监听滚动事件
  messagesContainer.addEventListener('scroll', handleScroll);
  messagesContainer.addEventListener('wheel', handleWheel);
  
  // 绑定编辑模态框事件
  bindEditModalEvents();
  
  // 初始化快捷模板
  await initializeTemplates();
  
}

// 加载主题
async function loadTheme() {
  const darkMode = await window.electronAPI.storeGet('darkMode') || false;
  applyDarkMode(darkMode);
  
  // 加载主题色
  const chatTheme = await window.electronAPI.storeGet('chatTheme') || 'shiba';
  applyChatTheme(chatTheme);
  
  // 加载字体大小
  const fontSize = await window.electronAPI.storeGet('chatFontSize') || 'medium';
  applyFontSize(fontSize);
}

// 应用夜间模式
function applyDarkMode(isDarkMode) {
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

// 应用主题（兼容旧接口）
function applyTheme(isDarkMode) {
  applyDarkMode(isDarkMode);
}

// 应用主题色
function applyChatTheme(theme) {
  // 移除所有主题类
  document.body.classList.remove('theme-shiba', 'theme-blue', 'theme-purple', 'theme-green');
  // 添加新主题类（shiba 是默认主题，不需要添加类）
  if (theme !== 'shiba') {
    document.body.classList.add(`theme-${theme}`);
  }
}

// 应用字体大小
function applyFontSize(fontSize) {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${fontSize}`);
}

// 绑定编辑模态框事件
function bindEditModalEvents() {
  editConfirmBtn.addEventListener('click', handleEditConfirm);
  editCancelBtn.addEventListener('click', closeEditModal);
  editModalClose.addEventListener('click', closeEditModal);
  
  // 点击背景关闭
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });
  
  // ESC 键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
      closeEditModal();
    }
  });
}

// 打开编辑模态框
function openEditModal(messageContent, messageIndex) {
  if (isGenerating) {
    showStatus('请先停止 AI 生成再编辑消息', 'info');
    return;
  }
  
  editingMessageIndex = messageIndex;
  editInput.value = messageContent;
  editModal.classList.remove('hidden');
  editInput.focus();
  editInput.select();
}

// 关闭编辑模态框
function closeEditModal() {
  editModal.classList.add('hidden');
  editingMessageIndex = -1;
  editInput.value = '';
}

// 处理编辑确认
async function handleEditConfirm() {
  const newContent = editInput.value.trim();
  if (!newContent) {
    showStatus('消息不能为空哦~', 'info');
    return;
  }
  
  closeEditModal();
  
  // 删除从编辑点开始的所有消息
  removeMessagesFromIndex(editingMessageIndex);
  
  // 重新发送编辑后的消息
  userInput.value = newContent;
  await sendMessage(false);
}

// 从指定索引开始删除消息
function removeMessagesFromIndex(userMessageIndex) {
  // 找出需要删除的消息数量
  // userMessageIndex 对应 conversationHistory 的索引
  // 需要删除从这条用户消息开始的所有内容
  
  // 计算要删除的对话轮数
  const turnsToRemove = conversationHistory.length - userMessageIndex;
  
  // 删除 conversationHistory
  conversationHistory = conversationHistory.slice(0, userMessageIndex);
  
  // 删除 apiMessages（每轮有 user 和 assistant 两条）
  const messagesToRemove = turnsToRemove * 2;
  // 保留到 userMessageIndex 对应的位置
  apiMessages = apiMessages.slice(0, userMessageIndex * 2);
  
  // 删除 DOM 中的消息
  const allMessages = messagesContainer.querySelectorAll('.message');
  let userMsgCount = 0;
  let startRemoving = false;
  
  Array.from(allMessages).forEach(msg => {
    if (msg.classList.contains('user')) {
      if (userMsgCount === userMessageIndex) {
        startRemoving = true;
      }
      if (startRemoving) {
        msg.remove();
      } else {
        userMsgCount++;
      }
    } else if (startRemoving) {
      msg.remove();
    }
  });
}

// 处理滚动事件 - 检测用户是否手动滚动
function handleScroll() {
  // 如果是程序触发的滚动，忽略
  if (programmaticScroll) {
    return;
  }
  
  // 用户手动滚动，检查是否远离底部
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
  
  // 如果距离底部超过 150px，认为用户在查看历史消息
  if (distanceFromBottom > 150) {
    userScrolled = true;
  } else {
    // 如果用户滚动到接近底部，恢复自动滚动
    userScrolled = false;
  }
}

// 监听鼠标滚轮事件 - 更准确地检测用户滚动意图
function handleWheel(e) {
  // 向上滚动（查看历史）
  if (e.deltaY < 0) {
    userScrolled = true;
  } else {
    // 向下滚动，检查是否接近底部
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom < 50) {
      userScrolled = false;
    }
  }
}

// 智能滚动到底部
function smartScrollToBottom() {
  if (!userScrolled) {
    programmaticScroll = true;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    // 短暂延迟后重置标志，确保 scroll 事件处理完成
    requestAnimationFrame(() => {
      programmaticScroll = false;
    });
  }
}

// 强制滚动到底部
function forceScrollToBottom() {
  userScrolled = false;
  programmaticScroll = true;
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  requestAnimationFrame(() => {
    programmaticScroll = false;
  });
}

// 加载 MCP 状态
async function loadMcpStatus() {
  mcpEnabled = await window.electronAPI.storeGet('mcpEnabled') || false;
  
  if (mcpEnabled) {
    const connectedServers = await window.electronAPI.getConnectedMcpServers();
    if (connectedServers.length > 0) {
      const totalTools = connectedServers.reduce((sum, s) => sum + (s.toolCount || 0), 0);
      console.log(`MCP 已启用，${connectedServers.length} 个服务器，${totalTools} 个工具可用`);
    }
  }
}

// 处理工具调用更新
function handleToolCallUpdate(data) {
  if (data.type === 'calling') {
    addToolCallMessage('calling', data.toolName, data.args);
  } else if (data.type === 'result') {
    addToolCallMessage('result', data.toolName, data.result, data.success);
  }
}

// 添加工具调用消息 - 极简版
function addToolCallMessage(type, toolName, content, success = true) {
  const messageDiv = document.createElement('div');
  const displayName = formatToolName(toolName);
  const friendlyName = getToolFriendlyName(displayName);
  const toolIcon = getToolIcon(displayName);
  
  if (type === 'calling') {
    messageDiv.className = 'message tool-call calling';
    const paramsStr = formatToolParams(content);
    const hasParams = paramsStr && paramsStr.length > 0;
    
    messageDiv.innerHTML = `
      <div class="tool-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="tool-header-icon">${toolIcon}</div>
        <div class="tool-header-info">
          <div class="tool-header-title">${friendlyName}</div>
          <div class="tool-header-subtitle"><code>执行中...</code></div>
        </div>
        ${hasParams ? `
        <div class="tool-expand-indicator">
          <span>参数</span>
          <span class="tool-expand-arrow">▼</span>
        </div>
        ` : ''}
      </div>
      <div class="tool-loading-bar"></div>
      ${hasParams ? `
      <div class="tool-body">
        <div class="tool-section">
          <div class="tool-section-content">${escapeHtml(paramsStr)}</div>
        </div>
      </div>
      ` : ''}
    `;
  } else {
    messageDiv.className = `message tool-call ${success ? 'result-success' : 'result-error'}`;
    const outputStr = formatToolOutput(content);
    
    messageDiv.innerHTML = `
      <div class="tool-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="tool-header-icon">${success ? '✓' : '✕'}</div>
        <div class="tool-header-info">
          <div class="tool-header-title">${friendlyName}</div>
          <div class="tool-header-subtitle"><code>${success ? '已完成' : '出错了'}</code></div>
        </div>
        <div class="tool-expand-indicator">
          <span>结果</span>
          <span class="tool-expand-arrow">▼</span>
        </div>
      </div>
      <div class="tool-body">
        <div class="tool-section">
          <div class="tool-section-content">${escapeHtml(outputStr)}</div>
        </div>
      </div>
    `;
  }
  
  messagesContainer.appendChild(messageDiv);
  smartScrollToBottom();
}

// 获取工具图标
function getToolIcon(name) {
  const icons = {
    'list_directory': '📁',
    'list_allowed_directories': '📂',
    'read_file': '📄',
    'write_file': '✏️',
    'create_directory': '📁',
    'move_file': '📦',
    'search_files': '🔍',
    'get_file_info': '📋',
    'execute_command': '⌨️',
    'fetch': '🌐',
    'puppeteer_navigate': '🌐',
    'puppeteer_screenshot': '📸',
    'puppeteer_click': '👆',
    'puppeteer_fill': '⌨️',
    'puppeteer_evaluate': '⚡',
    'get_news': '📰',
    'search_news': '🔎',
    'store': '💾',
    'retrieve': '📥'
  };
  return icons[name] || '🔧';
}

// 格式化工具名称
function formatToolName(name) {
  const parts = name.split('__');
  return parts.length > 1 ? parts.slice(1).join('__') : name;
}

// 获取工具友好名称
function getToolFriendlyName(name) {
  const friendlyNames = {
    'list_directory': '📁 列出目录',
    'list_allowed_directories': '📂 可访问目录',
    'read_file': '📄 读取文件',
    'write_file': '✏️ 写入文件',
    'create_directory': '📁 创建目录',
    'move_file': '📦 移动文件',
    'search_files': '🔍 搜索文件',
    'get_file_info': '📋 文件信息',
    'execute_command': '💻 执行命令',
    'fetch': '🌐 网络请求'
  };
  return friendlyNames[name] || name;
}

// 格式化工具参数
function formatToolParams(params) {
  if (!params || (typeof params === 'object' && Object.keys(params).length === 0)) {
    return '';
  }
  
  if (typeof params === 'string') {
    return params;
  }
  
  const lines = [];
  for (const [key, value] of Object.entries(params)) {
    const displayValue = typeof value === 'string' ? value : JSON.stringify(value);
    lines.push(`${key}: ${displayValue}`);
  }
  return lines.join('\n');
}

// 格式化工具输出
function formatToolOutput(output) {
  if (!output) return '(无输出)';
  const maxLength = 2000;
  if (output.length > maxLength) {
    return output.substring(0, maxLength) + '\n\n... (输出已截断)';
  }
  return output;
}

// 转义 HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 加载配置列表
async function loadConfigs() {
  apiConfigs = await window.electronAPI.getApiConfigs();
  const activeConfig = await window.electronAPI.getActiveConfig();
  
  configSelect.innerHTML = '';
  
  const enabledConfigs = apiConfigs.filter(c => c.enabled);
  
  if (enabledConfigs.length === 0) {
    configSelect.innerHTML = '<option value="">还没有配置呢~</option>';
    configInfo.textContent = '等待配置 🔧';
    configInfo.className = 'config-badge';
    updateScreenshotButton(false);
    return;
  }
  
  enabledConfigs.forEach(config => {
    const option = document.createElement('option');
    option.value = config.id;
    option.textContent = config.name;
    if (config.id === activeConfig?.id) {
      option.selected = true;
    }
    configSelect.appendChild(option);
  });
  
  await updateConfigInfo();
}

// 检查当前配置是否支持视觉
function checkCurrentVisionSupport() {
  const selectedId = configSelect.value;
  const config = apiConfigs.find(c => c.id === selectedId);
  
  if (!config || !appConfig) return false;
  
  const template = appConfig.providerTemplates[config.provider];
  const model = template?.models.find(m => m.id === config.selectedModel);
  
  return model?.supportsVision === true;
}

// 更新截图按钮状态
function updateScreenshotButton(supportsVision) {
  if (supportsVision) {
    screenshotBtn.disabled = false;
    screenshotBtn.title = '截图分析';
    screenshotBtn.style.opacity = '1';
  } else {
    screenshotBtn.disabled = false;
    screenshotBtn.title = '截图分析（当前模型不支持）';
    screenshotBtn.style.opacity = '0.6';
  }
}

// 更新配置信息显示
async function updateConfigInfo() {
  const selectedId = configSelect.value;
  const config = apiConfigs.find(c => c.id === selectedId);
  
  if (!config) {
    configInfo.textContent = '等待配置 🔧';
    configInfo.className = 'config-badge';
    updateScreenshotButton(false);
    return;
  }
  
  const template = appConfig.providerTemplates[config.provider];
  const model = template?.models.find(m => m.id === config.selectedModel);
  
  let infoText = `${template?.icon || ''} ${model?.name || config.selectedModel}`;
  if (model?.supportsVision) {
    infoText += ' 👁️';
  }
  
  configInfo.textContent = infoText;
  configInfo.className = config.apiKey ? 'config-badge success' : 'config-badge';
  
  updateScreenshotButton(model?.supportsVision === true);
}

// 添加消息到界面
function addMessage(role, content, model = null, screenshot = null, messageIndex = -1) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const label = document.createElement('div');
  label.className = 'message-label';
  
  if (role === 'user') {
    label.innerHTML = '你';
    // 为用户消息添加点击编辑功能
    const actualIndex = messageIndex >= 0 ? messageIndex : conversationHistory.length;
    messageDiv.dataset.messageIndex = actualIndex;
    messageDiv.addEventListener('click', () => {
      openEditModal(content, actualIndex);
    });
  } else {
    label.innerHTML = `AI助手${model ? ` <span class="model-badge">${model}</span>` : ''}`;
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(contentDiv);
  
  if (screenshot) {
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + screenshot;
    img.className = 'screenshot-preview';
    messageDiv.appendChild(img);
  }
  
  messagesContainer.appendChild(messageDiv);
  smartScrollToBottom();
  
  return messageDiv;
}

// 流式添加消息（支持停止）
async function addMessageStreaming(role, content, model = null, screenshot = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  
  const label = document.createElement('div');
  label.className = 'message-label';
  
  if (role === 'user') {
    label.innerHTML = '你';
  } else {
    label.innerHTML = `AI助手${model ? ` <span class="model-badge">${model}</span>` : ''}`;
  }
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content streaming';
  
  messageDiv.appendChild(label);
  messageDiv.appendChild(contentDiv);
  
  if (screenshot) {
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + screenshot;
    img.className = 'screenshot-preview';
    messageDiv.appendChild(img);
  }
  
  messagesContainer.appendChild(messageDiv);
  
  // 流式显示
  let currentText = '';
  const chars = content.split('');
  const delay = 12;
  
  for (const char of chars) {
    if (stopGeneration) {
      currentText += '...(已停止)';
      contentDiv.textContent = currentText;
      break;
    }
    
    currentText += char;
    contentDiv.textContent = currentText;
    smartScrollToBottom();
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  contentDiv.classList.remove('streaming');
  
  return { messageDiv, displayedContent: currentText };
}

// 显示/隐藏加载动画
function showLoading() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.id = 'loading-indicator';
  loadingDiv.innerHTML = '<span></span><span></span><span></span>';
  messagesContainer.appendChild(loadingDiv);
  smartScrollToBottom();
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading-indicator');
  if (loadingDiv) loadingDiv.remove();
}

// 显示状态提示
function showStatus(message, type = 'success') {
  statusDiv.textContent = message;
  statusDiv.className = type;
  setTimeout(() => statusDiv.classList.add('hidden'), 3000);
}

// 发送消息
async function sendMessage(isRegenerate = false) {
  const question = userInput.value.trim();
  
  if (!question) {
    const msg = window.getFriendlyMessage('noInput');
    showStatus(msg.text, msg.type);
    return;
  }
  
  const selectedId = configSelect.value;
  if (!selectedId) {
    const msg = window.getFriendlyMessage('noConfig');
    showStatus(msg.text, msg.type);
    return;
  }
  
  // 设置为激活配置
  await window.electronAPI.setActiveConfig(selectedId);
  
  // 开始生成
  isGenerating = true;
  stopGeneration = false;
  
  // 更新按钮状态
  updateButtonStates(true);
  
  // 添加用户消息并记录索引
  const userMsgIndex = conversationHistory.length;
  addMessage('user', question, null, null, userMsgIndex);
  forceScrollToBottom();
  
  userInput.value = '';
  userInput.style.height = 'auto';
  
  // 更新 apiMessages
  apiMessages.push({
    role: 'user',
    content: question
  });
  
  showLoading();
  
  try {
    const response = mcpEnabled 
      ? await window.electronAPI.sendMessageWithTools(apiMessages)
      : await window.electronAPI.sendMessage(apiMessages);
    
    hideLoading();
    
    if (response.success) {
      const answer = response.content;
      const model = response.model;
      
      if (response.toolCalls && response.toolCalls.length > 0) {
        showStatus(`🛠️ 使用了 ${response.toolCalls.length} 个工具`, 'info');
      }
      
      const result = await addMessageStreaming('assistant', answer, model);
      const displayedAnswer = result.displayedContent || answer;
      
      apiMessages.push({
        role: 'assistant',
        content: displayedAnswer
      });
      
      conversationHistory.push({
        question: question,
        answer: displayedAnswer,
        model: model,
        toolCalls: response.toolCalls
      });
    } else {
      const friendlyError = window.formatApiError(response.error || '未知错误');
      const msg = window.getFriendlyMessage('apiCallFailed', friendlyError);
      addMessage('assistant', msg.text, '提示 💡');
      showStatus(msg.text.split('\n')[0], msg.type);
    }
  } catch (error) {
    hideLoading();
    console.error('发送消息失败:', error);
    const friendlyError = window.formatApiError(error.message);
    const msg = window.getFriendlyMessage('apiCallFailed', friendlyError);
    addMessage('assistant', msg.text, '提示 💡');
    showStatus(msg.text.split('\n')[0], msg.type);
  } finally {
    isGenerating = false;
    stopGeneration = false;
    updateButtonStates(false);
    userInput.focus();
  }
}

// 停止生成
function handleStopGeneration() {
  stopGeneration = true;
  showStatus('已请求停止生成...', 'info');
}

// 更新按钮状态
function updateButtonStates(generating) {
  userInput.disabled = generating;
  sendBtn.disabled = generating;
  saveBtn.disabled = generating;
  screenshotBtn.disabled = generating;
  
  if (generating) {
    stopBtn.classList.remove('hidden');
    sendBtn.classList.add('hidden');
  } else {
    stopBtn.classList.add('hidden');
    sendBtn.classList.remove('hidden');
  }
}

// 截图分析
async function analyzeScreenshot() {
  const selectedId = configSelect.value;
  if (!selectedId) {
    const msg = window.getFriendlyMessage('noConfig');
    showStatus(msg.text, msg.type);
    return;
  }
  
  const supportsVision = checkCurrentVisionSupport();
  const currentConfig = apiConfigs.find(c => c.id === selectedId);
  
  if (!supportsVision) {
    const template = appConfig.providerTemplates[currentConfig.provider];
    const currentModel = template?.models.find(m => m.id === currentConfig.selectedModel);
    const visionModels = template?.models.filter(m => m.supportsVision);
    
    const allVisionConfigs = apiConfigs.filter(c => {
      const t = appConfig.providerTemplates[c.provider];
      const m = t?.models.find(model => model.id === c.selectedModel);
      return m?.supportsVision === true;
    }).map(cfg => {
      const t = appConfig.providerTemplates[cfg.provider];
      const m = t?.models.find(model => model.id === cfg.selectedModel);
      return { name: cfg.name, model: m?.name };
    });
    
    const suggestions = window.generateVisionSuggestions(visionModels, allVisionConfigs);
    const msg = window.getFriendlyMessage('noVisionSupport', currentModel?.name || currentConfig.selectedModel, suggestions);
    
    addMessage('assistant', msg.text, '柴柴助手 🐕');
    showStatus(msg.text.split('\n')[0], msg.type);
    return;
  }
  
  await window.electronAPI.setActiveConfig(selectedId);
  
  screenshotBtn.disabled = true;
  sendBtn.disabled = true;
  saveBtn.disabled = true;
  userInput.disabled = true;
  
  const capturingMsg = window.getFriendlyMessage('screenshotCapturing');
  showStatus(capturingMsg.text, capturingMsg.type);
  
  try {
    const captureResult = await window.electronAPI.captureScreen();
    
    if (!captureResult.success) {
      const msg = window.getFriendlyMessage('screenshotFailed', captureResult.error);
      showStatus(msg.text.split('\n')[0], msg.type);
      return;
    }
    
    const screenshot = captureResult.data;
    addMessage('user', '📸 请分析这张屏幕截图', null, screenshot);
    
    showLoading();
    const analyzingMsg = window.getFriendlyMessage('screenshotAnalyzing');
    showStatus(analyzingMsg.text, analyzingMsg.type);
    
    const analysisResult = await window.electronAPI.analyzeScreenshot(screenshot);
    hideLoading();
    
    if (analysisResult.success) {
      const answer = analysisResult.content;
      const model = analysisResult.model;
      
      await addMessageStreaming('assistant', answer, model);
      
      conversationHistory.push({
        question: '📸 屏幕截图分析',
        answer: answer,
        model: model
      });
      
      const successMsg = window.getFriendlyMessage('screenshotSuccess');
      showStatus(successMsg.text, successMsg.type);
    } else {
      const friendlyError = window.formatApiError(analysisResult.error);
      const msg = window.getFriendlyMessage('screenshotFailed', friendlyError);
      addMessage('assistant', msg.text, '提示 💡');
      showStatus(msg.text.split('\n')[0], msg.type);
    }
  } catch (error) {
    hideLoading();
    console.error('截图分析失败:', error);
    const friendlyError = window.formatApiError(error.message);
    const msg = window.getFriendlyMessage('screenshotFailed', friendlyError);
    addMessage('assistant', msg.text, '提示 💡');
    showStatus(msg.text.split('\n')[0], msg.type);
  } finally {
    screenshotBtn.disabled = false;
    sendBtn.disabled = false;
    saveBtn.disabled = false;
    userInput.disabled = false;
  }
}

// 保存对话
async function saveConversation() {
  if (conversationHistory.length === 0) {
    const msg = window.getFriendlyMessage('noConversation');
    showStatus(msg.text, msg.type);
    return;
  }
  
  saveBtn.disabled = true;
  
  const savingMsg = window.getFriendlyMessage('savingConversation');
  showStatus(savingMsg.text, savingMsg.type);
  
  try {
    const result = await window.electronAPI.saveConversation(conversationHistory);
    
    if (result.success) {
      const msg = window.getFriendlyMessage('saveSuccess', result.filename);
      showStatus(msg.text.split('\n')[0], msg.type);
    } else {
      const msg = window.getFriendlyMessage('saveFailed', result.error);
      showStatus(msg.text.split('\n')[0], msg.type);
    }
  } catch (error) {
    console.error('保存对话失败:', error);
    const msg = window.getFriendlyMessage('saveFailed', error.message);
    showStatus(msg.text.split('\n')[0], msg.type);
  } finally {
    saveBtn.disabled = false;
  }
}

// 事件监听
sendBtn.addEventListener('click', () => sendMessage(false));
stopBtn.addEventListener('click', handleStopGeneration);
screenshotBtn.addEventListener('click', analyzeScreenshot);
settingsBtn.addEventListener('click', () => window.electronAPI.openSettings());
saveBtn.addEventListener('click', saveConversation);

configSelect.addEventListener('change', async () => {
  await updateConfigInfo();
  const selectedId = configSelect.value;
  if (selectedId) {
    await window.electronAPI.setActiveConfig(selectedId);
    const msg = window.getFriendlyMessage('configActivated');
    showStatus(msg.text, msg.type);
  }
});

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendMessage(false);
  }
});

// 输入框自动调整高度
function autoResizeTextarea() {
  userInput.style.height = 'auto';
  const minHeight = 24;
  const maxHeight = 150;
  const newHeight = Math.min(Math.max(userInput.scrollHeight, minHeight), maxHeight);
  userInput.style.height = newHeight + 'px';
}

userInput.addEventListener('input', autoResizeTextarea);

// ========== 快捷模板功能 ==========

// 初始化模板
async function initializeTemplates() {
  try {
    // 加载预设模板
    builtinTemplatesConfig = await window.electronAPI.getBuiltinTemplates();
    allTemplates = builtinTemplatesConfig?.templates || [];
    
    // 渲染快捷模板栏
    renderQuickTemplates();
  } catch (error) {
    console.error('初始化模板失败:', error);
  }
}

// 渲染快捷模板栏
function renderQuickTemplates() {
  if (!quickTemplates) return;
  
  quickTemplates.innerHTML = '';
  
  // 获取快捷访问的模板 ID
  const quickAccessIds = builtinTemplatesConfig?.quickAccess || ['summarize', 'translate', 'polish', 'explain'];
  
  // 找到对应的模板并渲染
  quickAccessIds.forEach(id => {
    const template = allTemplates.find(t => t.id === id);
    if (template) {
      const btn = document.createElement('button');
      btn.className = 'template-quick-btn';
      btn.dataset.templateId = template.id;
      btn.innerHTML = `
        <span class="template-icon">${template.icon}</span>
        <span>${template.name}</span>
      `;
      btn.addEventListener('click', () => applyTemplate(template));
      quickTemplates.appendChild(btn);
    }
  });
}

// 应用模板
function applyTemplate(template) {
  const currentText = userInput.value.trim();
  let promptText = template.prompt;
  
  // 替换占位符
  if (promptText.includes('{{text}}')) {
    promptText = promptText.replace(/\{\{text\}\}/g, currentText || '');
  } else if (currentText) {
    // 如果模板没有占位符但输入框有内容，追加到末尾
    promptText = promptText + '\n\n' + currentText;
  }
  
  userInput.value = promptText;
  autoResizeTextarea();
  userInput.focus();
  
  showStatus(`✨ 已应用模板「${template.name}」`, 'success');
}

// 初始化
userInput.focus();
initializeApp();

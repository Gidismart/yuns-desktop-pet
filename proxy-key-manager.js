// Gemini API Key 管理器 - 负责 Key 的轮询、状态管理和故障切换
// 支持动态代理配置，无需重启

const store = require('./store');

class GeminiKeyManager {
  constructor() {
    // Key 池
    this.keys = [];
    
    // 当前索引
    this.currentIndex = 0;

    // 服务启动时间
    this.startTime = null;

    // 全局统计
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastRequestTime: null
    };

    // 配置
    this.config = {
      cooldownTime: 60 * 1000,              // Key 冷却时间（1分钟）
      maxFailures: 3,                        // 最大连续失败次数
      recoveryCheckInterval: 30 * 1000,      // 恢复检查间隔（30秒）
      rateLimitCooldownTime: 60 * 1000,      // RPM 速率限制冷却时间（1分钟）
      dailyQuotaCooldownTime: null           // 每日配额用尽：动态计算到太平洋时间午夜
    };

    // 恢复检查定时器
    this.recoveryInterval = null;
  }
  
  /**
   * 动态获取代理 Agent（每次调用时实时读取配置，无需重启）
   */
  getProxyAgent() {
    try {
      const proxyConfig = store.getNetworkProxy ? store.getNetworkProxy() : null;
      
      if (!proxyConfig || !proxyConfig.enabled) {
        return null;
      }
      
      const { HttpsProxyAgent } = require('https-proxy-agent');
      const proxyUrl = `http://${proxyConfig.host}:${proxyConfig.port}`;
      return new HttpsProxyAgent(proxyUrl);
    } catch (err) {
      console.error('❌ 创建代理 Agent 失败:', err.message);
      return null;
    }
  }

  /**
   * 初始化 Key 池
   */
  initialize(geminiKeys) {
    this.startTime = Date.now();
    
    // 重置全局统计
    this.stats = {
      totalRequests: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      lastRequestTime: null
    };

    this.keys = geminiKeys
      .filter(k => k.enabled !== false)
      .map((k, index) => ({
        index,
        key: k.key,
        source: k.source || 'unknown',
        configName: k.configName,
        status: 'active',           // active, cooldown, disabled
        statusReason: null,         // 状态原因
        failureCount: 0,
        lastUsed: null,
        lastError: null,
        lastErrorTime: null,
        cooldownUntil: null,
        // 统计
        totalRequests: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        quotaErrors: 0,
        rateLimitErrors: 0,
        lastSuccessTime: null
      }));

    console.log(`🔑 Key 管理器初始化完成，共 ${this.keys.length} 个 Key`);
    
    // 启动恢复检查
    this.startRecoveryChecker();
  }

  /**
   * 获取下一个可用的 Key
   */
  getNextKey() {
    if (this.keys.length === 0) return null;

    // 遍历所有 Key，找到可用的
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentIndex + i) % this.keys.length;
      const keyObj = this.keys[index];
      
      if (this.isKeyAvailable(keyObj)) {
        keyObj.lastUsed = Date.now();
        keyObj.totalRequests++;
        this.stats.totalRequests++;
        this.stats.lastRequestTime = Date.now();
        
        // 轮询到下一个
        this.currentIndex = (index + 1) % this.keys.length;
        return keyObj;
      }
    }

    return null;
  }

  /**
   * 检查 Key 是否可用
   */
  isKeyAvailable(keyObj) {
    if (keyObj.status === 'disabled') return false;
    
    if (keyObj.status === 'cooldown') {
      // 检查冷却是否结束
      if (Date.now() >= keyObj.cooldownUntil) {
        keyObj.status = 'active';
        keyObj.statusReason = null;
        keyObj.failureCount = 0;
        console.log(`🔄 Key #${keyObj.index + 1} 冷却结束，重新激活`);
        return true;
      }
      return false;
    }

    return keyObj.status === 'active';
  }

  /**
   * 获取可用 Key 数量
   */
  getAvailableCount() {
    return this.keys.filter(k => this.isKeyAvailable(k)).length;
  }

  /**
   * 报告成功
   */
  reportSuccess(keyObj) {
    if (!keyObj) return;
    
    keyObj.failureCount = 0;
    keyObj.status = 'active';
    keyObj.statusReason = null;
    keyObj.totalSuccesses++;
    keyObj.lastSuccessTime = Date.now();
    this.stats.totalSuccesses++;
    
    console.log(`✅ Key #${keyObj.index + 1} 请求成功`);
  }

  /**
   * 报告失败
   */
  reportFailure(keyObj, error) {
    if (!keyObj) return;
    
    keyObj.failureCount++;
    keyObj.totalFailures++;
    this.stats.totalFailures++;
    keyObj.lastError = error.message || String(error);
    keyObj.lastErrorTime = Date.now();

    const errorMsg = String(error.message || error).toLowerCase();

    // 判断错误类型
    if (this.isDailyQuotaError(errorMsg)) {
      // 每日配额用尽 - 需要等到太平洋时间午夜重置
      keyObj.status = 'cooldown';
      keyObj.statusReason = '每日配额用尽';
      keyObj.cooldownUntil = this.getNextPacificMidnight();
      keyObj.quotaErrors++;
      const hoursRemaining = Math.ceil((keyObj.cooldownUntil - Date.now()) / (1000 * 60 * 60));
      console.log(`🚫 Key #${keyObj.index + 1} 每日配额用尽，需等待约 ${hoursRemaining} 小时（太平洋时间午夜重置）`);
    } else if (this.isRateLimitError(errorMsg)) {
      // RPM 速率限制 - 等待 1 分钟
      keyObj.status = 'cooldown';
      keyObj.statusReason = '速率限制(RPM)';
      keyObj.cooldownUntil = Date.now() + this.config.rateLimitCooldownTime;
      keyObj.rateLimitErrors++;
      console.log(`🚦 Key #${keyObj.index + 1} 速率限制(RPM)，冷却 ${this.config.rateLimitCooldownTime / 1000}秒`);
    } else if (this.isAuthError(errorMsg)) {
      // 认证错误 - 永久禁用
      keyObj.status = 'disabled';
      keyObj.statusReason = 'Key 无效';
      console.log(`🚫 Key #${keyObj.index + 1} 认证失败，已禁用`);
    } else if (keyObj.failureCount >= this.config.maxFailures) {
      // 连续失败 - 短期冷却
      keyObj.status = 'cooldown';
      keyObj.statusReason = '连续失败';
      keyObj.cooldownUntil = Date.now() + this.config.cooldownTime;
      console.log(`⚠️ Key #${keyObj.index + 1} 连续失败 ${keyObj.failureCount} 次，冷却中`);
    }

    console.log(`❌ Key #${keyObj.index + 1} 失败: ${error.message || error}`);
  }

  /**
   * 判断是否为每日配额用尽错误
   * Gemini 每日配额用尽通常返回: "quota exceeded", "resource exhausted", "limit: 0"
   */
  isDailyQuotaError(error) {
    // 包含 quota/resource exhausted 且可能包含 limit: 0 或 daily
    const quotaKeywords = ['quota exceeded', 'resource exhausted', 'resource_exhausted', 'limit reached'];
    const hasQuotaError = quotaKeywords.some(p => error.includes(p));
    
    // 如果包含 "limit: 0" 或 "daily"，确定是每日配额
    const isDailyIndicator = error.includes('limit: 0') || error.includes('daily');
    
    // 如果是配额错误，默认认为是每日配额用尽（保守策略）
    return hasQuotaError;
  }

  /**
   * 判断是否为 RPM 速率限制错误
   * RPM 限制通常返回: "Too Many Requests", "rate limit", 429
   */
  isRateLimitError(error) {
    return ['rate limit', 'too many requests', 'slow down'].some(p => error.includes(p));
  }

  /**
   * 判断是否为认证错误
   */
  isAuthError(error) {
    return ['invalid api key', 'unauthorized', '401', 'api_key_invalid'].some(p => error.includes(p));
  }

  /**
   * 计算下一个太平洋时间午夜的时间戳
   * Gemini 每日配额在太平洋时间午夜重置
   * PST = UTC-8, PDT = UTC-7 (夏令时)
   */
  getNextPacificMidnight() {
    const now = new Date();
    
    // 获取当前 UTC 时间
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const utcDate = now.getUTCDate();
    const utcHours = now.getUTCHours();
    
    // 太平洋时间偏移（简化处理，使用 PST UTC-8）
    // 实际上应该考虑夏令时，但为了简化，使用固定偏移
    const pacificOffset = -8; // PST
    
    // 计算太平洋时间的当前小时
    let pacificHours = utcHours + pacificOffset;
    let pacificDate = utcDate;
    
    if (pacificHours < 0) {
      pacificHours += 24;
      pacificDate -= 1;
    }
    
    // 计算到下一个太平洋时间午夜的时间
    // 下一个太平洋午夜 = 今天太平洋时间 00:00 + 24小时（如果还没到午夜）
    //                  = 明天太平洋时间 00:00（如果已经过了午夜）
    
    // 创建今天太平洋时间 00:00 对应的 UTC 时间
    const todayPacificMidnightUTC = new Date(Date.UTC(utcYear, utcMonth, utcDate, -pacificOffset, 0, 0));
    
    // 如果当前时间已经过了今天的太平洋午夜，则使用明天的
    let nextMidnight = todayPacificMidnightUTC;
    if (now >= todayPacificMidnightUTC) {
      nextMidnight = new Date(todayPacificMidnightUTC.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // 添加 5 分钟缓冲，确保配额已经重置
    return nextMidnight.getTime() + 5 * 60 * 1000;
  }

  /**
   * 启动恢复检查
   */
  startRecoveryChecker() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
    
    this.recoveryInterval = setInterval(() => {
      this.keys.forEach(keyObj => {
        if (keyObj.status === 'cooldown' && Date.now() >= keyObj.cooldownUntil) {
          keyObj.status = 'active';
          keyObj.statusReason = null;
          keyObj.failureCount = 0;
          console.log(`🔄 Key #${keyObj.index + 1} 自动恢复`);
        }
      });
    }, this.config.recoveryCheckInterval);
  }

  /**
   * 获取详细状态
   */
  getStatus() {
    const now = Date.now();
    const uptime = this.startTime ? Math.floor((now - this.startTime) / 1000) : 0;
    
    // 计算总体健康度
    const activeCount = this.keys.filter(k => k.status === 'active').length;
    const cooldownCount = this.keys.filter(k => k.status === 'cooldown').length;
    const disabledCount = this.keys.filter(k => k.status === 'disabled').length;
    
    let healthLevel = 'healthy';
    if (activeCount === 0 && cooldownCount > 0) {
      healthLevel = 'warning';
    } else if (activeCount === 0 && disabledCount === this.keys.length) {
      healthLevel = 'critical';
    } else if (activeCount < this.keys.length / 2) {
      healthLevel = 'warning';
    }

    // 计算下一个恢复时间
    let nextRecoveryTime = null;
    const cooldownKeys = this.keys.filter(k => k.status === 'cooldown' && k.cooldownUntil);
    if (cooldownKeys.length > 0) {
      const earliestRecovery = Math.min(...cooldownKeys.map(k => k.cooldownUntil));
      nextRecoveryTime = earliestRecovery > now ? earliestRecovery - now : 0;
    }

    return {
      // 服务状态
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      healthLevel,
      
      // Key 统计
      total: this.keys.length,
      active: activeCount,
      cooldown: cooldownCount,
      disabled: disabledCount,
      available: this.getAvailableCount(),
      
      // 下一个恢复时间
      nextRecoveryTime,
      nextRecoveryFormatted: nextRecoveryTime ? this.formatDuration(nextRecoveryTime) : null,
      
      // 全局统计
      stats: {
        totalRequests: this.stats.totalRequests,
        totalSuccesses: this.stats.totalSuccesses,
        totalFailures: this.stats.totalFailures,
        successRate: this.stats.totalRequests > 0 
          ? Math.round((this.stats.totalSuccesses / this.stats.totalRequests) * 100) 
          : 100,
        lastRequestTime: this.stats.lastRequestTime,
        lastRequestFormatted: this.stats.lastRequestTime 
          ? this.formatTimeAgo(this.stats.lastRequestTime) 
          : '暂无'
      },
      
      // 每个 Key 的详细状态
      keys: this.keys.map(k => {
        const cooldownRemaining = k.cooldownUntil ? Math.max(0, k.cooldownUntil - now) : 0;
        
        return {
          index: k.index + 1,
          source: k.source,
          configName: k.configName,
          status: k.status,
          statusReason: k.statusReason,
          statusEmoji: this.getStatusEmoji(k.status),
          statusText: this.getStatusText(k),
          
          // 冷却信息
          cooldownRemaining,
          cooldownFormatted: cooldownRemaining > 0 ? this.formatDuration(cooldownRemaining) : null,
          
          // 统计
          totalRequests: k.totalRequests,
          totalSuccesses: k.totalSuccesses,
          totalFailures: k.totalFailures,
          successRate: k.totalRequests > 0 
            ? Math.round((k.totalSuccesses / k.totalRequests) * 100) 
            : 100,
          
          // 错误分类
          quotaErrors: k.quotaErrors,
          rateLimitErrors: k.rateLimitErrors,
          
          // 最后使用/错误
          lastUsed: k.lastUsed,
          lastUsedFormatted: k.lastUsed ? this.formatTimeAgo(k.lastUsed) : '未使用',
          lastError: k.lastError,
          lastErrorTime: k.lastErrorTime,
          lastErrorFormatted: k.lastErrorTime ? this.formatTimeAgo(k.lastErrorTime) : null,
          
          // Key 预览
          keyPreview: k.key ? `${k.key.slice(0, 8)}...${k.key.slice(-4)}` : 'N/A'
        };
      })
    };
  }

  /**
   * 获取状态 Emoji
   */
  getStatusEmoji(status) {
    const emojis = {
      'active': '🟢',
      'cooldown': '🟡',
      'disabled': '🔴'
    };
    return emojis[status] || '⚪';
  }

  /**
   * 获取状态文本
   */
  getStatusText(keyObj) {
    if (keyObj.status === 'active') {
      return '可用';
    } else if (keyObj.status === 'cooldown') {
      const remaining = Math.max(0, keyObj.cooldownUntil - Date.now());
      // 根据原因显示不同文本
      if (keyObj.statusReason === '每日配额用尽') {
        return `今日已用尽 (${this.formatDuration(remaining)}后重置)`;
      } else if (keyObj.statusReason === '速率限制(RPM)') {
        return `速率限制 (${this.formatDuration(remaining)})`;
      }
      return `冷却中 (${this.formatDuration(remaining)})`;
    } else if (keyObj.status === 'disabled') {
      return keyObj.statusReason || '已禁用';
    }
    return '未知';
  }

  /**
   * 格式化运行时间
   */
  formatUptime(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${mins}分`;
  }

  /**
   * 格式化持续时间（毫秒）
   */
  formatDuration(ms) {
    if (ms < 1000) return '即将恢复';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}秒`;
    
    const mins = Math.floor(seconds / 60);
    if (mins < 60) {
      const secs = seconds % 60;
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
    }
    
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    if (hours < 24) {
      return remainMins > 0 ? `${hours}小时${remainMins}分` : `${hours}小时`;
    }
    
    // 超过 24 小时
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`;
  }

  /**
   * 格式化时间差
   */
  formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 1000) return '刚刚';
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }

  /**
   * 重置单个 Key
   */
  resetKey(index) {
    const keyObj = this.keys[index];
    if (keyObj) {
      keyObj.status = 'active';
      keyObj.statusReason = null;
      keyObj.failureCount = 0;
      keyObj.cooldownUntil = null;
      keyObj.lastError = null;
      keyObj.lastErrorTime = null;
      console.log(`🔄 Key #${index + 1} 已重置`);
      return true;
    }
    return false;
  }

  /**
   * 重置所有冷却中的 Key
   */
  resetAllKeys() {
    let resetCount = 0;
    
    this.keys.forEach((keyObj, index) => {
      if (keyObj.status === 'cooldown') {
        this.resetKey(index);
        resetCount++;
      }
    });
    
    console.log(`🔄 已重置 ${resetCount} 个 Key`);
    return { success: true, resetCount };
  }

  /**
   * 测试单个 Key 的连接（支持代理）
   */
  async testKey(keyIndex) {
    const keyObj = this.keys[keyIndex];
    if (!keyObj) {
      return { success: false, error: 'Key 不存在' };
    }

    const https = require('https');
    const proxyAgent = this.getProxyAgent();
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // 使用模型列表接口测试，比生成内容更快
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models?key=${keyObj.key}`,
        method: 'GET',
        timeout: 30000,
        agent: proxyAgent
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          
          if (res.statusCode === 200) {
            resolve({
              success: true,
              responseTime,
              message: `连接成功 (${responseTime}ms)${proxyAgent ? ' [通过代理]' : ''}`
            });
          } else {
            let errorMsg = '未知错误';
            try {
              const parsed = JSON.parse(data);
              errorMsg = parsed.error?.message || `HTTP ${res.statusCode}`;
            } catch {
              errorMsg = `HTTP ${res.statusCode}`;
            }
            resolve({
              success: false,
              responseTime,
              error: errorMsg
            });
          }
        });
      });

      req.on('error', (err) => {
        const proxyConfig = store.getNetworkProxy ? store.getNetworkProxy() : null;
        const usingProxy = proxyConfig?.enabled;
        resolve({
          success: false,
          error: `${err.message}${usingProxy ? ` (代理: ${proxyConfig.host}:${proxyConfig.port})` : ' (直连模式，可在设置中配置代理)'}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const proxyConfig = store.getNetworkProxy ? store.getNetworkProxy() : null;
        const usingProxy = proxyConfig?.enabled;
        resolve({
          success: false,
          error: `连接超时${usingProxy ? ` (代理: ${proxyConfig.host}:${proxyConfig.port})` : ' (直连模式，建议配置代理)'}`
        });
      });

      req.end();
    });
  }

  /**
   * 停止管理器
   */
  stop() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
    console.log('🔑 Key 管理器已停止');
  }
}

module.exports = new GeminiKeyManager();

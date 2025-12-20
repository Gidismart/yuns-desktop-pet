// Gemini API Key 管理器 - 负责 Key 的轮询、状态管理和故障切换

class GeminiKeyManager {
  constructor() {
    // Key 池
    this.keys = [];
    
    // 当前索引
    this.currentIndex = 0;

    // 配置
    this.config = {
      cooldownTime: 60 * 1000,     // Key 冷却时间（1分钟）
      maxFailures: 3,              // 最大连续失败次数
      recoveryCheckInterval: 5 * 60 * 1000  // 恢复检查间隔（5分钟）
    };

    // 启动恢复检查
    this.startRecoveryChecker();
  }

  /**
   * 初始化 Key 池
   * @param {Array} geminiKeys - 所有 Gemini Keys 数组
   */
  initialize(geminiKeys) {
    this.keys = geminiKeys
      .filter(k => k.enabled !== false)
      .map((k, index) => ({
        id: k.id,
        key: k.key,
        index,
        source: k.source || 'unknown',
        configName: k.configName,
        status: 'active',      // active, cooldown, disabled
        failureCount: 0,
        lastUsed: null,
        lastError: null,
        cooldownUntil: null,
        totalRequests: 0,
        totalErrors: 0
      }));

    this.currentIndex = 0;
    console.log(`🔑 Gemini Key 池已初始化: ${this.keys.length} 个 Key`);
    
    this.keys.forEach((k, i) => {
      const preview = k.key ? `${k.key.slice(0, 8)}...${k.key.slice(-4)}` : 'N/A';
      console.log(`   #${i + 1}: ${preview} (${k.source}${k.configName ? ' - ' + k.configName : ''})`);
    });
  }

  /**
   * 获取下一个可用的 Key
   */
  getNextKey() {
    if (this.keys.length === 0) {
      console.log('⚠️ 没有配置任何 Gemini API Key');
      return null;
    }

    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const keyObj = this.keys[this.currentIndex];
      
      if (this.isKeyAvailable(keyObj)) {
        keyObj.lastUsed = Date.now();
        keyObj.totalRequests++;
        
        // 轮询到下一个
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        
        console.log(`🔑 使用 Key #${keyObj.index + 1} (${keyObj.source})`);
        return keyObj;
      }

      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    console.log('❌ 所有 Gemini Key 都不可用');
    return null;
  }

  /**
   * 检查 Key 是否可用
   */
  isKeyAvailable(keyObj) {
    if (keyObj.status === 'disabled') {
      return false;
    }

    if (keyObj.status === 'cooldown') {
      if (Date.now() >= keyObj.cooldownUntil) {
        keyObj.status = 'active';
        keyObj.failureCount = 0;
        console.log(`🔄 Key #${keyObj.index + 1} 冷却结束，重新激活`);
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * 报告成功
   */
  reportSuccess(keyObj) {
    if (!keyObj) return;
    keyObj.failureCount = 0;
    keyObj.status = 'active';
    console.log(`✅ Key #${keyObj.index + 1} 请求成功`);
  }

  /**
   * 报告失败
   */
  reportFailure(keyObj, error) {
    if (!keyObj) return;
    
    keyObj.failureCount++;
    keyObj.totalErrors++;
    keyObj.lastError = {
      message: error.message || error,
      time: Date.now()
    };

    const errorMsg = String(error.message || error).toLowerCase();

    if (this.isQuotaError(errorMsg)) {
      keyObj.status = 'cooldown';
      keyObj.cooldownUntil = Date.now() + this.config.cooldownTime;
      console.log(`⏳ Key #${keyObj.index + 1} 配额用尽，冷却 ${this.config.cooldownTime / 1000}秒`);
    } else if (this.isRateLimitError(errorMsg)) {
      keyObj.status = 'cooldown';
      keyObj.cooldownUntil = Date.now() + 10000; // 10秒
      console.log(`🚦 Key #${keyObj.index + 1} 速率限制，冷却10秒`);
    } else if (this.isAuthError(errorMsg)) {
      keyObj.status = 'disabled';
      console.log(`🚫 Key #${keyObj.index + 1} 认证失败，已禁用`);
    } else if (keyObj.failureCount >= this.config.maxFailures) {
      keyObj.status = 'cooldown';
      keyObj.cooldownUntil = Date.now() + this.config.cooldownTime;
      console.log(`⚠️ Key #${keyObj.index + 1} 连续失败 ${keyObj.failureCount} 次，冷却中`);
    }

    console.log(`❌ Key #${keyObj.index + 1} 失败: ${error.message || error}`);
  }

  isQuotaError(error) {
    return ['quota', 'exceeded', 'limit reached', 'resource exhausted', '429', 'rate_limit'].some(p => error.includes(p));
  }

  isRateLimitError(error) {
    return ['rate limit', 'too many requests', 'slow down', 'resource_exhausted'].some(p => error.includes(p));
  }

  isAuthError(error) {
    return ['invalid api key', 'unauthorized', '401', '403', 'api key not valid', 'api_key_invalid'].some(p => error.includes(p));
  }

  /**
   * 启动恢复检查
   */
  startRecoveryChecker() {
    this.recoveryInterval = setInterval(() => {
      this.keys.forEach(keyObj => {
        if (keyObj.status === 'cooldown' && Date.now() >= keyObj.cooldownUntil) {
          keyObj.status = 'active';
          keyObj.failureCount = 0;
          console.log(`🔄 Key #${keyObj.index + 1} 自动恢复`);
        }
      });
    }, this.config.recoveryCheckInterval);
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      total: this.keys.length,
      available: this.getAvailableCount(),
      keys: this.keys.map(k => ({
        index: k.index + 1,
        source: k.source,
        configName: k.configName,
        status: k.status,
        failureCount: k.failureCount,
        totalRequests: k.totalRequests,
        totalErrors: k.totalErrors,
        lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : null,
        keyPreview: k.key ? `${k.key.slice(0, 8)}...${k.key.slice(-4)}` : 'N/A',
        cooldownUntil: k.cooldownUntil ? new Date(k.cooldownUntil).toISOString() : null
      }))
    };
  }

  /**
   * 获取可用 Key 数量
   */
  getAvailableCount() {
    return this.keys.filter(k => this.isKeyAvailable(k)).length;
  }

  /**
   * 重置 Key
   */
  resetKey(index) {
    const keyObj = this.keys[index];
    if (keyObj) {
      keyObj.status = 'active';
      keyObj.failureCount = 0;
      keyObj.cooldownUntil = null;
      console.log(`🔄 Key #${index + 1} 已重置`);
      return true;
    }
    return false;
  }

  /**
   * 停止
   */
  stop() {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
  }
}

module.exports = new GeminiKeyManager();

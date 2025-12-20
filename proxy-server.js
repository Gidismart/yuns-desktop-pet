// Gemini API 中转站服务 - 集成在 Electron 应用中
// 兼容 OpenAI API 格式，支持多 Key 自动切换

const http = require('http');
const https = require('https');
const url = require('url');
const keyManager = require('./proxy-key-manager');

class GeminiProxyServer {
  constructor() {
    this.server = null;
    this.port = 3001;
    this.isRunning = false;

    // 模型映射：OpenAI 格式 -> Gemini 格式
    this.modelMapping = {
      // OpenAI 兼容
      'gpt-3.5-turbo': 'gemini-1.5-flash',
      'gpt-4': 'gemini-1.5-pro',
      'gpt-4-turbo': 'gemini-1.5-pro',
      'gpt-4o': 'gemini-2.0-flash-exp',
      'gpt-4o-mini': 'gemini-1.5-flash',
      // Gemini 原生
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash-preview-05-20': 'gemini-2.5-flash-preview-05-20',
    };
  }

  /**
   * 启动服务器
   * @param {Array} geminiKeys - 所有 Gemini Keys
   * @param {number} port - 端口号
   */
  start(geminiKeys, port = 3001) {
    if (this.isRunning) {
      console.log('⚠️ 中转站已在运行');
      return;
    }

    this.port = port;
    
    // 初始化 Key 管理器
    keyManager.initialize(geminiKeys);

    if (keyManager.keys.length === 0) {
      console.log('⚠️ 没有可用的 Gemini Key，中转站未启动');
      return;
    }

    // 创建 HTTP 服务器
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      this.isRunning = true;
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         🚀 Gemini API 中转站已启动！                        ║
╠════════════════════════════════════════════════════════════╣
║  地址: http://localhost:${this.port}/v1                      
║  Gemini Keys: ${keyManager.getAvailableCount()} 个可用               
╠════════════════════════════════════════════════════════════╣
║  接口:                                                      ║
║  POST /v1/chat/completions - 聊天接口                       ║
║  GET  /v1/models           - 模型列表                       ║
║  GET  /status              - 状态查询                       ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    this.server.on('error', (err) => {
      console.error('❌ 中转站启动失败:', err.message);
      this.isRunning = false;
    });
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('👋 中转站已停止');
        this.isRunning = false;
      });
      keyManager.stop();
    }
  }

  /**
   * 重新加载 Keys（当 API 配置变化时调用）
   */
  reloadKeys(geminiKeys) {
    keyManager.initialize(geminiKeys);
    console.log(`🔄 Key 池已更新，当前 ${keyManager.getAvailableCount()} 个可用`);
  }

  /**
   * 处理请求
   */
  async handleRequest(req, res) {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    console.log(`📨 ${new Date().toISOString()} ${req.method} ${path}`);

    try {
      if (path === '/' || path === '/status') {
        this.handleStatus(res);
      } else if (path === '/v1/models') {
        this.handleModels(res);
      } else if (path === '/v1/chat/completions' && req.method === 'POST') {
        await this.handleChatCompletions(req, res);
      } else if (path === '/admin/keys') {
        this.handleAdminKeys(res);
      } else {
        this.sendError(res, 404, '未找到路径: ' + path);
      }
    } catch (error) {
      console.error('❌ 请求处理错误:', error);
      this.sendError(res, 500, error.message);
    }
  }

  /**
   * 状态接口
   */
  handleStatus(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Gemini API 中转站',
      port: this.port,
      keys: keyManager.getStatus()
    }));
  }

  /**
   * 模型列表
   */
  handleModels(res) {
    const models = Object.keys(this.modelMapping).map(id => ({
      id,
      object: 'model',
      created: 1677610602,
      owned_by: 'google-gemini'
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: models }));
  }

  /**
   * 管理接口
   */
  handleAdminKeys(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(keyManager.getStatus()));
  }

  /**
   * Chat Completions 接口
   */
  async handleChatCompletions(req, res) {
    const body = await this.readBody(req);
    const openaiRequest = JSON.parse(body);

    const { stream = false, model = 'gpt-4o' } = openaiRequest;
    const geminiModel = this.modelMapping[model] || 'gemini-1.5-flash';

    console.log(`🤖 请求: model=${model} -> ${geminiModel}, stream=${stream}`);

    // 获取可用的 Key 并尝试请求
    let keyObj = keyManager.getNextKey();
    let lastError = null;
    let attempts = 0;
    const maxRetries = 3;

    while (keyObj && attempts < maxRetries) {
      try {
        if (stream) {
          await this.proxyGeminiStream(openaiRequest, geminiModel, keyObj, res);
        } else {
          await this.proxyGemini(openaiRequest, geminiModel, keyObj, res);
        }
        keyManager.reportSuccess(keyObj);
        return;
      } catch (error) {
        lastError = error;
        keyManager.reportFailure(keyObj, error);
        keyObj = keyManager.getNextKey();
        attempts++;
        if (keyObj) {
          console.log(`🔄 切换到 Key #${keyObj.index + 1} 重试...`);
        }
      }
    }

    // 所有重试都失败
    this.sendError(res, 500, lastError?.message || '所有 API Key 都不可用');
  }

  /**
   * 代理到 Gemini（非流式）
   */
  proxyGemini(openaiRequest, geminiModel, keyObj, res) {
    return new Promise((resolve, reject) => {
      const contents = this.convertToGeminiMessages(openaiRequest.messages);
      
      const geminiRequest = JSON.stringify({
        contents,
        generationConfig: {
          temperature: openaiRequest.temperature ?? 0.7,
          maxOutputTokens: openaiRequest.max_tokens ?? 4096,
          topP: openaiRequest.top_p ?? 0.95
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/${geminiModel}:generateContent?key=${keyObj.key}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(geminiRequest)
        }
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          try {
            if (proxyRes.statusCode !== 200) {
              reject(new Error(`Gemini API 错误: ${proxyRes.statusCode} - ${data}`));
              return;
            }

            const geminiResponse = JSON.parse(data);
            const openaiResponse = this.convertFromGeminiResponse(geminiResponse, openaiRequest.model);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(openaiResponse));
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      });

      proxyReq.on('error', reject);
      proxyReq.write(geminiRequest);
      proxyReq.end();
    });
  }

  /**
   * 代理到 Gemini（流式）
   */
  proxyGeminiStream(openaiRequest, geminiModel, keyObj, res) {
    return new Promise((resolve, reject) => {
      const contents = this.convertToGeminiMessages(openaiRequest.messages);
      
      const geminiRequest = JSON.stringify({
        contents,
        generationConfig: {
          temperature: openaiRequest.temperature ?? 0.7,
          maxOutputTokens: openaiRequest.max_tokens ?? 4096,
          topP: openaiRequest.top_p ?? 0.95
        }
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${keyObj.key}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(geminiRequest)
        }
      };

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const requestId = `chatcmpl-${Date.now()}`;

      const proxyReq = https.request(options, (proxyRes) => {
        let buffer = '';

        proxyRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                res.write('data: [DONE]\n\n');
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                
                if (text) {
                  const chunk = {
                    id: requestId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: openaiRequest.model,
                    choices: [{
                      index: 0,
                      delta: { content: text },
                      finish_reason: null
                    }]
                  };
                  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }

                if (parsed.candidates?.[0]?.finishReason) {
                  const finalChunk = {
                    id: requestId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: openaiRequest.model,
                    choices: [{
                      index: 0,
                      delta: {},
                      finish_reason: 'stop'
                    }]
                  };
                  res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        });

        proxyRes.on('end', () => {
          res.write('data: [DONE]\n\n');
          res.end();
          resolve();
        });

        proxyRes.on('error', reject);
      });

      proxyReq.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        reject(err);
      });

      proxyReq.write(geminiRequest);
      proxyReq.end();
    });
  }

  /**
   * 转换为 Gemini 消息格式
   */
  convertToGeminiMessages(openaiMessages) {
    const contents = [];
    let systemPrompt = '';

    for (const msg of openaiMessages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // System prompt 合并到第一条 user 消息
    if (systemPrompt && contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = `[System]\n${systemPrompt}\n\n[User]\n${contents[0].parts[0].text}`;
    }

    return contents;
  }

  /**
   * 转换 Gemini 响应为 OpenAI 格式
   */
  convertFromGeminiResponse(geminiResponse, model) {
    const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * 读取请求体
   */
  readBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * 发送错误响应
   */
  sendError(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: {
        message,
        type: 'api_error'
      }
    }));
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      running: this.isRunning,
      port: this.port,
      keys: keyManager.getStatus()
    };
  }

  /**
   * 获取 Key 管理器（供 api-service 直接使用）
   */
  getKeyManager() {
    return keyManager;
  }
}

module.exports = new GeminiProxyServer();

// MCP 客户端管理模块
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { spawn } = require('child_process');
const store = require('./store');

/**
 * 自定义 Stdio 传输层 - 实现 MCP SDK Transport 接口
 */
class CustomStdioTransport {
  constructor(serverProcess) {
    this.process = serverProcess;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this._buffer = '';
    this._started = false;
  }

  async start() {
    if (this._started) return;
    this._started = true;

    // 监听 stdout 数据 - JSON-RPC 消息
    this.process.stdout.on('data', (chunk) => {
      this._buffer += chunk.toString();
      this._processBuffer();
    });

    // 监听进程关闭
    this.process.on('close', (code) => {
      console.log(`MCP 进程退出，代码: ${code}`);
      if (this.onclose) {
        this.onclose();
      }
    });

    // 监听进程错误
    this.process.on('error', (err) => {
      console.error('MCP 进程错误:', err);
      if (this.onerror) {
        this.onerror(err);
      }
    });
  }

  _processBuffer() {
    // MCP 使用换行符分隔的 JSON 消息
    const lines = this._buffer.split('\n');
    this._buffer = lines.pop() || ''; // 保留不完整的行

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        const message = JSON.parse(trimmed);
        console.log('收到 MCP 消息:', JSON.stringify(message).substring(0, 200));
        
        // 直接传递 JSONRPCMessage 给 onmessage
        if (this.onmessage) {
          this.onmessage(message);
        }
      } catch (e) {
        // 忽略非 JSON 输出（如日志）
        console.log('MCP 非 JSON 输出:', trimmed.substring(0, 100));
      }
    }
  }

  async send(message) {
    if (!this.process || this.process.killed) {
      throw new Error('进程已关闭');
    }
    
    const json = typeof message === 'string' ? message : JSON.stringify(message);
    console.log('发送 MCP 消息:', json.substring(0, 200));
    
    return new Promise((resolve, reject) => {
      this.process.stdin.write(json + '\n', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close() {
    if (this.process && !this.process.killed) {
      this.process.stdin.end();
      this.process.kill();
    }
  }
}

class MCPClientManager {
  constructor() {
    this.clients = new Map(); // serverId -> { client, transport, tools, resources, process }
    this.allTools = []; // 所有可用的工具列表
  }

  /**
   * 连接到 MCP 服务器
   */
  async connectServer(serverConfig) {
    const { id, name, command, args = [], env = {} } = serverConfig;

    if (!command) {
      return { success: false, error: '启动命令不能为空' };
    }

    if (this.clients.has(id)) {
      const existing = this.clients.get(id);
      return { 
        success: true, 
        message: '已连接',
        tools: existing.tools.map(t => ({ name: t.name, description: t.description }))
      };
    }

    try {
      console.log(`正在连接 MCP 服务器: ${name}...`);
      console.log(`命令: ${command}`);
      console.log(`参数:`, args);

      const argsArray = Array.isArray(args) ? args : 
        (typeof args === 'string' ? args.split(/\s+/).filter(Boolean) : []);
      
      const isWindows = process.platform === 'win32';
      console.log(`平台: ${process.platform}`);
      console.log(`实际参数: ${argsArray.join(' ')}`);
      
      // 启动 MCP 服务器进程
      const serverProcess = spawn(command, argsArray, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows,
        windowsHide: true
      });

      // 等待进程启动
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('等待进程启动超时，继续...');
          resolve();
        }, 10000); // 给 npx 足够时间下载

        serverProcess.on('spawn', () => {
          clearTimeout(timeout);
          console.log('MCP 服务器进程已启动');
          resolve();
        });

        serverProcess.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (serverProcess.killed) {
        throw new Error('进程启动后立即退出');
      }

      // 监听 stderr
      serverProcess.stderr.on('data', (data) => {
        console.log(`MCP [${name}] stderr:`, data.toString().trim());
      });

      // 创建传输层
      const transport = new CustomStdioTransport(serverProcess);

      // 创建客户端
      const client = new Client(
        { name: 'ai-desktop-pet', version: '2.1.0' },
        { capabilities: { tools: {}, resources: {} } }
      );

      // 设置连接超时
      const connectPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('连接超时（30秒）')), 30000);
      });

      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`MCP服务器 "${name}" 连接成功！`);

      // 获取工具列表
      let tools = [];
      try {
        const toolsResult = await client.listTools();
        tools = toolsResult.tools || [];
        console.log(`获取到 ${tools.length} 个工具:`, tools.map(t => t.name));
      } catch (e) {
        console.log(`获取工具失败:`, e.message);
      }

      // 获取资源列表
      let resources = [];
      try {
        const resourcesResult = await client.listResources();
        resources = resourcesResult.resources || [];
        console.log(`获取到 ${resources.length} 个资源`);
      } catch (e) {
        console.log(`获取资源失败:`, e.message);
      }

      // 保存连接信息
      this.clients.set(id, {
        client,
        transport,
        process: serverProcess,
        tools,
        resources,
        config: serverConfig
      });

      this.updateToolsList();

      return {
        success: true,
        message: `连接成功，获取到 ${tools.length} 个工具`,
        tools: tools.map(t => ({ name: t.name, description: t.description }))
      };
    } catch (error) {
      console.error(`连接 MCP 服务器 "${name}" 失败:`, error);
      return { success: false, error: error.message || '连接失败' };
    }
  }

  /**
   * 断开连接
   */
  async disconnectServer(serverId) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return { success: false, error: '服务器未连接' };
    }

    try {
      try { await clientInfo.client.close(); } catch (e) { }
      try { await clientInfo.transport.close(); } catch (e) { }
      if (clientInfo.process && !clientInfo.process.killed) {
        clientInfo.process.kill();
      }

      this.clients.delete(serverId);
      this.updateToolsList();
      return { success: true, message: '已断开连接' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  updateToolsList() {
    this.allTools = [];
    for (const [serverId, clientInfo] of this.clients) {
      for (const tool of clientInfo.tools) {
        this.allTools.push({
          serverId,
          serverName: clientInfo.config.name,
          ...tool
        });
      }
    }
  }

  getToolsForAI() {
    return this.allTools.map(tool => ({
      type: 'function',
      function: {
        name: `${tool.serverId}__${tool.name}`,
        description: tool.description || `Tool: ${tool.name}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      }
    }));
  }

  async callTool(toolCallId, args) {
    const [serverId, ...toolNameParts] = toolCallId.split('__');
    const toolName = toolNameParts.join('__');

    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return { success: false, error: `MCP服务器 "${serverId}" 未连接` };
    }

    try {
      console.log(`调用工具: ${toolName}，参数:`, args);
      
      const result = await clientInfo.client.callTool({
        name: toolName,
        arguments: args
      });

      console.log(`工具调用结果:`, result);

      let content = '';
      if (result.content && Array.isArray(result.content)) {
        content = result.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
      } else if (typeof result === 'string') {
        content = result;
      } else {
        content = JSON.stringify(result, null, 2);
      }

      return { success: true, result: content, isError: result.isError || false };
    } catch (error) {
      console.error(`工具调用失败:`, error);
      return { success: false, error: error.message };
    }
  }

  async readResource(serverId, uri) {
    const clientInfo = this.clients.get(serverId);
    if (!clientInfo) {
      return { success: false, error: 'MCP服务器未连接' };
    }

    try {
      const result = await clientInfo.client.readResource({ uri });
      return { success: true, content: result.contents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getConnectedServers() {
    const servers = [];
    for (const [serverId, clientInfo] of this.clients) {
      servers.push({
        id: serverId,
        name: clientInfo.config.name,
        toolCount: clientInfo.tools.length,
        resourceCount: clientInfo.resources.length,
        connected: true
      });
    }
    return servers;
  }

  async initializeFromConfig() {
    const mcpServers = store.get('mcpServers', []);
    const enabledServers = mcpServers.filter(s => s.enabled);

    console.log(`正在初始化 ${enabledServers.length} 个 MCP 服务器...`);

    for (const server of enabledServers) {
      try {
        await this.connectServer(server);
      } catch (error) {
        console.error(`初始化失败:`, error);
      }
    }
  }

  async closeAll() {
    for (const [serverId] of this.clients) {
      await this.disconnectServer(serverId);
    }
  }
}

module.exports = new MCPClientManager();

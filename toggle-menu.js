#!/usr/bin/env node
/**
 * 快速切换菜单模式脚本
 * 
 * 用法：
 *   node toggle-menu.js [mode]
 * 
 * 模式：
 *   custom   - 中文自定义菜单（默认）
 *   hide     - 完全隐藏菜单
 *   minimal  - 极简菜单
 */

const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'main.js');
const mode = process.argv[2] || 'custom';

console.log('='.repeat(50));
console.log('Yuns桌面助手 - 菜单模式切换工具');
console.log('='.repeat(50));

// 读取main.js
let content = fs.readFileSync(mainJsPath, 'utf-8');

// 根据模式修改代码
switch(mode) {
  case 'hide':
    console.log('切换到模式：完全隐藏菜单');
    // 注释掉 createCustomMenu()
    content = content.replace(
      /(\s+)createCustomMenu\(\);/g,
      '$1// createCustomMenu();  // 已隐藏'
    );
    // 启用 Menu.setApplicationMenu(null)
    content = content.replace(
      /(\s+)\/\/ Menu\.setApplicationMenu\(null\);/g,
      '$1Menu.setApplicationMenu(null);  // 隐藏菜单'
    );
    console.log('✅ 已配置：完全隐藏菜单栏');
    console.log('   - 界面更简洁');
    console.log('   - 按 F12 打开开发者工具');
    console.log('   - 通过设置按钮访问配置');
    break;

  case 'minimal':
    console.log('切换到模式：极简菜单');
    // 启用 createCustomMenu()
    content = content.replace(
      /(\s+)\/\/ createCustomMenu\(\);/g,
      '$1createCustomMenu();'
    );
    // 注释掉 Menu.setApplicationMenu(null)
    content = content.replace(
      /(\s+)Menu\.setApplicationMenu\(null\);(?!\s*\/\/)/g,
      '$1// Menu.setApplicationMenu(null);'
    );
    
    // 修改 createCustomMenu 函数为极简版本
    const minimalMenuCode = `function createCustomMenu() {
  const template = [
    {
      label: 'AI助手',
      submenu: [
        { label: '设置', accelerator: 'CmdOrCtrl+,', click: () => { if (settingsWindow) settingsWindow.show(); else createSettingsWindow(); } },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '退出', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}`;
    
    content = content.replace(
      /\/\/ 创建自定义菜单\nfunction createCustomMenu\(\) \{[\s\S]*?\n\}/,
      '// 创建自定义菜单（极简版本）\n' + minimalMenuCode
    );
    
    console.log('✅ 已配置：极简菜单模式');
    console.log('   - 只有一个"AI助手"菜单');
    console.log('   - 包含必要功能：设置、开发工具、退出');
    console.log('   - 快捷键：Ctrl+, 打开设置');
    break;

  case 'custom':
  default:
    console.log('切换到模式：中文自定义菜单');
    // 启用 createCustomMenu()
    content = content.replace(
      /(\s+)\/\/ createCustomMenu\(\);/g,
      '$1createCustomMenu();'
    );
    // 注释掉 Menu.setApplicationMenu(null)
    content = content.replace(
      /(\s+)Menu\.setApplicationMenu\(null\);(?!\s*\/\/)/g,
      '$1// Menu.setApplicationMenu(null);'
    );
    console.log('✅ 已配置：完整中文菜单');
    console.log('   - 文件、编辑、视图、窗口、帮助');
    console.log('   - 全中文界面');
    console.log('   - 完整功能支持');
    break;
}

// 写回文件
fs.writeFileSync(mainJsPath, content, 'utf-8');

console.log('');
console.log('='.repeat(50));
console.log('✅ 配置已更新！');
console.log('');
console.log('下一步：');
console.log('  1. 重启应用查看效果');
console.log('  2. 运行: npm start');
console.log('');
console.log('切换其他模式：');
console.log('  node toggle-menu.js hide     - 隐藏菜单');
console.log('  node toggle-menu.js minimal  - 极简菜单');
console.log('  node toggle-menu.js custom   - 自定义菜单');
console.log('='.repeat(50));


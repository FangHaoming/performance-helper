const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3006;
const HOST = 'localhost';

// MIME 类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 存储上报的数据
const reportData = [];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 请求
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API 路由：接收上报数据
  if (pathname === '/api/report' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        reportData.push({
          ...data,
          receivedAt: new Date().toISOString(),
        });
        console.log('📊 收到上报数据:', JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Data received' }));
      } catch (error) {
        console.error('❌ 解析上报数据失败:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // API 路由：获取所有上报数据
  if (pathname === '/api/data' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reportData, null, 2));
    return;
  }

  // API 路由：清空上报数据
  if (pathname === '/api/clear' && method === 'POST') {
    reportData.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Data cleared' }));
    return;
  }

  // 忽略 Chrome DevTools 请求
  if (pathname.startsWith('/.well-known/')) {
    res.writeHead(404);
    res.end();
    return;
  }

  // 忽略 WebSocket 升级请求和其他特殊路径
  if (pathname === '/ws' || pathname.startsWith('/ws/') || req.headers.upgrade === 'websocket') {
    res.writeHead(404);
    res.end();
    return;
  }

  // 静态文件服务
  const projectRoot = path.resolve(__dirname, '..');
  let filePath;

  if (pathname === '/') {
    filePath = path.join(__dirname, 'basic.html');
  } else {
    // 移除开头的 /，然后拼接路径
    const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    filePath = path.resolve(projectRoot, relativePath);
  }

  // 安全检查：确保文件在项目目录内
  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 尝试读取文件（支持无扩展名的 ES 模块请求）
  const tryReadFile = (filePathToTry, isRetry = false) => {
    fs.access(filePathToTry, fs.constants.F_OK, (err) => {
      if (err) {
        // 如果文件不存在且没有扩展名，尝试添加 .js 扩展名（ES 模块）
        if (!isRetry && !path.extname(filePathToTry)) {
          const jsPath = filePathToTry + '.js';
          return tryReadFile(jsPath, true);
        }
        
        // 文件确实不存在
        // 只记录非特殊路径的 404 错误（避免日志噪音）
        if (
          !pathname.startsWith('/.well-known/') &&
          pathname !== '/ws' &&
          !pathname.startsWith('/ws/')
        ) {
          console.error(`❌ 文件未找到: ${pathname} -> ${filePathToTry}`);
        }
        res.writeHead(404);
        res.end('File not found: ' + pathname);
        return;
      }

      // 读取文件
      fs.readFile(filePathToTry, (err, data) => {
        if (err) {
          console.error(`❌ 读取文件失败: ${filePathToTry}`, err);
          res.writeHead(500);
          res.end('Internal server error');
          return;
        }

        // 设置 Content-Type
        const ext = path.extname(filePathToTry);
        // 对于 ES 模块，确保使用正确的 MIME 类型
        const contentType = ext === '.js' 
          ? 'application/javascript' 
          : (mimeTypes[ext] || 'application/octet-stream');
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  };

  tryReadFile(filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`
🚀 本地开发服务器已启动！

📍 访问地址：
   http://${HOST}:${PORT}

📝 上报页面：
   http://${HOST}:${PORT}/examples/api-test.html

📊 API 端点：
   POST http://${HOST}:${PORT}/api/report  - 接收上报数据
   GET  http://${HOST}:${PORT}/api/data   - 查看所有上报数据
   POST http://${HOST}:${PORT}/api/clear  - 清空上报数据

按 Ctrl+C 停止服务器
  `);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n👋 服务器正在关闭...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});


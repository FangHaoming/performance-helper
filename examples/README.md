# Examples

本目录包含 Performance SDK 的使用示例和本地开发服务器。

## 快速开始

### 1. 构建项目

```bash
npm run build
```

### 2. 启动本地服务器

```bash
npm run serve
```

或者使用完整命令：

```bash
npm start
```

服务器将在 `http://localhost:3006` 启动。

## 示例页面

### basic.html
基础使用示例，展示 SDK 的基本功能：
- 查看性能指标
- 查看资源信息
- 查看错误信息
- 触发错误测试
- 手动上报性能数据

访问地址：`http://localhost:3006/examples/basic.html`

### api-test.html
API 测试页面，用于查看和测试上报的数据：
- 实时查看所有上报数据
- 统计数据概览
- 清空数据
- 自动刷新

访问地址：`http://localhost:3006/examples/api-test.html`

## API 端点

### POST /api/report
接收 SDK 上报的数据

**请求体：**
```json
[
  {
    "type": "performance",
    "data": { ... },
    "timestamp": 1234567890,
    "url": "http://localhost:3006/examples/basic.html",
    "userAgent": "...",
    "appId": "demo-app",
    "userId": "demo-user"
  }
]
```

**响应：**
```json
{
  "success": true,
  "message": "Data received"
}
```

### GET /api/data
获取所有已接收的上报数据

**响应：**
```json
[
  {
    "type": "performance",
    "data": { ... },
    "timestamp": 1234567890,
    "receivedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/clear
清空所有上报数据

**响应：**
```json
{
  "success": true,
  "message": "Data cleared"
}
```

## 使用说明

1. 确保已构建项目（`npm run build`）
2. 启动服务器（`npm run serve`）
3. 在浏览器中打开示例页面
4. 在 `api-test.html` 中查看上报的数据

## 注意事项

- 服务器默认运行在 `localhost:3006`
- 所有上报数据存储在内存中，重启服务器后会清空
- 服务器支持 CORS，可以从任何域名访问


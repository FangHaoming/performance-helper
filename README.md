# Performance SDK

前端性能监控 SDK，用于采集和上报前端应用的性能指标、资源加载情况和错误信息。

## 功能特性

- ✅ **性能指标监控**：FCP、LCP、FID、CLS、TTFB 等 Web Vitals 指标
- ✅ **资源加载监控**：监控所有资源的加载时间和大小
- ✅ **错误监控**：自动捕获 JavaScript 错误、Promise 错误和资源加载错误
- ✅ **数据上报**：支持批量上报和立即上报，使用 sendBeacon 确保数据不丢失
- ✅ **采样率控制**：支持配置采样率，减少数据量
- ✅ **TypeScript 支持**：完整的类型定义

## 安装

```bash
npm install performance-helper
```

## 快速开始

### 基础使用

```typescript
import PerformanceHelper from 'performance-helper';

const sdk = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
  appId: 'your-app-id',
  userId: 'user-123',
});

// 初始化 SDK
sdk.init();
```

### 完整配置

```typescript
const sdk = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report', // 必需：上报地址
  appId: 'your-app-id',                      // 可选：应用ID
  userId: 'user-123',                        // 可选：用户ID
  immediate: false,                          // 可选：是否立即上报，默认 false
  batchInterval: 5000,                      // 可选：批量上报间隔（毫秒），默认 5000
  monitorResources: true,                    // 可选：是否监控资源加载，默认 true
  monitorErrors: true,                       // 可选：是否监控错误，默认 true
  monitorPerformance: true,                  // 可选：是否监控性能指标，默认 true
  sampleRate: 1,                            // 可选：采样率 0-1，默认 1
});

sdk.init();
```

## API

### 方法

#### `init()`
初始化 SDK，开始监控。

```typescript
sdk.init();
```

#### `reportPerformance()`
手动上报性能指标。

```typescript
sdk.reportPerformance();
```

#### `getPerformanceMetrics()`
获取当前性能指标。

```typescript
const metrics = sdk.getPerformanceMetrics();
console.log(metrics.fcp, metrics.lcp, metrics.fid);
```

#### `getResources()`
获取所有资源加载信息。

```typescript
const resources = sdk.getResources();
```

#### `getSlowResources(threshold?)`
获取慢资源（超过阈值的资源）。

```typescript
const slowResources = sdk.getSlowResources(2000); // 超过 2 秒的资源
```

#### `getErrors()`
获取所有错误信息。

```typescript
const errors = sdk.getErrors();
```

#### `reportError(error, context?)`
手动上报错误。

```typescript
try {
  // some code
} catch (error) {
  sdk.reportError(error, { customField: 'value' });
}
```

#### `reportCustom(type, data)`
上报自定义数据。

```typescript
sdk.reportCustom('custom', { event: 'click', button: 'submit' });
```

#### `destroy()`
销毁 SDK，清理资源并上报剩余数据。

```typescript
sdk.destroy();
```

## 性能指标说明

### FCP (First Contentful Paint)
首次内容绘制时间，页面首次渲染文本、图片等内容的时间。

### LCP (Largest Contentful Paint)
最大内容绘制时间，页面最大内容元素渲染完成的时间。

### FID (First Input Delay)
首次输入延迟，用户首次与页面交互到浏览器响应该交互的时间。

### CLS (Cumulative Layout Shift)
累积布局偏移，页面布局稳定性的指标。

### TTFB (Time to First Byte)
首字节时间，从请求到接收到第一个字节的时间。

### 其他指标
- `dns`: DNS 查询时间
- `tcp`: TCP 连接时间
- `request`: 请求响应时间
- `parse`: DOM 解析时间
- `domContentLoaded`: DOMContentLoaded 事件时间
- `load`: Load 事件时间

## 数据格式

### 性能指标数据

```json
{
  "type": "performance",
  "data": {
    "fcp": 1200,
    "lcp": 2500,
    "fid": 50,
    "cls": 0.1,
    "ttfb": 300,
    "dns": 20,
    "tcp": 100,
    "request": 200,
    "parse": 500,
    "domContentLoaded": 1500,
    "load": 3006
  },
  "timestamp": 1234567890,
  "url": "https://example.com",
  "userAgent": "Mozilla/5.0...",
  "appId": "your-app-id",
  "userId": "user-123"
}
```

### 资源数据

```json
{
  "type": "resource",
  "data": {
    "name": "https://example.com/image.png",
    "type": "image",
    "duration": 500,
    "size": 102400,
    "startTime": 1000,
    "url": "https://example.com/image.png"
  },
  "timestamp": 1234567890,
  "url": "https://example.com",
  "userAgent": "Mozilla/5.0...",
  "appId": "your-app-id",
  "userId": "user-123"
}
```

### 错误数据

```json
{
  "type": "error",
  "data": {
    "message": "Uncaught TypeError: Cannot read property 'x' of undefined",
    "source": "https://example.com/app.js",
    "lineno": 42,
    "colno": 10,
    "stack": "Error: ...",
    "timestamp": 1234567890,
    "url": "https://example.com",
    "userAgent": "Mozilla/5.0..."
  },
  "timestamp": 1234567890,
  "url": "https://example.com",
  "userAgent": "Mozilla/5.0...",
  "appId": "your-app-id",
  "userId": "user-123"
}
```

## 浏览器兼容性

- Chrome 51+
- Firefox 55+
- Safari 11+
- Edge 79+

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 开发模式（监听文件变化）
npm run dev
```

## License

MIT


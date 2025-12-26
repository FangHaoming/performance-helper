/**
 * Performance SDK 使用示例
 */

import PerformanceHelper from '../src/index';

// 示例 1: 基础使用
function basicUsage() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
    appId: 'my-app',
    userId: 'user-123',
  });

  sdk.init();
}

// 示例 2: 完整配置
function fullConfig() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
    appId: 'my-app',
    userId: 'user-123',
    immediate: false,           // 批量上报
    batchInterval: 5000,         // 每 5 秒上报一次
    monitorResources: true,       // 监控资源
    monitorErrors: true,         // 监控错误
    monitorPerformance: true,    // 监控性能
    sampleRate: 0.5,            // 50% 采样率
  });

  sdk.init();
}

// 示例 3: 获取性能指标
function getMetrics() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
  });

  sdk.init();

  // 等待页面加载完成后获取指标
  window.addEventListener('load', () => {
    setTimeout(() => {
      const metrics = sdk.getPerformanceMetrics();
      console.log('FCP:', metrics.fcp);
      console.log('LCP:', metrics.lcp);
      console.log('FID:', metrics.fid);
      console.log('CLS:', metrics.cls);
    }, 2000);
  });
}

// 示例 4: 监控慢资源
function monitorSlowResources() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
  });

  sdk.init();

  // 获取加载时间超过 2 秒的资源
  window.addEventListener('load', () => {
    setTimeout(() => {
      const slowResources = sdk.getSlowResources(2000);
      console.log('慢资源:', slowResources);
    }, 3006);
  });
}

// 示例 5: 手动上报错误
function manualErrorReport() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
  });

  sdk.init();

  // 在 try-catch 中上报错误
  try {
    // 一些可能出错的代码
    const result = someFunction();
  } catch (error) {
    sdk.reportError(error as Error, {
      context: 'user-action',
      action: 'submit-form',
    });
  }
}

// 示例 6: 上报自定义事件
function customEvent() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
  });

  sdk.init();

  // 上报用户行为
  document.getElementById('button')?.addEventListener('click', () => {
    sdk.reportCustom('user-action', {
      event: 'click',
      element: 'button',
      timestamp: Date.now(),
    });
  });
}

// 示例 7: 仅监控错误
function errorOnly() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
    monitorResources: false,
    monitorPerformance: false,
    monitorErrors: true,
  });

  sdk.init();
}

// 示例 8: 立即上报模式
function immediateReport() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
    immediate: true,  // 立即上报，不使用批量模式
  });

  sdk.init();
}

// 示例 9: 清理 SDK
function cleanup() {
  const sdk = new PerformanceHelper({
    reportUrl: 'https://your-api.com/report',
  });

  sdk.init();

  // 在应用卸载时清理
  window.addEventListener('beforeunload', () => {
    sdk.destroy();
  });
}

function someFunction(): any {
  // 示例函数
  return null;
}


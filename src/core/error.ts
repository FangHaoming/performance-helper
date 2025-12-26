import { ErrorInfo } from '../types';

/**
 * 错误监控器
 */
export class ErrorMonitor {
  private errors: ErrorInfo[] = [];

  /**
   * 开始监控错误
   */
  start(): void {
    // 监控 JavaScript 错误
    this.monitorJSErrors();

    // 监控 Promise 未捕获的错误
    this.monitorUnhandledRejections();

    // 监控资源加载错误
    this.monitorResourceErrors();
  }

  /**
   * 监控 JavaScript 错误
   */
  private monitorJSErrors(): void {
    window.addEventListener('error', (event) => {
      const errorInfo: ErrorInfo = {
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      this.errors.push(errorInfo);
      this.onError(errorInfo);
    });
  }

  /**
   * 监控 Promise 未捕获的错误
   */
  private monitorUnhandledRejections(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const errorInfo: ErrorInfo = {
        message: event.reason?.message || String(event.reason) || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      this.errors.push(errorInfo);
      this.onError(errorInfo);
    });
  }

  /**
   * 监控资源加载错误
   */
  private monitorResourceErrors(): void {
    document.addEventListener(
      'error',
      (event) => {
        const target = event.target as HTMLElement;
        if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
          const errorInfo: ErrorInfo = {
            message: `Resource load error: ${target.tagName}`,
            source: (target as HTMLImageElement).src || (target as HTMLLinkElement).href || '',
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          };

          this.errors.push(errorInfo);
          this.onError(errorInfo);
        }
      },
      true
    );
  }

  /**
   * 错误回调（可被覆盖）
   */
  private onError(errorInfo: ErrorInfo): void {
    // 可以在这里添加自定义错误处理逻辑
  }

  /**
   * 获取所有错误
   */
  getErrors(): ErrorInfo[] {
    return this.errors;
  }

  /**
   * 手动上报错误
   */
  reportError(error: Error, context?: Record<string, any>): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    this.errors.push(errorInfo);
    this.onError(errorInfo);
  }
}


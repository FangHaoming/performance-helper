import { ReportData, PerformanceHelperOptions } from '../types';

/**
 * 数据上报器
 */
export class Reporter {
  private reportUrl: string;
  private appId?: string;
  private userId?: string;
  private immediate: boolean;
  private batchInterval: number;
  private queue: ReportData[] = [];
  private timer?: number;

  constructor(options: PerformanceHelperOptions) {
    this.reportUrl = options.reportUrl;
    this.appId = options.appId;
    this.userId = options.userId;
    this.immediate = options.immediate || false;
    this.batchInterval = options.batchInterval || 5000;

    if (!this.immediate) {
      this.startBatchTimer();
    }

    // 页面卸载时上报剩余数据
    this.setupBeforeUnload();
  }

  /**
   * 上报数据
   */
  report(data: Omit<ReportData, 'timestamp' | 'url' | 'userAgent'>): void {
    const reportData: ReportData = {
      ...data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      appId: this.appId,
      userId: this.userId,
    };

    if (this.immediate) {
      this.send([reportData]);
    } else {
      this.queue.push(reportData);
    }
  }

  /**
   * 批量上报
   */
  private batchReport(): void {
    if (this.queue.length === 0) {
      return;
    }

    const dataToSend = [...this.queue];
    this.queue = [];
    this.send(dataToSend);
  }

  /**
   * 发送数据
   */
  private send(data: ReportData[]): void {
    // 使用 sendBeacon 优先，fallback 到 fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(this.reportUrl, blob);
    } else {
      // 使用 fetch 发送
      fetch(this.reportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch((error) => {
        console.error('Report failed:', error);
        // 发送失败，重新加入队列
        if (!this.immediate) {
          this.queue.push(...data);
        }
      });
    }
  }

  /**
   * 启动批量定时器
   */
  private startBatchTimer(): void {
    this.timer = window.setInterval(() => {
      this.batchReport();
    }, this.batchInterval);
  }

  /**
   * 设置页面卸载时的上报
   */
  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      if (this.queue.length > 0) {
        // 使用 sendBeacon 确保数据能发送
        const blob = new Blob([JSON.stringify(this.queue)], { type: 'application/json' });
        navigator.sendBeacon(this.reportUrl, blob);
      }
    });
  }

  /**
   * 销毁上报器
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // 上报剩余数据
    this.batchReport();
  }
}


import { 
  PerformanceHelperOptions, 
  PerformanceMetrics, 
  ResourceInfo, 
  ErrorInfo, 
  ReportData,
  LongTaskInfo,
  LongTaskAttribution
} from './types';
import { PerformanceCollector } from './core/performance';
import { ResourceMonitor } from './core/resource';
import { ErrorMonitor } from './core/error';
import { Reporter } from './core/reporter';
import { querySelectorByPath, highlightElement, removeElementHighlight, HighlightOptions } from './utils/index';

/**
 * 性能监控 SDK
 */
export class PerformanceHelper {
  private options: PerformanceHelperOptions;
  private reporter: Reporter;
  private performanceCollector: PerformanceCollector;
  private resourceMonitor: ResourceMonitor;
  private errorMonitor: ErrorMonitor;
  private initialized: boolean = false;

  constructor(options: PerformanceHelperOptions) {
    if (!options.reportUrl) {
      throw new Error('reportUrl is required');
    }

    this.options = {
      immediate: false,
      monitorResources: true,
      monitorErrors: false,
      monitorPerformance: true,
      sampleRate: 1,
      ...options,
    };

    this.reporter = new Reporter(this.options);
    this.performanceCollector = new PerformanceCollector();
    this.resourceMonitor = new ResourceMonitor();
    this.errorMonitor = new ErrorMonitor();
    
    // 立即初始化性能观察器（需要在页面加载前设置）
    if (this.options.monitorPerformance) {
      this.performanceCollector.init();
    }
  }

  /**
   * 初始化 SDK
   */
  init(): void {
    if (this.initialized) {
      console.warn('PerformanceHelper has already been initialized');
      return;
    }

    // 采样率检查
    if (Math.random() > (this.options.sampleRate || 1)) {
      return;
    }

    // 启动监控
    if (this.options.monitorResources) {
      this.resourceMonitor.start();
    }

    if (this.options.monitorErrors) {
      this.errorMonitor.start();
    }

    if (this.options.monitorPerformance) {
      // 等待页面加载完成后采集性能指标
      if (document.readyState === 'complete') {
        this.collectAndReportPerformance();
      } else {
        window.addEventListener('load', () => {
          // 延迟采集，确保所有指标都已计算完成
          setTimeout(() => {
            this.collectAndReportPerformance();
          }, 2000);
        });
      }
    }

    this.initialized = true;
  }

  /**
   * 采集并上报性能指标
   */
  private collectAndReportPerformance(): void {
    const metrics = this.performanceCollector.collect();
    this.reporter.report({
      type: 'performance',
      data: metrics,
    });
  }

  /**
   * 手动上报性能指标
   */
  reportPerformance(): void {
    const metrics = this.performanceCollector.collect();
    this.reporter.report({
      type: 'performance',
      data: metrics,
    });
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceCollector.collect();
  }

  /**
   * 框出 LCP 元素（用于调试）
   * 会在 LCP 元素周围添加高亮边框
   * @param options 高亮选项
   * @returns 是否成功框出元素
   */
  highlightLCPElement(options?: HighlightOptions): boolean {
    const metrics = this.getPerformanceMetrics();
    const lcpElementPath = metrics.lcpElement;

    if (!lcpElementPath) {
      console.warn('LCP element path not found');
      return false;
    }

    // 根据路径查找元素
    const element = querySelectorByPath(lcpElementPath);
    if (!element) {
      console.warn(`LCP element not found: ${lcpElementPath}`);
      return false;
    }

    // 使用工具函数高亮元素
    const removeHighlight = highlightElement(element, options);
    if (!removeHighlight) {
      console.warn(`LCP element is not an HTMLElement: ${lcpElementPath}`);
      return false;
    }

    // 保存移除函数到元素上（方便调试）
    (element as any).__removeLCPHighlight = removeHighlight;

    console.log('LCP element highlighted:', element, lcpElementPath);
    return true;
  }

  /**
   * 移除 LCP 元素的高亮
   */
  removeLCPHighlight(): void {
    const metrics = this.getPerformanceMetrics();
    const lcpElementPath = metrics.lcpElement;

    if (!lcpElementPath) {
      return;
    }

    const element = querySelectorByPath(lcpElementPath);
    if (element) {
      removeElementHighlight(element);
      // 同时清理 LCP 特定的引用
      if ((element as any).__removeLCPHighlight) {
        delete (element as any).__removeLCPHighlight;
      }
    }
  }

  /**
   * 获取资源信息
   */
  getResources(): ResourceInfo[] {
    return this.resourceMonitor.getResources();
  }

  /**
   * 获取慢资源
   */
  getSlowResources(threshold?: number): ResourceInfo[] {
    return this.resourceMonitor.getSlowResources(threshold);
  }

  /**
   * 获取错误信息
   */
  getErrors(): ErrorInfo[] {
    return this.errorMonitor.getErrors();
  }

  /**
   * 手动上报错误
   */
  reportError(error: Error, context?: Record<string, any>): void {
    this.errorMonitor.reportError(error, context);
    const errors = this.errorMonitor.getErrors();
    const lastError = errors[errors.length - 1];
    if (lastError) {
      this.reporter.report({
        type: 'error',
        data: lastError,
      });
    }
  }

  /**
   * 上报自定义数据
   */
  reportCustom(type: string, data: any): void {
    this.reporter.report({
      type: type as any,
      data: data,
    });
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    this.reporter.destroy();
    this.performanceCollector.destroy();
    this.initialized = false;
  }
}

// 导出类型
export type { 
  PerformanceHelperOptions, 
  PerformanceMetrics, 
  ResourceInfo, 
  ErrorInfo, 
  ReportData,
  LongTaskInfo,
  LongTaskAttribution
};

// 默认导出
export default PerformanceHelper;


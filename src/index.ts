import { 
  PerformanceHelperOptions, 
  PerformanceMetrics, 
  ResourceInfo, 
  ErrorInfo, 
  ReportData,
  LongTaskInfo,
  LongTaskAttribution,
  RenderMetrics,
  ReflowInfo,
  RepaintInfo,
  GPUAccelerationInfo
} from './types';
import { PerformanceCollector } from './core/performance';
import { ResourceMonitor } from './core/resource';
import { ErrorMonitor } from './core/error';
import { RenderMonitor } from './core/render';
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
  private renderMonitor: RenderMonitor;
  private initialized: boolean = false;

  constructor(options: PerformanceHelperOptions) {
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
    this.renderMonitor = new RenderMonitor();
    
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

    // 启动渲染性能监控
    this.renderMonitor.start();

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
   * 获取渲染性能指标
   */
  getRenderMetrics(): RenderMetrics {
    return this.renderMonitor.getMetrics();
  }

  /**
   * 获取频繁重排的元素
   * @param threshold 阈值，默认3次
   */
  getFrequentReflowElements(threshold?: number): Array<{ element: Element; path: string; count: number }> {
    return this.renderMonitor.getFrequentReflowElements(threshold);
  }

  /**
   * 获取需要GPU加速但未使用的元素
   */
  getElementsNeedingGPUAcceleration(): Array<{ element: HTMLElement; path: string; reason: string }> {
    return this.renderMonitor.getElementsNeedingGPUAcceleration();
  }

  /**
   * 手动标记重排
   * @param element 相关元素
   * @param reason 原因
   */
  markReflow(element?: Element, reason?: string): void {
    this.renderMonitor.markReflow(element, reason);
  }

  /**
   * 手动标记重绘
   * @param element 相关元素
   * @param reason 原因
   */
  markRepaint(element?: Element, reason?: string): void {
    this.renderMonitor.markRepaint(element, reason);
  }

  /**
   * 高亮频繁重排的元素（用于调试）
   * @param threshold 阈值，默认3次
   * @param options 高亮选项
   */
  highlightFrequentReflowElements(threshold?: number, options?: HighlightOptions): number {
    const frequentElements = this.getFrequentReflowElements(threshold);
    let highlightedCount = 0;

    frequentElements.forEach(({ element }) => {
      if (element instanceof HTMLElement) {
        const removeHighlight = highlightElement(element, {
          borderColor: '#ff0000',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          ...options,
        });
        if (removeHighlight) {
          highlightedCount++;
        }
      }
    });

    console.log(`Highlighted ${highlightedCount} frequent reflow elements`);
    return highlightedCount;
  }

  /**
   * 高亮需要GPU加速的元素（用于调试）
   * @param options 高亮选项
   */
  highlightElementsNeedingGPUAcceleration(options?: HighlightOptions): number {
    const elements = this.getElementsNeedingGPUAcceleration();
    let highlightedCount = 0;

    elements.forEach(({ element }) => {
      const removeHighlight = highlightElement(element, {
        borderColor: '#ffa500',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        ...options,
      });
      if (removeHighlight) {
        highlightedCount++;
      }
    });

    console.log(`Highlighted ${highlightedCount} elements needing GPU acceleration`);
    return highlightedCount;
  }

  /**
   * 上报渲染性能数据
   */
  reportRenderMetrics(): void {
    const metrics = this.renderMonitor.getMetrics();
    this.reporter.report({
      type: 'render',
      data: metrics,
    });
  }

  /**
   * 停止渲染性能监控
   */
  stopRenderMonitoring(): void {
    this.renderMonitor.stop();
  }

  /**
   * 清理渲染性能数据
   */
  clearRenderMetrics(): void {
    this.renderMonitor.clear();
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    this.reporter.destroy();
    this.performanceCollector.destroy();
    this.renderMonitor.stop();
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
  LongTaskAttribution,
  RenderMetrics,
  ReflowInfo,
  RepaintInfo,
  GPUAccelerationInfo
};

// 默认导出
export default PerformanceHelper;


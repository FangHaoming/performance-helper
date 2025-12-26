import { PerformanceMetrics, LongTaskInfo, LongTaskAttribution } from '../types';
import { getElementPath } from '../utils/index';

/**
 * 性能指标采集器
 */
export class PerformanceCollector {
  private metrics: Partial<PerformanceMetrics> = {};
  private lcpObserver?: PerformanceObserver;
  private fidObserver?: PerformanceObserver;
  private clsObserver?: PerformanceObserver;
  private fcpObserver?: PerformanceObserver;
  private longTaskObserver?: PerformanceObserver;
  private initialized: boolean = false;

  /**
   * 初始化观察器（需要在页面加载前调用）
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    // 初始化所有性能观察器
    this.collectWebVitals();
    this.initialized = true;
  }

  /**
   * 采集所有性能指标
   */
  collect(): PerformanceMetrics {
    this.collectNavigationTiming();
    // 重新获取最终的 LCP 值，确保与 Lighthouse 一致
    // 因为 LCP 可能在页面加载过程中多次更新，需要在最终时刻获取
    this.collectFinalLCP();
    return { ...this.metrics };
  }

  /**
   * 采集最终的 LCP 值
   * 从 Performance API 中获取最新的 LCP entry，确保获取的是最终值
   * 这与 Lighthouse 的计算方式一致
   */
  private collectFinalLCP(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    try {
      // 获取所有 LCP entries，最后一个就是最终的 LCP
      const lcpEntries = window.performance.getEntriesByType('largest-contentful-paint') as any[];
      if (lcpEntries.length > 0) {
        const lastEntry = lcpEntries[lcpEntries.length - 1];
        
        // 使用与 observeLCP 相同的计算逻辑
        let lcpValue: number | undefined;
        
        if (lastEntry.renderTime !== undefined && lastEntry.renderTime !== null && lastEntry.renderTime > 0) {
          lcpValue = lastEntry.renderTime;
        } else if (lastEntry.loadTime !== undefined && lastEntry.loadTime !== null && lastEntry.loadTime > 0) {
          lcpValue = lastEntry.loadTime;
        } else {
          lcpValue = lastEntry.startTime;
        }
        
        if (lcpValue !== undefined && lcpValue !== null && lcpValue > 0) {
          this.metrics.lcp = Math.round(lcpValue);
          
          // 更新 LCP 元素路径
          if (lastEntry.element && lastEntry.element instanceof Element) {
            const elementPath = getElementPath(lastEntry.element);
            if (elementPath) {
              this.metrics.lcpElement = elementPath;
            }
          }
        }
      }
    } catch (e) {
      // 浏览器不支持或出错，使用 observer 中已收集的值
    }
  }

  /**
   * 采集 Navigation Timing 指标
   * 使用 PerformanceNavigationTiming API（新标准）
   */
  private collectNavigationTiming(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    try {
      const navigationEntries = window.performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navigation = navigationEntries[0];

      if (!navigation) {
        return;
      }

      // DNS 查询时间
      this.metrics.dns = Math.round(navigation.domainLookupEnd - navigation.domainLookupStart);

      // TCP 连接时间
      this.metrics.tcp = Math.round(navigation.connectEnd - navigation.connectStart);

      // TTFB (Time to First Byte) - 从请求发送到收到第一个字节
      // 标准定义：responseStart - requestStart
      // 如果 requestStart 不存在（如缓存），则使用 fetchStart 作为备选
      this.metrics.ttfb = Math.round(
        navigation.responseStart - (navigation.requestStart || navigation.fetchStart)
      );

      // 请求响应时间
      this.metrics.request = Math.round(navigation.responseEnd - navigation.responseStart);

      // DOM 解析时间
      this.metrics.parse = Math.round(navigation.domInteractive - navigation.responseEnd);

      // DOMContentLoaded 时间
      // 使用 startTime（对应旧 API 的 navigationStart），表示导航开始的时间
      // 这比 fetchStart 更准确，因为 startTime 是 PerformanceEntry 的标准属性
      this.metrics.domContentLoaded = Math.round(navigation.domContentLoadedEventEnd - navigation.startTime);

      // Load 完成时间
      // 同样使用 startTime 作为基准，保持一致性
      this.metrics.load = Math.round(navigation.loadEventEnd - navigation.startTime);
    } catch (e) {
      // 浏览器不支持新 API，降级到旧 API
      this.collectNavigationTimingLegacy();
    }
  }

  /**
   * 降级方案：使用旧的 PerformanceTiming API（已废弃，仅作兼容）
   */
  private collectNavigationTimingLegacy(): void {
    if (!window.performance || !(window.performance as any).timing) {
      return;
    }

    const timing = window.performance.timing;

    // DNS 查询时间
    this.metrics.dns = timing.domainLookupEnd - timing.domainLookupStart;

    // TCP 连接时间
    this.metrics.tcp = timing.connectEnd - timing.connectStart;

    // TTFB (Time to First Byte)
    this.metrics.ttfb = timing.responseStart - timing.navigationStart;

    // 请求响应时间
    this.metrics.request = timing.responseEnd - timing.responseStart;

    // DOM 解析时间
    this.metrics.parse = timing.domInteractive - timing.responseEnd;

    // DOMContentLoaded 时间
    this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;

    // Load 完成时间
    this.metrics.load = timing.loadEventEnd - timing.navigationStart;
  }

  /**
   * 观察 FCP (First Contentful Paint)
   * 使用 PerformanceObserver 更可靠
   */
  private observeFCP(): void {
    // 先尝试从已有的 paint entries 中读取（适用于页面已加载完成的情况）
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = Math.round(entry.startTime);
        }
      });
    }

    // 如果还没有 FCP 值，使用 PerformanceObserver 观察（适用于页面加载中的情况）
    if (this.metrics.fcp === undefined && 'PerformanceObserver' in window) {
      try {
        this.fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.fcp = Math.round(entry.startTime);
              // 获取到值后可以断开观察
              if (this.fcpObserver) {
                this.fcpObserver.disconnect();
              }
            }
          });
        });

        this.fcpObserver.observe({ type: 'paint', buffered: true });
      } catch (e) {
        // 浏览器不支持
      }
    }
  }

  /**
   * 初始化所有性能观察器
   * 在 init() 时调用，用于设置 PerformanceObserver
   */
  private collectWebVitals(): void {
    this.observeFCP();
    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeTBT();
  }

  /**
   * 观察 LCP
   * 
   * 根据 Web Vitals 标准和 Lighthouse 的实现：
   * - renderTime 和 loadTime 是相对于 performance.timeOrigin 的
   * - timeOrigin 通常等于 navigation start
   * - 所以 renderTime/loadTime/startTime 已经是相对于 navigation start 的
   * 
   * Lighthouse 的计算方式：
   * - 对于图片等资源：优先使用 renderTime，如果没有则使用 loadTime
   * - 对于文本节点：使用 startTime
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        // LCP 值计算优先级（根据 Web Vitals 标准和 Lighthouse 实现）：
        // 1. renderTime - 元素实际渲染到屏幕的时间（最准确，适用于图片等资源）
        // 2. loadTime - 资源加载完成时间（适用于图片等资源，如果 renderTime 不可用）
        // 3. startTime - PerformanceEntry 标准属性（总是存在，适用于文本节点等）
        // 
        // 注意：这些时间值都是相对于 timeOrigin 的，而 timeOrigin 通常等于 navigation start
        // 所以直接使用这些值即可，与 Lighthouse 的计算方式一致
        let lcpValue: number | undefined;
        
        if (lastEntry.renderTime !== undefined && lastEntry.renderTime !== null && lastEntry.renderTime > 0) {
          // 优先使用 renderTime（图片等资源的实际渲染时间）
          // 这是 Lighthouse 推荐的方式，最准确
          lcpValue = lastEntry.renderTime;
        } else if (lastEntry.loadTime !== undefined && lastEntry.loadTime !== null && lastEntry.loadTime > 0) {
          // 如果没有 renderTime，使用 loadTime（资源加载完成时间）
          lcpValue = lastEntry.loadTime;
        } else {
          // 最后使用 startTime（文本节点等）
          lcpValue = lastEntry.startTime;
        }
        
        if (lcpValue !== undefined && lcpValue !== null && lcpValue > 0) {
          // renderTime/loadTime/startTime 已经是相对于 timeOrigin 的
          // 而 timeOrigin 通常等于 navigation start，所以直接使用即可
          this.metrics.lcp = Math.round(lcpValue);
          
          // 记录LCP元素的路径
          // LargestContentfulPaint entry 的 element 属性指向导致 LCP 的 DOM 元素
          if (lastEntry.element && lastEntry.element instanceof Element) {
            const elementPath = getElementPath(lastEntry.element);
            if (elementPath) {
              this.metrics.lcpElement = elementPath;
            }
          }
        }
      });

      this.lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // 浏览器不支持或已触发
    }
  }

  /**
   * 观察 FID
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const eventEntry = entry as PerformanceEventTiming;
          if (eventEntry.processingStart && eventEntry.startTime) {
            this.metrics.fid = Math.round(eventEntry.processingStart - eventEntry.startTime);
            // FID 只需要第一个输入，获取后可以断开观察
            if (this.fidObserver) {
              this.fidObserver.disconnect();
            }
          }
        });
      });

      this.fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }
  }

  /**
   * 观察 CLS
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    // LayoutShift 接口定义（TypeScript DOM 类型中可能不存在）
    interface LayoutShift extends PerformanceEntry {
      value: number;
      hadRecentInput: boolean;
    }

    let clsValue = 0;
    let clsEntries: LayoutShift[] = [];

    try {
      this.clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // layout-shift 类型返回的是 LayoutShift
          const layoutShift = entry as LayoutShift;
          
          // 只统计没有 recent user input 的布局偏移
          if (!layoutShift.hadRecentInput) {
            const firstSessionEntry = clsEntries[0];
            const lastSessionEntry = clsEntries[clsEntries.length - 1];

            // 如果 entry 与上一个 entry 间隔小于 1 秒，且与第一个 entry 间隔小于 5 秒，则合并到当前会话
            if (
              clsValue &&
              clsEntries.length > 0 &&
              layoutShift.startTime - lastSessionEntry.startTime < 1000 &&
              layoutShift.startTime - firstSessionEntry.startTime < 5000
            ) {
              clsValue += layoutShift.value;
              clsEntries.push(layoutShift);
            } else {
              clsValue = layoutShift.value;
              clsEntries = [layoutShift];
            }
          }
        }

        this.metrics.cls = Math.round(clsValue * 1000) / 1000;
      });

      this.clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // 浏览器不支持
    }
  }

  /**
   * 观察长任务并计算 TBT (Total Blocking Time)
   * TBT = 所有长任务（>50ms）的阻塞时间总和
   * 阻塞时间 = 任务持续时间 - 50ms
   */
  private observeTBT(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      // 初始化长任务数组和 TBT
      if (!this.metrics.longTasks) {
        this.metrics.longTasks = [];
      }
      this.metrics.tbt = 0;

      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // 长任务定义为超过 50ms 的任务
          if (entry.duration > 50) {
            const longTaskEntry = entry as any; // PerformanceLongTaskTiming
            
            // 提取归因信息
            const attribution: LongTaskAttribution[] = [];
            
            if (longTaskEntry.attribution && Array.isArray(longTaskEntry.attribution)) {
              longTaskEntry.attribution.forEach((attr: any) => {
                const attributionInfo: LongTaskAttribution = {
                  taskType: attr.entryType || attr.name || 'unknown',
                  name: attr.name,
                };

                // 容器信息（如果是 iframe 等）
                if (attr.containerType) {
                  attributionInfo.containerType = attr.containerType;
                }
                if (attr.containerName) {
                  attributionInfo.containerName = attr.containerName;
                }
                if (attr.containerId) {
                  attributionInfo.containerId = attr.containerId;
                }
                if (attr.containerSrc) {
                  attributionInfo.containerSrc = attr.containerSrc;
                }

                // 脚本URL（如果是脚本执行导致的长任务）
                if (attr.scriptURL) {
                  attributionInfo.scriptURL = attr.scriptURL;
                }

                // DOM元素信息（如果是DOM操作导致的长任务）
                if (attr.element) {
                  const element = attr.element as Element;
                  attributionInfo.element = element;
                  attributionInfo.elementPath = getElementPath(element);
                  attributionInfo.elementTag = element.tagName.toLowerCase();
                  
                  if (element.id) {
                    attributionInfo.elementId = element.id;
                  }
                  
                  if (element.className && typeof element.className === 'string') {
                    attributionInfo.elementClass = element.className.trim();
                  }
                }

                attribution.push(attributionInfo);
              });
            } else {
              // 如果没有 attribution，尝试从 entry 本身推断
              // 某些浏览器可能不支持 attribution，但我们可以从其他信息推断
              const fallbackInfo: LongTaskAttribution = {
                taskType: 'unknown',
                name: entry.name || 'long-task',
              };

              // 尝试从 entry 中提取脚本信息
              if ((entry as any).scriptURL) {
                fallbackInfo.scriptURL = (entry as any).scriptURL;
              }

              attribution.push(fallbackInfo);
            }

            // 添加到长任务列表
            const longTaskInfo: LongTaskInfo = {
              startTime: Math.round(entry.startTime),
              duration: Math.round(entry.duration),
              attribution,
            };
            
            this.metrics.longTasks!.push(longTaskInfo);
            
            // 累加 TBT（阻塞时间 = duration - 50ms）
            const blockingTime = Math.round(entry.duration - 50);
            this.metrics.tbt = (this.metrics.tbt || 0) + blockingTime;
          }
        }
      });

      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
      
      // 重新计算 TBT（确保准确性，处理所有 buffered entries）
      // 因为 buffered: true 会立即触发回调，但为了确保准确性，重新计算一次
      this.updateTBT();
    } catch (e) {
      // 浏览器不支持 longtask API
    }
  }

  /**
   * 更新 TBT (Total Blocking Time)
   * 从已收集的长任务列表中重新计算 TBT，确保准确性
   */
  private updateTBT(): void {
    const longTasks = this.metrics.longTasks;
    if (!longTasks || longTasks.length === 0) {
      this.metrics.tbt = 0;
      return;
    }

    // 重新计算 TBT（确保准确性）
    let tbt = 0;
    longTasks.forEach((task) => {
      // 只有 duration > 50ms 的任务才计入 TBT
      // 阻塞时间 = duration - 50ms
      if (task.duration > 50) {
        tbt += task.duration - 50;
      }
    });

    this.metrics.tbt = Math.round(tbt);
  }

  /**
   * 销毁观察器
   */
  destroy(): void {
    if (this.lcpObserver) {
      this.lcpObserver.disconnect();
    }
    if (this.fidObserver) {
      this.fidObserver.disconnect();
    }
    if (this.clsObserver) {
      this.clsObserver.disconnect();
    }
    if (this.fcpObserver) {
      this.fcpObserver.disconnect();
    }
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
    }
    this.initialized = false;
  }
}


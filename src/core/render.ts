import { RenderMetrics, ReflowInfo, RepaintInfo, GPUAccelerationInfo } from '../types';
import { getElementPath } from '../utils/index';

/**
 * 渲染性能监控器
 * 用于检测重排（Reflow）和重绘（Repaint）
 */
export class RenderMonitor {
  private reflows: ReflowInfo[] = [];
  private repaints: RepaintInfo[] = [];
  private gpuAcceleratedElements: GPUAccelerationInfo[] = [];
  private isMonitoring: boolean = false;
  private frameObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  private styleObserver?: MutationObserver;
  
  // 用于检测重排的标记
  private reflowDetector: {
    lastFrameTime: number;
    frameCount: number;
    suspiciousElements: Map<Element, number>;
  } = {
    lastFrameTime: 0,
    frameCount: 0,
    suspiciousElements: new Map(),
  };

  /**
   * 开始监控渲染性能
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.observeFrameTiming();
    this.observeDOMChanges();
    this.observeStyleChanges();
    this.detectGPUAcceleration();
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.isMonitoring = false;
    
    if (this.frameObserver) {
      this.frameObserver.disconnect();
      this.frameObserver = undefined;
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }
    
    if (this.styleObserver) {
      this.styleObserver.disconnect();
      this.styleObserver = undefined;
    }
  }

  /**
   * 观察帧性能（用于检测重排重绘）
   */
  private observeFrameTiming(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.frameObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('reflow')) {
            // 自定义的 reflow 测量
            this.recordReflow(entry);
          } else if (entry.entryType === 'measure' && entry.name.includes('repaint')) {
            // 自定义的 repaint 测量
            this.recordRepaint(entry);
          }
        }
      });

      // 观察 measure 类型（用于检测自定义标记的重排重绘）
      try {
        this.frameObserver.observe({ 
          entryTypes: ['measure'],
          buffered: true 
        });
      } catch (e) {
        // 某些浏览器可能不支持 entryTypes，尝试使用 type
        try {
          this.frameObserver.observe({ 
            type: 'measure',
            buffered: true 
          });
        } catch (e2) {
          // 如果都不支持，忽略
        }
      }
    } catch (e) {
      // 浏览器不支持或已触发
      console.warn('Frame observer not supported:', e);
    }

    // 使用 requestAnimationFrame 检测帧率变化（间接检测重排重绘）
    this.monitorFrameRate();
  }

  /**
   * 监控帧率变化（用于检测性能问题）
   */
  private monitorFrameRate(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    let droppedFrames = 0;

    const checkFrame = (currentTime: number) => {
      if (!this.isMonitoring) {
        return;
      }

      frameCount++;
      const deltaTime = currentTime - lastTime;
      
      // 如果帧间隔超过 20ms（正常应该是 16.67ms），可能是重排重绘导致的
      if (deltaTime > 20) {
        droppedFrames += Math.floor((deltaTime - 16.67) / 16.67);
        
        // 如果连续掉帧，记录为潜在的重排重绘问题
        if (droppedFrames > 2) {
          this.recordPotentialReflow(deltaTime, droppedFrames);
        }
      } else {
        droppedFrames = 0;
      }

      lastTime = currentTime;
      requestAnimationFrame(checkFrame);
    };

    requestAnimationFrame(checkFrame);
  }

  /**
   * 记录潜在的重排
   * 优化：限制记录数量，避免内存溢出
   */
  private recordPotentialReflow(deltaTime: number, droppedFrames: number): void {
    // 限制重排记录数量，避免内存溢出
    const MAX_REFLOW_RECORDS = 1000;
    if (this.reflows.length >= MAX_REFLOW_RECORDS) {
      return; // 已达到最大记录数，不再记录
    }

    // 获取当前可能导致重排的元素（通过检查最近修改的DOM）
    const suspiciousElements = Array.from(this.reflowDetector.suspiciousElements.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // 只取前5个最可疑的元素

    if (suspiciousElements.length > 0) {
      suspiciousElements.forEach(([element, count]) => {
        const reflowInfo: ReflowInfo = {
          timestamp: performance.now(),
          duration: deltaTime,
          element: element,
          elementPath: getElementPath(element),
          reason: 'frame_drop',
          droppedFrames: droppedFrames,
          stackTrace: this.getStackTrace(),
        };
        this.reflows.push(reflowInfo);
      });
    }
  }

  /**
   * 观察DOM变化（用于检测可能导致重排的操作）
   */
  private observeDOMChanges(): void {
    if (!('MutationObserver' in window)) {
      return;
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // 检测可能导致重排的DOM操作
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          const target = mutation.target as Element;
          
          // 记录可疑元素
          const count = this.reflowDetector.suspiciousElements.get(target) || 0;
          this.reflowDetector.suspiciousElements.set(target, count + 1);
          
          // 清理旧记录（只保留最近5秒的）
          setTimeout(() => {
            this.reflowDetector.suspiciousElements.delete(target);
          }, 5000);

          // 如果修改了可能导致重排的属性
          if (mutation.type === 'attributes') {
            const attrName = mutation.attributeName;
            if (attrName && this.isReflowTriggeringAttribute(attrName)) {
              this.recordReflowFromMutation(target, attrName);
            }
          }
        }
      });
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'width', 'height', 'display', 'position'],
    });
  }

  /**
   * 观察样式变化（用于检测可能导致重绘的操作）
   */
  private observeStyleChanges(): void {
    if (!('MutationObserver' in window)) {
      return;
    }

    // 使用 Performance API 的 mark/measure 来检测样式计算
    // 通过拦截样式读取来检测重绘
    this.interceptStyleReads();
  }

  /**
   * 拦截样式读取（用于检测重绘）
   * 注意：这个方法会修改全局的 getComputedStyle，需要谨慎使用
   */
  private interceptStyleReads(): void {
    // 通过代理 getComputedStyle 来检测频繁的样式读取
    // 注意：这个方法可能会影响性能，建议在开发环境使用
    // 检查是否在生产环境（通过检查是否有 source map 或其他方式）
  
    const self = this;
    const originalGetComputedStyle = window.getComputedStyle;
    let readCount = 0;
    let lastReadTime = 0;
    let readElements = new Map<Element, number>();

    (window as any).getComputedStyle = function(element: Element, ...args: any[]) {
      const now = performance.now();
      readCount++;
      
      // 记录元素读取次数
      const elementReadCount = readElements.get(element) || 0;
      readElements.set(element, elementReadCount + 1);
      
      // 如果频繁读取样式（可能是重绘导致的）
      if (now - lastReadTime < 10 && readCount > 5) {
        // 记录潜在的重绘
        const frequentElement = Array.from(readElements.entries())
          .find(([_, count]) => count > 3);
        
        if (frequentElement) {
          self.markRepaint(frequentElement[0], 'frequent_style_read');
        }
        
        // 重置计数器
        readCount = 0;
        readElements.clear();
      }
      
      // 清理旧记录
      if (now - lastReadTime > 100) {
        readElements.clear();
      }
      
      lastReadTime = now;
      return originalGetComputedStyle.call(window, element, ...args);
    };
  }

  /**
   * 检测GPU加速
   * 优化：使用 requestIdleCallback 和分批处理，避免阻塞主线程
   */
  private detectGPUAcceleration(): void {
    // 延迟执行，等待页面加载完成
    const detectInIdle = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.detectGPUAccelerationSelectively();
        }, { timeout: 2000 });
      } else {
        // 降级：延迟执行
        setTimeout(() => {
          this.detectGPUAccelerationSelectively();
        }, 1000);
      }
    };

    // 如果页面已加载完成，立即检测；否则等待加载完成
    if (document.readyState === 'complete') {
      detectInIdle();
    } else {
      window.addEventListener('load', detectInIdle, { once: true });
    }
  }

  /**
   * 检测GPU加速（检测所有元素）
   * 优化：使用分批处理，避免阻塞主线程
   */
  private detectGPUAccelerationSelectively(): void {
    // 直接获取所有元素
    const allElements = document.querySelectorAll('*');
    const candidates: HTMLElement[] = [];

    // 不应该检测的元素标签（这些元素通常不需要GPU加速）
    const excludeTags = new Set([
      'META', 'LINK', 'SCRIPT', 'STYLE', 'TITLE', 'HEAD', 'HTML', 'BODY',
      'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH'
    ]);

    // 过滤出 HTMLElement 类型的元素，并排除不需要检测的元素
    allElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // 排除不应该检测的元素
        if (!excludeTags.has(element.tagName)) {
          candidates.push(element);
        }
      }
    });

    // 分批处理，避免阻塞主线程
    this.processGPUAccelerationBatch(candidates, 0);
  }

  /**
   * 分批处理GPU加速检测
   */
  private processGPUAccelerationBatch(candidates: HTMLElement[], index: number): void {
    const batchSize = 50; // 每批处理50个元素
    const endIndex = Math.min(index + batchSize, candidates.length);

    for (let i = index; i < endIndex; i++) {
      const element = candidates[i];
      try {
        const computedStyle = window.getComputedStyle(element);
        const gpuInfo = this.checkGPUAcceleration(element, computedStyle);
        
        if (gpuInfo.isAccelerated) {
          this.gpuAcceleratedElements.push(gpuInfo);
        }
      } catch (e) {
        // 忽略错误，继续处理下一个
      }
    }

    // 如果还有剩余元素，继续处理
    if (endIndex < candidates.length) {
      // 使用 requestIdleCallback 或 setTimeout 继续处理
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          this.processGPUAccelerationBatch(candidates, endIndex);
        }, { timeout: 1000 });
      } else {
        setTimeout(() => {
          this.processGPUAccelerationBatch(candidates, endIndex);
        }, 0);
      }
    }
  }

  /**
   * 检查元素是否使用GPU加速
   */
  private checkGPUAcceleration(
    element: HTMLElement,
    computedStyle: CSSStyleDeclaration
  ): GPUAccelerationInfo {
    const info: GPUAccelerationInfo = {
      element: element,
      elementPath: getElementPath(element),
      isAccelerated: false,
      accelerationMethods: [],
      willChange: false,
      transform: false,
      opacity: false,
      filter: false,
      backdropFilter: false,
    };

    // 1. 检查 will-change（明确声明需要GPU加速）
    const willChange = computedStyle.willChange;
    if (willChange && willChange !== 'auto' && willChange.trim() !== '') {
      info.willChange = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('will-change');
    }

    // 2. 检查 transform（只有非 'none' 时才使用GPU加速）
    const transform = computedStyle.transform;
    const transitionProperty = computedStyle.transitionProperty;
    const transitionDuration = computedStyle.transitionDuration;
    
    // 检查是否有 transform 过渡动画（即使当前 transform 是默认值，transition: transform 也会使用GPU加速）
    const hasTransformTransition = transitionProperty && 
      transitionProperty !== 'none' &&
      parseFloat(transitionDuration) > 0 &&
      (transitionProperty.includes('transform') || transitionProperty === 'all');
    
    if (transform && transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
      info.transform = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('transform');
      
      // 检查3D变换（强制GPU加速）
      if (transform.includes('translate3d') || 
          transform.includes('translateZ') ||
          transform.includes('perspective') ||
          transform.includes('matrix3d')) {
        if (!info.accelerationMethods.includes('transform-3d')) {
          info.accelerationMethods.push('transform-3d');
        }
      }
    } else if (hasTransformTransition) {
      // 即使当前 transform 是默认值，如果有 transition: transform，也认为使用了GPU加速
      info.transform = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('transform-transition');
    }

    // 3. 检查 opacity（只有小于 1 时才真正使用GPU加速）
    const opacityValue = parseFloat(computedStyle.opacity);
    if (!isNaN(opacityValue) && opacityValue < 1 && opacityValue >= 0) {
      info.opacity = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('opacity');
    }

    // 4. 检查 filter（只有非 'none' 时才使用GPU加速）
    const filter = computedStyle.filter;
    if (filter && filter !== 'none' && filter.trim() !== '') {
      info.filter = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('filter');
    }

    // 5. 检查 backdrop-filter（只有非 'none' 时才使用GPU加速）
    const backdropFilter = computedStyle.backdropFilter;
    if (backdropFilter && backdropFilter !== 'none' && backdropFilter.trim() !== '') {
      info.backdropFilter = true;
      info.isAccelerated = true;
      info.accelerationMethods.push('backdrop-filter');
    }

    return info;
  }

  /**
   * 判断属性是否可能导致重排
   */
  private isReflowTriggeringAttribute(attrName: string | null): boolean {
    if (!attrName) {
      return false;
    }

    // 这些属性的改变会导致重排
    const reflowAttributes = [
      'width', 'height', 'padding', 'margin', 'border',
      'display', 'position', 'top', 'left', 'right', 'bottom',
      'font-size', 'font-weight', 'line-height',
      'overflow', 'float', 'clear',
    ];

    return reflowAttributes.some(attr => attrName.includes(attr));
  }

  /**
   * 从Mutation记录重排
   */
  private recordReflowFromMutation(element: Element, attrName: string): void {
    const reflowInfo: ReflowInfo = {
      timestamp: performance.now(),
      duration: 0, // 无法准确测量，设为0
      element: element,
      elementPath: getElementPath(element),
      reason: `attribute_change:${attrName}`,
      stackTrace: this.getStackTrace(),
    };
    this.reflows.push(reflowInfo);
  }

  /**
   * 记录重排
   */
  private recordReflow(entry: PerformanceEntry): void {
    const reflowInfo: ReflowInfo = {
      timestamp: entry.startTime,
      duration: entry.duration,
      reason: 'measured',
      stackTrace: this.getStackTrace(),
    };
    this.reflows.push(reflowInfo);
  }

  /**
   * 记录重绘
   */
  private recordRepaint(entry: PerformanceEntry): void {
    const repaintInfo: RepaintInfo = {
      timestamp: entry.startTime,
      duration: entry.duration,
      reason: 'measured',
      stackTrace: this.getStackTrace(),
    };
    this.repaints.push(repaintInfo);
  }

  /**
   * 获取堆栈跟踪
   * 优化：只在需要时获取，避免频繁调用影响性能
   */
  private getStackTrace(): string {
    // 在生产环境或大量数据时，可以跳过堆栈跟踪以提升性能
    // 可以通过环境变量或配置控制
    if (this.reflows.length > 1000 || this.repaints.length > 1000) {
      return ''; // 数据量太大时跳过堆栈跟踪
    }
    
    try {
      throw new Error();
    } catch (e: any) {
      return e.stack || '';
    }
  }

  /**
   * 手动标记重排（供外部调用）
   */
  markReflow(element?: Element, reason?: string): void {
    performance.mark('reflow-start');
    
    // 使用 setTimeout 0 来测量重排时间
    setTimeout(() => {
      performance.mark('reflow-end');
      performance.measure('reflow', 'reflow-start', 'reflow-end');
      
      const measure = performance.getEntriesByName('reflow', 'measure')[0];
      if (measure) {
        const reflowInfo: ReflowInfo = {
          timestamp: measure.startTime,
          duration: measure.duration,
          element: element,
          elementPath: element ? getElementPath(element) : undefined,
          reason: reason || 'manual',
          stackTrace: this.getStackTrace(),
        };
        this.reflows.push(reflowInfo);
      }
    }, 0);
  }

  /**
   * 手动标记重绘（供外部调用）
   */
  markRepaint(element?: Element, reason?: string): void {
    performance.mark('repaint-start');
    
    setTimeout(() => {
      performance.mark('repaint-end');
      performance.measure('repaint', 'repaint-start', 'repaint-end');
      
      const measure = performance.getEntriesByName('repaint', 'measure')[0];
      if (measure) {
        const repaintInfo: RepaintInfo = {
          timestamp: measure.startTime,
          duration: measure.duration,
          element: element,
          elementPath: element ? getElementPath(element) : undefined,
          reason: reason || 'manual',
          stackTrace: this.getStackTrace(),
        };
        this.repaints.push(repaintInfo);
      }
    }, 0);
  }

  /**
   * 获取渲染性能指标
   */
  getMetrics(): RenderMetrics {
    return {
      reflowCount: this.reflows.length,
      repaintCount: this.repaints.length,
      reflows: this.reflows,
      repaints: this.repaints,
      gpuAcceleratedCount: this.gpuAcceleratedElements.length,
      gpuAcceleratedElements: this.gpuAcceleratedElements,
      totalReflowTime: this.reflows.reduce((sum, r) => sum + r.duration, 0),
      totalRepaintTime: this.repaints.reduce((sum, r) => sum + r.duration, 0),
    };
  }

  /**
   * 获取频繁重排的元素
   * 优化：使用 Map 和单次遍历，时间复杂度 O(n)
   */
  getFrequentReflowElements(threshold: number = 3): Array<{ element: Element; path: string; count: number }> {
    const elementCounts = new Map<string, { element: Element; count: number }>();
    
    // 单次遍历，统计每个元素的重排次数
    for (let i = 0; i < this.reflows.length; i++) {
      const reflow = this.reflows[i];
      if (reflow.element && reflow.elementPath) {
        const existing = elementCounts.get(reflow.elementPath);
        if (existing) {
          existing.count++;
        } else {
          elementCounts.set(reflow.elementPath, {
            element: reflow.element,
            count: 1,
          });
        }
      }
    }

    // 过滤、映射、排序
    return Array.from(elementCounts.entries())
      .filter(([_, data]) => data.count >= threshold)
      .map(([path, data]) => ({
        element: data.element,
        path,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取未使用GPU加速但应该使用的元素
   * 这些元素通常是动画元素或频繁更新的元素
   * 直接检测所有元素
   */
  getElementsNeedingGPUAcceleration(): Array<{ element: HTMLElement; path: string; reason: string }> {
    const candidates: Array<{ element: HTMLElement; path: string; reason: string }> = [];
    
    // 不应该检测的元素标签（这些元素通常不需要GPU加速）
    const excludeTags = new Set([
      'META', 'LINK', 'SCRIPT', 'STYLE', 'TITLE', 'HEAD', 'HTML', 'BODY',
      'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH'
    ]);
    
    // 直接检测所有元素
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // 排除不应该检测的元素
        if (excludeTags.has(element.tagName)) {
          return;
        }
        
        try {
          const computedStyle = window.getComputedStyle(element);
          
          // 检查是否有真正的动画（duration > 0）
          const hasRealAnimation = this.hasRealAnimation(computedStyle);
          
          if (hasRealAnimation) {
            const gpuInfo = this.checkGPUAcceleration(element, computedStyle);
            if (!gpuInfo.isAccelerated) {
              candidates.push({
                element,
                path: getElementPath(element),
                reason: 'has_animation',
              });
            }
          }
        } catch (e) {
          // 忽略错误，继续处理下一个
        }
      }
    });

    // 查找频繁重排的元素
    const frequentReflowElements = this.getFrequentReflowElements(5);
    frequentReflowElements.forEach(({ element, path }) => {
      if (element instanceof HTMLElement) {
        // 排除不应该检测的元素
        if (excludeTags.has(element.tagName)) {
          return;
        }
        
        try {
          const computedStyle = window.getComputedStyle(element);
          const gpuInfo = this.checkGPUAcceleration(element, computedStyle);
          if (!gpuInfo.isAccelerated) {
            // 避免重复添加
            if (!candidates.some(c => c.element === element)) {
              candidates.push({
                element,
                path,
                reason: 'frequent_reflow',
              });
            }
          }
        } catch (e) {
          // 忽略错误
        }
      }
    });

    return candidates;
  }

  /**
   * 检查元素是否有真正的动画（duration > 0）
   */
  private hasRealAnimation(computedStyle: CSSStyleDeclaration): boolean {
    // 检查 animation
    const animationName = computedStyle.animationName;
    const animationDuration = computedStyle.animationDuration;
    
    if (animationName && animationName !== 'none') {
      // 解析 animationDuration（可能是多个值，用逗号分隔）
      const durations = animationDuration.split(',').map(d => parseFloat(d.trim()));
      // 只要有一个 duration > 0，就认为有动画
      if (durations.some(d => !isNaN(d) && d > 0)) {
        return true;
      }
    }
    
    // 检查 transition
    const transitionProperty = computedStyle.transitionProperty;
    const transitionDuration = computedStyle.transitionDuration;
    
    if (transitionProperty && transitionProperty !== 'none') {
      // 解析 transitionDuration（可能是多个值，用逗号分隔）
      const durations = transitionDuration.split(',').map(d => parseFloat(d.trim()));
      // 只要有一个 duration > 0，就认为有过渡动画
      if (durations.some(d => !isNaN(d) && d > 0)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 清理数据
   */
  clear(): void {
    this.reflows = [];
    this.repaints = [];
    this.gpuAcceleratedElements = [];
    this.reflowDetector.suspiciousElements.clear();
  }
}


import { ResourceInfo } from '../types';

/**
 * 资源加载监控器
 */
export class ResourceMonitor {
  private resources: ResourceInfo[] = [];

  /**
   * 开始监控资源加载
   */
  start(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    // 监控资源（包括已有和新增的）
    this.observeNewResources();
  }

  /**
   * 采集已有资源
   */
  private collectExistingResources(): void {
    try {
      const entries = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      entries.forEach((entry) => {
        this.addResource(entry);
      });
    } catch (e) {
      console.warn('Resource collection failed:', e);
    }
  }

  /**
   * 观察资源加载（包括已有和新增的）
   */
  private observeNewResources(): void {
    // 如果浏览器不支持 PerformanceObserver，或 observe 失败，降级到 getEntriesByType
    if (!('PerformanceObserver' in window)) {
      this.collectExistingResources();
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.addResource(entry as PerformanceResourceTiming);
          }
        }
      });

      observer.observe({ type: 'resource', buffered: true });
    } catch (e) {
      // observe 失败（如参数不支持），降级到 getEntriesByType
      console.warn('Resource observer failed, fallback to getEntriesByType:', e);
      this.collectExistingResources();
    }
  }

  /**
   * 添加资源信息
   */
  private addResource(entry: PerformanceResourceTiming): void {
    const resourceInfo: ResourceInfo = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      duration: Math.round(entry.duration),
      size: (entry as any).transferSize || 0,
      startTime: Math.round(entry.startTime),
      url: entry.name,
    };

    this.resources.push(resourceInfo);
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      js: 'script',
      css: 'stylesheet',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      svg: 'image',
      webp: 'image',
      woff: 'font',
      woff2: 'font',
      ttf: 'font',
      eot: 'font',
      xml: 'xmlhttprequest',
      json: 'xmlhttprequest',
    };

    return typeMap[extension] || 'other';
  }

  /**
   * 获取所有资源信息
   */
  getResources(): ResourceInfo[] {
    return this.resources;
  }

  /**
   * 获取慢资源（超过阈值的资源）
   */
  getSlowResources(threshold: number = 2000): ResourceInfo[] {
    return this.resources.filter((resource) => resource.duration > threshold);
  }
}


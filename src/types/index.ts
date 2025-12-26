/**
 * SDK 配置选项
 */
export interface PerformanceHelperOptions {
  /** 上报地址 */
  reportUrl: string;
  /** 应用ID */
  appId?: string;
  /** 用户ID */
  userId?: string;
  /** 是否立即上报，默认false（批量上报） */
  immediate?: boolean;
  /** 批量上报间隔（毫秒），默认5000 */
  batchInterval?: number;
  /** 是否监控资源加载，默认true */
  monitorResources?: boolean;
  /** 是否监控错误，默认true */
  monitorErrors?: boolean;
  /** 是否监控性能指标，默认true */
  monitorPerformance?: boolean;
  /** 采样率 0-1，默认1 */
  sampleRate?: number;
}

/**
 * 长任务归因信息
 */
export interface LongTaskAttribution {
  /** 任务类型：script, layout, style, paint, composite, other */
  taskType: string;
  /** 容器类型：window, iframe, embed, object */
  containerType?: string;
  /** 容器名称 */
  containerName?: string;
  /** 容器ID */
  containerId?: string;
  /** 容器源（URL） */
  containerSrc?: string;
  /** 任务名称 */
  name?: string;
  /** 脚本URL（如果是脚本执行导致的长任务） */
  scriptURL?: string;
  /** 相关DOM元素（如果是DOM操作导致的长任务） */
  element?: Element;
  /** 元素路径（CSS选择器路径） */
  elementPath?: string;
  /** 元素标签名 */
  elementTag?: string;
  /** 元素ID */
  elementId?: string;
  /** 元素类名 */
  elementClass?: string;
}

/**
 * 长任务详细信息
 */
export interface LongTaskInfo {
  /** 开始时间（相对于页面加载） */
  startTime: number;
  /** 持续时间（毫秒） */
  duration: number;
  /** 归因信息数组 */
  attribution: LongTaskAttribution[];
}

/**
 * 性能指标数据
 */
export interface PerformanceMetrics {
  /** First Contentful Paint */
  fcp?: number;
  /** Largest Contentful Paint */
  lcp?: number;
  /** LCP 元素路径 */
  lcpElement?: string;
  /** First Input Delay */
  fid?: number;
  /** Cumulative Layout Shift */
  cls?: number;
  /** Total Blocking Time */
  tbt?: number;
  /** Speed Index */
  speedIndex?: number;
  /** 长任务列表 */
  longTasks?: LongTaskInfo[];
  /** Time to First Byte */
  ttfb?: number;
  /** DOM Content Loaded */
  domContentLoaded?: number;
  /** Load 完成时间 */
  load?: number;
  /** DNS 查询时间 */
  dns?: number;
  /** TCP 连接时间 */
  tcp?: number;
  /** 请求响应时间 */
  request?: number;
  /** 页面解析时间 */
  parse?: number;
}

/**
 * 资源加载信息
 */
export interface ResourceInfo {
  name: string;
  type: string;
  duration: number;
  size: number;
  startTime: number;
  url: string;
}

/**
 * 错误信息
 */
export interface ErrorInfo {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
}

/**
 * 上报数据
 */
export interface ReportData {
  type: 'performance' | 'resource' | 'error';
  data: PerformanceMetrics | ResourceInfo | ErrorInfo;
  timestamp: number;
  url: string;
  userAgent: string;
  appId?: string;
  userId?: string;
}


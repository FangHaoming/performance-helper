/**
 * SDK 配置选项
 */
export interface PerformanceHelperOptions {
  /** 上报地址，如果为空则将数据打印到控制台 */
  reportUrl?: string;
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
  type: 'performance' | 'resource' | 'error' | 'render';
  data: PerformanceMetrics | ResourceInfo | ErrorInfo | RenderMetrics;
  timestamp: number;
  url: string;
  userAgent: string;
  appId?: string;
  userId?: string;
}

/**
 * 重排（Reflow）信息
 */
export interface ReflowInfo {
  /** 时间戳（相对于页面加载） */
  timestamp: number;
  /** 持续时间（毫秒） */
  duration: number;
  /** 相关DOM元素 */
  element?: Element;
  /** 元素路径 */
  elementPath?: string;
  /** 重排原因 */
  reason: string;
  /** 掉帧数（如果是帧率下降导致） */
  droppedFrames?: number;
  /** 堆栈跟踪 */
  stackTrace?: string;
}

/**
 * 重绘（Repaint）信息
 */
export interface RepaintInfo {
  /** 时间戳（相对于页面加载） */
  timestamp: number;
  /** 持续时间（毫秒） */
  duration: number;
  /** 相关DOM元素 */
  element?: Element;
  /** 元素路径 */
  elementPath?: string;
  /** 重绘原因 */
  reason: string;
  /** 堆栈跟踪 */
  stackTrace?: string;
}

/**
 * GPU加速信息
 */
export interface GPUAccelerationInfo {
  /** DOM元素 */
  element: HTMLElement;
  /** 元素路径 */
  elementPath: string;
  /** 是否启用GPU加速 */
  isAccelerated: boolean;
  /** 加速方法列表 */
  accelerationMethods: string[];
  /** 是否使用 will-change */
  willChange: boolean;
  /** 是否使用 transform */
  transform: boolean;
  /** 是否使用 opacity */
  opacity: boolean;
  /** 是否使用 filter */
  filter: boolean;
  /** 是否使用 backdrop-filter */
  backdropFilter: boolean;
}

/**
 * 渲染性能指标
 */
export interface RenderMetrics {
  /** 重排次数 */
  reflowCount: number;
  /** 重绘次数 */
  repaintCount: number;
  /** 重排详情列表 */
  reflows: ReflowInfo[];
  /** 重绘详情列表 */
  repaints: RepaintInfo[];
  /** GPU加速元素数量 */
  gpuAcceleratedCount: number;
  /** GPU加速元素详情 */
  gpuAcceleratedElements: GPUAccelerationInfo[];
  /** 总重排时间（毫秒） */
  totalReflowTime: number;
  /** 总重绘时间（毫秒） */
  totalRepaintTime: number;
}


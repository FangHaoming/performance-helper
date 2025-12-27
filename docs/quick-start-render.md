# 渲染性能排查快速开始

## 快速使用

### 1. 初始化

```typescript
import PerformanceHelper from 'performance-helper';

const helper = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
});

helper.init();
```

### 2. 获取渲染性能数据

```typescript
// 获取完整的渲染性能指标
const metrics = helper.getRenderMetrics();

console.log('重排次数:', metrics.reflowCount);
console.log('重绘次数:', metrics.repaintCount);
console.log('GPU加速元素:', metrics.gpuAcceleratedCount);
```

### 3. 查找问题元素

```typescript
// 查找频繁重排的元素（超过3次）
const frequentReflows = helper.getFrequentReflowElements(3);
frequentReflows.forEach(({ element, path, count }) => {
  console.log(`${path} 发生了 ${count} 次重排`);
});

// 查找需要GPU加速但未使用的元素
const needingGPU = helper.getElementsNeedingGPUAcceleration();
needingGPU.forEach(({ element, path, reason }) => {
  console.log(`${path} 需要GPU加速，原因: ${reason}`);
});
```

### 4. 可视化调试

```typescript
// 在页面上高亮频繁重排的元素（红色边框）
helper.highlightFrequentReflowElements(3);

// 高亮需要GPU加速的元素（橙色边框）
helper.highlightElementsNeedingGPUAcceleration();
```

### 5. 手动标记

```typescript
// 在代码中标记可能导致重排的操作
const element = document.getElementById('my-element');
helper.markReflow(element, 'width_change');
element.style.width = '500px'; // 这会触发重排

// 标记重绘
helper.markRepaint(element, 'color_change');
element.style.color = 'red';
```

## 常见问题排查

### 问题1：页面卡顿

```typescript
// 1. 检查是否有频繁重排
const metrics = helper.getRenderMetrics();
if (metrics.reflowCount > 50) {
  console.warn('检测到大量重排，可能影响性能');
  
  // 2. 找出频繁重排的元素
  const frequent = helper.getFrequentReflowElements(5);
  console.table(frequent);
  
  // 3. 高亮显示
  helper.highlightFrequentReflowElements(5);
}
```

### 问题2：动画不流畅

```typescript
// 1. 检查动画元素是否使用GPU加速
const needingGPU = helper.getElementsNeedingGPUAcceleration();
const animatedElements = needingGPU.filter(e => e.reason === 'has_animation');

if (animatedElements.length > 0) {
  console.warn('发现未使用GPU加速的动画元素:');
  animatedElements.forEach(e => {
    console.log(`- ${e.path}: ${e.reason}`);
  });
  
  // 2. 高亮显示
  helper.highlightElementsNeedingGPUAcceleration();
}
```

### 问题3：滚动性能差

```typescript
// 检查滚动容器是否使用GPU加速
const scrollContainers = document.querySelectorAll('.scroll-container');
scrollContainers.forEach(container => {
  const metrics = helper.getRenderMetrics();
  const gpuElements = metrics.gpuAcceleratedElements;
  const isAccelerated = gpuElements.some(e => e.element === container);
  
  if (!isAccelerated) {
    console.warn('滚动容器未使用GPU加速:', container);
    // 建议添加: container.style.transform = 'translateZ(0)';
  }
});
```

## 浏览器控制台使用

将 helper 暴露到全局，方便在控制台调试：

```typescript
// 在代码中
window.performanceHelper = helper;

// 在浏览器控制台中
// 1. 查看性能数据
window.performanceHelper.getRenderMetrics()

// 2. 查找频繁重排的元素
window.performanceHelper.getFrequentReflowElements(3)

// 3. 高亮问题元素
window.performanceHelper.highlightFrequentReflowElements(3)
window.performanceHelper.highlightElementsNeedingGPUAcceleration()

// 4. 清空数据重新开始
window.performanceHelper.clearRenderMetrics()
```

## 最佳实践

1. **开发环境**：使用高亮功能可视化问题
2. **生产环境**：定期上报性能数据，设置阈值告警
3. **持续优化**：根据监控数据持续优化代码

更多详细信息请查看 [完整排查指南](./render-performance-guide.md)


# 渲染性能排查指南

## 概述

本文档介绍如何使用 `performance-helper` 来排查和优化渲染性能问题，重点关注**减少重排重绘**和**GPU加速**两个方面。

## 一、重排（Reflow）和重绘（Repaint）排查

### 1.1 什么是重排和重绘

- **重排（Reflow）**：当DOM元素的几何属性（如宽度、高度、位置）发生变化时，浏览器需要重新计算元素的几何属性，这个过程称为重排。
- **重绘（Repaint）**：当元素的视觉属性（如颜色、背景）发生变化，但不影响布局时，浏览器只需要重新绘制元素，这个过程称为重绘。

重排比重绘更消耗性能，因为重排会触发整个渲染流程的重新计算。

### 1.2 使用 API 排查

#### 获取渲染性能指标

```typescript
import PerformanceHelper from 'performance-helper';

const helper = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
});

helper.init();

// 获取渲染性能指标
const renderMetrics = helper.getRenderMetrics();
console.log('重排次数:', renderMetrics.reflowCount);
console.log('重绘次数:', renderMetrics.repaintCount);
console.log('总重排时间:', renderMetrics.totalReflowTime, 'ms');
console.log('总重绘时间:', renderMetrics.totalRepaintTime, 'ms');
```

#### 查找频繁重排的元素

```typescript
// 获取重排次数超过3次的元素
const frequentElements = helper.getFrequentReflowElements(3);

frequentElements.forEach(({ element, path, count }) => {
  console.log(`元素 ${path} 发生了 ${count} 次重排`);
  console.log('元素:', element);
});
```

#### 高亮频繁重排的元素（可视化调试）

```typescript
// 高亮所有重排次数超过3次的元素（红色边框）
const highlightedCount = helper.highlightFrequentReflowElements(3);

console.log(`已高亮 ${highlightedCount} 个频繁重排的元素`);
```

### 1.3 手动标记重排重绘

在代码中手动标记可能导致重排重绘的操作：

```typescript
// 标记重排
const element = document.getElementById('my-element');
helper.markReflow(element, 'width_change');

// 修改可能导致重排的属性
element.style.width = '500px';

// 标记重绘
helper.markRepaint(element, 'color_change');
element.style.color = 'red';
```

### 1.4 常见导致重排的操作

以下操作会导致重排，应该避免或优化：

1. **修改DOM结构**
   ```javascript
   // ❌ 不好：频繁添加DOM
   for (let i = 0; i < 100; i++) {
     const div = document.createElement('div');
     document.body.appendChild(div);
   }
   
   // ✅ 好：使用 DocumentFragment 批量添加
   const fragment = document.createDocumentFragment();
   for (let i = 0; i < 100; i++) {
     const div = document.createElement('div');
     fragment.appendChild(div);
   }
   document.body.appendChild(fragment);
   ```

2. **读取布局属性**
   ```javascript
   // ❌ 不好：强制同步布局
   element.style.width = '100px';
   const width = element.offsetWidth; // 触发重排
   element.style.height = width + 'px';
   
   // ✅ 好：批量读取，然后批量写入
   const width = element.offsetWidth;
   const height = width;
   element.style.width = '100px';
   element.style.height = height + 'px';
   ```

3. **修改样式属性**
   ```javascript
   // ❌ 不好：逐个修改样式
   element.style.width = '100px';
   element.style.height = '100px';
   element.style.margin = '10px';
   
   // ✅ 好：使用 class 或一次性修改
   element.className = 'new-style';
   // 或
   element.style.cssText = 'width: 100px; height: 100px; margin: 10px;';
   ```

## 二、GPU 加速排查

### 2.1 什么是 GPU 加速

GPU 加速是指将某些渲染任务交给 GPU 处理，而不是 CPU。GPU 在处理图形相关任务时更高效，可以显著提升动画和交互的流畅度。

### 2.2 使用 API 排查

#### 获取 GPU 加速信息

```typescript
const renderMetrics = helper.getRenderMetrics();

console.log('GPU加速元素数量:', renderMetrics.gpuAcceleratedCount);

renderMetrics.gpuAcceleratedElements.forEach((info) => {
  console.log('元素路径:', info.elementPath);
  console.log('加速方法:', info.accelerationMethods);
  console.log('使用 will-change:', info.willChange);
  console.log('使用 transform:', info.transform);
});
```

#### 查找需要 GPU 加速但未使用的元素

```typescript
// 获取需要GPU加速但未使用的元素
const elementsNeedingGPU = helper.getElementsNeedingGPUAcceleration();

elementsNeedingGPU.forEach(({ element, path, reason }) => {
  console.log(`元素 ${path} 需要GPU加速，原因: ${reason}`);
  console.log('元素:', element);
});
```

#### 高亮需要 GPU 加速的元素（可视化调试）

```typescript
// 高亮所有需要GPU加速但未使用的元素（橙色边框）
const highlightedCount = helper.highlightElementsNeedingGPUAcceleration();

console.log(`已高亮 ${highlightedCount} 个需要GPU加速的元素`);
```

### 2.3 如何启用 GPU 加速

对于需要动画或频繁更新的元素，应该启用 GPU 加速：

#### 方法1：使用 `transform` 和 `opacity`

```css
/* ✅ 好：使用 transform（GPU加速） */
.animated-element {
  transform: translateX(100px);
  transition: transform 0.3s;
}

/* ❌ 不好：使用 left/top（触发重排） */
.animated-element {
  left: 100px;
  transition: left 0.3s;
}
```

#### 方法2：使用 `will-change`

```css
/* 告诉浏览器这个元素将要发生变化，提前优化 */
.will-animate {
  will-change: transform;
}

/* 动画结束后移除 will-change */
.will-animate.animated {
  will-change: auto;
}
```

#### 方法3：使用 3D 变换（强制 GPU 加速）

```css
/* 使用 translate3d 或 translateZ(0) 强制GPU加速 */
.gpu-accelerated {
  transform: translate3d(0, 0, 0);
  /* 或 */
  transform: translateZ(0);
}
```

### 2.4 常见需要 GPU 加速的场景

1. **动画元素**
   ```css
   .slide-in {
     animation: slideIn 0.3s;
     will-change: transform;
   }
   ```

2. **滚动容器**
   ```css
   .scroll-container {
     transform: translateZ(0);
     /* 或 */
     will-change: scroll-position;
   }
   ```

3. **固定定位元素**
   ```css
   .fixed-header {
     position: fixed;
     transform: translateZ(0); /* 强制GPU加速 */
   }
   ```

4. **频繁更新的元素**
   ```css
   .frequently-updated {
     will-change: transform, opacity;
   }
   ```

## 三、完整排查流程

### 3.1 开发环境排查

```typescript
import PerformanceHelper from 'performance-helper';

const helper = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
  monitorPerformance: true,
});

helper.init();

// 在控制台中使用
(window as any).performanceHelper = helper;

// 在浏览器控制台中执行：
// performanceHelper.highlightFrequentReflowElements(3);
// performanceHelper.highlightElementsNeedingGPUAcceleration();
```

### 3.2 生产环境监控

```typescript
const helper = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
  monitorPerformance: true,
  sampleRate: 0.1, // 10% 采样率
});

helper.init();

// 定期上报渲染性能数据
setInterval(() => {
  const metrics = helper.getRenderMetrics();
  
  // 如果重排次数过多，上报警告
  if (metrics.reflowCount > 100) {
    helper.reportRenderMetrics();
  }
}, 60000); // 每分钟检查一次
```

### 3.3 性能报告分析

```typescript
// 获取完整的渲染性能报告
const report = {
  timestamp: Date.now(),
  renderMetrics: helper.getRenderMetrics(),
  frequentReflows: helper.getFrequentReflowElements(5),
  elementsNeedingGPU: helper.getElementsNeedingGPUAcceleration(),
};

console.table(report.frequentReflows);
console.table(report.elementsNeedingGPU);
```

## 四、最佳实践

### 4.1 减少重排重绘

1. **批量 DOM 操作**：使用 DocumentFragment 或先隐藏元素，修改后再显示
2. **避免强制同步布局**：不要频繁读取布局属性
3. **使用 CSS 类**：而不是直接修改 style 属性
4. **使用虚拟列表**：对于长列表，只渲染可见部分

### 4.2 合理使用 GPU 加速

1. **不要过度使用**：GPU 加速会消耗更多内存，只对需要的元素使用
2. **及时清理**：动画结束后移除 `will-change`
3. **优先使用 transform 和 opacity**：这两个属性不会触发重排
4. **测试性能**：使用 Chrome DevTools 的 Performance 面板验证效果

### 4.3 监控和优化

1. **定期检查**：使用工具定期检查渲染性能
2. **设置阈值**：定义性能阈值，超过时发出警告
3. **持续优化**：根据监控数据持续优化代码

## 五、Chrome DevTools 配合使用

### 5.1 Performance 面板

1. 打开 Chrome DevTools
2. 切换到 Performance 面板
3. 点击录制按钮
4. 执行需要分析的操作
5. 停止录制，查看 Flame Chart
6. 查找红色的 "Layout" 和 "Paint" 任务

### 5.2 Rendering 面板

1. 打开 Chrome DevTools
2. 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows)
3. 输入 "Show Rendering"
4. 启用以下选项：
   - **Paint flashing**：高亮重绘区域
   - **Layout Shift Regions**：显示布局偏移区域
   - **Frame Rendering Stats**：显示帧率统计

### 5.3 配合 performance-helper 使用

```typescript
// 在代码中标记关键操作
helper.markReflow(element, 'user_interaction');

// 在 DevTools 中查看对应的 Performance 记录
// 可以看到标记的时间点，方便定位问题
```

## 六、示例代码

### 完整示例

```typescript
import PerformanceHelper from 'performance-helper';

const helper = new PerformanceHelper({
  reportUrl: 'https://your-api.com/report',
});

helper.init();

// 模拟一个可能导致性能问题的操作
function performHeavyOperation() {
  const container = document.getElementById('container');
  
  // 标记开始
  helper.markReflow(container, 'batch_update');
  
  // 批量更新（应该优化）
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.style.width = `${i * 10}px`; // 每次都会触发重排
    container?.appendChild(div);
  }
  
  // 获取性能数据
  const metrics = helper.getRenderMetrics();
  console.log('操作后重排次数:', metrics.reflowCount);
}

// 优化后的版本
function performOptimizedOperation() {
  const container = document.getElementById('container');
  
  helper.markReflow(container, 'optimized_batch_update');
  
  // 使用 DocumentFragment 批量添加
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.style.width = `${i * 10}px`;
    fragment.appendChild(div);
  }
  container?.appendChild(fragment);
  
  const metrics = helper.getRenderMetrics();
  console.log('优化后重排次数:', metrics.reflowCount);
}
```

## 七、总结

通过使用 `performance-helper` 的渲染性能监控功能，你可以：

1. ✅ **发现性能问题**：快速定位导致重排重绘的代码
2. ✅ **可视化调试**：高亮问题元素，直观看到性能瓶颈
3. ✅ **优化建议**：自动识别需要GPU加速的元素
4. ✅ **持续监控**：在生产环境中持续监控性能指标

记住：**测量 → 优化 → 验证 → 重复**，持续优化才能保持最佳性能！


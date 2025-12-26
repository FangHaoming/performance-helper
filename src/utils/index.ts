/**
 * 工具函数集合
 */

/**
 * 获取元素的DOM路径
 * 生成类似 "html > body > div#app > div.container > img" 的路径字符串
 * 
 * @param element - DOM元素
 * @returns 元素的完整DOM路径字符串
 */
export function getElementPath(element: Element | null): string {
  if (!element) {
    return '';
  }

  const path: string[] = [];

  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    // 添加ID
    if (current.id) {
      selector += `#${current.id}`;
    }

    // 添加类名（最多取前3个，避免路径过长）
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .trim()
        .split(/\s+/)
        .filter((cls) => cls)
        .slice(0, 3);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    // 如果没有ID和类名，添加索引
    if (!current.id && (!current.className || current.className.trim() === '')) {
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current);
        if (index >= 0) {
          selector += `:nth-child(${index + 1})`;
        }
      }
    }

    path.unshift(selector);

    // 向上遍历到html为止（包括body和html）
    current = current.parentElement;
    if (current && current.tagName === 'HTML') {
      // 如果当前是html，已经添加到路径，停止遍历
      break;
    }
  }

  return path.join(' > ');
}

/**
 * 根据 CSS 选择器路径查找元素
 * @param path CSS 选择器路径，例如 "body > div#app > img"
 * @returns 找到的元素，如果未找到返回 null
 */
export function querySelectorByPath(path: string): Element | null {
  if (!path) {
    return null;
  }

  try {
    // 尝试直接使用 querySelector
    const element = document.querySelector(path);
    if (element) {
      return element;
    }

    // 如果直接查询失败，尝试分段查找
    // 路径格式通常是 "html > body > div#id.class > img"
    const parts = path.split(' > ');
    let current: Element | null = document.documentElement;

    for (const part of parts) {
      if (!current) {
        return null;
      }

      // 尝试在当前元素下查找
      const found: Element | null = current.querySelector(part);
      if (found && current.contains(found)) {
        current = found;
      } else {
        // 如果查询失败，尝试直接匹配当前元素
        if (matchesSelector(current, part)) {
          continue;
        }
        return null;
      }
    }

    return current;
  } catch (e) {
    console.error('Error querying element by path:', path, e);
    return null;
  }
}

/**
 * 检查元素是否匹配选择器
 */
export function matchesSelector(element: Element, selector: string): boolean {
  try {
    return element.matches(selector);
  } catch (e) {
    // 降级方案：手动解析简单的选择器
    return simpleMatches(element, selector);
  }
}

/**
 * 简单的选择器匹配（降级方案）
 */
export function simpleMatches(element: Element, selector: string): boolean {
  // 移除空格
  selector = selector.trim();

  // 检查标签名
  if (selector.includes('#')) {
    const [tag, id] = selector.split('#');
    if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) {
      return false;
    }
    if (id && element.id !== id.split('.')[0]) {
      return false;
    }
  } else if (selector.includes('.')) {
    const [tag, classes] = selector.split('.');
    if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) {
      return false;
    }
    if (classes) {
      const classList = classes.split('.');
      for (const cls of classList) {
        if (cls && !element.classList.contains(cls)) {
          return false;
        }
      }
    }
  } else {
    if (element.tagName.toLowerCase() !== selector.toLowerCase()) {
      return false;
    }
  }

  return true;
}

/**
 * 元素高亮选项
 */
export interface HighlightOptions {
  /** 边框颜色，默认红色 */
  borderColor?: string;
  /** 边框宽度，默认 3px */
  borderWidth?: string;
  /** 背景颜色，默认透明黄色 */
  backgroundColor?: string;
  /** 是否滚动到元素位置，默认 true */
  scrollIntoView?: boolean;
}

/**
 * 高亮元素
 * 在元素周围添加高亮边框和背景色
 * @param element - 要高亮的 HTML 元素
 * @param options - 高亮选项
 * @returns 移除高亮的函数，如果元素不是 HTMLElement 则返回 null
 */
export function highlightElement(
  element: Element,
  options?: HighlightOptions
): (() => void) | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  // 设置高亮样式
  const {
    borderColor = '#ff0000',
    borderWidth = '3px',
    backgroundColor = 'rgba(255, 255, 0, 0.2)',
    scrollIntoView = true,
  } = options || {};

  // 保存原始样式
  const originalBorder = element.style.border;
  const originalBoxShadow = element.style.boxShadow;
  const originalBackgroundColor = element.style.backgroundColor;
  const originalZIndex = element.style.zIndex;
  const originalPosition = element.style.position;

  // 应用高亮样式
  element.style.border = `${borderWidth} solid ${borderColor}`;
  element.style.boxShadow = `0 0 0 ${borderWidth} ${borderColor}`;
  element.style.backgroundColor = backgroundColor;
  element.style.zIndex = '9999';
  if (getComputedStyle(element).position === 'static') {
    element.style.position = 'relative';
  }

  // 滚动到元素位置
  if (scrollIntoView) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // 返回移除高亮的函数
  return () => {
    element.style.border = originalBorder;
    element.style.boxShadow = originalBoxShadow;
    element.style.backgroundColor = originalBackgroundColor;
    element.style.zIndex = originalZIndex;
    element.style.position = originalPosition;
  };
}

/**
 * 移除元素高亮
 * 如果元素上有保存的移除函数，则调用它
 * @param element - 要移除高亮的元素
 */
export function removeElementHighlight(element: Element): void {
  if (element instanceof HTMLElement && (element as any).__removeHighlight) {
    (element as any).__removeHighlight();
    delete (element as any).__removeHighlight;
  }
}


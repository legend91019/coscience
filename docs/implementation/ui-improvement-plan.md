# CoScience UI 改进计划

## 参考设计系统
- **Codex (Wikimedia)**: 现代化设计系统，强调可访问性和一致性
- **Zcode (Z.ai)**: Agent-first 开发环境，终端原生UI设计

## 当前UI分析

### 现有优势
- 三栏布局结构清晰
- 暖色调设计（paper/brass/clay）
- 响应式设计支持
- 使用lucide-react图标库

### 需要改进的地方
1. **设计系统不完善**: 缺少系统化的设计令牌
2. **组件样式不一致**: 按钮、输入框等组件样式需要统一
3. **深色模式缺失**: 没有深色主题支持
4. **布局灵活性不足**: 面板大小固定，无法调整
5. **可访问性待提升**: 缺少一些ARIA属性和键盘导航

## 改进方案

### 1. 设计令牌系统 (参考Codex)

#### 颜色系统
```css
:root {
  /* 基础颜色 */
  --cdx-color-base: #fffdf8;
  --cdx-color-base-dark: #f7f3ea;
  --cdx-color-base-deep: #ece6d9;
  
  /* 文本颜色 */
  --cdx-color-text: #17231e;
  --cdx-color-text-subtle: #69766e;
  --cdx-color-text-disabled: #9eafa3;
  
  /* 边框颜色 */
  --cdx-color-border: #d8d0c1;
  --cdx-color-border-subtle: #e2daca;
  --cdx-color-border-strong: #c9c1b2;
  
  /* 强调色 */
  --cdx-color-progressive: #173e33;
  --cdx-color-progressive-hover: #255849;
  --cdx-color-destructive: #a95c3a;
  --cdx-color-warning: #b98b3a;
  
  /* 背景色 */
  --cdx-background-color-interactive: #1a4b3d;
  --cdx-background-color-interactive-hover: #255849;
  --cdx-background-color-interactive-active: #1d3b30;
}
```

#### 间距系统
```css
:root {
  --cdx-spacing-50: 4px;
  --cdx-spacing-75: 6px;
  --cdx-spacing-100: 8px;
  --cdx-spacing-150: 12px;
  --cdx-spacing-200: 16px;
  --cdx-spacing-250: 20px;
  --cdx-spacing-300: 24px;
  --cdx-spacing-400: 32px;
  --cdx-spacing-500: 40px;
}
```

#### 字体系统
```css
:root {
  /* 字体族 */
  --cdx-font-family-sans: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  --cdx-font-family-serif: Georgia, "Times New Roman", serif;
  --cdx-font-family-monospace: "IBM Plex Mono", Consolas, monospace;
  
  /* 字体大小 */
  --cdx-font-size-50: 10px;
  --cdx-font-size-75: 11px;
  --cdx-font-size-100: 12px;
  --cdx-font-size-125: 13px;
  --cdx-font-size-150: 15px;
  --cdx-font-size-200: 19px;
  --cdx-font-size-250: 24px;
  --cdx-font-size-300: 25px;
  
  /* 字体权重 */
  --cdx-font-weight-normal: 400;
  --cdx-font-weight-medium: 500;
  --cdx-font-weight-semibold: 600;
  --cdx-font-weight-bold: 700;
}
```

#### 圆角系统
```css
:root {
  --cdx-border-radius-base: 4px;
  --cdx-border-radius-medium: 6px;
  --cdx-border-radius-large: 999px;
}
```

#### 阴影系统
```css
:root {
  --cdx-box-shadow-base: 0 1px 2px rgba(0, 0, 0, 0.05);
  --cdx-box-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.08);
  --cdx-box-shadow-large: 0 14px 38px rgba(43, 50, 43, 0.08);
}
```

### 2. 组件样式改进

#### 按钮组件
```css
.cdx-button {
  /* 基础样式 */
  background: var(--cdx-background-color-interactive);
  border: 1px solid var(--cdx-color-progressive);
  border-radius: var(--cdx-border-radius-base);
  color: #fffaf0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cdx-spacing-100);
  min-height: 36px;
  padding: var(--cdx-spacing-100) var(--cdx-spacing-150);
  transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
}

/* 主要按钮 */
.cdx-button--primary {
  background: var(--cdx-color-progressive);
  border-color: var(--cdx-color-progressive);
}

/* 次要按钮 */
.cdx-button--secondary {
  background: transparent;
  border-color: var(--cdx-color-border-strong);
  color: var(--cdx-color-text);
}

/* 静音按钮 */
.cdx-button--quiet {
  background: transparent;
  border-color: transparent;
  color: var(--cdx-color-progressive);
}

/* 状态 */
.cdx-button:hover {
  background: var(--cdx-color-progressive-hover);
  border-color: var(--cdx-color-progressive-hover);
}

.cdx-button:active {
  transform: translateY(1px);
}

.cdx-button:focus-visible {
  outline: 3px solid var(--cdx-color-progressive);
  outline-offset: 2px;
}

.cdx-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 输入框组件
```css
.cdx-text-input {
  border: 1px solid var(--cdx-color-border-strong);
  border-radius: var(--cdx-border-radius-base);
  background: var(--cdx-color-base);
  color: var(--cdx-color-text);
  min-height: 38px;
  padding: var(--cdx-spacing-100) var(--cdx-spacing-125);
  width: 100%;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.cdx-text-input:hover {
  border-color: var(--cdx-color-border);
}

.cdx-text-input:focus {
  border-color: var(--cdx-color-progressive);
  box-shadow: 0 0 0 2px rgba(23, 62, 51, 0.2);
  outline: none;
}

.cdx-text-input::placeholder {
  color: var(--cdx-color-text-disabled);
}
```

#### 卡片组件
```css
.cdx-card {
  background: var(--cdx-color-base);
  border: 1px solid var(--cdx-color-border);
  border-radius: var(--cdx-border-radius-medium);
  box-shadow: var(--cdx-box-shadow-base);
  padding: var(--cdx-spacing-200);
  transition: box-shadow 140ms ease, border-color 140ms ease;
}

.cdx-card:hover {
  box-shadow: var(--cdx-box-shadow-medium);
  border-color: var(--cdx-color-border-subtle);
}

.cdx-card__title {
  font-family: var(--cdx-font-family-serif);
  font-size: var(--cdx-font-size-200);
  font-weight: var(--cdx-font-weight-bold);
  margin: 0 0 var(--cdx-spacing-100);
}

.cdx-card__description {
  color: var(--cdx-color-text-subtle);
  font-size: var(--cdx-font-size-100);
  margin: 0;
  line-height: 1.5;
}
```

### 3. 布局改进

#### 响应式三栏布局
```css
.coscience-shell {
  display: grid;
  grid-template-columns: minmax(230px, 278px) minmax(480px, 1fr) minmax(330px, 410px);
  min-height: 100vh;
  transition: grid-template-columns 300ms ease;
}

/* 可调整大小的面板 */
@media (min-width: 920px) {
  .coscience-shell {
    grid-template-columns: minmax(230px, 278px) 1fr minmax(330px, 410px);
  }
}

/* 响应式断点 */
@media (max-width: 1180px) {
  .coscience-shell {
    grid-template-columns: 230px minmax(420px, 1fr) 330px;
  }
}

@media (max-width: 920px) {
  .coscience-shell {
    grid-template-columns: 1fr;
  }
  
  .project-rail,
  .conversation-panel,
  .control-console {
    border-right: 0;
  }
}
```

#### 面板调整手柄
```css
.panel-resize-handle {
  background: var(--cdx-color-border);
  cursor: col-resize;
  height: 100%;
  width: 4px;
  transition: background 140ms ease;
}

.panel-resize-handle:hover {
  background: var(--cdx-color-progressive);
}

.panel-resize-handle:active {
  background: var(--cdx-color-progressive-hover);
}
```

### 4. 深色模式支持

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* 基础颜色 */
    --cdx-color-base: #1a1a1a;
    --cdx-color-base-dark: #121212;
    --cdx-color-base-deep: #0a0a0a;
    
    /* 文本颜色 */
    --cdx-color-text: #f5f5f5;
    --cdx-color-text-subtle: #a0a0a0;
    --cdx-color-text-disabled: #606060;
    
    /* 边框颜色 */
    --cdx-color-border: #333333;
    --cdx-color-border-subtle: #2a2a2a;
    --cdx-color-border-strong: #404040;
    
    /* 强调色 */
    --cdx-color-progressive: #4CAF50;
    --cdx-color-progressive-hover: #66BB6A;
    --cdx-color-destructive: #ef5350;
    --cdx-color-warning: #ffb74d;
    
    /* 背景色 */
    --cdx-background-color-interactive: #2d5a27;
    --cdx-background-color-interactive-hover: #3d7a37;
    --cdx-background-color-interactive-active: #1d4a17;
    
    /* 阴影 */
    --cdx-box-shadow-base: 0 1px 2px rgba(0, 0, 0, 0.2);
    --cdx-box-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.3);
    --cdx-box-shadow-large: 0 14px 38px rgba(0, 0, 0, 0.4);
  }
}
```

### 5. 导航和工具栏改进

#### 工具栏组件
```css
.cdx-toolbar {
  background: var(--cdx-color-base-dark);
  border-bottom: 1px solid var(--cdx-color-border);
  display: flex;
  align-items: center;
  gap: var(--cdx-spacing-100);
  padding: var(--cdx-spacing-100) var(--cdx-spacing-150);
  min-height: 48px;
}

.cdx-toolbar__item {
  display: flex;
  align-items: center;
  gap: var(--cdx-spacing-75);
}

.cdx-toolbar__separator {
  background: var(--cdx-color-border);
  height: 24px;
  width: 1px;
  margin: 0 var(--cdx-spacing-100);
}
```

#### 分段控件
```css
.cdx-segmented-control {
  background: var(--cdx-color-base-dark);
  border: 1px solid var(--cdx-color-border);
  border-radius: var(--cdx-border-radius-base);
  display: inline-flex;
  gap: var(--cdx-spacing-50);
  padding: var(--cdx-spacing-50);
}

.cdx-segmented-control__item {
  background: transparent;
  border: none;
  border-radius: calc(var(--cdx-border-radius-base) - 2px);
  color: var(--cdx-color-text-subtle);
  cursor: pointer;
  padding: var(--cdx-spacing-75) var(--cdx-spacing-150);
  transition: background 140ms ease, color 140ms ease;
}

.cdx-segmented-control__item:hover {
  background: var(--cdx-color-border-subtle);
  color: var(--cdx-color-text);
}

.cdx-segmented-control__item--selected {
  background: var(--cdx-color-base);
  color: var(--cdx-color-text);
  box-shadow: var(--cdx-box-shadow-base);
}
```

### 6. 可访问性改进

#### ARIA属性
```tsx
// 按钮
<button 
  className="cdx-button"
  aria-label="创建新项目"
  aria-describedby="create-project-description"
>
  <Plus size={16} />
  新建项目
</button>

// 输入框
<div className="cdx-field">
  <label className="cdx-label" htmlFor="research-question">
    研究问题
  </label>
  <input
    id="research-question"
    className="cdx-text-input"
    type="text"
    aria-describedby="research-question-help"
    aria-required="true"
  />
  <div id="research-question-help" className="cdx-field__help-text">
    请输入您的研究问题
  </div>
</div>

// 标签页
<div role="tablist" aria-label="研究面板">
  <button
    role="tab"
    aria-selected={activeTab === 'hypothesis'}
    aria-controls="hypothesis-panel"
    id="hypothesis-tab"
  >
    假设
  </button>
  <div
    role="tabpanel"
    id="hypothesis-panel"
    aria-labelledby="hypothesis-tab"
    hidden={activeTab !== 'hypothesis'}
  >
    {/* 假设内容 */}
  </div>
</div>
```

#### 键盘导航
```css
/* 焦点样式 */
.cdx-button:focus-visible,
.cdx-text-input:focus-visible,
.cdx-segmented-control__item:focus-visible {
  outline: 2px solid var(--cdx-color-progressive);
  outline-offset: 2px;
}

/* 跳过链接 */
.cdx-skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--cdx-color-progressive);
  color: white;
  padding: 8px;
  z-index: 100;
  transition: top 300ms ease;
}

.cdx-skip-link:focus {
  top: 0;
}
```

## 实施步骤

### 阶段1: 设计令牌系统
1. 在 `App.css` 中添加CSS自定义属性
2. 更新现有组件使用新的设计令牌
3. 确保向后兼容

### 阶段2: 组件样式更新
1. 更新按钮组件样式
2. 更新输入框组件样式
3. 更新卡片组件样式
4. 更新标签页和分段控件

### 阶段3: 布局改进
1. 改进响应式布局
2. 添加面板调整功能（可选）
3. 优化移动端体验

### 阶段4: 深色模式
1. 添加媒体查询支持
2. 测试深色模式下的可读性
3. 确保对比度符合可访问性标准

### 阶段5: 可访问性优化
1. 添加必要的ARIA属性
2. 改进键盘导航
3. 添加跳过链接
4. 测试屏幕阅读器兼容性

## 预期效果

### 改进前
- 样式不一致，缺少系统化设计
- 无深色模式支持
- 组件交互反馈不足

### 改进后
- 统一的设计令牌系统
- 支持深色/浅色模式
- 更好的组件交互反馈
- 提升的可访问性
- 更现代化的视觉风格

## 注意事项

1. **渐进式改进**: 分阶段实施，避免一次性大改
2. **向后兼容**: 确保现有功能不受影响
3. **测试验证**: 每个阶段都需要测试
4. **性能考虑**: 避免过度使用CSS变量影响性能
5. **浏览器兼容**: 确保在主流浏览器中正常工作

## 参考资源

- [Codex设计系统文档](https://doc.wikimedia.org/codex/latest/)
- [Zcode文档](https://zcode.z.ai/en/docs/welcome)
- [WCAG可访问性指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS自定义属性](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

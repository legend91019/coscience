# CoScience 文件夹主导项目管理改造总结

## 已完成的改进

### 1. 文件夹主导的项目管理
- **打开文件夹即项目**：参考Codex设计，打开一个文件夹就是一个项目
- **自动创建项目结构**：在文件夹中创建 `.coscience` 配置目录
- **标准化目录结构**：
  ```
  项目文件夹/
  ├── .coscience/          # 配置目录
  ├── papers/              # 论文管理
  │   ├── deep-read/       # 精读论文
  │   └── skim-read/       # 泛读论文
  ├── experiments/         # 实验数据
  ├── figures/             # 图表
  └── writing/             # 写作
  ```

### 2. 文件管理器（左侧栏）
- **Codex风格**：类似Codex的文件管理器
- **实时文件浏览**：显示项目文件夹结构
- **搜索功能**：支持文件名搜索
- **快速上传**：一键上传论文到对应文件夹

### 3. 工作区选择窗口
- **四种工作类型**：
  - 💡 Idea 与方向：探索研究方向，形成假设
  - 🔬 复现与小规模验证：管线验证，Baseline 复现
  - 📊 画图：图表规划和生成
  - ✍️ 写作：论文撰写和编辑
- **直观选择界面**：类似Google Notebook的选择体验

### 4. 论文管理功能（参考Google NotebookLM）
- **PDF上传**：支持拖拽上传PDF文件
- **分类存储**：自动分类到精读/泛读文件夹
- **元数据管理**：自动创建论文元数据文件
- **笔记支持**：为每篇论文创建笔记文件

### 5. Electron IPC通信
- **文件系统访问**：安全的文件系统API
- **文件夹选择**：原生文件夹选择对话框
- **文件上传**：PDF文件上传和复制
- **项目配置**：项目配置文件的读写

## 新增文件

### 组件文件
- `src/ui/components/FileExplorer.tsx` - 文件管理器组件
- `src/ui/components/WorkspaceSelector.tsx` - 工作区选择窗口
- `src/ui/components/PaperUploader.tsx` - 论文上传组件

### Electron文件
- `electron/preload.cjs` - 预加载脚本（IPC通信）
- 更新 `electron/main.cjs` - 添加IPC处理程序

### 配置文件
- `docs/implementation/folder-based-project-redesign.md` - 详细设计文档
- `docs/implementation/folder-based-redesign-summary.md` - 本文档

## 修改的文件

### 主要组件
- `src/ui/App.tsx` - 添加项目路径管理和新组件集成
- `src/ui/components/WorkspaceShell.tsx` - 移除旧的左侧栏
- `src/ui/domain-adapter.ts` - 添加论文管理数据模型

### 样式文件
- `src/ui/App.css` - 添加文件管理器、工作区选择、论文上传器样式
- 更新响应式布局为两栏设计

### 测试文件
- `electron/main.test.cjs` - 添加dialog和ipcMain的mock
- `electron/startup-failure.test.cjs` - 添加dialog和ipcMain的mock

## 验证结果

### 测试
- ✅ 所有33个测试通过
- ✅ 包括Electron主进程测试
- ✅ 包括服务测试
- ✅ 包括UI逻辑测试

### 构建
- ✅ 构建成功
- ✅ 输出文件大小合理
- ✅ 无TypeScript错误

## 使用流程

### 1. 启动应用
```bash
npm run desktop
```

### 2. 打开项目
1. 点击"打开文件夹"按钮
2. 选择一个文件夹
3. 系统自动创建项目结构（如果是新文件夹）
4. 显示工作区选择窗口

### 3. 选择工作类型
- 从四种工作类型中选择一个
- 进入对应的工作界面

### 4. 管理论文
- 点击"上传论文"按钮
- 选择PDF文件
- 选择分类（精读/泛读）
- 论文自动保存到对应文件夹

### 5. 文件管理
- 使用左侧文件管理器浏览项目结构
- 搜索文件
- 快速上传论文

## 技术亮点

### 安全性
- 使用Electron的contextIsolation
- 通过IPC安全访问文件系统
- 沙箱环境下的安全操作

### 用户体验
- 原生文件选择对话框
- 实时文件浏览
- 直观的工作区选择
- 一键论文上传

### 可扩展性
- 模块化的组件设计
- 清晰的IPC接口
- 灵活的项目结构

## 后续改进建议

1. **文件预览**：在文件管理器中预览PDF内容
2. **批量上传**：支持多文件同时上传
3. **论文阅读器**：集成PDF阅读器
4. **笔记编辑器**：富文本笔记编辑
5. **版本控制**：集成Git进行项目版本管理
6. **云同步**：可选的云存储备份

## 兼容性

- 支持Windows/macOS/Linux
- 响应式设计，支持不同屏幕尺寸
- 触摸和鼠标交互支持
- 高对比度模式支持

## 总结

本次改造成功将CoScience从固定项目管理改为文件夹主导的项目管理，参考了Codex和Google Notebook的设计理念。主要改进包括：

1. **文件夹主导**：打开文件夹即项目
2. **文件管理器**：Codex风格的文件浏览
3. **工作区选择**：四种工作类型的直观选择
4. **论文管理**：参考Google NotebookLM的论文上传和分类

所有测试通过，构建成功，应用现在具有更现代、更灵活的项目管理方式。

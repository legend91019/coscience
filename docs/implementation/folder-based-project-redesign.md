# CoScience 文件夹主导项目管理改造计划

## 设计参考

### Codex 设计特点
- **文件夹主导**：打开一个文件夹就是一个项目
- **左侧栏**：文件管理器为主，显示项目结构
- **工作区**：专注于当前任务的面板
- **简洁导航**：清晰的项目/文件切换

### Google NotebookLM 设计特点
- **源材料管理**：支持上传PDF、文档、网页等
- **分类存储**：不同类型的材料分组管理
- **AI集成**：基于上传材料进行问答和总结
- **引用追踪**：所有回答都引用原始材料

## 当前架构分析

### 现有结构
```
CoScience/
├── 项目列表（localStorage）
│   ├── 项目1
│   │   ├── 对话线程（idea/experiment/figure/writing）
│   │   ├── 假设列表
│   │   ├── 来源列表
│   │   └── 实验节点
│   └── 项目2
│       └── ...
└── 设置
```

### 问题
1. 项目存储在localStorage中，不是真实的文件夹
2. 左侧栏是固定的对话列表，不是文件管理器
3. 没有论文上传和管理功能
4. 工作类型（idea/实验/画图/写作）是固定的对话类型

## 新架构设计

### 目标结构
```
用户选择的文件夹/
├── .coscience/              # CoScience配置目录
│   ├── project.json         # 项目配置
│   ├── threads/             # 对话线程存储
│   │   ├── idea-1.json
│   │   ├── experiment-1.json
│   │   └── ...
│   └── settings.json        # 项目设置
├── papers/                  # 论文管理
│   ├── deep-read/          # 精读论文
│   │   ├── paper1.pdf
│   │   ├── paper1-notes.md
│   │   └── ...
│   └── skim-read/          # 泛读论文
│       ├── paper2.pdf
│       └── ...
├── experiments/             # 实验数据
│   ├── pilot/              # 小规模验证
│   ├── formal/             # 正式实验
│   └── ...
├── figures/                 # 图表
├── writing/                 # 写作
└── src/                     # 代码（如果是代码项目）
```

### 工作流程

#### 1. 打开/创建项目
```
用户操作：
1. 点击"打开文件夹"按钮
2. 选择一个文件夹
3. 系统检查是否包含 .coscience 目录
4. 如果没有，提示创建项目结构
5. 加载项目配置
```

#### 2. 左侧栏（文件管理器）
```
┌─────────────────────────┐
│ 📁 项目名称              │
├─────────────────────────┤
│ 📄 .coscience/          │
│ 📄 papers/              │
│   📁 deep-read/         │
│   📁 skim-read/         │
│ 📄 experiments/         │
│ 📄 figures/             │
│ 📄 writing/             │
│ 📄 src/                 │
├─────────────────────────┤
│ 🔍 搜索文件...          │
└─────────────────────────┘
```

#### 3. 工作区选择窗口
```
打开项目后显示：
┌─────────────────────────────────────┐
│  选择工作类型                        │
├─────────────────────────────────────┤
│  💡 Idea 与方向                     │
│     探索研究方向，形成假设           │
│                                     │
│  🔬 复现与小规模验证                │
│     管线验证，Baseline 复现         │
│                                     │
│  📊 画图                            │
│     图表规划和生成                  │
│                                     │
│  ✍️  写作                            │
│     论文撰写和编辑                  │
└─────────────────────────────────────┘
```

#### 4. 论文管理（参考Google NotebookLM）
```
上传论文：
1. 点击"上传论文"按钮
2. 选择PDF文件
3. 选择分类（精读/泛读）
4. 系统复制到对应文件夹
5. 提取元数据（标题、作者、摘要）
6. 创建笔记文件

精读论文文件夹结构：
papers/deep-read/
├── paper-title.pdf
├── paper-title-meta.json    # 元数据
├── paper-title-notes.md     # 笔记
└── paper-title-highlights/  # 高亮标注
```

## 实施步骤

### 阶段1：数据模型重构
1. 创建新的项目配置模型
2. 更新文件存储结构
3. 添加论文管理数据模型

### 阶段2：左侧栏重构
1. 实现文件管理器组件
2. 添加文件夹选择功能
3. 实现文件预览

### 阶段3：工作区选择
1. 创建工作区选择窗口
2. 实现不同工作类型的面板
3. 添加工作区切换功能

### 阶段4：论文管理
1. 实现PDF上传功能
2. 创建论文分类管理
3. 添加笔记和标注功能

### 阶段5：集成测试
1. 测试完整工作流程
2. 优化用户体验
3. 修复bug

## 技术实现

### 文件系统访问
```typescript
// 使用 Electron 的 dialog 模块
const { dialog } = require('electron').remote

async function selectFolder() {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  
  if (!result.canceled) {
    return result.filePaths[0]
  }
  return null
}
```

### 项目配置
```typescript
interface ProjectConfig {
  version: string
  name: string
  createdAt: number
  updatedAt: number
  settings: {
    aiModel?: string
    apiKey?: string
  }
}
```

### 论文元数据
```typescript
interface PaperMetadata {
  id: string
  title: string
  authors: string[]
  abstract?: string
  doi?: string
  filePath: string
  category: 'deep-read' | 'skim-read'
  uploadedAt: number
  tags: string[]
}
```

## 用户体验改进

### 打开项目流程
1. **首次打开**：选择文件夹 → 创建项目结构 → 显示工作区选择
2. **再次打开**：选择文件夹 → 检测项目 → 直接进入上次的工作区
3. **切换项目**：点击左侧栏项目名称 → 切换到对应文件夹

### 文件管理
1. **拖拽上传**：直接拖拽PDF到论文文件夹
2. **批量操作**：多选文件进行移动、删除
3. **搜索功能**：全文搜索文件内容

### 工作区切换
1. **快捷键**：Ctrl+1/2/3/4 切换不同工作区
2. **标签页**：类似浏览器标签页的工作区切换
3. **最近使用**：显示最近打开的工作区

## 兼容性考虑

### 旧数据迁移
1. 检测旧格式的项目数据
2. 提供迁移工具
3. 保持向后兼容

### 设置同步
1. 项目设置存储在 .coscience 目录
2. 支持导出/导入设置
3. 可选的云同步（未来功能）

## 预期效果

### 改进前
- 项目存储在localStorage
- 固定的四栏布局
- 没有文件管理功能
- 论文需要手动管理

### 改进后
- 真实的文件夹项目
- 类似Codex的文件管理器
- 集成的论文管理
- 灵活的工作区切换
- 更好的可移植性

## 注意事项

1. **权限处理**：需要处理文件系统读写权限
2. **错误处理**：文件操作失败时的回退机制
3. **性能优化**：大文件夹的加载性能
4. **跨平台**：Windows/macOS/Linux的路径处理

## 后续功能

1. **版本控制**：集成Git进行项目版本管理
2. **协作功能**：支持多人协作（通过共享文件夹）
3. **云同步**：可选的云存储备份
4. **插件系统**：支持自定义工作类型

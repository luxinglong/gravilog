# Gravilog

Gravilog 是一个离线优先的个人日记 / 笔记编辑器。它的核心目标是让内容可以长期保存在一个可携带、可备份、可放进云盘同步目录的 JSON 文件中，同时保留接近日常写作软件的富文本体验。

当前版本保持原生 Web 实现：无需构建步骤，直接通过本地 HTTP 服务打开即可使用。代码已经按编辑器、演示、存储、日历、样式和 UI 事件等领域拆分，便于继续演进。

## Recent updates

- 新增 Excalidraw 画布：可从工具栏进入沉浸式画布，保存后以图片节点插入正文，并保留可再次编辑的 scene 数据。
- 画布资源支持目录模式外置保存：链接同步目录时，`diary.json` 只记录资源路径，预览图和场景文件会写入 `resources/canvas_xxx/preview.png` 与 `resources/canvas_xxx/scene.excalidraw.json`。
- 完善画布迁移、冲突合并、导入导出与资源清理：目录模式读取会自动水合外置资源，导出仍可生成自包含 JSON，删除或合并后不再引用的 `canvas_*` 资源目录会被清理。
- 画布图片支持正文内复制、粘贴和拖拽移动：复制粘贴会创建独立 `canvasId` 的画布副本，拖拽会把原画布移动到正文其他位置。
- Windows 启动脚本统一改为 npm/Node 启动，不再依赖 Python 或 Anaconda；本地服务器会自动寻找 `8765-8779` 之间的可用端口并打开浏览器。
- 日历月视图去掉日期格内的字数统计文本，保留内容量圆点提示，并加高日期格，缓解农历、节日和标记挤在一起的问题。
- 代码块编辑体验重做：输入和粘贴 Python 等代码时保持稳定的多行语法高亮，不再只高亮第一行或受回车影响。
- 代码块增加更舒适的内边距，改善文字贴边的问题；代码块删除按钮已移除，避免误删。
- 代码块支持更自然的 Markdown 交互：输入 ```python 后回车创建代码块，清空代码内容后会回到对应代码围栏，便于继续修改或退出。
- 标题支持类似 Markdown 的动态交互：可通过调整 `#` 数量改变标题层级，也支持自然新增和删除。
- 待办事项的勾选状态会写入快照，刷新或重新加载后仍能保持完成状态。
- 演示模式下的代码块改为高对比白底样式，并在选中代码块内部任意片段时展示完整代码块，避免深色背景上浅灰代码看不清。
- 演示模式会清理编辑层专用的高亮镜像节点，再重新渲染展示用高亮，避免代码显示重复或颜色失真。
- 刷新后重新链接文件时会重置撤销历史基线，首次撤销不会再把文档退回空内容。
- 新增端到端回归覆盖代码块粘贴、高亮稳定性、空代码块回退、标题 Markdown 交互和待办勾选持久化。

## 快速开始

Windows 上推荐双击：

```text
start-gravilog.bat
```

脚本会调用 `npm run serve`，在当前目录启动本地 HTTP 服务，并打开类似下面的地址：

```text
http://127.0.0.1:8765/index.html
```

也可以使用 npm：

```bash
npm run serve
```

然后在浏览器中打开：

```text
http://127.0.0.1:8765/index.html
```

如果 `8765` 已被占用，服务会自动尝试 `8766` 到 `8779`。Windows 机器需要先安装 Node.js LTS（自带 npm），不再要求安装 Python。

直接用浏览器打开 `index.html` 也可以写作，但如果需要稳定使用“链接文件”能力，建议通过本地 HTTP 服务访问。

## 浏览器要求

建议使用 Chrome 或 Edge。

“链接文件”依赖 File System Access API，用于选择并持续写入本地 JSON 文件，适合把数据文件放在云盘同步目录中。Firefox 和 Safari 对该 API 的支持有限，可能只能使用本地缓存、导出和导入。

首次加载需要联网获取：

- KaTeX
- highlight.js
- highlight.js 语言包

浏览器缓存后，后续加载会更快。

## 主要功能

- 富文本编辑：加粗、斜体、下划线、删除线、高亮、文字颜色。
- Markdown 快捷输入：标题、列表、引用、待办、代码块。
- 标题层级：通过 `#` 数量动态调整标题等级，Enter 和删除行为更接近普通编辑器。
- 待办事项：支持勾选完成，并在重新加载后保持状态。
- LaTeX 公式：支持行内公式和块级公式。
- 代码块：语法高亮、语言选择、粘贴整段代码、缩进和空块回退。
- 图片：插入、粘贴、压缩、对齐、缩放、预览。
- Excalidraw 画布：工具栏进入沉浸式绘图，保存为正文图片，支持再次编辑、复制粘贴为独立副本，以及拖拽移动到其他正文行。
- 表格：插入表格，增删行列，删除整表。
- 演示模式：展示选中内容，支持激光笔、自由书写和局部放大镜。
- 日历：年、月、周、日视图，支持写作统计和日程记录。
- 深色模式。
- 撤销 / 重做。
- 本地自动保存。
- 可选链接 JSON 文件进行手动备份和云盘同步。

## 数据保存

Gravilog 仍能读取旧版 v1 数据格式：

```json
{
  "doc": "<html>editor content</html>",
  "dates": [],
  "stats": {},
  "todos": {},
  "savedAt": "2026-05-17T00:00:00.000Z"
}
```

浏览器本地缓存仍使用 `localStorage` 和 IndexedDB，以降低编辑器改动风险。导出和单文件写入时，Gravilog 会写出 v2 单文件结构：

```json
{
  "version": 2,
  "blocks": [
    {
      "id": "legacy_001",
      "type": "legacy-html",
      "html": "<html>editor content</html>"
    }
  ],
  "assets": {},
  "calendar": {
    "todos": {}
  },
  "stats": {
    "dailyChars": {},
    "editDates": []
  },
  "meta": {
    "schemaVersion": 2,
    "savedAt": "2026-05-17T00:00:00.000Z"
  }
}
```

当前导出和链接文件会按顶层 DOM 拆成 `html`、`table`、`code`、`image` 等 block；旧数据仍可作为 `legacy-html` 读取。图片 data URL 会从正文 HTML 中抽到 `assets`，读取时再回填给当前编辑器。

Excalidraw 画布作为 `type: "excalidraw"` 的图片资源保存，正文图片节点通过 `data-canvas-id` 关联资源，并通过 `data-canvas-scene` 支持再次编辑。导出 JSON 会尽量保持自包含，便于手动备份和跨设备恢复。

当通过“链接目录”使用云盘同步目录时，Gravilog 会在目录下维护：

```text
diary.json
resources/
  canvas_xxx/
    preview.png
    scene.excalidraw.json
```

目录模式下 `diary.json` 只记录 `resources/...` 路径，读取、导入和冲突合并时会自动从资源目录水合预览图和 scene；保存时会清理不再被当前日记引用的孤立 `resources/canvas_*` 目录。

更多说明见 [重构设计文档](docs/REFACTOR_DESIGN.md) 和 [备份与恢复策略](docs/BACKUP_AND_RECOVERY.md)。

## 当前工程结构

```text
gravilog/
  index.html
  src/
    calendar/
      calendar.js
    core/
      boot.js
      date-bootstrap.js
      state-shell.js
    canvas/
      canvas.js
      excalidraw-app.jsx
      excalidraw.bundle.css
      excalidraw.bundle.js
    editor/
      editor-richtext.js
    presenter/
      presenter.js
    storage/
      conflict.js
      file-store.js
      indexed-db.js
      local-store.js
      schema.js
      storage-sync.js
    styles/
      base.css
      calendar.css
      dark.css
      editor.css
      main.css
      presenter.css
      storage.css
      toolbar.css
    ui/
      controls.js
      events.js
  scripts/
    build-canvas.mjs
    check-js-syntax.cjs
    serve-static.cjs
  docs/
    BACKUP_AND_RECOVERY.md
    REFACTOR_DESIGN.md
  tests/
    e2e/
    *.test.js
  README.md
  package.json
  start-gravilog.bat
```

职责划分：

- `index.html`：页面骨架、静态 DOM、图标符号、外部 CDN 资源引用。
- `src/styles/main.css`：样式入口，汇总各领域 CSS。
- `src/core/*`：启动顺序、全局状态、撤销重做和早期初始化。
- `src/canvas/*`：Excalidraw 画布入口、沉浸式编辑器封装、正文图片节点、复制粘贴和拖拽移动逻辑。
- `src/editor/*`：富文本编辑器、Markdown、代码块、公式、图片和表格逻辑。
- `src/presenter/*`：演示模式逻辑。
- `src/ui/*`：颜色选择器、弹窗、工具控件和静态 DOM 事件委托。
- `src/storage/*`：schema/migration、本地缓存、文件链接、IndexedDB、同步和冲突处理。
- `src/calendar/*`：日历、日程、农历和写作统计渲染。
- `scripts/build-canvas.mjs`：打包 Excalidraw React 入口为浏览器可直接加载的 bundle。
- `scripts/serve-static.cjs`：开发和 Windows 双击启动使用的 Node 静态文件服务器。
- `tests/*`：存储单元测试和编辑器端到端回归测试。

## 开发命令

```bash
npm run serve
npm run lint
npm test
npm run test:e2e
```

说明：

- `npm run lint` 会检查 JavaScript 语法。
- `npm test` 会运行 Vitest 单元测试。
- `npm run test:e2e` 会运行 Playwright 端到端测试，需要可用的浏览器环境。

## 重构状态

已完成：

- 从 `index.html` 拆出应用样式到 `src/styles/main.css`，并继续拆分为 `base/editor/toolbar/presenter/calendar/storage/dark` 等领域文件。
- 从 `index.html` 拆出应用脚本，并按 `core/editor/presenter/ui/storage/calendar` 拆分。
- 保留 classic script 加载方式，保证现有内联事件和全局函数调用兼容。
- 将静态 HTML 上的 `onclick` / `onchange` / `onkeydown` 迁移为 `data-action`、`data-change-action` 和事件委托。
- 新增 `src/storage/schema.js`，提供 snapshot 归一化、迁移和 v2 写出入口。
- 新增本地缓存、IndexedDB、文件读写和冲突处理模块。
- 导出和链接文件写入升级为 v2 单 JSON 文件结构。
- 图片 data URL 从正文 HTML 中迁移到 `assets`。
- 新增 Excalidraw 画布集成，支持正文图片化保存、再次编辑、复制粘贴、拖拽移动、目录资源外置、导入水合和孤立资源清理。
- 编辑器渲染入口改为 block 级遍历，输入时优先轻量重渲染当前活动块。
- 撤销栈改为 snapshot 结构，并在链接文件或导入文件后重置历史基线。
- 新增 Vitest、Playwright、lint、format 工具链。
- 新增备份与恢复策略文档。

下一阶段建议：

- 将 classic script 迁移到 ESM 模块。
- 继续把运行时编辑器从单个 `contenteditable` 迁移到真实 block DOM。
- 将撤销栈从 block snapshot 继续推进到 block diff 变更记录。
- 让图片工具栏和插入流程直接操作 `assets` 引用。
- 扩展 Playwright 覆盖导入、导出、日历和关键编辑器流程。

## 开发原则

- 保留单文件数据理念。
- 优先兼容已有用户数据。
- 每一步重构都尽量保持可运行、可回退、可验证。
- 不为拆分而拆分，优先拆出存储、编辑器、日历这类高变化领域。
- 在引入框架或构建工具前，先让现有原生实现拥有清晰边界。

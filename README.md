# Gravilog

## Recent updates

- Removed the previous editor motion treatments, including text shadows, background blur, side rails, horizontal ticks, date labels, and top/bottom translucent masks.
- Local CSS and JavaScript asset URLs now include a cache-busting version suffix so refreshes pick up the cleaned editor surface.
- Cloud sync now keeps a lightweight last-synced fingerprint so startup mount can detect local/remote conflicts before writing back to the linked JSON file.
- Conflict resolution is resilient when browser local storage is full: choosing the cloud version does not fail just because `localStorage` cannot cache a full snapshot.
- Calendar todos are stored in the v2 cloud file under `calendar.todos`; the editor can restore calendar todos from the linked cloud file and keeps an in-memory fallback when local cache is unavailable.
- The editor toolbar includes a body-text control for converting headings back to normal text; headings are still created with Markdown `#` levels and return to body text on Enter.
- Non-list content is normalized to left alignment. Ordered and unordered lists keep their intended indentation.
- Empty list items exit cleanly to a body paragraph without pulling following content into the list.
- Code blocks edit as plain text while focused, re-highlight on blur/language change, and include a delete button.
- Selected editor blocks can be folded into a compact placeholder and expanded again.
- Added unit coverage for storage conflict decisions, local cache fallback, and calendar todo round-tripping through the cloud file format.

Gravilog 是一个离线优先的个人日志 / 笔记编辑器。它的产品理念是：内容最终可以保存为一个可携带、可备份、可放进云盘同步目录的 JSON 文件。

当前版本已经完成外层拆分、事件整理、存储层第一轮抽象、v2 单文件结构引入和编辑器性能优化基础：页面骨架、样式和应用脚本已经拆分，运行方式保持兼容，外部 JSON 文件已升级为结构化容器。

## 快速开始

Windows 上推荐双击：

```text
start-gravilog.bat
```

脚本会在当前目录启动本地 HTTP 服务，并打开类似下面的地址：

```text
http://localhost:8765/index.html
```

也可以使用 npm：

```bash
npm run serve
```

然后在浏览器中打开：

```text
http://localhost:8765/index.html
```

直接用浏览器打开 `index.html` 也可以写作，但如果需要稳定使用“链接文件”能力，建议通过本地 HTTP 服务访问。

## 浏览器要求

建议使用 Chrome 或 Edge。

“链接文件”依赖 File System Access API。这个能力用于选择并持续写入本地 JSON 文件，适合放在云盘同步目录中。Firefox 和 Safari 对该 API 的支持有限，可能只能使用本地缓存、导出和导入。

首次加载需要联网获取：

- KaTeX
- highlight.js
- highlight.js 语言包

浏览器缓存后，后续加载会更快。

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
  docs/
    BACKUP_AND_RECOVERY.md
    REFACTOR_DESIGN.md
  README.md
  package.json
  start-gravilog.bat
```

职责划分：

- `index.html`：页面骨架、静态 DOM、图标符号、外部 CDN 资源引用。
- `src/styles/main.css`：样式入口，汇总各领域 CSS。
- `src/core/*`：启动顺序、全局状态和早期初始化。
- `src/editor/*`：富文本编辑器、Markdown、代码块、公式、图片和表格逻辑。
- `src/presenter/*`：演示模式逻辑。
- `src/ui/*`：颜色选择器、弹窗、工具控件和静态 DOM 事件委托。
- `src/storage/*`：schema/migration、本地缓存、文件链接、IndexedDB、同步和冲突处理。
- `src/calendar/*`：日历、日程、农历和写作统计渲染。
- `docs/REFACTOR_DESIGN.md`：重构设计文档与后续演进路线。
- `docs/BACKUP_AND_RECOVERY.md`：数据备份、恢复和冲突处理策略。
- `start-gravilog.bat`：Windows 本地启动脚本。

## 主要功能

- 富文本编辑：加粗、斜体、下划线、删除线、高亮、文字颜色。
- Markdown 快捷输入：标题、列表、引用、待办、代码块等。
- LaTeX 公式：支持行内公式和块级公式。
- 代码块：语法高亮、语言选择、缩进处理。
- 图片：插入、粘贴、压缩、对齐、缩放、预览。
- 表格：插入表格，增删行列，删除整表。
- 演示模式：展示选中内容，支持激光笔、自由书写和局部放大镜。
- 日历：年、月、周、日视图，支持写作统计和日程记录。
- 深色模式。
- 撤销 / 重做。
- 本地自动保存。
- 可选链接 JSON 文件进行手动备份和云盘同步。

## 数据保存

当前版本仍能读取原始 v1 数据格式：

```json
{
  "doc": "<html>editor content</html>",
  "dates": [],
  "stats": {},
  "todos": {},
  "savedAt": "2026-05-17T00:00:00.000Z"
}
```

浏览器本地缓存仍使用 `localStorage` 和 IndexedDB，以降低编辑器改动风险。导出和链接文件写入时，Gravilog 会写出 v2 单文件结构：

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

现阶段导出和链接文件会按顶层 DOM 拆成 `html`、`table`、`code`、`image` 等 block；旧数据仍可作为 `legacy-html` 读取。图片 data URL 会从正文 HTML 中抽到 `assets`，读取时再回填给当前编辑器。

详见 [重构设计文档](docs/REFACTOR_DESIGN.md)。

备份和恢复策略详见 [备份与恢复策略](docs/BACKUP_AND_RECOVERY.md)。

## 重构状态

已完成：

- 从 `index.html` 拆出应用样式到 `src/styles/main.css`。
- 继续将样式拆成 `base/editor/toolbar/presenter/calendar/storage/dark` 等领域文件。
- 从 `index.html` 拆出应用脚本，并继续按 `core/editor/presenter/ui/storage/calendar` 拆分。
- 保留当前静态运行模式，不强制引入框架或构建工具。
- 暂时保留 classic script 加载方式，保证现有内联事件仍能调用全局函数。
- 将静态 HTML 上的 `onclick` / `onchange` / `onkeydown` 迁移为 `data-action`、`data-change-action` 和事件委托。
- 将动态日历渲染字符串中的内联事件迁移为 `data-cal-action` 和日历容器事件委托。
- 新增 `src/storage/schema.js`，提供 `normalizeSnapshot`、`migrateSnapshot` 和 v2 legacy-html 迁移入口。
- 新增 `src/storage/local-store.js`、`indexed-db.js`、`file-store.js`、`conflict.js`，把本地缓存、句柄存储、文件读写和冲突判断从编辑器/UI 代码中拆出。
- 导出和链接文件写入升级为 v2 单 JSON 文件结构，包含 `blocks/assets/calendar/stats/meta`。
- v2 写出时按顶层 DOM 生成 block，代码块和图片会进入独立 block。
- 图片 data URL 从正文 HTML 中迁移到 `assets`。
- 编辑器渲染入口改为 block 级遍历，输入时只重渲染当前活动块的轻量内容。
- 撤销栈改为 block snapshot 结构，为后续 block diff 撤销做准备。
- 新增 `node --test` 兼容测试，覆盖 v1 snapshot 归一化、v2 legacy-html 读取和 v2 写出结构。
- 新增 Vitest、Playwright、lint、format 工具链。
- 新增备份与恢复策略文档。
- 新增 `package.json`，提供可选的 `npm run serve`。
- 修正 Windows 启动脚本中的 Python 启动检测逻辑。
- 新增详细重构设计文档。

下一阶段建议：

- 将 classic script 迁移到 ESM 模块。
- 继续把运行时编辑器从单个 `contenteditable` 迁移到真实 block DOM。
- 将撤销栈从 block snapshot 继续推进到 block diff 变更记录。
- 将图片工具栏和插入流程改为直接操作 `assets` 引用。
- 增加浏览器端 block 导出流程测试。
- 扩展 Playwright 覆盖导入、导出、日历和编辑器关键流程。
- 补充单元测试和关键浏览器流程测试。

## 开发原则

- 保留单文件数据理念。
- 优先兼容已有用户数据。
- 每一步重构都尽量保持可运行、可回退、可验证。
- 不为拆分而拆分，优先拆出存储、编辑器、日历这类高变化领域。
- 在引入框架或构建工具前，先让现有原生实现拥有清晰边界。

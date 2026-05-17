# Gravilog 重构设计文档

## 1. 背景

Gravilog 最初以单文件应用形式实现：HTML、CSS、JavaScript、页面结构、编辑器逻辑、日历逻辑、同步逻辑全部集中在 `index.html` 中。

这种形式的优点很明显：

- 部署简单。
- 没有构建流程。
- 离线可用。
- 用户容易理解和备份。

但随着功能增长，单文件实现开始出现工程风险：

- `index.html` 超过 3000 行，阅读和定位成本升高。
- 样式、DOM、状态和业务逻辑耦合紧密。
- 全局变量多，功能之间边界不清晰。
- 编辑器、日历、同步、演示模式互相穿插，修改风险变高。
- 长期内容积累后，大 DOM、整篇 HTML 快照和 base64 图片会放大内存压力。

本轮重构的目标不是改变产品形态，而是为后续演进建立工程边界。

## 2. 产品理念

Gravilog 的核心理念保持不变：

> 用户最终只需要管理一个可携带的日志文件。

也就是说，重构不应该把数据强行拆成多个用户可见文件、数据库服务或后端 API。

但“一个文件”不等于“一个巨大 HTML 字符串”。更准确的长期目标是：

> 对用户是一个 JSON 文件；对代码是结构化文档模型。

## 3. 本次重构范围

当前已经完成第一阶段和第二阶段重构，重点是降低单文件代码压力，不改变运行方式和数据格式。

已完成：

- `index.html` 保留页面骨架、CDN 引用和静态 DOM。
- CSS 拆到 `src/styles/*`，由 `src/styles/main.css` 汇总。
- JavaScript 拆到 `src/core`、`src/editor`、`src/presenter`、`src/ui`、`src/storage`、`src/calendar`。
- 静态 HTML 的内联事件已经迁移到 `src/ui/events.js` 中的 `data-action` 事件委托。
- 动态日历 HTML 的内联事件已经迁移到 `src/calendar/calendar.js` 中的 `data-cal-action` 事件委托。
- 新增 `package.json`，提供可选本地服务命令。
- 修正 `start-gravilog.bat` 中重复检测 `python` 的问题，增加 `py -3` 兜底。
- 新增本文档，固定后续重构路线。

刻意未做：

- 没有引入 React、Vue 或其他前端框架。
- 没有引入构建步骤。
- 没有改变 `localStorage` key。
- 没有改变导出 JSON 格式。
- 没有改写富文本编辑器核心行为。
- 没有把 `<script>` 改成 ESM 模块，因为现有 HTML 中仍有大量内联事件依赖全局函数。
- 没有把 v1 数据升级为 v2 结构化单文件。

## 4. 当前结构

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
      schema.js
      local-store.js
      indexed-db.js
      file-store.js
      conflict.js
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
    REFACTOR_DESIGN.md
  README.md
  package.json
  start-gravilog.bat
```

### 4.1 `index.html`

负责：

- 基础 HTML。
- CDN 资源。
- SVG symbol 图标。
- 应用静态 DOM。
- 加载 `src/styles/main.css`。
- 加载 `src/app.js`。

暂时仍包含：

- 内联 `onclick` / `onchange` / `onkeydown`。
- 静态弹窗、工具栏、日历容器、编辑器容器。
- 多个 classic script 标签，按依赖顺序加载。
- 静态 DOM 主要通过 `data-action`、`data-change-action`、`data-enter-action` 声明行为。

后续目标：

- 逐步把内联事件迁移到 JS 事件绑定。
- 将复杂静态 UI 拆成模板函数或组件化渲染函数。

### 4.2 `src/styles/main.css`

负责全部应用样式。

当前已经按领域拆分。`main.css` 只负责 `@import` 汇总。

### 4.3 JavaScript 分层

当前仍保留 classic script 方式，但已经按领域拆分：

- `src/core/date-bootstrap.js`：为早期状态初始化提供 `getMon`。
- `src/core/state-shell.js`：全局 key、状态、主题、日历面板、编辑器基础、撤销基础。
- `src/editor/editor-richtext.js`：代码块、保存调度、写作统计、Markdown、图片、表格、基础编辑命令。
- `src/presenter/presenter.js`：演示模式、激光笔、自由书写、放大镜。
- `src/ui/controls.js`：颜色选择器、表格弹窗、图片入口、公式输入。
- `src/ui/events.js`：静态 DOM 的声明式事件委托。
- `src/storage/schema.js`：v1 snapshot 归一化、v2 legacy-html 读取迁移入口。
- `src/storage/local-store.js`：localStorage 读写与 pending-sync 标记。
- `src/storage/indexed-db.js`：文件句柄 IndexedDB 持久化。
- `src/storage/file-store.js`：链接 JSON 文件读写。
- `src/storage/conflict.js`：本地与远端 snapshot 冲突判断。
- `src/storage/storage-sync.js`：挂载流程、冲突合并 UI 协调、导入导出。
- `src/calendar/calendar.js`：日期工具、日历渲染、todo 编辑和拖拽。
- `src/core/boot.js`：最后启动需要完整依赖的初始化。

后续目标是先移除内联事件，再把这些 classic script 迁移为真正的 ESM 模块。

## 5. 推荐目标结构

```text
src/
  main.js
  editor/
    editor.js
    selection.js
    commands.js
    markdown.js
    latex.js
    codeBlock.js
    image.js
    table.js
    undo.js
  calendar/
    calendar.js
    calendarRender.js
    todo.js
    dateUtils.js
    lunar.js
  presenter/
    presenter.js
    drawing.js
    lens.js
  storage/
    schema.js
    localStore.js
    indexedDb.js
    fileStore.js
    sync.js
    conflict.js
    migration.js
  ui/
    toolbar.js
    dialogs.js
    colorPicker.js
    status.js
  utils/
    dom.js
    html.js
    debounce.js
    sanitize.js
```

## 6. 模块边界设计

### 6.1 Editor

编辑器模块负责正文编辑体验。

边界：

- 只关心编辑区 DOM。
- 不直接写文件。
- 不直接处理 File System Access API。
- 内容变化通过回调或事件通知存储层。

建议 API：

```js
createEditor({
  root,
  onChange,
  onImmediateSaveRequest,
});
```

拆分重点：

- `selection.js`：选区保存、恢复、判断选区是否在编辑器中。
- `commands.js`：加粗、斜体、颜色、插入 HTML。
- `markdown.js`：Markdown 快捷输入转换。
- `codeBlock.js`：代码块结构、语言选择、高亮和缩进。
- `latex.js`：公式输入、公式渲染、公式编辑。
- `image.js`：图片读取、压缩、插入、对齐、缩放。
- `table.js`：表格增删行列。
- `undo.js`：撤销重做。

### 6.2 Calendar

日历模块负责日期视图、写作统计显示和日程记录。

边界：

- 不直接读取编辑器 DOM。
- 从状态对象接收统计和日程数据。
- 日程变化通过回调通知存储层。

建议拆分：

- `dateUtils.js`：日期格式化、周起始日、ISO 周数。
- `lunar.js`：农历和节日计算。
- `calendarRender.js`：年 / 月 / 周 / 日视图渲染。
- `todo.js`：日程归一化、拖拽、编辑、删除。
- `calendar.js`：视图状态和事件协调。

### 6.3 Storage

存储模块负责本地缓存、文件同步、冲突判断和数据迁移。

边界：

- 不直接操作编辑器 UI。
- 不直接渲染日历。
- 对外提供 snapshot 读写接口。

建议 API：

```js
loadLocalSnapshot();
saveLocalSnapshot(snapshot);
linkFile();
writeLinkedFile(snapshot);
resolveConflict(choice);
```

拆分重点：

- `schema.js`：定义当前数据结构和默认值。
- `migration.js`：旧格式升级到新格式。
- `localStore.js`：`localStorage` 读写。
- `indexedDb.js`：文件句柄和较大缓存。
- `fileStore.js`：File System Access API。
- `sync.js`：本地 / 文件版本比较和写入调度。
- `conflict.js`：冲突判断和合并辅助。

### 6.4 Presenter

演示模式模块负责把选区内容复制到展示层，并处理激光笔、书写和放大镜。

边界：

- 接收选区 fragment 或 HTML。
- 不修改编辑器正文。
- 退出时清理临时画布和状态。

建议拆分：

- `presenter.js`：进入、退出、全屏、菜单状态。
- `drawing.js`：自由书写轨迹。
- `lens.js`：局部放大镜。

### 6.5 UI

UI 模块负责工具栏、弹窗、颜色选择器和状态显示。

边界：

- 不保存业务数据。
- 只接收状态并渲染。
- 用户操作通过回调交给领域模块。

## 7. 数据结构演进

### 7.1 当前 v1 格式

```json
{
  "doc": "<html>editor content</html>",
  "dates": [],
  "stats": {},
  "todos": {},
  "savedAt": "2026-05-17T00:00:00.000Z"
}
```

问题：

- 正文是一整段 HTML。
- 图片以 data URL 混在正文 HTML 中。
- 撤销栈保存整篇 HTML 快照。
- 局部修改也需要保存整篇文档。
- 公式、代码高亮和链接识别容易退化为全量扫描。

### 7.2 目标 v2 格式

```json
{
  "version": 2,
  "blocks": [
    {
      "id": "blk_001",
      "type": "paragraph",
      "html": "今天写了点东西。",
      "createdAt": "2026-05-17T10:00:00.000Z",
      "updatedAt": "2026-05-17T10:00:00.000Z"
    },
    {
      "id": "blk_002",
      "type": "image",
      "assetId": "asset_001",
      "align": "center",
      "width": "75%"
    },
    {
      "id": "blk_003",
      "type": "code",
      "lang": "javascript",
      "text": "console.log('hello')"
    }
  ],
  "assets": {
    "asset_001": {
      "mime": "image/jpeg",
      "data": "data:image/jpeg;base64,...",
      "createdAt": "2026-05-17T10:00:00.000Z"
    }
  },
  "calendar": {
    "todos": {}
  },
  "stats": {
    "dailyChars": {},
    "editDates": []
  },
  "meta": {
    "savedAt": "2026-05-17T10:00:00.000Z"
  }
}
```

优势：

- 仍然是一个 JSON 文件。
- 正文可以按块处理。
- 图片资源从正文 HTML 中剥离。
- 撤销可以按块记录。
- 后续可以只渲染可见块。
- 日历、统计和正文边界更清晰。

### 7.3 迁移策略

不要一次性把所有历史 HTML 拆成完美块结构。

推荐分三步：

1. v1 转 v2 时先生成一个 `legacy-html` block。
2. 新增内容逐步使用结构化 block。
3. 在保存或空闲时间把 legacy block 分段迁移。

示例：

```json
{
  "version": 2,
  "blocks": [
    {
      "id": "legacy_001",
      "type": "legacy-html",
      "html": "<原始 doc HTML>"
    }
  ],
  "assets": {},
  "calendar": {},
  "stats": {},
  "meta": {}
}
```

这样可以最大限度降低破坏已有数据的风险。

## 8. 性能设计

### 8.1 当前风险

当前实现中，长期内容积累会带来几个性能压力：

- 所有正文都在一个 `contenteditable` DOM 中。
- 撤销栈保存整篇 `innerHTML`。
- 图片 base64 会被正文、快照、导出 JSON 反复引用。
- 保存时生成整份 snapshot。
- 公式和代码处理容易全量扫描。

### 8.2 优化方向

短期：

- 降低整篇快照频率。
- 限制撤销栈总字节数。
- 对公式和代码块优先做局部处理。
- 图片继续压缩，并提示过大图片风险。

中期：

- 引入 block id。
- 每个 block 独立更新。
- 撤销栈记录 block 级 before / after。
- 图片进入 `assets`，正文只保留引用。

长期：

- 对非常长的日志启用可见区域渲染。
- 编辑器只挂载屏幕附近的块。
- 搜索和导出从结构化数据生成。

## 9. 撤销重做设计

### 9.1 当前方式

```js
undoStack.push(doc.innerHTML);
```

优点：

- 简单。
- 容易恢复。

缺点：

- 大文档内存占用高。
- 图片会被重复保存。
- 每次输入都可能复制整篇文档。

### 9.2 目标方式

```js
{
  "type": "update-block",
  "blockId": "blk_001",
  "before": "<p>旧内容</p>",
  "after": "<p>新内容</p>"
}
```

图片、表格、代码块可以有更明确的操作类型：

```js
{ "type": "insert-block", "blockId": "blk_002" }
{ "type": "delete-block", "blockId": "blk_003", "snapshot": {} }
{ "type": "update-asset-meta", "assetId": "asset_001", "before": {}, "after": {} }
```

## 10. 文件同步设计

### 10.1 设计约束

- 用户仍然选择一个 JSON 文件。
- 不引入后端。
- 不拆成多个用户可见资源文件。
- 本地缓存和云盘文件可能同时变化。

### 10.2 Snapshot 字段

建议所有格式都保留：

```json
{
  "meta": {
    "savedAt": "...",
    "clientId": "...",
    "schemaVersion": 2
  }
}
```

后续可以加入：

- `revision`
- `baseRevision`
- `lastSyncedAt`
- `lastSyncedHash`

### 10.3 冲突判断

当前已经有本地与远端版本比较逻辑。重构后应把冲突判断从 UI 中移到 `storage/conflict.js`。

建议返回明确结果：

```js
{
  "type": "use-local" | "use-remote" | "conflict" | "same",
  "reason": "..."
}
```

UI 只负责展示选择。

## 11. 事件绑定迁移

当前静态 HTML 已改为声明式事件：

```html
<button data-action="undo">...</button>
```

动态日历 HTML 也使用同样思路：

```html
<span data-cal-action="select-date" data-date="2026-05-17">17</span>
```

集中绑定：

```js
toolbar.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  actions[action]?.();
});
```

好处：

- HTML 不依赖全局函数。
- 方便改成 ESM。
- 方便测试。
- 方便替换 UI 结构。

## 12. 工具链建议

当前不强制引入构建工具。

当模块拆分进入第二阶段后，建议引入：

- Vite：开发服务器和模块打包。
- Vitest：纯逻辑单元测试。
- Playwright：关键浏览器流程测试。

推荐脚本：

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

引入时机：

- 已经移除大部分内联事件。
- `src/app.js` 已拆成领域模块。
- 需要自动化测试或打包发布。

## 13. 测试策略

优先测试纯逻辑：

- 日期格式化。
- ISO 周数。
- 农历和节日显示。
- todo 归一化。
- schema migration。
- 本地 / 远端冲突判断。
- block 级撤销。
- HTML 清洗和转义。

浏览器流程测试：

- 打开应用。
- 输入文本并刷新恢复。
- 插入代码块。
- 插入公式。
- 插入图片。
- 创建日程。
- 导出 JSON。
- 导入 JSON。
- 模拟链接文件冲突。

当前质量工具：

- Vitest：运行 `tests/**/*.test.js` 单元测试。
- Playwright：运行 `tests/e2e/**/*.js` 浏览器流程测试。
- `scripts/check-js-syntax.cjs`：对 JS 文件执行语法检查。
- Prettier：格式化文档、配置和测试辅助脚本。

## 14. 分阶段路线图

### 阶段 1：外层拆分

状态：已完成。

- 拆 CSS。
- 拆 JS。
- 保持原始运行方式。
- 保持原始数据格式。
- 补文档。

### 阶段 2：领域模块化

状态：已完成第一轮拆分。

已完成：

- 拆出 `core`、`editor`、`presenter`、`ui`、`storage`、`calendar`。
- 拆出领域样式文件。
- 保留 classic script 和全局函数，确保内联事件继续工作。
- 不改变用户数据格式。

后续可继续细化：

1. 拆日期和农历工具。
2. 拆 todo 逻辑。
3. 拆 storage 读写。
4. 拆 presenter。
5. 拆 editor 子模块。

### 阶段 3：事件系统整理

状态：已完成。

已完成：

- `index.html` 中固定按钮和输入控件改为 `data-action` / `data-change-action` / `data-enter-action`。
- 新增 `src/ui/events.js` 统一分发静态 UI 行为。
- 颜色选择器生成的色点从 `onclick` 属性赋值改为 `addEventListener`。
- 日历视图和 todo 视图中由字符串动态生成的事件改为 `data-cal-action`。
- `src/calendar/calendar.js` 统一处理日期选择、周选择、年视图月份选择、todo 创建、删除和拖拽入口。

目标：

- 减少 `onclick`。
- 建立 action map。
- 为 ESM 迁移做准备。

### 阶段 4：schema 与 migration

状态：已完成第一轮读写边界抽象。

已完成：

- 定义 `normalizeSnapshot`。
- 定义 `migrateSnapshot`，可读取 v1 和 v2 `legacy-html` block。
- 定义 `snapshotToV2`，为后续结构化写入预留迁移出口。
- 将 localStorage 读写拆到 `local-store.js`。
- 将 IndexedDB 文件句柄读写拆到 `indexed-db.js`。
- 将文件读写拆到 `file-store.js`。
- 将本地 / 远端冲突判断拆到 `conflict.js`。
- 增加旧格式兼容测试。

目标：

- 定义 `schemaVersion`。
- 引入 `normalizeSnapshot`。
- 引入 `migrateSnapshot`。
- v1 格式继续可读。

### 阶段 5：结构化单文件

状态：已完成第一轮 v2 容器写入。

已完成：

- 导出 JSON 写出 `version: 2`。
- 链接文件写入 `version: 2`。
- 新增 `blocks`，正文暂存为一个 `legacy-html` block。
- 新增 `assets` 空容器。
- 新增 `calendar.todos`。
- 新增 `stats.dailyChars` 和 `stats.editDates`。
- 新增 `meta.schemaVersion` 和 `meta.savedAt`。
- v1 文件仍可读取，并会通过 `migrateSnapshot` 进入当前运行时 snapshot。
- v2 文件仍可读取，并会把 `legacy-html` block 还原为当前编辑器正文 HTML。

目标：

- 引入 `blocks`。
- 引入 `assets`。
- 图片从正文 HTML 中剥离。
- 撤销栈改为 block 级。

### 阶段 6：性能增强

状态：已完成第一轮数据层和渲染入口优化。

已完成：

- v2 写出时按顶层 DOM 生成 block。
- `pre` 写出为 `code` block。
- 顶层 `img` 写出为 `image` block。
- 含图片的 HTML/table block 会把图片 data URL 抽到 `assets`，正文只保留 `data-asset-id`。
- v2 读取时会把 `assets` 回填成当前编辑器可显示的图片 `src`。
- `renderAllContent` 改为按顶层 block 逐块处理。
- 输入时增加当前活动 block 的轻量重渲染入口。
- 撤销栈改为 block snapshot 结构。

目标：

- 局部渲染公式和代码。
- 控制撤销内存。
- 可选虚拟渲染。
- 大文件加载进度提示。

## 15. 风险与回退

主要风险：

- 富文本编辑器行为细节复杂，改动容易影响光标和输入体验。
- 旧数据中可能存在任意 HTML，需要谨慎清洗和迁移。
- File System Access API 的权限状态在不同浏览器版本中表现不同。
- 图片 base64 数据较大，迁移时不能重复复制太多次。

回退策略：

- 每个阶段都保持可运行。
- 每次 schema 升级前保留原始 snapshot 备份。
- v2 读取层必须兼容 v1。
- 先引入 migration 读逻辑，再改变写逻辑。

备份和恢复策略详见 `docs/BACKUP_AND_RECOVERY.md`。

## 16. 判断标准

一次重构完成后，至少应满足：

- 旧数据可以加载。
- 新内容可以保存。
- 刷新后内容不丢。
- 导出和导入仍可用。
- 日历视图可切换。
- 代码块和公式可渲染。
- 图片可插入和预览。
- 演示模式可进入和退出。

本次阶段 1 的判断标准是：

- `index.html` 能加载外部 CSS 和 JS。
- 应用全局函数仍能被内联事件调用。
- 本地 HTTP 服务可启动。
- 文件结构比原始单文件更清晰。

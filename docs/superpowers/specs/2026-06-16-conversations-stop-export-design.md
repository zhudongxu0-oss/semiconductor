# 设计文档：会话管理 / 停止·重新生成 / 复制·导出（Round 1）

- **日期：** 2026-06-16
- **状态：** 已通过设计评审，待实现
- **适用范围：** 「芯问」半导体知识问答助手（Vue 3 + Vite 前端，Express / Vercel 后端）
- **作者：** brainstorming 协作产出

## 背景

「芯问」当前是一个单会话的流式问答界面：欢迎页 → 提问 → SSE 流式回答。无会话持久化、无停止/重生、无复制导出。本设计新增三个面向用户的功能（Round 1）。第四个功能「上传文档维护知识库」属架构级，单独成 spec（Round 2），但其产品模型已敲定（见「前向兼容」），本设计据此预留数据接口。

## 范围

**本轮包含：**
1. 对话历史 / 会话管理（多会话、localStorage 持久化、抽屉式列表、新建/切换/重命名/删除、自动标题）
2. 停止生成 / 重新生成
3. 回答复制 / 导出 Markdown

**本轮不包含：**
- 用户系统 / 登录鉴权（随功能 4 引入）
- 后端持久化 / 跨设备同步
- 上传与知识库扩充（功能 4，单独 spec）
- 对现有欢迎页 / 消息气泡 / 配色的整体重塑（本轮仅新增组件并贴合现有风格）

## 关键决策记录

| 议题 | 决策 | 理由 |
|---|---|---|
| 推进节奏 | 拆两轮：本轮 1+2+3，功能 4 单独 | 功能 4 涉架构决策，性质不同 |
| 会话存储 | 纯 localStorage（本轮），数据模型预留 `ownerId` | 为对话历史上用户系统是过度设计；预留字段平滑迁移 |
| 知识库模型（功能 4） | 模型 C：共享官方库 + 个人私有库 | 决定功能 4 必须用户系统；据此设计前向兼容 |
| 会话列表 UI | 可折叠左侧抽屉（☰，overlay） | 不破坏现有居中英雄式布局，移动端友好 |
| 会话标题 | 首条提问截取 ~15 字 + 可手动改名 | 零额外 API 调用，即时可见，保留灵活性 |
| 保留策略 | 全部保留，手动删除 | 符合 YAGNI；localStorage 5MB 对问答场景够用 |
| 停止生成 | 保留已生成部分 + 标记「已中断」 | 不浪费已生成内容，可基于它追问或重生 |
| 复制/导出 | 每回答「复制」+ 整会话「导出 .md」 | 两者互补，成本低 |
| 代码结构 | 抽出 `src/sessionStore.js` 模块 | App.vue 已 1678 行；store 作唯一存储边界，便于后端替换与功能 4 接入 |
| 视觉范围 | 仅新组件，贴合现有「仪器面板」风格 | 用户暂不整体优化；新组件需与现有设计语言一致 |

## 1. 架构与模块布局

- **新增 `src/sessionStore.js`**（纯 JS 模块，匹配现有 Options API 风格，不引入 Composition 范式）。它是会话状态的**唯一拥有者**：localStorage CRUD + 当前活跃会话 + 切换。导出：
  - `loadAll()` / `saveAll()`
  - `createSession()` / `deleteSession(id)` / `renameSession(id, title)`
  - `switchTo(id)` / `getActive()` / `getAll()`
  - `appendMessage(sessionId, msg)` / `updateMessage(sessionId, msgId, patch)`
  - `setActiveId(id)`
- **`App.vue`** 不再直接持有 `messages: []`，改为从 `sessionStore.getActive()` 派生当前会话消息用于渲染。所有持久化逻辑收敛进 store。
- 组件实例挂 `this.currentAbort`（`AbortController`）用于停止生成。
- store 作为「以后换后端只改一个文件」的边界，也是功能 4 用户系统的接入点。

> 设计目标：`App.vue` 净增行数最小（主要加 UI：抽屉、动作按钮），核心逻辑在 store，文件不失控膨胀。

## 2. 数据模型

```
Session = {
  id: string,            // 唯一 id
  title: string,         // 首问截取 ~15 字，可改
  ownerId: null,         // 本轮恒 null；功能 4 引入用户后填 userId
  createdAt: number,     // 时间戳（epoch ms，由调用方传入，store 不自生时间——见说明）
  updatedAt: number,
  messages: Message[]
}

Message = {
  id: number,
  role: 'user' | 'assistant',
  content: string,
  thinking?: string,        // 深度思考过程原文
  sources?: Source[],
  streaming?: boolean,
  isDeepThink?: boolean,
  showThinking?: boolean,
  stopped?: boolean         // 新增：是否被用户中断
}

存储键: "xinwen.sessions.v1" → { sessions: Session[], activeId: string | null }
```

**时间戳说明：** 现有 `sendMessage`/`++msgId` 等机制不含 `Date.now()`。`createdAt`/`updatedAt` 由调用方（App.vue 在用户操作时）传入；store 内部不调用 `new Date()`，保持模块纯净与可测。

## 3. 功能 1 · 会话管理（抽屉）

- Header 加 **☰ 按钮**，切换左侧抽屉（overlay，点遮罩或再点 ☰ 关闭）。主居中布局完全不动。
- 抽屉内：
  - 顶部「+ 新对话」按钮。
  - 下方会话列表：每项显示标题 + 相对时间。
  - 每项支持**重命名**（双击标题或点 ✏ → 内联输入）与**删除**（hover 出现 🗑，带二次确认）。
- **新建对话：** 切到一个空会话 → 显示欢迎页；首条提问发出时才真正落库（避免空会话堆积）。
- **自动标题：** 首条用户消息发出后，`title = question.slice(0, 15)`；可手动改。
- **切换：** 点列表项 → `switchTo(id)` → 渲染该会话消息 → 滚到底部。
- **删除活跃会话：** 自动切到最近一个会话；若无会话则回到欢迎页。
- **「返回首页」按钮语义更新：** 从「清空消息」改为「开始新对话」（等价 +新建）。按钮位置与外观不变。

## 4. 功能 2 · 停止生成 / 重新生成

- **停止：** 流式过程中，发送按钮**就地变形**为停止按钮（视觉见 §视觉设计）。点击 → `currentAbort.abort()`。`reader.read()` 抛 `AbortError`，catch 后标记 `msg.stopped=true, streaming=false`，**保留已生成部分**，气泡底部显示「⏹ 已中断」。`loading` 复位，清空 `currentAbort`。
- **重新生成：** 在最后一条 assistant 消息上提供「重新生成」动作（视觉见 §视觉）。逻辑 = 移除该 assistant 消息 → 取其上一条 user 消息作为 question → 重跑 `sendMessage` 流程（建新占位、新流、可再次停止）。深度思考标志沿用原会话的当前 `deepThink` 设置。
- `fetch('/api/chat', { signal: currentAbort.signal, ... })` 透传 signal。

## 5. 功能 3 · 复制 / 导出

- **复制：** 每条 assistant 气泡底部「复制」动作 → `navigator.clipboard.writeText(msg.content)`（`msg.content` 即 markdown 原文，复制干净）。失败回退：临时 textarea + `document.execCommand('copy')`。成功后短暂显示「✓ 已复制」微反馈（~1.2s 淡出）。
- **导出（会话级，单一位置）：** 抽屉头部的「导出当前会话」按钮（导出**当前活跃会话**）。需要导出历史会话时，先切换到它再导出。拼成 markdown：
  ```
  # {会话标题}
  
  ## 提问
  {user content}
  
  ### 回答
  {assistant content}
  ```
  （思考过程默认不含；深度思考会话可在导出时折叠包含，作为可选增强。）→ `Blob([md], {type:'text/markdown'})` + `<a download="{title}.md">` 触发下载。

## 6. 视觉设计（仅新组件，贴合现有风格）

**统一隐喻 ——「晶圆槽 / 仪器面板」：** 所有新表面沿用应用既有的 fab 仪器语言（磨砂深色玻璃、`--accent` 青色、等宽标签、电路纹理），使抽屉与按钮读作同一台机器的部件，而非外挂的通用聊天控件。

**会话抽屉（☰）**
- 左侧滑出磨砂玻璃面板（`backdrop-filter: blur`，背景同 header 的 `rgba(3,7,16,.7)`），宽 ~280px，overlay + 暗化遮罩。
- 抽屉头：`会话记录`（Orbitron 小型大写）+ 一条细电路纹理分隔线（青色，低透明）。
- 每个会话行 = 一个「槽」：前导小节点 `●`（活跃青色 / 否则暗色）+ 标题（Noto Sans SC）+ 相对时间（JetBrains Mono 大写，如 `2H AGO` / `YESTERDAY`）。活跃行有**左侧青色强调条 + 柔和青色辉光**，如被选中的晶圆槽。hover：行右移 2px + `accent-dim` 填充。
- 「+ 新对话」：通栏药丸按钮，青色描边，`+` 字符空闲时轻微脉冲。
- 重命名：标题就地切换为等宽输入框 + 青色光标。删除：hover 出现 🗑，带确认微状态。
- 背景：极低透明度的纵向扫描线 / 网格纹理，营造仪器氛围。

**发送 → 停止 就地变形**
- 发送箭头（青色）在流式时**就地变形**为 `■` 停止字符，强调色由青转琥珀/红并加缓慢脉冲环——表达「中断」无需额外按钮。点击停止后变回发送。

**安静的动作微工具栏（每条 assistant 回答）**
- 气泡底部一行等宽微操作：`复制` · `重新生成`（导出是会话级，放在抽屉，见 §5）。默认低透明（`--text-muted`），hover 时整行提亮至 `--accent`。
- **复制** → 瞬时 `✓ 已复制` 等宽微反馈，~1.2s 淡出。
- **重新生成** → 圆形箭头字符，hover 时旋转 180°。
- 刻意保持安静（非大块彩色按钮），让回答保持焦点；工具栏仅在交互时「唤醒」。

**停止标记**
- 中断的回答以等宽 `⏹ 已中断` 胶囊收尾，琥珀色低饱和——与来源标签同款药丸，读作元数据而非错误。

## 7. 数据流（带持久化的发送）

1. `sendMessage(question)`：
   - 建 user 消息 → `appendMessage(activeId, userMsg)`。
   - 建 assistant 占位（`streaming:true`）→ `appendMessage`。
   - 首条提问时设置 `title`，并真正落库（此前新建会话不落库）。
2. 流式循环：每个 `chunk`/`thinking` → `updateMessage(activeId, assistantId, patch)` 更新内存 + **防抖保存**（~500ms，避免每个 token 写 localStorage）。
3. `done` → 写入 `sources` → 最终 `saveAll()`。会话 `updatedAt` 刷新（决定抽屉排序，最近在上）。
4. 切换/删除/重命名 → 立即 `saveAll()`。

## 8. 错误处理

- **localStorage 配额超限（`QuotaExceededError`）：** catch → 提示「本地存储已满，建议删除旧会话」，数据保留在内存，应用不崩溃；保存降级为「仅内存」。
- **AbortError：** 静默处理（预期行为），走停止流程。
- **剪贴板 API 失败（非 HTTPS / 无权限）：** 回退 textarea + `execCommand`。
- **导出 Blob 失败：** 捕获并提示。
- 流式 `data:` 行解析沿用现有实现，不受影响。

## 9. 验收标准（项目无测试框架，手动验证）

- 刷新页面后会话与消息仍在；新建 / 切换 / 重命名 / 删除均生效且即时持久化。
- 流式中点停止 → 保留部分 + 「已中断」标记；`loading` 复位；可重新生成；重新生成中途也可停止。
- 复制粘出干净 markdown 原文；导出得到合法 `.md`（含标题与问答分节）。
- localStorage 写入有防抖，DevTools 观察 Network/Application 无异常抖动。
- 现有欢迎页、深度思考、知识库来源标签、Markdown 渲染等功能不回归。
- 新组件视觉与现有仪器面板风格一致（磨砂玻璃、青色强调、等宽标签）。

## 10. 前向兼容（向功能 4）

- `ownerId` 字段预留：本轮恒 `null`。
- `sessionStore` 是唯一存储边界。功能 4 引入用户系统后：
  - 登录时给会话填 `ownerId`。
  - 把 store 内部从 localStorage 换成后端 API（`loadAll/saveAll/...` 改为 fetch 调用）。
  - **调用方（App.vue）无需改动**——接口不变。
- 功能 4 的模型 C（共享库 + 私有库）需后端：用户表、文档上传端点、异步解析队列、（待定）向量化与检索。这些在功能 4 spec 中单独设计，不在本轮。

## 待定 / 开放问题

- 无。本轮所有决策已敲定。功能 4 的存储/向量化方案在其单独 spec 中讨论。

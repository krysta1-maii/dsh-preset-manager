# 验证记录

## 0.3.0 — 2026-11-03 扩展 DSH 0.2.2 兼容范围

### 升版与范围

插件版本从 0.2.0 升至 0.3.0，`package.json` 与 `package-lock.json` 的项目版本已同步。`engines.dsh` 从 `>=0.2.1-0 <0.2.2-0` 扩为 `>=0.2.1-0 <0.2.3-0`，覆盖 DSH 0.2.1 与 0.2.2 的预发布版及正式版。实现基线仍为 0.2.1-rc.2；本次新增目标是 0.2.2-alpha.3（tag `dsh-v0.2.2-alpha.3`，commit `05b1cae8db6e674c5685101494d4eec24652424a`）。

### 源码核对

按固定 Git 对象读取 0.2.2-alpha.3，不采用工作树 HEAD。用 semver 7.8.5 以 `includePrerelease: true` 计算：扩范围前 `0.2.2-alpha.3` 不满足旧范围，扩范围后满足新范围。DSH 的判定先读插件自己的 `engines.dsh`，因此范围更新是准入的必要条件。

逐项核对结果：

- 槽位注册 API 与 0.2.1-rc.2 相比未改；`entries`、`inject`、`register`、`subscribe` 语义一致。
- `conversation.hero.agentPreset` 槽位声明未变；`AgentPresetSeat.tsx` 和 `ConversationContent.tsx` 未变；原生 Menu 的 `items`、`selectedId`、`onSelect`、`anchor` 结构仍能被适配层识别。
- 配置表单 API 未变；`getSnapshot`、`subscribe`、`mutate(ops, revision)`、`status`、`writable`、`revision` 仍可用。
- Host `settings.configure` 在 0.2.2-alpha.3 改为用 `owner.ctx.fiber` 取 fiber；Cordis 的 Fiber 构造保证 `fiber.ctx.fiber === fiber`，项目传入的 `ctx.fiber` 仍指向同一个实例，因此 Host 不需要改。
- 目标 vendor 的 schemastery 源码与本项目安装的 3.18.5 源码逐字节相同，只有版本字符串不同；volatile schema 的序列化和校验格式不变。
- 客户端 manifest 仍接受字符串形式的 `./client` 导出；`platform`、`immediately` 和三个 `inject` 包名有效；ModuleLoader 的 `load({ id, factory })` 格式未变，React 仍在基线模块表。
- locale 注册的三参数单语言重载仍保留；插件只提供 zh/en，其他语言按回退链显示英文，不是加载错误。
- `plugins.bundle.config` 仍是按 bundle 包名 keyed 的槽位；`remote.agentPresets.list` 的 roster 结构未变。
- 设置导航仍按 `slots.entries` 全量投影，重复入口问题未修；插件继续暂停设置页适配，`settingsOrder` 和 `hiddenSettings` 仍不生效。

### 代码调整

- “预设页面适配已停用”的中英文说明改为版本中性表述，去掉对 0.2.1-rc.2 的硬编码；`client.js` 已由 `npm run build` 重新生成。
- 管理面板在 `agentPresets.list()` 返回 `gateway/invocation-unavailable` 时按空 roster 处理；其他错误仍显示在列表内并允许重试。
- 适配逻辑、Host `apply`、策略函数和 bundle patch 未改。

### 本地检查

- `npm run check`：构建、Host/Client 语法检查通过，**31/31 测试通过**。新增测试覆盖 `gateway/invocation-unavailable` 空 roster 和兼容范围一致性。
- `node --check index.js` 与 `node --check client.js` 通过。
- `git diff --check` 通过。
- 工作区之外没有同步或安装。本次没有在 0.2.2-alpha.3 上安装，也没有刷新 GUI、做浏览器交互或真实模型请求。

### 未完成与限制

- 0.2.2-alpha.3 只做了固定提交的源码核对，没有目标版本运行结果。
- 原生元素结构仍是精确版本适配，不是跨版本稳定 API；0.2.2 其他版本没有逐一验证。
- 本地安装目录保持原样，没有执行 rsync、安装、重装或重启 DSH；当前 GUI 仍运行已安装的旧版本。

## 0.2.0 — 2026-11-02 移除模型工具

### 升版

插件版本从 0.1.2 升至 0.2.0，`package.json` 与 `package-lock.json` 的项目版本已同步。本次移除模型工具和宿主服务，属于不兼容变更；配置格式不变。

### 范围

按用户要求移除 `preset_manager` 模型工具、写入审批流程、宿主侧 `presetManager` 服务及其测试。Host 的 `inject` 从 `['settings', 'agentPresets', 'tools', 'approval']` 改为 `['settings']`；Web 面板、槽位适配和五字段配置格式不变。当前仓库的 Host 半只保留 volatile Config 和 `settings.configure({ auto: false })`。

### 本地检查

- `npm run check`：构建、Host/Client 语法检查通过，**29/29 测试通过**。测试数从 39 减少到 29，减少的是工具、审批、revision 写入和宿主服务相关用例；剩余用例覆盖 Config 默认值、volatile schema、Settings 配置和客户端适配。
- `git diff --check` 通过。
- `npm pack --dry-run` 使用工作区内 npm cache：版本 0.2.0，22 个文件，`index.js` 887 B，分发包不再包含工具实现。
- `node --check index.js` 与 `node --check client.js` 通过。

### 安装

2026-11-02 已用 rsync 将本仓库的 0.2.0 文件同步到 `/home/andyk/.dsh-local-plugins/dsh-preset-manager`，保留该目录的 `node_modules`，没有复制 `.git` 和 `.cache`。安装副本的 `package.json` 为 0.2.0，`index.js` 的 `inject` 为 `['settings']`，不再包含 `preset_manager`；同步的变更文件与仓库一致。按用户要求没有重新加载、重装或重启 DSH。

### 未完成

当前运行进程仍使用重载前加载的旧版 Host 代码，所以现有 GUI 里的 `preset_manager` 会在下次重载/重启后消失；本次没有验证这一运行时变化。当前 profile 的浏览器面板行为未在真实 GUI 中重新验收。历史记录中出现的 `preset_manager` 描述的是移除前的版本。

## 0.1.2 — 2026-10-26

### 升版与安装

插件版本从 0.1.1 升至 0.1.2。`package.json` 与 `package-lock.json` 的项目版本已同步。配置格式未改。安装目录保持 `/home/andyk/.dsh-local-plugins/dsh-preset-manager`；profile `web` 的依赖仍是 `link:/home/andyk/.dsh-local-plugins/dsh-preset-manager`，`node_modules/dsh-preset-manager` 仍指向该目录。没有把链接改到本仓库路径。

有 HMR 时，对已安装包直接 `install_bundle` 会在 pnpm 之前返回 `already-installed`。本次先把 0.1.2 文件同步到既有目录（保留该目录的 `node_modules`，不复制 `.git` 和 `.cache`），再 `remove_bundle` 后以同一绝对路径 `install_bundle`。运行中的 DSH 是 0.2.1-rc.3。

- `npm run check`：构建、Host/Client 语法检查通过，**39/39 测试通过**。
- remove：`application: applied`，`warnings: []`，pnpm 退出码 0。
- install：`application: applied`，`warnings: []`，`version: 0.1.2`，`bundle: dsh-preset-manager`，pnpm 退出码 0。pnpm 输出有既有 profile 的 peer dependency 提示，未为此升级其他插件。
- Host Config `include:dsh-preset-manager` 状态为 schema，`packageDir` 解析到 profile 中的上述链接。
- `preset_manager` get 返回 8 项 roster。五个策略数组与升级前一致：`newSessionOrder` 为 ptc-instant、standard、ptc、cordis-ptc、minimal、cordis、chat-assistant、standard-instant；`hiddenNewSession` 为 standard、cordis、chat-assistant、ptc；其余三个数组为空。revision 从 2 变为 4，本次没有调用 set。
- Client Inspect：`plugins.bundle.config` 的 key `dsh-preset-manager` 为 active；`conversation.hero.agentPreset` 上 priority -10 的包装注册为 active，priority 0 的原生注册为 inactive。
- 安装目录的 locale 仍导出中文标题“预设管理”和英文标题“Preset Manager”。没有浏览器控制，未验证渲染后的标题、图标和面板视觉。槽位仍在不证明浏览器已执行新的 `client.js`；请刷新现有 GUI 后再看面板。

重装后该 bundle 排到 profile 选择列表末尾（19 项中的第 19 项）。这是管理器先卸载再安装的既有行为，不是安装目录变化。

## 未发布界面优化 — 2026-10-26

### 范围

只重做管理面板（plugins.bundle.config）的展示层，配置格式、保存路径、revision 检查、模型工具和新对话选择器适配均未改动。样式只使用 DSH 主题 token；依据是本地 deepseek-harness 仓库中 dsh-v0.2.1-rc.2（687f282e）固定对象的 ui-theme 样式、ui-primitives 的 Button / SegmentedControl / Switch / Input / Tag 样式，以及插件详情页容器。计划使用的 alias token 在 rc.2 和 rc.3 的浅色、深色主题中都有定义。客户端仍只从模块表引入 React，没有引入 ui-primitives。

### 本地检查

- npm run check：构建、Host/Client 语法检查通过，**39/39 测试通过**。显示开关的语义改为“开启表示显示”，原有保存/重置测试改为关闭第一项的开关，并断言 role=switch 与选中状态。新增测试覆盖列表读取完成前不显示“未安装 ID”提示；按照修复前的判断条件，这个测试会失败。
- 静态预览：在仓库外的 /tmp 预览页加载本仓库生成的 client.js、React 18.3.1 UMD 和 rc.2 主题 CSS，用桩实现 slots、locale、configForms 和 remote，再用 headless Chrome 截图。检查了浅色和深色主题、中文和英文、约 560px 和 420px 内容宽度、未保存、已保存、保存被拒、列表读取失败、加载中、等待新对话界面接入、全部隐藏和独立顺序等状态。无头截图不会推进 CSS 过渡，因此使用 prefers-reduced-motion 截取最终状态。

### 未完成

本次按要求**没有安装到当前 profile**，也没有修改 DSH 安装目录或 profile。静态预览不是 DSH 实际页面：没有验证真实插件页容器、真实设置读写、刷新后的持久化、键盘焦点在实际页面中的表现，以及 rc.2 / rc.3 实际页面的视觉效果。安装后仍需在 GUI 中验收。

## 未发布修复 — 2026-10-21

### 范围与原因

用户确认仅修改插件，不改动 DSH。本次停止注册 settings.section#agent-presets，保留原生设置页；新对话的隐藏、排序仍使用原生选择器适配。管理面板移除暂停功能的控件，提供中英文说明。旧 settingsOrder、hiddenSettings 保留，保存及恢复新对话显示都不清空这两项。配置格式、插件版本及精确 DSH 兼容范围不变，属于尚未发布的修复提交。

实际运行版本为 DSH 0.2.1-rc.2，既有兼容记录固定 commit 687f282e8625c6b8d11ff58211a90524be2e4317。已安装 ui-settings-general 的导航通过 slots.entries("settings.section") 投影所有注册，同 ID 的覆盖项和原生项因此都会出现在导航中。修改前 live Inspect 证实存在 priority -10 / 0 两条 agent-presets 注册。已有 Slot fixture 只验证覆盖生效，未验证导航对完整注册列表的投影，因此没有发现重复入口。

独立只读审查核对了固定提交的 [SlotCore](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/packages/client/ui-slots/src/index.ts#L1245-L1251) 和 [renderer](https://github.com/deepseek-ai/deepseek-harness/blob/687f282e8625c6b8d11ff58211a90524be2e4317/packages/client/ui-renderer/src/client/scoped-slots.tsx#L577-L578)：第二次声明已有子插槽会报错，不声明 children 则不会取得 renderSlot。因此没有通过再次包装整个设置框架来绕过问题，也没有修改第三方对象或 DOM。

### 本地回归

新增测试直接加载本项目生成的客户端并执行 apply，按 rc.2 导航的全量注册投影复现问题：修改前得到两个 agent-presets，修复后仅保留原生一项。覆盖原生入口重载、卸载清理、中英文暂停说明、新对话控件、保存及重置时保留暂停字段；重置前的新对话独立顺序非空。测试使用 slots fixture 和 React 测试渲染器，是逻辑回归，不代表真实浏览器视觉验收。

npm run check：构建、Host/Client 语法检查及 **38/38 测试通过**。新增测试最初在旧生成产物上 4/4 失败，已修复；中间一次括号语法错误由语法检查发现并纠正。git diff --check 通过。npm pack --dry-run 确认客户端、双语元数据及新增测试均在分发清单内。生成产物由构建脚本生成，没有手工修改。

模型工具说明同步标明预设页适配暂停，set 应保留两个暂不生效字段；未改变 schema、审批或持久化行为。没有重新发起真实模型请求，首轮 prompt token 数未测。

### 当前 profile 与浏览器边界

任务期间重新查询发现当前 profile 已不包含 dsh-preset-manager：list_bundles 无此 bundle，Host Config 按包名查询为零项；Client Inspect 的设置导航只有一条原生 agent-presets。这个状态出现在修复安装之前，不能据此声称新版已经上线。没有自动装回插件，也没有修改当前 profile 或 DSH 安装目录。

当前没有浏览器控制工具，未点击真实 GUI、刷新页面或验证视觉效果；没有启动额外 Web 服务，未发现 Web 构建 watcher。要使用本次修复，需重新安装本仓库，并在现有 GUI 中验收。历史版本的安装记录见下文，不表示本次修复已安装。

## 0.1.1 — 2026-10-21

### 目标与接口证据

当前适配 DSH **0.2.1-rc.2**，Cordis **4.0.5**。既有[兼容记录](<compatibility.json>)固定上游 tag dsh-v0.2.1-rc.2 / commit 687f282e8625c6b8d11ff58211a90524be2e4317；本次以实际安装的该版本声明、产物和 live Cordis Inspect 为运行依据。dsh-dev-docs 默认仍为 rc.1，没有用旧版笔记代替 rc.2 接口核查，也没有扩大兼容范围。

Cordis Inspect 核对了 Host Config 的真实包目录与 schema，Client slots 注册约定、两个原生展示入口、插件管理入口和 connection/reset 事件。原生预设客户端的 inject 同时声明 remote 与 remote.agentPresets；Cordis 分别按精确服务键检查两次访问。漏掉 remote 时，错误发生在发 RPC 之前。

原生新对话组件从完整 options 查当前名称，再生成 Menu items；设置页在两个原生分组中生成带 data-agent-preset-id 的卡片。适配保留完整 store、原 inject、原生函数组件和处理器，只转换已生成的列表元素。该元素结构及原生组件的直接函数调用约定属于精确版本适配，不能视为跨版本公共 API。实现范围见[使用说明](<README.md#实现边界>)。

### 本地检查

- npm run check：构建、Host/Client 语法检查通过，**34/34 测试通过**。
- 真实 Cordis sibling provider fibers 复现缺父服务、缺子命名空间两个错误；成功路径使用生成产物导出的 inject，验证一次列表调用成功。
- React 元素测试覆盖空策略保留原树、当前项名称/图标、菜单描述与处理器、独立显示范围、原生编程工具过滤、分组卡片、说明按钮、创建入口、打开的弹窗和无原地修改。
- 使用真实 React / react-test-renderer 验证 wrapper 的状态生命周期：全部隐藏后恢复不会重开菜单，重排关闭旧菜单，策略更新不重复 mount，卸载清理订阅。测试使用对照 rc.2 结构的组件 fixture，**不代替实际 DSH 浏览器交互**。
- Slot fixture 覆盖原 inject 完整复用、源注册重新加载生成新 wrapper、声明折叠/恢复，以及配置未就绪时恢复原生注册。
- npm pack --dry-run：运行产物、源码、测试、patch、双语元数据和 SVG 均在分发清单内。构建产物由构建脚本生成，没有手工修改。
- 中英标题、描述及原创 SVG 资源已从实际安装路径读取核对；未取得渲染后的图标截图。

### 当前 profile 安装

升级前的旧版位于独立的本地插件目录，五个显示策略数组均为空，roster 为 8 项。直接 install_bundle 返回 already-installed，按管理器要求 remove_bundle 后重新安装本仓库：

	http://127.0.0.1:43127
	bundle: dsh-preset-manager
	version: 0.1.1
	application: applied
	warnings: []

安装源现在链接到本仓库，源码目录不应移动或删除。管理器的包安装输出另有现有 profile 的 peer dependency 提示；操作退出码为 0，未为此升级其他插件。

安装后查询 Host Config 成功，实际安装路径解析到本仓库的 0.1.1。Client Inspect 返回新对话和设置页适配注册 active，插件配置入口 active。preset_manager get 返回 8 项 roster；五个策略数组仍为空，未更改默认预设或现有会话。

### 尚未完成的真实 GUI 验收

当前没有浏览器控制工具，不能读取真实 DOM、控制刷新、点击保存或取得新版截图。Client slot 注册不证明视觉或所有交互已经通过。应在现有 GUI 刷新后确认原生选择器、预设卡片与说明弹窗，以及显示管理面板的读取/保存、刷新持久化、浅色/深色效果。

远程 web_fetch 无法获取本机地址（API 返回 HTTP 404）；本机无认证 HTTP 请求返回 401，说明该地址受登录保护，没有尝试提取浏览器凭据。以上请求都不能替代已登录页面验收。没有启动替代 Web 服务，没有声称未核实 watcher 的自动热更新。

## 0.1.0 历史记录

初始版本本地检查为 25/25 测试通过，首次安装曾因 DSH 进程 PATH 缺少 pnpm 返回 spawn pnpm ENOENT。之后用户已在独立目录安装旧版，本次截图暴露了缺失 remote 依赖和替换原生 UI 的问题；旧测试 fixture 未覆盖真实 Cordis 注入检查。该历史失败不代表 0.1.1 当前安装结果。

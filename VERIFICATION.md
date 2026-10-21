# 验证记录

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

# 验证记录

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

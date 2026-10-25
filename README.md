# DSH 预设管理

管理 DSH Web 新对话的 preset 显示范围和顺序。当前适配 **DSH 0.2.1-rc.2**，不修改 DSH 安装目录，不修改 preset 定义。

## 使用

安装并启用后，打开 **插件 → 预设管理**。

- 关闭某一行的“显示”开关，即可在新对话预设选择器中隐藏该 preset。管理面板始终列出所有 preset，已隐藏的行会淡化并标注“已隐藏”；列表头显示总数和当前显示数量。
- 在“统一顺序”中使用置顶、上移、下移、置底按钮调整排序。新对话未单独设置顺序时自动继承。
- 切换到“新对话独立顺序”调整独立顺序；“使用统一顺序”恢复继承。
- 点击“保存更改”后应用并持久化到当前 profile；“放弃修改”丢弃草稿并载入最新配置。搜索按名称、ID 和描述定位，不影响配置。退出页面不会保存草稿。
- “恢复新对话显示”重置统一顺序、新对话独立顺序及新对话隐藏项，保存后才生效。停用或卸载插件恢复原生展示，不影响 preset 和已有会话。

**预设页面适配已停用**：DSH 0.2.1-rc.2 的设置导航会把覆盖注册和原注册都列出来，造成两个“Agent 预设”入口。按仅修改插件、不改动 DSH 的方案，本插件不再覆盖该设置页；页面恢复原生显示和顺序。已有的 settingsOrder、hiddenSettings 配置保留，保存和重置新对话设置都不会清空它们，但它们暂不生效。

隐藏只影响候选列表，不是权限限制。隐藏默认 preset 不会更改默认值；隐藏当前选择时，选择器仍显示当前名称，但下拉候选中不再列出它。全部隐藏时选择器禁用，可以从插件面板恢复。已有对话的 preset 标识始终保留。DSH 的“编程工具”开关仍对原生 PTC、Minimal 生效；加载失败的 preset 保留在管理面板和预设页面供诊断，不进入新对话候选。

新对话选择器沿用 DSH 原生界面，只过滤和排序候选项，保留当前项名称、图标、描述和菜单操作。原生“设置 → Agent 预设”页面及其分组、卡片、模式说明、使用方式、查看配置和创建入口不受本插件影响。会话标题中的 preset 是单项标识，无排序；插件安装菜单的 Creator 快捷入口、CLI、API 和第三方自行绘制的列表也不受这些显示设置约束。

## 安装与开发

在 DSH 插件管理器中安装本目录的绝对路径。目录安装会链接本工作区，使用期间不要移动或删除目录。首次安装前执行：

```sh
npm install --ignore-scripts
npm run check
```

浏览器产物通过 DSH ModuleLoader 加载，唯一模块导入是 DSH 提供的 React。没有额外 Web 服务器、浏览器 DOM 注入或跨插件模块导入。修改源码后执行 npm run build，再按 DSH 对已安装包更新的要求重启/重新加载；本项目不承诺没有 watcher 的自动热更新。

## 配置与模型工具

Loader 行 ID 和 settings namespace 都是 dsh-preset-manager。Config 的 policy 对象包含：

| 字段 | 用途 |
| --- | --- |
| globalOrder | 全局 preset ID 顺序 |
| newSessionOrder | 新对话独立顺序；空数组继承全局 |
| settingsOrder | 预设页面独立顺序；保留但暂不生效 |
| hiddenNewSession | 新对话隐藏的 preset ID |
| hiddenSettings | 预设页面隐藏的 preset ID；保留但暂不生效 |

未排序的 preset 保留原生相对顺序，排在已指定项目之后。未安装 ID 保留在配置里，重新安装后继续生效。保存使用 revision 防止旧草稿覆盖其他页面的修改。

模型工具 preset_manager 的 get 返回配置、revision 和完整 roster；set 原子提交完整五字段 policy 和 expectedRevision，写入前请求审批。面板和工具都使用 DSH settings 服务的同一验证、持久化和版本检查路径。该工具不会更改 preset 默认值或定义。

## 实现边界

通过公开的 slots.entries / subscribe / register 绑定原生新对话预设选择器，完整复用原 inject 和原生函数组件的渲染逻辑。只对返回的 React 元素中的菜单 items 做不可变过滤和排序，不修改原 registration、snapshot、DOM 或 CSS；原生控制器始终保留完整 roster，因此隐藏当前项不会丢失名称或改变选择。菜单键盘操作与错误提示沿用原逻辑，全部隐藏时禁用原生菜单按钮。客户端不注册 settings.section，也不包装 settings shell；原有设置页列表转换函数及测试暂保留，但不接入运行中的页面。

元素结构和原生组件作为函数调用的约定是 **0.2.1-rc.2 专属适配**，不是跨版本稳定 API。每个源注册生成独立 wrapper，原生函数在每次渲染中无条件调用；原插件卸载时移除适配，重新加载时创建新 wrapper，避免复用旧 hooks。本插件卸载时撤销自己的注册和订阅。未设置任何策略时返回原生元素本身，不复制一套控件。

兼容依据是已安装的 0.2.1-rc.2 声明和产物、Cordis Inspect，以及[官方 tag 对应提交](https://github.com/deepseek-ai/deepseek-harness/tree/687f282e8625c6b8d11ff58211a90524be2e4317)。版本范围刻意固定；升级 DSH 后应重新核对原生 inject 结构，不建议绕过兼容检查。图标为本项目原创 SVG。

实际验证记录见 [验证说明](<VERIFICATION.md>)。

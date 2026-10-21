# DSH 预设管理

管理 DSH Web 的 preset 显示范围和顺序。当前适配 **DSH 0.2.1-rc.2**，不修改 DSH 安装目录，不修改 preset 定义。

## 使用

安装并启用后，打开 **插件 → 预设管理**。

- 勾选“在新对话隐藏”或“在预设页面隐藏”，分别控制两个界面的显示范围。管理面板始终显示所有 preset。
- 在“统一顺序”中使用置顶、上移、下移、置底调整排序。未单独设置顺序的界面自动继承。
- 切换到“新对话”或“预设页面”调整独立顺序；“使用统一顺序”恢复继承。
- 点击“保存更改”后应用并持久化到当前 profile。搜索仅用于定位。退出页面不会保存草稿。
- “恢复所有显示设置”先修改草稿，保存后才生效。停用或卸载插件恢复原生展示，不影响 preset 和已有会话。

隐藏只影响候选列表，不是权限限制。隐藏默认 preset 不会更改默认值；隐藏当前选择时，选择器仍显示当前名称，但下拉候选中不再列出它。全部隐藏时选择器禁用，可以从插件面板恢复。已有对话的 preset 标识始终保留。DSH 的“编程工具”开关仍对原生 PTC、Minimal 生效；加载失败的 preset 保留在管理面板和预设页面供诊断，不进入新对话候选。

新对话选择器和“设置 → 预设”沿用 DSH 原生界面，只过滤和排序原生列表项，保留图标、描述、卡片、模式说明、使用方式、查看配置及创建预设入口。预设页面保留内置/自定义分组，排序在各组内生效，不跨组平铺。会话标题中的 preset 是单项标识，无排序；插件安装菜单的 Creator 快捷入口、CLI、API 和第三方自行绘制的列表不受这些显示设置约束。

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
| settingsOrder | 预设页面独立顺序；空数组继承全局 |
| hiddenNewSession | 新对话隐藏的 preset ID |
| hiddenSettings | 预设页面隐藏的 preset ID |

未排序的 preset 保留原生相对顺序，排在已指定项目之后。未安装 ID 保留在配置里，重新安装后继续生效。保存使用 revision 防止旧草稿覆盖其他页面的修改。

模型工具 preset_manager 的 get 返回配置、revision 和完整 roster；set 原子提交完整五字段 policy 和 expectedRevision，写入前请求审批。面板和工具都使用 DSH settings 服务的同一验证、持久化和版本检查路径。该工具不会更改 preset 默认值或定义。

## 实现边界

通过公开的 slots.entries / subscribe / register 绑定两个原生展示入口，完整复用原 inject 和原生函数组件的渲染逻辑。只对返回的 React 元素中的菜单 items / 预设卡片列表做不可变过滤和排序，不修改原 registration、snapshot、DOM 或 CSS；原生控制器始终保留完整 roster，因此隐藏当前项不会丢失名称或改变选择。设为默认、模式说明、查看配置、创建预设、菜单键盘操作与错误提示沿用原逻辑。全部隐藏时禁用原生菜单按钮；隐藏空卡片分组，但保留原生创建入口和已打开的弹窗。

元素结构和原生组件作为函数调用的约定是 **0.2.1-rc.2 专属适配**，不是跨版本稳定 API。每个源注册生成独立 wrapper，原生函数在每次渲染中无条件调用；原插件卸载时移除适配，重新加载时创建新 wrapper，避免复用旧 hooks。本插件卸载时撤销自己的注册和订阅。未设置任何策略时返回原生元素本身，不复制一套控件。

兼容依据是已安装的 0.2.1-rc.2 声明和产物、Cordis Inspect，以及[官方 tag 对应提交](https://github.com/deepseek-ai/deepseek-harness/tree/687f282e8625c6b8d11ff58211a90524be2e4317)。版本范围刻意固定；升级 DSH 后应重新核对原生 inject 结构，不建议绕过兼容检查。图标为本项目原创 SVG。

实际验证记录见 [验证说明](<VERIFICATION.md>)。

# 验证记录

## 目标与证据

- 当前目标 DSH：0.2.1-rc.2。官方 tag dsh-v0.2.1-rc.2 的 commit：687f282e8625c6b8d11ff58211a90524be2e4317。
- 用 Cordis Inspect 核查 Host agentPresets、settings、tools、approval 和 Client slots、locale、Theme；检查原生 hero、settings.section、plugins.bundle.config 的实时声明。
- 安装包声明及实现核对了 SlotRegistry.entries/subscribe、ConfigForms.get/describe/mutate、原 preset 展示的 inject 闭包及其选择/默认值操作。
- 本插件的适配只覆盖两处列表，详见 [使用说明](<README.md>)。

## 已执行

- npm install --ignore-scripts --cache .cache/npm --no-audit --no-fund：成功。
- npm run check：构建成功，Host 与 Client 语法检查通过，25/25 单元测试通过。
- 测试覆盖稳定排序、独立范围、全隐藏、缺失 preset 恢复、无原地修改、revision 冲突、审批拒绝/取消、volatile schema、原 controller 引用复用、slot 卸载重载、配置暂不可用时恢复原生界面。Host/slot 测试使用服务 fixture，不代替真实浏览器交互。
- npm pack --dry-run：运行文件、源码、测试、patch、双语元数据和 SVG 都在打包清单内。
- SVG XML 和文件大小有效；中英标题和描述完整。图标为原创。
- 审查后修复了错误提示关闭行为，以及配置读取未就绪时不应永久覆盖原生选择器的问题。

## 安装状态：尚未安装

当前 GUI：http://127.0.0.1:43127。plugin_manager install_bundle 返回：

```text
application: failed
changed: false
spawn pnpm ENOENT
```

当前 DSH 进程的 PATH 不包含已安装 Node/pnpm 所在目录。pnpm 已存在于 /home/andyk/.nvm/versions/node/v24.19.0/bin/pnpm。没有修改 profile 的配置文件或锁文件来绕过管理器，也没有更改任何 preset。

用户选择“修正环境后继续安装”。需要让启动 DSH 的进程继承：

```sh
export PATH="/home/andyk/.nvm/versions/node/v24.19.0/bin:$PATH"
```

随后重启当前 DSH 服务。只在另一个终端执行 export 不会改变已经运行的 DSH 进程；从桌面端启动时也应修正桌面端启动 DSH 的环境。恢复后由插件管理器重试安装本目录。

## 待完成

- 安装结果为 applied，并读取新 Host Config 和 Client slot 注册。
- 面板点击保存、配置持久化、两个界面的隐藏/顺序、现有会话保持不变。
- 模型工具 get/set 与 UI 写入路径的实际运行验证，测试后恢复初始显示设置。
- 当前连接页面的中英元数据、图标及浅色/深色视觉验收。当前工具没有浏览器控制能力，尚无截图或实际点击验证；slot 注册也不等于视觉验收。

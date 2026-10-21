# 项目开发约定

## Git 纪律

- 主分支使用 `main`。提交保持单一目的；提交前检查暂存区，避免混入不相关修改。
- 使用 Conventional Commits，例如 `feat:`、`fix:`、`docs:`、`chore:`。
- 不提交依赖目录、缓存、日志、临时文件、环境变量或密钥；遵守 `.gitignore`。
- 不擅自修改全局 Git 配置，不自动 push、强推、改写历史或创建发布 tag。
- 完成提交后核对提交内容和工作区状态；不得把未验证的运行效果写成已完成。

## 构建与验证

- 提交前执行 `npm run check` 和 `git diff --cached --check`。
- `client.js` 是安装必需的生成产物，必须跟踪。修改 `src/client.js`、`policy.js` 或 `adapter.js` 后执行 `npm run build`，将生成产物和源码一起提交；不要手工编辑生成产物。
- 跟踪 `package-lock.json`，依赖变动同时更新声明和锁文件。干净安装使用 `npm ci --ignore-scripts`。
- 当前测试不能代替真实 GUI 验收；安装、持久化及视觉验证的限制记录在 `VERIFICATION.md`。

## 版本纪律

- 当前初始开发基线是 `0.1.0`；首次 Git 提交不代表已经发布或安装成功。
- 版本号遵循 SemVer：修复递增 patch，向后兼容功能递增 minor；不兼容变更明确说明并选择相应版本。开发期间不因每次提交自动升版。
- 正式升版时同步 `package.json` 与 `package-lock.json` 的项目版本，更新验证记录和变更说明。
- DSH 兼容范围与插件版本分开管理；只有查证目标 DSH 接口并完成相应测试后才能扩大 `engines.dsh` 范围，并同步 `compatibility.json`。
- 发布 tag 仅在用户要求发布、版本文件一致且所需验证完成后创建。

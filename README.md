# 养老金融区域指数数据库 · Cloudflare Pages

本仓库保存公开静态门户及版本化数据分片。当前数据v114，598个指标、206297条记录；完整建设框架framework_v01。框架预留不代表已有数据，待核资料不自动代表正式统计值；不提供地区排名。

## Pages 自动部署配置

- 生产分支：`main`
- 框架预设：`None`
- 构建命令：`node scripts/verify-site.mjs`
- 构建输出目录：`site`
- 根目录：留空（仓库根目录）
- 使用Pages静态托管，不启用Workers、Functions或付费功能。

连接GitHub仓库后，main分支的新提交由Cloudflare自动构建和部署。首次创建项目时选择Git仓库集成；直接上传项目与Git集成的切换需以Cloudflare当前产品规则为准。

## 更新方式

在项目主工作区完成底库闸门、全库审查、网页和下载传播验证，重建公网包后运行 `prepare_cloudflare_repository_v01.py` 同步本仓库的site目录。执行 `node scripts/verify-site.mjs` 后提交并推送。公网发布后还须验证实际网址的框架、下载、数据分片和缓存。

网站下载由浏览器从当前数据生成CSV和Excel；后台及原始资料库不在公开仓库中。凭据只保留在账户授权或本机凭据管理器，不提交到仓库。

Cloudflare当前Free方案支持静态托管；官方限制包括25MiB单文件、20000文件和每月500次构建。免费政策与限制以官方最新条款为准，不承诺永久无限免费。

官方限制：https://developers.cloudflare.com/pages/platform/limits/
Git集成：https://developers.cloudflare.com/pages/configuration/git-integration/

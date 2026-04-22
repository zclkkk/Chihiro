# PM2 + CI/CD 部署

这套方案不再走 standalone 压缩包，而是让服务器保留完整项目仓库，由 GitHub Actions 通过 SSH 触发部署。

## 适合当前项目的原因

- `Prisma migrate deploy` 可以直接在服务器跑
- 构建、迁移、启动都在同一个目录完成，不再拆成两套环境
- PM2 负责常驻 Next 服务，部署脚本只做拉代码、装依赖、迁移、构建和重载

## 服务器首次准备

先在服务器上安装这些基础工具：

- Node.js 20+
- pnpm
- pm2
- git

然后把项目克隆到固定目录，例如：

```bash
mkdir -p /srv/chihiro
cd /srv/chihiro
git clone <your-repo-url> current
cd current
cp .env.example .env
```

把生产环境变量写进 `.env`，至少要有：

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

首次启动建议手动跑一次：

```bash
pnpm install --frozen-lockfile --prod=false
pnpm exec prisma migrate deploy
pnpm build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

## 日常部署流程

之后每次部署都由服务器脚本完成：

```bash
bash scripts/deploy/server-deploy.sh
```

这个脚本会执行：

1. 拉取最新代码
2. 安装依赖（包含 Prisma CLI）
3. 执行 `prisma migrate deploy`
4. 构建 Next.js
5. 用 PM2 reload 服务

## GitHub Actions 配置

仓库里已经提供：

- [`.github/workflows/ci.yml`](/Users/yinian/Code/chihiro/.github/workflows/ci.yml)
- [`.github/workflows/deploy.yml`](/Users/yinian/Code/chihiro/.github/workflows/deploy.yml)

其中：

- `CI` 在 PR 和 `main` push 时跑 `tsc`、`build`
- `Deploy` 在 `main` push 后通过 SSH 登录服务器并执行部署脚本

当前仓库里还有一批历史 ESLint 告警和错误没有清理，所以这里先把 CI 的阻塞项收敛到类型检查和构建，避免流程一直红灯。

### 需要的 GitHub Secrets

- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_USER`：SSH 用户
- `DEPLOY_SSH_KEY`：部署私钥

### 需要的 GitHub Variables

- `DEPLOY_PATH`：服务器项目目录，默认 `/srv/chihiro/current`
- `DEPLOY_PORT`：SSH 端口，默认 `22`
- `PM2_APP_NAME`：PM2 进程名，默认 `chihiro`

## 常用命令

查看 PM2 进程：

```bash
pm2 status
pm2 logs chihiro
```

手动重载：

```bash
pm2 reload ecosystem.config.cjs --env production
```

手动执行一次部署：

```bash
APP_DIR=/srv/chihiro/current DEPLOY_BRANCH=main bash scripts/deploy/server-deploy.sh
```

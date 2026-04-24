# Docker + CI/CD 部署

这套部署让 GitHub Actions 构建 Docker 镜像并推送到 GHCR，服务器只负责拉取镜像和 `docker compose up -d`。容器启动时会先执行 `prisma migrate deploy`，再启动 Next.js。

## 服务器首次准备

服务器需要安装：

- Docker
- Docker Compose plugin
- git

项目目录仍然建议放在固定路径，例如：

```bash
mkdir -p /srv/chihiro
cd /srv/chihiro
git clone <your-repo-url> current
cd current
cp .env.example .env
```

生产 `.env` 至少要确认这些值：

```bash
DATABASE_URL="postgresql://chihiro:your-password@localhost:5432/chihiro?schema=public"
DOCKER_DATABASE_URL="postgresql://chihiro:your-password@postgres:5432/chihiro?schema=public"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
POSTGRES_DB="chihiro"
POSTGRES_USER="chihiro"
POSTGRES_PASSWORD="your-password"
POSTGRES_HOST="127.0.0.1"
POSTGRES_PORT="5432"
APP_PORT="3000"
RUN_MIGRATIONS="true"
```

如果数据库也跑在这份 compose 里，容器内连接串 `DOCKER_DATABASE_URL` 的 host 使用 `postgres`。`DATABASE_URL` 留给服务器本机上的手动 Prisma 命令使用，所以默认 host 是 `localhost`。

如果你用外部数据库，把 `DATABASE_URL` 和 `DOCKER_DATABASE_URL` 都改成外部连接串即可。

## GitHub 配置

需要的 GitHub Secrets：

- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_USER`：SSH 用户
- `DEPLOY_SSH_KEY`：部署私钥
- `GHCR_TOKEN`：可选；如果 GHCR 镜像是 private，需要一个带 `read:packages` 权限的 PAT

需要的 GitHub Variables：

- `DEPLOY_PATH`：服务器项目目录，默认 `/srv/chihiro/current`
- `DEPLOY_PORT`：SSH 端口，默认 `22`
- `COMPOSE_PROJECT_NAME`：compose 项目名，默认 `chihiro`

Actions 会把镜像推送到：

```text
ghcr.io/<owner>/<repo>:<commit-sha>
ghcr.io/<owner>/<repo>:latest
```

部署时实际使用 commit sha 标签，避免 `latest` 缓存或漂移导致发布内容不确定。

## 日常部署流程

推送到 `main` 后，`.github/workflows/deploy.yml` 会自动：

1. 构建 Docker 镜像
2. 推送到 GHCR
3. SSH 到服务器
4. 拉取服务器上的最新 compose 配置
5. 执行 `docker compose pull && docker compose up -d --remove-orphans`

容器启动入口在 `docker/entrypoint.sh`，默认会跑：

```bash
pnpm exec prisma migrate deploy
```

如需临时跳过迁移，可以在服务器 `.env` 设置：

```bash
RUN_MIGRATIONS="false"
```

## 手动部署

服务器上可以手动执行：

```bash
APP_DIR=/srv/chihiro/current \
DEPLOY_BRANCH=main \
CHIHIRO_IMAGE=ghcr.io/<owner>/<repo>:latest \
bash scripts/deploy/docker-deploy.sh
```

常用排查命令：

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f postgres
docker compose exec postgres psql -U chihiro -d chihiro
```

## 从 PM2 切换

如果旧服务还在 PM2 里，第一次 Docker 发布成功后可以在服务器停掉旧进程：

```bash
pm2 stop chihiro
pm2 delete chihiro
pm2 save
```

数据库是否保留取决于 `DOCKER_DATABASE_URL`。如果要继续使用旧库，就让 `.env` 里的 `DOCKER_DATABASE_URL` 指向旧库；如果要切到 compose 内置 Postgres，就先做好数据迁移或备份。

# 拾词

面向手机端的高中英语抗遗忘跟读工具。产品与技术需求见 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)。

## 本地启动

需要 Node.js 22。

```bash
npm install
cp .env.example .env.local
npm run db:setup
npm run dev
```

打开 `http://localhost:3000`，注册账号后即可开始学习。

## 常用命令

```bash
npm run db:migrate  # 执行版本化 PostgreSQL 迁移
npm run db:seed     # 幂等导入 3500 词
npm run test        # 复习调度单元测试
npm run typecheck   # TypeScript 类型检查
npm run lint
npm run build
```

`db:seed` 优先从开源 ECDICT 词库筛选带 `gk`（高考）标签的 3500 条词汇。种子环境无法联网时会使用内置兜底数据，保证开发流程可继续；正式部署前应在可联网环境执行一次种子导入。

数据库使用 Neon PostgreSQL：应用请求连接 pooled 地址，迁移连接 unpooled 地址。部署步骤见 [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)。业务表的所有学习查询都以当前会话的 `user_id` 为边界。

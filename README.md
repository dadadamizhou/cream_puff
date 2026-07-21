# 泡芙

面向手机端的高中英语抗遗忘跟读工具。产品与技术需求见 [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)。

核心流程包括每日跟读复习与每日一练。练习从用户已经学习过的单词中生成 15 道固定题目，覆盖翻译选择、听力选择、听力默写和翻译默写；错词会自动进入后续复习。

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
npm run db:seed     # 幂等导入高中分级与四级拓展词库
npm run test        # 复习调度单元测试
npm run typecheck   # TypeScript 类型检查
npm run lint
npm run build
```

`db:seed` 从开源 ECDICT 词库筛选 `gk`（高考）与 `cet4`（四级）标签，严格取高中 3500 条作为兼容模式主词库。高中词按词频分成高一基础、高二进阶、高三冲刺；四级成员关系保留完整四级范围，即使某个词主阶段是高一，也会在四级筛选中出现。学习分配通过用户词卡唯一约束避免重复。下载或校验失败时脚本会停止，不会向生产库写入假词。

数据库使用 Neon PostgreSQL：应用请求连接 pooled 地址，迁移连接 unpooled 地址。部署步骤见 [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)。业务表的所有学习查询都以当前会话的 `user_id` 为边界。

# Vercel + Neon 部署说明

## 数据库连接

项目使用 `postgres.js + Drizzle ORM` 连接 Neon PostgreSQL：

- `DATABASE_URL`：Neon pooled 地址，供 Next.js API 和页面请求使用。
- `DATABASE_URL_UNPOOLED`：Neon direct 地址，仅供 Drizzle 迁移使用。
- 运行时单实例最大连接数设为 1，并关闭 prepared statements，适配 Neon 的 PgBouncer 连接池。
- 复习提交仍使用数据库事务，保证词卡进度和复习日志同时成功或同时回滚。

不要把真实连接串写入 Git、Vercel 构建日志或客户端公开环境变量。项目只在服务端读取变量，变量名不能带 `NEXT_PUBLIC_` 前缀。

## 1. 配置 Vercel 环境变量

在 Vercel 项目的 Production、Preview、Development 环境中配置：

```text
DATABASE_URL=postgresql://...-pooler.../neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://.../neondb?sslmode=require
```

Production 和 Preview 最好使用不同 Neon branch。这样预览部署的迁移、测试账号和学习数据不会污染生产库。

## 2. 初始化数据库

在本地配置 `.env` 后执行：

```bash
npm run db:migrate
npm run db:seed
```

迁移是版本化的；种子按单词拼写幂等。不要把 `db:setup` 放进 Vercel Build Command，多次并行部署可能同时迁移或下载词库。

## 3. 导入项目

1. 在 Vercel 中导入 GitHub 仓库。
2. Framework Preset 选择 Next.js。
3. Install Command 保持默认，Build Command 使用 `npm run build`。
4. Node.js 使用 `package.json` 指定的 22.x。
5. 添加环境变量后再部署。

## 4. 上线前检查

- 执行 `0004_word_books` 迁移后重新运行 `npm run db:seed`，确认 `words` 表包含高一、高二、高三和四级拓展四类真实词汇。
- 注册两个测试账号，确认学习记录彼此隔离。
- 在手机 Safari 和 Chrome 验证发音；语音识别需要 HTTPS 和麦克风权限，部分 iOS 浏览器可能只支持发音。
- 免费 Neon 项目可能自动休眠，首次请求会有冷启动延迟；前端已经提供加载状态。
- Preview 环境不要复用生产数据库连接串。
- 给登录和注册接口配置 Vercel WAF 或速率限制，降低暴力尝试风险。
- 上线前轮换一次已经通过聊天或其他非密钥渠道传输过的数据库密码。

## 5. 后续生产化建议

- 当前邮箱不做真实性验证。公开注册前应增加邮箱验证码、密码重置和账号注销。
- 目前语音评分来自浏览器识别结果，只适合辅助反馈，不应作为正式口语评分。
- 用户规模增长后应增加会话过期清理、复习日志归档和数据库用量告警。

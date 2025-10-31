# Local Deployment Guide

本项目已从原始的 Vercel AI Chatbot 修改为支持本地部署，移除了所有云服务依赖。

## 已移除的功能

### 1. 认证系统 (Auth.js / NextAuth)
- 移除了用户登录/注册功能
- 移除了 guest 模式
- 所有用户现在使用默认的本地用户账户

### 2. 数据库 (PostgreSQL)
- 移除了 Vercel Postgres 依赖
- 移除了 Drizzle ORM
- 所有数据现在存储在内存中（重启后会丢失）

### 3. Redis
- 移除了 Redis 依赖
- 移除了 resumable-stream 功能（流式响应恢复）

### 4. Blob Storage
- 移除了 Vercel Blob 存储
- 移除了文件上传功能

## 新的存储实现

所有数据现在使用内存存储，实现在 `lib/memory-storage.ts`：

- **用户数据**: 使用默认本地用户 (local-user)
- **聊天历史**: 存储在内存 Map 中
- **消息**: 存储在内存 Map 中
- **文档和建议**: 存储在内存 Map 中

⚠️ **重要提示**: 服务器重启后所有数据都会丢失！

## 配置要求

创建 `.env` 文件并设置以下环境变量：

```bash
# AI Gateway API Key (必需)
AI_GATEWAY_API_KEY=your_api_key_here
```

## 运行项目

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

## 已移除的依赖

从 `package.json` 中移除的依赖：

- `next-auth` - 认证
- `@vercel/postgres` - PostgreSQL
- `@vercel/blob` - Blob 存储
- `redis` - Redis 缓存
- `resumable-stream` - 流式恢复
- `postgres` - PostgreSQL 客户端
- `drizzle-orm` - ORM
- `drizzle-kit` - 数据库迁移工具
- `bcrypt-ts` - 密码哈希

## 主要文件更改

### 新增文件
- `lib/memory-storage.ts` - 内存存储实现

### 移除的文件夹
- `app/(auth)` - 认证相关路由和组件
- `lib/db` - 数据库查询和schema

### 修改的文件
- `middleware.ts` - 移除认证检查
- `app/(chat)/api/chat/route.ts` - 使用内存存储
- `app/(chat)/layout.tsx` - 移除 session 检查
- `components/sidebar-user-nav.tsx` - 简化用户导航
- 以及其他多个组件和API路由

## 限制

1. **无持久化**: 所有数据在服务器重启后丢失
2. **无认证**: 所有用户共享同一个账户
3. **无文件上传**: 不支持上传图片或文件
4. **无流式恢复**: 如果连接中断，无法恢复生成过程
5. **单用户模式**: 不适合多用户环境

## 如果需要持久化

如果需要数据持久化，可以考虑：

1. 使用本地 SQLite 数据库替代内存存储
2. 使用文件系统存储聊天历史
3. 实现简单的 JSON 文件存储

## 开发注意事项

- 所有对数据库的引用都已改为 `@/lib/memory-storage`
- Session 类型现在是本地定义的简单类型
- 模型选择器现在显示所有可用模型（无用户类型限制）

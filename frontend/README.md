# Wiley AI Frontend

一个简洁的AI对话前端应用，基于Next.js 15和TypeScript构建。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI组件**: @llamaindex/chat-ui
- **AI SDK**: @ai-sdk/react
- **包管理**: pnpm
- **代码风格**: Google TypeScript Style Guide

## 项目结构

```
frontend/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API代理路由
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 主页面（聊天界面）
├── components/
│   ├── custom-weather.tsx        # 天气信息展示组件
│   ├── custom-wiki.tsx           # Wiki信息展示组件
│   └── ui/
│       └── theme-toggle.tsx      # 主题切换组件
├── hooks/
│   └── use-responsive.ts         # 响应式Hook
├── package.json
└── tsconfig.json
```

## 核心功能

- **AI对话交互**: 基于@llamaindex/chat-ui的实时AI对话
- **流式响应**: 支持Server-Sent Events (SSE)流式输出
- **深色模式**: 支持亮色/暗色主题切换
- **响应式设计**: 适配桌面和移动端

## 环境变量

在项目根目录创建`.env.local`文件：

```bash
# 后端API地址
BACKENDURL=http://127.0.0.1:8000/api/chat
```

## 开发指南

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 代码规范

项目遵循Google TypeScript代码风格：

- 使用接口（interface）而非类型别名（type）定义对象类型
- 函数参数使用解构赋值，类型注解写在参数后面
- 使用JSDoc注释描述函数功能
- 常量使用UPPER_SNAKE_CASE命名
- 组件使用PascalCase命名
- 使用单引号，末尾加分号

## 与后端集成

前端通过`/api/chat`路由将请求代理到后端API。确保后端服务运行在配置的地址上。

### API流程

1. 用户在前端输入消息
2. 前端调用`/api/chat` API
3. Next.js API路由将请求转发到后端
4. 后端返回SSE流式响应
5. 前端实时显示AI回复

## 自定义组件

项目包含两个示例自定义组件：

- **WeatherPart**: 展示天气信息的卡片组件
- **WikiPart**: 展示Wikipedia信息的卡片组件

这些组件可以在AI响应中内嵌显示结构化数据。

## License

MIT

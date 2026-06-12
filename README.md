# 半导体知识助手

专注半导体行业的AI问答工具，特别针对RTP（快速热处理）工艺问题。

## 功能特点

- 🎯 专业知识问答：基于半导体行业知识库
- 🔬 RTP工艺专精：专注于快速热处理相关问题
- 💡 智能回答：结合AI生成与知识库检索
- 📚 来源可溯：显示答案参考来源

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的 OpenAI API Key：

```
OPENAI_API_KEY=sk-your-api-key-here
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `OPENAI_API_KEY`
4. 部署完成

## 知识库结构

知识库位于 `server/api/knowledge.json`，包含：

- **RTP相关**
  - 概念：RTP定义、应用场景、与炉管对比
  - 工艺参数：关键参数、调整方法
  - 异常处理：设备报警、良率下降、颗粒污染

- **通用半导体**
  - 术语：TD、PE、PIE、EE、YE等岗位解释
  - 工艺：光刻、刻蚀、薄膜沉积等

## 自定义知识库

编辑 `server/api/knowledge.json` 文件，按照现有格式添加更多知识：

```json
{
  "问题": "你的问题",
  "答案": "详细答案",
  "关键词": ["关键词1", "关键词2"]
}
```

## 技术栈

- **前端**：Vue 3 + Nuxt 3 + Tailwind CSS
- **后端**：Nuxt Server API
- **AI**：OpenAI GPT-3.5/4
- **部署**：Vercel

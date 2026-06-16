import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, 'dist')))

// Load knowledge base
let knowledgeData
try {
  knowledgeData = JSON.parse(readFileSync(join(__dirname, 'server', 'knowledge.json'), 'utf-8'))
} catch (e) {
  knowledgeData = {}
}

function searchKnowledge(query) {
  const results = []
  const queryLower = query.toLowerCase()
  const categories = ['rtp', 'general']
  const subCategories = ['概念', '工艺参数', '异常处理', '常见术语', '术语', '工艺', '问题解决']

  for (const category of categories) {
    for (const subCat of subCategories) {
      const items = knowledgeData[category]?.[subCat]
      if (items) {
        for (const item of items) {
          const keywordMatch = item.keywords?.some(kw => queryLower.includes(kw.toLowerCase()))
          const questionMatch = item.问题?.toLowerCase().includes(queryLower)
          const answerMatch = item.答案?.toLowerCase().includes(queryLower)
          if (keywordMatch || questionMatch || answerMatch) {
            results.push({
              category: `${category}-${subCat}`,
              question: item.问题,
              answer: item.答案,
              score: keywordMatch ? 3 : (questionMatch ? 2 : 1)
            })
          }
        }
      }
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 3)
}

// Streaming chat API
app.post('/api/chat', async (req, res) => {
  const { question, history = [], deepThink = false } = req.body

  if (!question) {
    return res.status(400).json({ error: '请提供问题' })
  }

  const relevantKnowledge = searchKnowledge(question)
  const apiKey = process.env.OPENAI_API_KEY
  const model = deepThink ? (process.env.AI_MODEL_DEEP || 'glm-4-plus') : (process.env.AI_MODEL || 'glm-4-flash')

  // No API key - return knowledge base directly
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    const answer = relevantKnowledge.length > 0
      ? relevantKnowledge[0].answer
      : '抱歉，暂无相关知识库内容。'
    return res.json({
      answer,
      sources: relevantKnowledge.map(k => ({ question: k.question, category: k.category }))
    })
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    })

    let systemPrompt = `你是一个专业的半导体行业知识助手「芯问」，专注于帮助半导体工程师解决工作中的问题，特别是RTP（快速热处理）相关工艺。

你的回答应该：
1. 准确、专业、实用
2. 结合实际工艺经验
3. 给出具体的解决步骤
4. 如果是异常处理问题，提供排查流程
5. 使用简洁的格式，善用编号和分点
6. 直接回答用户的问题，不要寒暄、不要自我介绍（禁止以「你好」「我是…」之类开头）

注意：你是一个多轮对话助手，能理解上下文。如果用户追问或引用之前的内容，请结合对话历史回答。

如果知识库中有相关内容，请基于知识库回答。如果没有，请根据你的专业知识回答。`

    if (relevantKnowledge.length > 0) {
      systemPrompt += '\n\n以下是与问题相关的知识库内容：\n'
      for (const item of relevantKnowledge) {
        systemPrompt += `\n【${item.category}】${item.question}\n${item.answer}\n`
      }
    }

    // Build messages with history
    const recentHistory = history.slice(-10)
    const messages = [{ role: 'system', content: systemPrompt }]

    // Add conversation history
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content })
    }

    // Add current question
    messages.push({ role: 'user', content: question })

    // Both modes use the same OpenAI compatible API
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (!delta) continue

      // Handle thinking content (for reasoning models like GLM-Z1)
      if (delta.reasoning_content) {
        res.write(`data: ${JSON.stringify({ type: 'thinking', content: delta.reasoning_content })}\n\n`)
      }

      // Handle regular content
      if (delta.content) {
        // Skip <think> tags in content
        const cleanContent = delta.content.replace(/<think>[\s\S]*?<\/thought>/g, '')
        if (cleanContent) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: cleanContent })}\n\n`)
        }
      }
    }

    // Send done signal
    res.write(`data: ${JSON.stringify({
      type: 'done',
      sources: relevantKnowledge.map(k => ({ question: k.question, category: k.category }))
    })}\n\n`)

    res.end()

  } catch (error) {
    console.error('AI API error:', error.message)
    const fallback = relevantKnowledge.length > 0
      ? relevantKnowledge[0].answer + '\n\n（AI服务暂时不可用，以上为知识库匹配结果）'
      : 'AI服务暂时不可用，请稍后重试。'
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: fallback })}\n\n`)
    res.write(`data: ${JSON.stringify({ type: 'done', sources: [] })}\n\n`)
    res.end()
  }
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔧 芯问运行在 http://localhost:${PORT}`)
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.AI_MODEL || 'glm-4-flash'
  const modelDeep = process.env.AI_MODEL_DEEP || 'glm-4-plus'
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('⚠️  未配置 API Key，使用知识库直接回答')
  } else {
    console.log(`✅ 快速: ${model} | 深度: ${modelDeep} | 知识库: ${Object.keys(knowledgeData).join(', ')}`)
  }
})

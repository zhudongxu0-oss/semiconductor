import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

// Load .env file
config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

// Load knowledge base
let knowledgeData
try {
  knowledgeData = JSON.parse(readFileSync(join(__dirname, 'server', 'knowledge.json'), 'utf-8'))
} catch (e) {
  console.error('Failed to load knowledge base:', e.message)
  knowledgeData = {}
}

// Simple keyword search
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
          const keywordMatch = item.keywords?.some(kw =>
            queryLower.includes(kw.toLowerCase())
          )
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

// Chat API
app.post('/api/chat', async (req, res) => {
  const { question } = req.body

  if (!question) {
    return res.status(400).json({ error: '请提供问题' })
  }

  // Search knowledge base
  const relevantKnowledge = searchKnowledge(question)

  const apiKey = process.env.OPENAI_API_KEY

  // If no API key, return knowledge base answer directly
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    if (relevantKnowledge.length > 0) {
      return res.json({
        answer: relevantKnowledge[0].answer,
        sources: relevantKnowledge.map(k => ({
          question: k.question,
          category: k.category
        }))
      })
    }
    return res.json({
      answer: '抱歉，暂无相关知识库内容。请配置 OPENAI_API_KEY 环境变量以启用AI回答功能。',
      sources: []
    })
  }

  // Call AI API (supports OpenAI, GLM, DeepSeek, etc.)
  try {
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    })

    let systemPrompt = `你是一个专业的半导体行业知识助手，专注于帮助半导体工程师解决工作中的问题。

你的回答应该：
1. 准确、专业、实用
2. 结合实际工艺经验
3. 给出具体的解决步骤
4. 如果是异常处理问题，提供排查流程

你特别擅长RTP（快速热处理）相关的工艺问题。

如果知识库中有相关内容，请基于知识库回答。如果没有，请根据你的专业知识回答，但要说明这是通用建议，具体情况可能需要根据实际工艺调整。`

    if (relevantKnowledge.length > 0) {
      systemPrompt += '\n\n以下是与问题相关的知识库内容：\n'
      for (const item of relevantKnowledge) {
        systemPrompt += `\n【${item.category}】${item.question}\n${item.answer}\n`
      }
    }

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })

    res.json({
      answer: completion.choices[0].message.content,
      sources: relevantKnowledge.map(k => ({
        question: k.question,
        category: k.category
      }))
    })
  } catch (error) {
    console.error('OpenAI API error:', error.message)
    // Fallback to knowledge base
    if (relevantKnowledge.length > 0) {
      res.json({
        answer: relevantKnowledge[0].answer + '\n\n（注：AI服务暂时不可用，以上为知识库匹配结果）',
        sources: relevantKnowledge.map(k => ({
          question: k.question,
          category: k.category
        }))
      })
    } else {
      res.status(500).json({ error: 'AI服务暂时不可用，请稍后重试' })
    }
  }
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`🔧 半导体知识助手 API 运行在 http://localhost:${PORT}`)
  console.log(`📝 知识库已加载: ${JSON.stringify(Object.keys(knowledgeData)).replace(/"/g, '')}`)
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.AI_MODEL || 'gpt-3.5-turbo'
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('⚠️  未配置 API Key，将使用知识库直接回答')
  } else {
    console.log(`✅ AI 已配置: ${baseUrl} / ${model}`)
  }
})

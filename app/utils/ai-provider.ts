import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'

import type { RequiredEnvVars } from '../../env-required'

function getGoogleApiKey(env: RequiredEnvVars) {
  return env.GOOGLE_AI_STUDIO_API_KEY ?? env.GOOGLE_GENERATIVE_AI_API_KEY
}

function getLanguageModel(env: RequiredEnvVars) {
  const provider = env.AI_PROVIDER
  const model = env.AI_MODEL || 'gemini-2.5-flash'
  const baseURL = env.AI_BASE_URL

  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY, baseURL })
      return openai(model)
    }
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: env.ANTHROPIC_API_KEY,
        baseURL,
      })
      return anthropic(model)
    }
    case 'openrouter': {
      const openrouter = createOpenRouter({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL,
      })
      return openrouter(model)
    }
    case 'google':
    default: {
      const apiKey = getGoogleApiKey(env)
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL: env.GOOGLE_AI_STUDIO_BASE_URL ?? baseURL,
      })
      return google(model)
    }
  }
}

export async function generateDescriptionFromContent({
  env,
  content,
}: {
  env: RequiredEnvVars
  content: string
}) {
  if (!env.AI_PROVIDER) return null

  if (env.AI_PROVIDER === 'google' && !getGoogleApiKey(env)) {
    throw new Error('GOOGLE_AI_STUDIO_API_KEY is required when AI_PROVIDER is google')
  }

  const { text } = await generateText({
    model: getLanguageModel(env),
    system:
      'You are a professional writer. You write simple, clear, and concise summaries for easy stakeholder understanding.',
    prompt: `Instructions:
Write a brief summary of the following issue in 2-3 sentences: ${content}

Guidelines:
- The summary should be concise and to the point, focusing on the problem outlined in the issue itself.
- Use issue comments as an aid, but focus on the issue's main problem statement and purpose.
- Include the essential narrative so that the stakeholder can understand the content at a glance.
- Do not make assumptions, extrapolate, or infer anything that is not explicitly stated in the issue.
- Do not comment on effort or severity as those are tracked in other fields.
- Do not mention the issue number or identifier in the summary.
- Do not mention the requestor or assignee in the summary.`,
  })

  return text
}

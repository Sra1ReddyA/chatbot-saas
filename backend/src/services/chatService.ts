import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import type { ChatMessage } from '../types';
import { logger } from '../utils/logger';

const openai = config.OPENAI_API_KEY
  ? new OpenAI({ apiKey: config.OPENAI_API_KEY })
  : null;

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

export interface ChatCompletionResult {
  content: string;
  tokens: number;
  latency: number;
  model: string;
}

export async function generateChatCompletion(
  provider: 'openai' | 'anthropic',
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  contextDocs?: string
): Promise<ChatCompletionResult> {
  const startTime = Date.now();

  // Build system prompt with context if available
  let fullSystemPrompt = systemPrompt;
  if (contextDocs) {
    fullSystemPrompt += `\n\nRelevant context from knowledge base:\n${contextDocs}\n\nUse this context to answer questions when relevant.`;
  }

  if (provider === 'openai') {
    if (!openai) throw new Error('OpenAI not configured');

    const response = await openai.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
    });

    const latency = Date.now() - startTime;
    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      tokens: response.usage?.total_tokens || 0,
      latency,
      model,
    };
  }

  if (provider === 'anthropic') {
    if (!anthropic) throw new Error('Anthropic not configured');

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: fullSystemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const latency = Date.now() - startTime;
    const content = response.content[0];

    return {
      content: content.type === 'text' ? content.text : '',
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      latency,
      model,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// Estimate token cost
export function estimateCost(model: string, tokens: number): number {
  const pricing: Record<string, number> = {
    'gpt-4o-mini': 0.00015 / 1000,
    'gpt-4o': 0.005 / 1000,
    'gpt-3.5-turbo': 0.0005 / 1000,
    'claude-3-haiku-20240307': 0.00025 / 1000,
    'claude-3-5-sonnet-20241022': 0.003 / 1000,
  };
  return (pricing[model] || 0.001 / 1000) * tokens;
}

// Simple keyword search in knowledge base (full vector search needs pgvector)
export function searchKnowledgeBase(
  documents: Array<{ content: string; name: string }>,
  query: string,
  maxChars = 3000
): string {
  if (!documents.length) return '';

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  // Score each document
  const scored = documents.map((doc) => {
    const contentLower = doc.content.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    }
    return { ...doc, score };
  });

  // Sort by relevance
  scored.sort((a, b) => b.score - a.score);

  // Build context from top docs
  let context = '';
  for (const doc of scored) {
    if (doc.score === 0) break;
    const excerpt = doc.content.substring(0, 500);
    const chunk = `[${doc.name}]\n${excerpt}\n\n`;
    if (context.length + chunk.length > maxChars) break;
    context += chunk;
  }

  return context;
}

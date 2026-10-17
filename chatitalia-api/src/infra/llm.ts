import logger from '../logger';
import { z } from 'zod/v3'
import { config } from '../config'
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, createAgent, HumanMessage, providerStrategy, SystemMessage } from 'langchain';
import { ChatGeneration } from '@langchain/core/outputs';

export type ChatHistoryItem = { role: string; content: string };

// Prompt de sistema com cache de prompt da Anthropic (via OpenRouter).
// `cached` é a parte fixa (regras, exemplos, lição): vai marcada com
// cache_control e, da 2ª mensagem em diante, é lida do cache (mais barata e
// mais rápida). `dynamic` é o que muda a cada mensagem (fala do aluno, erros)
// e vem depois, pra não quebrar o prefixo cacheado. Uma string sozinha é
// cacheada inteira.
export type SystemPrompt = string | { cached: string; dynamic: string };

function toSystemMessage(prompt: SystemPrompt) {
  const { cached, dynamic } = typeof prompt === 'string' ? { cached: prompt, dynamic: '' } : prompt;
  return new SystemMessage({
    content: [
      { type: 'text', text: cached, cache_control: { type: 'ephemeral' } } as any,
      ...(dynamic ? [{ type: 'text' as const, text: dynamic }] : []),
    ],
  });
}

// Converte o histórico da conversa em mensagens de chat nativas
// (user -> HumanMessage, qualquer outro papel -> AIMessage/assistente).
function toChatMessages(history: ChatHistoryItem[] = []) {
  return history.map((message) =>
    message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content),
  );
}

export class LLMService {
  llmClient: any;

  // `modelName` sobrescreve `config.model` (ex.: planner num modelo mais forte).
  constructor(modelName?: string) {

    try {
      this.llmClient = new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: modelName || config.model,
        configuration: {
          baseURL: config.baseURL,
        },
        // Roteamento de provedor do OpenRouter: escolhe o mais barato/rápido,
        // sempre com fallback se o preferido estiver fora.
        modelKwargs: {
          provider: { sort: config.providerSort || 'price', allow_fallbacks: true },
        },
      });

      logger.info('LLM client created');
    } catch (err: unknown) {
      logger.warn({ err }, 'Could not create ChatOpenAI client, falling back to null client');
      this.llmClient = null;
    }
  }

  async generatedStructure<T = any>(
    systemPrompt: SystemPrompt,
    userPrompt: string,
    schema: z.ZodSchema<T>,
    history: ChatHistoryItem[] = [],
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      if (!this.llmClient) throw new Error('LLM client not available');

      const agent = createAgent({
        model: this.llmClient,
        responseFormat: providerStrategy(schema)
      });

      // O history costuma já terminar com a última fala do usuário (= userPrompt).
      // Remove esse item duplicado antes de anexar o HumanMessage final.
      const last = history[history.length - 1];
      const priorHistory =
        last && last.role === 'user' && last.content === userPrompt ? history.slice(0, -1) : history;

      const messages = [
        toSystemMessage(systemPrompt),
        ...toChatMessages(priorHistory),
        new HumanMessage(userPrompt),
      ];

      const data = await agent.invoke({
        messages,
      }, {
        callbacks: [{
          handleChatModelStart(_llm, promptMessages) {
            const lastMsg = promptMessages.at(-1)?.at(-1);
            logger.info(
              { lastMessage: lastMsg?.content?.toString() },
              'LLM thinking'
            );
          },
          handleLLMEnd(output) {
            const msg = (output.generations?.at(0)?.at(0) as ChatGeneration)?.message as AIMessage;
            const usage = msg?.usage_metadata;
            if (usage) {
              logger.info(
                { inputTokens: usage.input_tokens, cacheRead: usage.input_token_details?.cache_read ?? 0 },
                'LLM usage',
              );
            }
            const toolCalls = msg?.tool_calls;
            if (toolCalls?.length) {
              logger.info(
                { toolCalls: toolCalls.map((toolCall) => toolCall.name) },
                'LLM decided to call tools'
              );
            }
          },
          handleToolStart(_tool, input, _runId, _parentRunId, _tags, _metadata, runName) {
            logger.info({ input, tool: runName }, 'LLM tool started');
          },
          handleToolEnd(output, _runId, _parentRunId, runName) {
            logger.info({ output, tool: runName }, 'LLM tool finished');
          },
        }]
      },);
      const structured = (data as any).structuredResponse;
      const parsed = schema.parse(structured);

      return { success: true, data: parsed };
    } catch (error: any) {
      logger.error({ error }, 'generatedStructure error');
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async run<T = string | Record<string, any>>(
    systemPrompt: string,
    userMessage: string,
    parseJson: boolean = false
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
  }> {
    try {
      if (!this.llmClient) throw new Error('LLM client not available');

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage)
      ];

      const response = await this.llmClient.invoke(messages);
      const content = response.content;

      if (parseJson) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return {
            success: false,
            error: 'Could not extract JSON from LLM response'
          };
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          const normalizedJson = jsonMatch[0]
            .replace(
              /\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g,
              '\\\\'
            )
            .replace(
              /([}\]])\s*("(?:\\.|[^"\\])*"\s*:)/g,
              '$1,$2'
            )
            .replace(
              /("(?:\\.|[^"\\])*"|true|false|null|-?\d+(?:\.\d+)?)\s+("(?:\\.|[^"\\])*"\s*:)/g,
              '$1,$2'
            );

          try {
            parsed = JSON.parse(normalizedJson);
            logger.warn({ parseError }, 'Repaired malformed JSON from LLM response');
          } catch (repairError) {
            logger.error(
              { parseError, repairError, contentLength: content.length },
              'Could not parse LLM JSON response'
            );
            return {
              success: false,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            };
          }
        }
        return { success: true, data: parsed as T };
      }

      return { success: true, data: content as unknown as T };
    } catch (error: any) {
      logger.error({ error }, 'run error');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

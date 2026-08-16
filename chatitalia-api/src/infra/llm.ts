import logger from '../logger';
import { z } from 'zod/v3'
import { config } from '../config'
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, HumanMessage, providerStrategy, SystemMessage } from 'langchain';

export class LLMService {
  llmClient: any;

  constructor() {

    try {
      this.llmClient = new ChatOpenAI({
        apiKey: config.apiKey,
        modelName: config.model,
        configuration: {
          baseURL: config.baseURL,
        }
      });

      logger.info('LLM client created');
    } catch (err: unknown) {
      logger.warn({ err }, 'Could not create ChatOpenAI client, falling back to null client');
      this.llmClient = null;
    }
  }

  async generatedStructure<T = any>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>,
    tools: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      if (!this.llmClient) throw new Error('LLM client not available');

      const agent = createAgent({
        model: this.llmClient,
        tools,
        responseFormat: providerStrategy(schema)
      });

      const messages = [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)];

      const data = await agent.invoke({ messages });
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

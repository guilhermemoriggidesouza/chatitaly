import { config } from '../config';
import { LLMService } from '../infra/llm';
import logger from '../logger';
import {
  buildTranscriptFixerInput,
  TRANSCRIPT_FIXER_PROMPT,
  TranscriptFixerSchema,
  TranscriptFixerType,
} from '../prompts/transcript-fixer';

// Passada rápida depois do STT: o modelo de transcrição escreve como ouve
// ("ovent yani", "rezidenza"). Um modelo barato reescreve com a grafia certa
// SEM consertar o italiano do aluno. Falhou ou demorou: segue com o bruto.
const FIX_TIMEOUT_MS = 5000;

export async function fixTranscript(raw: string, lastDonMessage?: string): Promise<string> {
  if (!raw) return raw;

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS));
  const call = new LLMService(config.errorModel).generatedStructure<TranscriptFixerType>(
    TRANSCRIPT_FIXER_PROMPT,
    buildTranscriptFixerInput(raw, lastDonMessage),
    TranscriptFixerSchema,
  );

  const result = await Promise.race([call, timeout]);
  const fixed = result?.success ? String(result.data?.text ?? '').replace(/\s+/g, ' ').trim() : '';

  if (!fixed) {
    logger.warn({ raw, timedOut: result === null }, 'TranscriptFixer: sem revisão, usando transcrição bruta');
    return raw;
  }

  // Bruto x revisado lado a lado: é aqui que se vê se a revisão escondeu erro real.
  logger.info({ raw, fixed, changed: raw !== fixed }, 'TranscriptFixer: transcrição revisada');
  return fixed;
}

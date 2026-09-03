import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tts as ttsConfig } from '../config';
import logger from '../logger';

// Modelo do config; se não existir (dev local), tenta chatitalia-api/models/.
function resolveModel(configured: string): string {
  if (existsSync(configured)) return configured;
  const local = join(process.cwd(), 'models', basename(configured));
  return existsSync(local) ? local : configured;
}

// TTS local via Piper (binário). Voz italiana, sem chave, sem custo.
export class TTSService {
  private readonly enabled = ttsConfig.enabled;
  private readonly model = resolveModel(ttsConfig.piperModel);

  // Gera a fala do Don. Retorna um data URI de WAV, ou '' se desligado/falhar.
  async synthesize(text: string): Promise<string> {
    if (!this.enabled || !text?.trim()) return '';

    const outFile = join(tmpdir(), `don-${randomUUID()}.wav`);
    try {
      await this.runPiper(text.trim(), outFile);
      const wav = await readFile(outFile);
      return `data:audio/wav;base64,${wav.toString('base64')}`;
    } catch (err: unknown) {
      logger.warn({ err: (err as Error).message }, 'Piper TTS falhou; resposta sem áudio');
      return '';
    } finally {
      unlink(outFile).catch(() => undefined);
    }
  }

  private runPiper(text: string, outFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ttsConfig.piperBin, [
        '--model', this.model,
        '--output_file', outFile,
      ]);

      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d; });
      proc.on('error', reject); // binário não encontrado
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`piper exit ${code}: ${stderr.slice(0, 300)}`));
      });

      proc.stdin.write(text);
      proc.stdin.end();
    });
  }

  // Valida o binário no boot só para logar cedo se estiver faltando.
  warmUp(): void {
    if (!this.enabled) return;
    const proc = spawn(ttsConfig.piperBin, ['--help']);
    proc.on('error', (err) =>
      logger.warn({ err: err.message, bin: ttsConfig.piperBin }, 'piper indisponível'),
    );
    proc.on('close', () => logger.info('Piper (TTS) disponível'));
    // piper --help sai com código != 0 em algumas versões; o `error` acima já
    // cobre "binário não encontrado", que é o que importa.
  }
}

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { STTService } from '../infra/stt';

// Eval da transcrição: roda os áudios reais de evals/stt/ (enviados pelo
// WhatsApp) em cada modelo e confere se o texto bate com o que foi DITO.
// Os casos com erro proposital checam que a transcrição NÃO conserta o
// italiano do aluno (é com esses erros que o Don corrige).
//
//   npm run eval:stt                                   -> modelos padrão abaixo
//   npm run eval:stt -- xiaomi/mimo-v2.6-flash         -> só esses modelos
//   ROUNDS=5 npm run eval:stt                          -> mais rodadas por áudio
//
// Chama a API de verdade (custa centavos). Sai com código 1 se o modelo de
// produção (config.sttModel) errar algum caso.
//
// Novo caso: coloque o áudio em evals/stt/audios/ e adicione em cases.json
// o que foi dito ("accept" = grafias aceitas).

type Case = { file: string; said: string; accept: string[] };

const DIR = path.resolve(__dirname, '../../evals/stt');
const DEFAULT_MODELS = [
  'google/gemini-3.5-flash-lite',
  'xiaomi/mimo-v2.6-flash',
  'google/gemini-3.8-flash',
  'qwen/qwen3.8-omni-flash',
];
const ROUNDS = Number(process.env.ROUNDS || 3);

// Compara sem maiúscula, pontuação final nem espaços extras.
const normalize = (text: string) =>
  text.toLowerCase().replace(/[.,!?;:"«»“”]/g, '').replace(/\s+/g, ' ').trim();

const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
};

const mimeFor = (file: string) => (file.endsWith('.wav') ? 'audio/wav' : 'audio/ogg; codecs=opus');

async function evalModel(model: string, cases: Case[]) {
  const times: number[] = [];
  const costs: number[] = [];
  const failures: string[] = [];
  let passed = 0;
  let total = 0;

  for (const testCase of cases) {
    const audio = fs.readFileSync(path.join(DIR, 'audios', testCase.file));
    const accept = testCase.accept.map(normalize);

    for (let round = 0; round < ROUNDS; round++) {
      const stt = new STTService(model);
      const started = Date.now();
      let output: string;
      try {
        output = await stt.transcribe(audio, mimeFor(testCase.file));
      } catch (error: any) {
        output = `ERRO: ${error.message}`;
      }
      times.push(Date.now() - started);
      costs.push(stt.lastCost);
      total++;

      if (accept.includes(normalize(output))) passed++;
      else failures.push(`  ✗ ${testCase.file} (disse: ${testCase.said}) -> "${output}"`);
    }
  }

  const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / (costs.length || 1);
  return { model, passed, total, failures, median: percentile(times, 0.5), p90: percentile(times, 0.9), worst: Math.max(...times), avgCost };
}

async function main() {
  const cases: Case[] = JSON.parse(fs.readFileSync(path.join(DIR, 'cases.json'), 'utf8'));
  const models = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MODELS;
  console.log(`Eval STT: ${cases.length} áudios × ${ROUNDS} rodadas × ${models.length} modelos\n`);

  // Modelos em paralelo, áudios em sequência (o tempo medido é de uma chamada sozinha).
  const results = await Promise.all(models.map((model) => evalModel(model, cases)));

  for (const result of results) {
    const pct = ((result.passed / result.total) * 100).toFixed(0);
    console.log(`## ${result.model}${result.model === config.sttModel ? '  (produção)' : ''}`);
    console.log(`   acertos ${result.passed}/${result.total} (${pct}%) | tempo mediana ${result.median}ms, p90 ${result.p90}ms, pior ${result.worst}ms`);
    console.log(`   custo médio US$ ${result.avgCost.toFixed(7)} por áudio (US$ ${(result.avgCost * 1000).toFixed(4)} a cada 1000 áudios)`);
    if (result.failures.length) console.log(result.failures.join('\n'));
    console.log('');
  }

  const production = results.find((result) => result.model === config.sttModel);
  if (production && production.passed < production.total) {
    console.log(`FALHOU: o modelo de produção (${config.sttModel}) errou ${production.total - production.passed} caso(s).`);
    process.exit(1);
  }
  process.exit(0);
}

main();

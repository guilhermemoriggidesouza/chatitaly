// Normaliza para "como soa": sem acento, sem pontuação, minúsculo.
const COMBINING_MARKS = /[̀-ͯ]/g;
const SPEECH_IRRELEVANT_PUNCT = /[.,!?;:…"'`«»~()\[\]{}\/\\_*–—-]/g;
export const normalizeForSpeech = (value: string): string =>
  (value || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // tira acentos
    .toLowerCase()
    .replace(SPEECH_IRRELEVANT_PUNCT, ' ') // pontuação -> espaço
    .replace(/\s+/g, ' ')
    .trim();

// Erro cuja única diferença é ESCRITA (maiúscula, pontuação, "...", acento).
// O aluno está FALANDO: isso nunca é um erro. Trava determinística, não
// depende do LLM obedecer o prompt.
export const isWritingOnlyError = (error: { original?: string; correction?: string }): boolean => {
  const original = normalizeForSpeech(error?.original ?? '');
  const correction = normalizeForSpeech(error?.correction ?? '');
  return original.length > 0 && original === correction;
};

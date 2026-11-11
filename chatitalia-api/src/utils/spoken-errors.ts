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

// Normaliza para o SOM em italiano, pra comparar o que a transcrição escreveu
// com a correção. O "h" é mudo (o/ho, a/ha, anno/hanno), "s" entre vogais soa
// como "z" (rezidenza/residenza), "k/j/y" são grafias que a máquina inventa e
// a separação de palavras não se ouve (ventianni/venti anni). A transcrição
// também perde consoante dupla ("ani" por "anni"), então dupla = simples: o
// preço é não corrigir "ano"/"anno" em áudio. "ch/gh" soam diferente e ficam.
export const normalizeForItalianSound = (value: string): string =>
  normalizeForSpeech(value)
    .replace(/ch/g, 'K')
    .replace(/gh/g, 'G')
    .replace(/h/g, '')
    .replace(/q|k|c(?![ei])/g, 'K')
    .replace(/g(?![eiln])/g, 'G')
    .replace(/z/g, 's')
    .replace(/[jy]/g, 'i')
    .replace(/\s+/g, '')
    .replace(/(.)\1+/g, '$1');

// Áudio: o aluno não escolhe a grafia, a máquina escolhe. Se o original e a
// correção SOAM iguais, a "correção" é da transcrição, não do aluno — nunca é
// erro. Trava determinística: não depende do LLM obedecer o prompt.
export const isSameSoundError = (error: { original?: string; correction?: string }): boolean => {
  const original = normalizeForItalianSound(error?.original ?? '');
  const correction = normalizeForItalianSound(error?.correction ?? '');
  return original.length > 0 && original === correction;
};

// Idioma da resposta do Don e o padrão das correções, conforme o nível.
// A1/A2 (ou sem nível): correções e explicações em português, a conversa em
// italiano simples. B1 em diante: tudo em italiano.
// O áudio é sempre em italiano (a voz do Piper é italiana): no A1/A2 o Don
// devolve em "spoken" a mesma fala só em italiano; no B1+ "spoken" vem vazio
// e o áudio usa o próprio "response".
// Nível desconhecido conta como A1, como em level-complexity.
export const isMixedLanguageLevel = (level?: string): boolean =>
    !/^[BC][12]$/.test((level || '').toUpperCase());

// Frase correta (sem erros): o Don não explica por que está certa, não cita
// regra nem repete a frase — segue a conversa. Entra no prompt NO LUGAR do
// padrão de correção (decidido no código, não pelo modelo).
const CORRECT_SENTENCE_RULES = [
    `## The student's message is CORRECT (no errors)`,
    `- NEVER explain why it is correct, NEVER mention a grammar rule, NEVER repeat the student's sentence back.`,
    `- No corrections at all: no "Você disse / Hai detto", no "A frase inteira fica assim / La frase giusta è". Same in "spoken".`,
    `- Just react naturally to WHAT they said and keep the conversation going.`,
    `- Example: student "Ho venti anni" -> response: "Vent'anni, che bella età! E cosa fai di bello nella vita?"`,
];

// `hasErrors` vem da lista de erros: com erros, entra o padrão de correção;
// sem erros, entram as regras de frase correta.
export const buildLanguageSection = (level?: string, hasErrors: boolean = true): string[] => {
    if (isMixedLanguageLevel(level)) {
        if (!hasErrors) {
            return [
                `## Output language: Portuguese + Italian (beginner)`,
                `"response": your reply in simple Italian (use Portuguese only to explain the answer to a question the student asked). The final question is always in Italian.`,
                `"spoken" is the same "response" said ONLY in Italian, final question included (it becomes the audio). Never put Portuguese in "spoken".`,
                ``,
                ...CORRECT_SENTENCE_RULES,
            ];
        }
        return [
            `## Output language: Portuguese + Italian (beginner)`,
            `"response" mixes Portuguese (pt-BR) and Italian: every correction and explanation in Portuguese; the Italian words being corrected, the right form, your warm line of conversation and the final question in simple Italian.`,
            `"spoken" is the same "response" said ONLY in Italian (it becomes the audio): same corrections, same line and same final question, with the explanations translated into simple Italian. Never put Portuguese in "spoken".`,
            ``,
            `## Correction pattern (one per item in "errors", in this exact shape)`,
            `If two or more items have the same reason, correct them in ONE line and give the explanation only once — never explain the same rule twice.`,
            `Você disse 'ORIGINAL', mas na verdade é 'CORRECTION', porque EXPLANATION IN PORTUGUESE.`,
            `- "response": Você disse 'io sono 30 anni', mas na verdade é 'ho 30 anni', porque em italiano a idade se diz com o verbo 'avere'.`,
            `- "spoken": Hai detto 'io sono 30 anni', ma in realtà è 'ho 30 anni', perché l'età si dice con 'avere'.`,
            ``,
            `## Whole sentence, corrected`,
            `Right after the last correction, say the student's WHOLE message again with every correction applied, in this exact shape:`,
            `- "response": A frase inteira fica assim: 'CORRECTED SENTENCE'.`,
            `- "spoken": La frase giusta è: 'CORRECTED SENTENCE'.`,
            `Example: student "io sono 30 anni e mi piace di cucinare" -> A frase inteira fica assim: 'Ho 30 anni e mi piace cucinare'.`,
        ];
    }

    if (!hasErrors) {
        return [
            `## Output language: ITALIAN`,
            `Write "response" only in Italian. "spoken" is always an empty string.`,
            ``,
            ...CORRECT_SENTENCE_RULES,
        ];
    }
    return [
        `## Output language: ITALIAN`,
        `Write "response" only in Italian. "spoken" is always an empty string.`,
        ``,
        `## Correction pattern (one per item in "errors", in this exact shape)`,
            `If two or more items have the same reason, correct them in ONE line and give the explanation only once — never explain the same rule twice.`,
        `Hai detto 'ORIGINAL', ma in realtà è 'CORRECTION', perché EXPLANATION.`,
        `- Hai detto 'ieri ho andato', ma in realtà è 'ieri sono andato', perché 'andare' vuole l'ausiliare 'essere'.`,
        ``,
        `## Whole sentence, corrected`,
        `Right after the last correction, say the student's WHOLE message again with every correction applied, in this exact shape:`,
        `La frase giusta è: 'CORRECTED SENTENCE'.`,
        `Example: student "ieri ho andato al mercato e ho comprato pane" -> La frase giusta è: 'Ieri sono andato al mercato e ho comprato il pane'.`,
    ];
};

// Texto que vira áudio: sempre em italiano ("spoken" no A1/A2, "response" no B1+).
export const buildSpeechText = (finalResponse: { response?: string; spoken?: string } | undefined): string =>
    (finalResponse?.spoken?.trim() || finalResponse?.response || '').trim();

// Junta duas falas com espaço, pondo ponto só se a primeira não terminar em
// pontuação (evita "italiana!. Adesso").
export const joinSentences = (first: string, second: string): string => {
    const a = first.trim();
    if (!a) return second.trim();
    return `${/[.!?…]$/.test(a) ? a : `${a}.`} ${second.trim()}`.trim();
};

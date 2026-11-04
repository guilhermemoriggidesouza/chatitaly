// Idioma da resposta do Don e o padrão das correções, conforme o nível.
// A1/A2 (ou sem nível): correções e explicações em português, a conversa em
// italiano simples. B1 em diante: tudo em italiano.
// O áudio é sempre em italiano (a voz do Piper é italiana): no A1/A2 o Don
// devolve em "spoken" a mesma fala só em italiano; no B1+ "spoken" vem vazio
// e o áudio usa o próprio "response".
// Nível desconhecido conta como A1, como em level-complexity.
export const isMixedLanguageLevel = (level?: string): boolean =>
    !/^[BC][12]$/.test((level || '').toUpperCase());

export const buildLanguageSection = (level?: string): string[] => {
    if (isMixedLanguageLevel(level)) {
        return [
            `## Output language: Portuguese + Italian (beginner)`,
            `"response" mixes Portuguese (pt-BR) and Italian: every correction and explanation in Portuguese; the Italian words being corrected, the right form and your warm line of conversation in simple Italian. "question" is always in Italian.`,
            `"spoken" is the same "response" said ONLY in Italian (it becomes the audio): same corrections and same line, with the explanations translated into simple Italian. Never put Portuguese in "spoken".`,
            ``,
            `## Correction pattern (one per item in "errors", in this exact shape)`,
            `Você disse 'ORIGINAL', mas na verdade é 'CORRECTION', porque EXPLANATION IN PORTUGUESE.`,
            `- "response": Você disse 'io sono 30 anni', mas na verdade é 'ho 30 anni', porque em italiano a idade se diz com o verbo 'avere'.`,
            `- "spoken": Hai detto 'io sono 30 anni', ma in realtà è 'ho 30 anni', perché l'età si dice con 'avere'.`,
            ``,
            `## Whole sentence, corrected (only when "errors" is not empty)`,
            `Right after the last correction, say the student's WHOLE message again with every correction applied, in this exact shape:`,
            `- "response": A frase inteira fica assim: 'CORRECTED SENTENCE'.`,
            `- "spoken": La frase giusta è: 'CORRECTED SENTENCE'.`,
            `Example: student "io sono 30 anni e mi piace di cucinare" -> A frase inteira fica assim: 'Ho 30 anni e mi piace cucinare'.`,
        ];
    }

    return [
        `## Output language: ITALIAN`,
        `Write "response" and "question" only in Italian. "spoken" is always an empty string.`,
        ``,
        `## Correction pattern (one per item in "errors", in this exact shape)`,
        `Hai detto 'ORIGINAL', ma in realtà è 'CORRECTION', perché EXPLANATION.`,
        `- Hai detto 'ieri ho andato', ma in realtà è 'ieri sono andato', perché 'andare' vuole l'ausiliare 'essere'.`,
        ``,
        `## Whole sentence, corrected (only when "errors" is not empty)`,
        `Right after the last correction, say the student's WHOLE message again with every correction applied, in this exact shape:`,
        `La frase giusta è: 'CORRECTED SENTENCE'.`,
        `Example: student "ieri ho andato al mercato e ho comprato pane" -> La frase giusta è: 'Ieri sono andato al mercato e ho comprato il pane'.`,
    ];
};

// Texto que vira áudio: sempre em italiano.
export const buildSpeechText = (
    finalResponse: { response?: string; spoken?: string; question?: string } | undefined,
    separator: string = ' ',
): string =>
    [finalResponse?.spoken?.trim() || finalResponse?.response, finalResponse?.question]
        .filter(Boolean)
        .join(separator)
        .trim();

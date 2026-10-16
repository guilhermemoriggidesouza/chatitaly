import { z } from 'zod/v3';

const Example = z.object({
    italian: z.string(),
    portuguese: z.string(),
});

// Uma frase de exemplo por tempo do cartão do verbo (o mesmo conjunto de
// tempos que aparece no print enviado no WhatsApp).
export const VerbExamplesSchema = z.object({
    presente: Example,
    passatoProssimo: Example,
    imperfetto: Example,
    futuro: Example,
    condizionale: Example,
    imperativo: Example,
});

export type VerbExamplesType = z.infer<typeof VerbExamplesSchema>;

// Frases de exemplo do verbo do dia, todas numa chamada só. Geradas uma vez
// por verbo e reaproveitadas pra todos os alunos.
export const buildVerbExamplesSystemPrompt = (infinitive: string, translation: string, auxiliary: string) => {
    return [
        `You write example sentences for an Italian verb, for a BRAZILIAN student. Each sentence will also be read aloud.`,
        ``,
        `- Verb: ${infinitive} (${translation}). Auxiliary in compound tenses: ${auxiliary}.`,
        `- Write ONE short, natural, everyday sentence for each tense below, always using THIS verb conjugated in that tense. Simple vocabulary. Double-check every conjugation.`,
        `  - "presente": presente indicativo.`,
        `  - "passatoProssimo": passato prossimo (${auxiliary} + participio${auxiliary === 'essere' ? ', agreeing with the subject' : ''}).`,
        `  - "imperfetto": imperfetto indicativo, describing a habit or a situation in the past.`,
        `  - "futuro": futuro semplice.`,
        `  - "condizionale": condizionale presente used to ASK for something politely or express a wish.`,
        `  - "imperativo": imperativo (tu or voi) used to give an instruction.`,
        `- Use different subjects and situations across the sentences.`,
        `- "italian": the sentence in Italian. "portuguese": its translation in Brazilian Portuguese.`,
    ].join('\n');
};

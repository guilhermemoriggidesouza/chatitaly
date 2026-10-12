import { z } from 'zod/v3';

export const VerbExampleSchema = z.object({
    italian: z.string(),
    portuguese: z.string(),
});

export type VerbExampleType = z.infer<typeof VerbExampleSchema>;

// Frase de exemplo do verbo do dia (WhatsApp). Gerada uma vez por verbo.
export const buildVerbExampleSystemPrompt = (infinitive: string, translation: string) => {
    return [
        `You write ONE example sentence for an Italian verb, for a BRAZILIAN beginner student.`,
        ``,
        `- Verb: ${infinitive} (${translation}).`,
        `- "italian": one short, natural, everyday sentence using the verb conjugated in the presente indicativo. Simple vocabulary. Double-check the conjugation.`,
        `- "portuguese": its translation in Brazilian Portuguese.`,
    ].join('\n');
};

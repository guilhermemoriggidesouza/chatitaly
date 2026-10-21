import { CELI_A1 } from './a1';
import { CELI_A2 } from './a2';
import { CELI_B1 } from './b1';
import { CELI_B2 } from './b2';
import { CeliReference } from './types';

export type { CeliReference } from './types';

// Níveis do CELI já cadastrados. Para incluir outro nível, crie o arquivo
// (ex.: a2.ts) e adicione aqui.
const CELI_BY_LEVEL: Record<string, CeliReference> = {
    A1: CELI_A1,
    A2: CELI_A2,
    B1: CELI_B1,
    B2: CELI_B2,
};

export function getCeliReference(level?: string): CeliReference | undefined {
    return level ? CELI_BY_LEVEL[level.trim().toUpperCase()] : undefined;
}

// Texto da referência para entrar num prompt.
export function formatCeliCompetences(ref: CeliReference): string {
    return [
        `### ${ref.exam} — what the candidate must know`,
        `Grammar:`,
        ...ref.grammar.map((item) => `- ${item}`),
        `Vocabulary: ${ref.vocabulary}`,
        `Exam tasks:`,
        ...ref.tasks.map((item) => `- ${item}`),
    ].join('\n');
}

export function formatCeliOralRubric(ref: CeliReference): string {
    return [
        `### ${ref.exam} — official oral rubric`,
        ...ref.oralRubric.flatMap((dimension) => [
            `${dimension.dimension}:`,
            ...dimension.levels.map((level) => `- ${level}`),
        ]),
    ].join('\n');
}

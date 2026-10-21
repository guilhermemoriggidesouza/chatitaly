// Referência de um nível do CELI (competências exigidas + escalas de
// correção). Cada nível fica num arquivo próprio (a1.ts, a2.ts...).
export type CeliReference = {
    level: string;
    exam: string;
    grammar: string[];
    vocabulary: string;
    tasks: string[];
    // Escala da produção escrita (nem todo nível veio com ela).
    writingRubric?: string[];
    // Escala oficial da prova oral. Só as dimensões que dá pra avaliar por
    // texto/transcrição (a fonética fica de fora).
    oralRubric: { dimension: string; levels: string[] }[];
    // Quando a última fala do aluno basta pra avançar de tema, em termos da
    // escala oral acima (vai no prompt da decisão de avanço, em inglês).
    advanceBar: string;
};

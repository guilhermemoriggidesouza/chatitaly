// Verbo REGULAR disponível na página de conjugação. A conjugação em si não é
// salva: o front monta radical + terminação a partir do infinitivo.
export type Verb = {
    verbId: string,
    // Infinitivo em italiano, minúsculo (ex.: "parlare").
    infinitive: string,
    // Tradução em português (ex.: "falar").
    translation: string,
    // Auxiliar dos tempos compostos — não dá pra deduzir por regra.
    auxiliary: 'avere' | 'essere',
    // Verbos em -ire que recebem -isc- (capire -> capisco).
    isc: boolean,
    // Posição do verbo, do mais usado (0) para o menos usado. É a ordem em
    // que o aluno recebe o verbo do dia. Vem da posição em data/verbs-seed.ts.
    order: number,
    createdAt: string,
    // Frases de exemplo enviadas com o verbo do dia no WhatsApp, uma por tempo
    // do cartão. Geradas na primeira vez que o verbo sai e reaproveitadas.
    examples?: Record<string, { italian: string, portuguese: string }>
}

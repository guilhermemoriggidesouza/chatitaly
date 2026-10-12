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
    createdAt: string,
    // Frase de exemplo enviada com o verbo do dia no WhatsApp. Gerada na
    // primeira vez que o verbo é sorteado e reaproveitada depois.
    example?: { italian: string, portuguese: string }
}

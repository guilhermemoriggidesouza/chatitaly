export type ThemeConsideration = {
    themeId?: string,
    theme?: string,
    considerations: string
}

export type Lesson = {
    name: string,
    lessonId: string,
    finalConsiderations?: string,
    themeIds: string[],
    // Uma nota curta por tema concluído; a final da lição é o resumo de todas.
    themeConsiderations?: ThemeConsideration[]
}

export type WhatsSchedule = {
    // 'verbs' = verbo do dia; 'lesson' = pergunta do dia sobre o tema que o
    // aluno está estudando.
    type: 'verbs' | 'lesson',
    // Dias da semana: 0 = domingo ... 6 = sábado.
    weekDays: number[],
    // Horário em que a mensagem será enviada, "HH:mm".
    hour: string
}

export type WhatsConfig = {
    phone: string,
    // Fuso horário do aluno (IANA, ex.: America/Sao_Paulo). O `hour` de cada
    // agendamento é nesse fuso.
    timezone: string,
    configs: WhatsSchedule[] | null,
}

export type User = {
    userId: string,
    level: string,
    lessons: Lesson[],
    whatsConfig?: WhatsConfig | null,
    // Dia local (YYYY-MM-DD) do último envio agendado de cada tipo. Fica fora
    // do whatsConfig pra não ser apagado quando o aluno salva a configuração.
    whatsLastSent?: Partial<Record<WhatsSchedule['type'], string>>,
    // Verbos do dia que o aluno já recebeu (infinitivos). O próximo envio é o
    // primeiro da ordem dos verbos que ainda não está aqui; quando ele já
    // recebeu todos, a lista recomeça.
    whatsReadVerbs?: string[],
    premium?: boolean,
    premiumEnabledAt?: string
}
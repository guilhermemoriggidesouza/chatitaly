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
    type: 'verbs' | 'lesson',
    // Dias da semana: 0 = domingo ... 6 = sábado.
    weekDays: number[],
    // Horário em que a mensagem será enviada, "HH:mm".
    hour: string
}

export type WhatsConfig = {
    phone: string,
    configs: WhatsSchedule[] | null,
}

export type User = {
    userId: string,
    level: string,
    lessons: Lesson[],
    whatsConfig?: WhatsConfig | null,
    premium?: boolean,
    premiumEnabledAt?: string
}
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
export type User = {
    userId: string,
    level: string,
    lessons: Lesson[],
    // Celular do aluno no WhatsApp: só dígitos, com DDI (ex.: 5519989375173).
    phone?: string
}
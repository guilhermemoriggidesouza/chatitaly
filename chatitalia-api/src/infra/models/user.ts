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
    lessons: Lesson[]
}
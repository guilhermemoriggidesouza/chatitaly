export type Lesson = {
    name: string,
    lessonId: string,
    finalConsiderations: string | undefined,
    themeIds: string[]
}
export type User = {
    userId: string,
    level: string,
    lessons: Lesson[]
}
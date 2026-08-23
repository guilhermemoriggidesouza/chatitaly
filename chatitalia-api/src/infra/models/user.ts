export type Lesson = {
    name: string,
    lessonId: string,
    finalConsiderations?: string,
    themeIds: string[]
}
export type User = {
    userId: string,
    level: string,
    lessons: Lesson[]
}
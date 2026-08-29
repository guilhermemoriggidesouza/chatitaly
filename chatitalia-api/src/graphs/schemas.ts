import { z } from 'zod/v3';

export const Step = z.object({ type: z.string(), description: z.string(), finished: z.boolean(), result: z.any() });
export const Message = z.object({ role: z.string(), content: z.string() });
export const Errors = z.array(
    z.object({
        original: z.string(),
        correction: z.string(),
        explanation: z.string()
    })
)
export const Context = z.object({
    theme: z.string().optional(),
    themeId: z.string().optional(),
    lesson: z.string().optional(),
    lessonId: z.string().optional(),
    userId: z.string().optional(),
    bookId: z.string().optional(),
    level: z.string().optional()
})
export type StepState = z.infer<typeof Step>;
export type ContextState = z.infer<typeof Context>;
export type ErrorsState = z.infer<typeof Errors>;
export type MessageState = z.infer<typeof Message>;

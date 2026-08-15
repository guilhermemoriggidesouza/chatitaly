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
export type StepState = z.infer<typeof Step>;
export type ErrorsState = z.infer<typeof Errors>;
export type MessageState = z.infer<typeof Message>;

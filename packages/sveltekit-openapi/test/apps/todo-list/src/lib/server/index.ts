import { z } from "zod"

export const newTodoSchema = z.object({
	title: z.string().min(1).max(32),
	done: z.boolean().default(false),
})

export const todoSchema = newTodoSchema.extend({
	id: z.string().uuid(),
})

export type Todo = z.infer<typeof todoSchema>

export const todosStore: Todo[] = Array.from({ length: 3 }, (_, idx) => ({
	id: crypto.randomUUID(),
	title: `Task ${idx + 1}`,
	done: idx === 1,
}))

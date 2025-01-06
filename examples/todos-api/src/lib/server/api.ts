import { z } from "zod"
import { defineAPI } from "sveltekit-openapi"

export const api = defineAPI({
	info: {
		title: "Todos API",
		description: "This API is designed to facilitate development of the sveltekit-openapi package.",
		version: "0.0.1",
	},
	servers: [{ url: "http://localhost:5173" }],
})

export const schemas = {
	newTodo: z.object({
		title: z.string().min(3),
		done: z.boolean().default(false),
	}),
	todo: z.object({
		id: z.string().uuid(),
		title: z.string().min(3),
		done: z.boolean().default(false),
	}),
}

export type NewTodo = z.infer<typeof schemas.newTodo>
export type Todo = z.infer<typeof schemas.todo>

export const todosStore = new Map<string, z.infer<typeof schemas.todo>>(
	Array.from({ length: 3 }, (_, idx) => {
		const randomUUID = crypto.randomUUID()
		return [randomUUID, { id: randomUUID, title: `Todo ${idx + 1}`, done: idx === 0 }]
	}),
)

import { collectHandlers, defineHandler } from "sveltekit-openapi"
import { z } from "zod"

import { newTodoSchema, todoSchema, todosStore } from "$lib/server"

export const GET = defineHandler(
	{
		operationId: "getTodos",
		parameters: {
			query: z.object({
				search: z.string().optional(),
			}),
		},
		responses: {
			200: z.object({
				todos: z.array(todoSchema),
			}),
		},
	},
	async ({ params, json }) => {
		console.log(await collectHandlers())

		if (params.query.search) {
			const searchStr = params.query.search.toLowerCase()
			return json(200, { todos: todosStore.filter((item) => item.title.includes(searchStr)) })
		}

		return json(200, { todos: todosStore })
	},
)

export const POST = defineHandler(
	{
		operationId: "createTodo",
		requestBody: newTodoSchema,
		responses: {
			200: z.object({
				todo: todoSchema,
			}),
		},
	},
	({ params, json }) => {
		const todo = { id: crypto.randomUUID(), ...params.body }
		todosStore.push(todo)

		return json(200, { todo })
	},
)

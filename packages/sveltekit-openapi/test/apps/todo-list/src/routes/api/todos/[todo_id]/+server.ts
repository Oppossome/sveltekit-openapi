import { define } from "sveltekit-openapi"
import { z } from "zod"

import { newTodoSchema, todoSchema, todosStore } from "$lib/server"

const pathSchema = z.object({
	todo_id: z.string().uuid(),
})

export const GET = define(
	{
		operationId: "getTodo",
		parameters: { path: pathSchema },
		responses: {
			200: z.object({ todo: todoSchema }),
			404: z.object({ message: z.string() }),
		},
	},
	({ params, json }) => {
		const todo = todosStore.find((item) => item.id === params.path.todo_id)
		if (!todo) return json(404, { message: `Todo with ID ${params.path.todo_id} not found!` })

		return json(200, { todo })
	},
)

export const PATCH = define(
	{
		operationId: "patchTodo",
		parameters: { path: pathSchema },
		requestBody: newTodoSchema,
		responses: {
			200: z.object({ todo: todoSchema }),
			404: z.object({ message: z.string() }),
		},
	},
	({ params, json }) => {
		const todo = todosStore.find((item) => item.id === params.path.todo_id)
		if (!todo) return json(404, { message: `Todo with ID ${params.path.todo_id} not found!` })

		// Update the underlying todo
		todo.title = params.body.title
		todo.done = params.body.done
		return json(200, { todo })
	},
)

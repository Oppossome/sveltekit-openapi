import { z } from "zod"

import { todoAPI, schemas, todosStore } from "../api.server.js"

export const GET = todoAPI.endpoint(
	{
		operationId: "getTodo",
		parameters: {
			path: z.object({
				todo_id: z.string().uuid(),
			}),
		},
		responses: {
			200: z.object({ todo: schemas.todo }),
			404: z.object({ message: z.string() }),
		},
	},
	({ params, json }) => {
		const todo = todosStore.get(params.path.todo_id)
		if (!todo) return json(404, { message: `Todo ${params.path.todo_id} Not Found!` })
		return json(200, { todo })
	},
)

export const PATCH = todoAPI.endpoint(
	{
		operationId: "patchTodo",
		parameters: { path: z.object({ todo_id: z.string().uuid() }) },
		requestBody: schemas.newTodo,
		responses: {
			200: z.object({ todo: schemas.todo }),
			404: z.object({ message: z.string() }),
		},
	},
	({ params, json }) => {
		const todo = todosStore.get(params.path.todo_id)
		if (!todo) return json(404, { message: `Todo ${params.path.todo_id} Not Found!` })

		todo.title = params.body.title
		todo.done = params.body.done
		return json(200, { todo })
	},
)

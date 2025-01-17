import { z } from "zod"

import { api, schemas, todosStore } from "$lib/server/api"

export const GET = api.defineEndpoint(
	{
		operationId: "getTodo",
		parameters: {
			path: z.object({
				todo_id: z.string().uuid(),
			}),
		},
		responses: {
			200: {
				content: z.object({ todo: schemas.todo }),
			},
			404: {
				content: z.object({ message: z.string() }),
			},
		},
	},
	({ params, json }) => {
		const todo = todosStore.get(params.path.todo_id)
		if (!todo) return json(404, { message: `Todo ${params.path.todo_id} Not Found!` })

		return json(200, { todo })
	},
)

export const PATCH = api.defineEndpoint(
	{
		operationId: "patchTodo",
		parameters: { path: z.object({ todo_id: z.string().uuid() }) },
		requestBody: schemas.newTodo,
		responses: {
			200: { content: z.object({ todo: schemas.todo }) },
			404: { content: z.object({ message: z.string() }) },
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

export const DELETE = api.defineEndpoint(
	{
		operationId: "deleteTodo",
		parameters: { path: z.object({ todo_id: z.string().uuid() }) },
		responses: {
			204: { content: undefined },
			404: { content: z.object({ message: z.string() }) },
		},
	},
	({ params, json }) => {
		if (!todosStore.delete(params.path.todo_id)) {
			return json(404, { message: `Todo ${params.path.todo_id} Not Found!` })
		}

		return json(204)
	},
)

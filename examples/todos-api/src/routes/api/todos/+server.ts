import { z } from "zod"

import { api, schemas, todosStore } from "$lib/server/api"

export const GET = api.defineEndpoint(
	{
		operationId: "getTodos",
		parameters: {
			query: z.object({
				search: z.string().optional(),
				done: z.coerce.boolean().optional(),
			}),
		},
		responses: {
			200: z.object({
				todos: z.array(schemas.todo),
			}),
		},
	},
	({ params, json }) => {
		const todos = Array.from(todosStore.values())

		return json(200, {
			todos: todos.filter((todo) => {
				if (params.query.done && params.query.done !== todo.done) {
					return false
				}

				if (params.query.search) {
					const searchStr = params.query.search.toLowerCase()
					if (!todo.title.toLowerCase().includes(searchStr)) return false
				}

				return true
			}),
		})
	},
)

export const POST = api.defineEndpoint(
	{
		operationId: "createTodo",
		requestBody: schemas.newTodo,
		responses: {
			200: z.object({
				todo: schemas.todo,
			}),
		},
	},
	({ params, json }) => {
		const newTodo: z.infer<typeof schemas.todo> = {
			id: crypto.randomUUID(),
			...params.body,
		}

		todosStore.set(newTodo.id, newTodo)
		return json(200, { todo: newTodo })
	},
)

import { json, type RequestHandler } from "@sveltejs/kit"

import { todoAPI } from "../api.server.js"

export const GET: RequestHandler = async () => {
	const todosOpenAPISpec = await todoAPI.generateOpenAPI()
	return json(todosOpenAPISpec)
}

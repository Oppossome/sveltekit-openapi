import { json, type RequestHandler } from "@sveltejs/kit"

import { api } from "../../api.server.js"

export const GET: RequestHandler = async () => {
	const apiSpec = await api.generateSpec()
	return json(apiSpec)
}

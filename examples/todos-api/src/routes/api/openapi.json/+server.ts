import { json, type RequestHandler } from "@sveltejs/kit"

import { api } from "$lib/server/api"

export const GET: RequestHandler = async () => {
	const specification = await api.generateOpenAPI()

	return json(specification)
}

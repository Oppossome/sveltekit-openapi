import { generateDocument } from "sveltekit-openapi/endpoint"
import { json } from "@sveltejs/kit"

import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async () => {
	return json(
		await generateDocument({
			info: {
				title: "Todo API",
				version: "0.0.1",
			},
		}),
	)
}

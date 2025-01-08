import { z } from "zod"

import { api } from "../../api.server.js"

export const GET = api.defineEndpoint(
	{
		operationId: "204NoContent",
		responses: {
			204: {
				content: z.object({}),
			},
		},
	},
	({ json }) => {
		return json(204, {})
	},
)

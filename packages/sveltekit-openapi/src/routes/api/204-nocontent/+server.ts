import { api } from "../../api.server.js"

export const GET = api.defineEndpoint(
	{
		operationId: "204NoContent",
		responses: {
			204: {
				description: "No Content",
				content: undefined,
			},
		},
	},
	({ json }) => {
		return json(204)
	},
)

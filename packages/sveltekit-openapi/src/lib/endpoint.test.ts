import { z } from "zod"

import { defineHandler, configToOperation, type Handler, getHandlerConfig } from "./endpoint.js"

const noopHandler = () => new Response()

describe("configToOperation", () => {
	test.each<{
		input: Handler
		output: object
	}>([
		{
			input: defineHandler(
				{
					tags: ["user"],
					summary: "Create user",
					description: "This can only be done by the logged in user.",
					operationId: "createUser",
					requestBody: z.object({
						name: z.string().min(3),
					}),
					responses: {
						200: z.object({
							id: z.string().uuid(),
							name: z.string().min(3),
						}),
					},
				},
				noopHandler,
			),
			output: {
				tags: ["user"],
				summary: "Create user",
				description: "This can only be done by the logged in user.",
				operationId: "createUser",
				requestBody: {
					description: "Created user object",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: { name: { type: "string", minLength: 3 } },
								required: ["name"],
								additionalProperties: false,
							},
						},
					},
				},
				responses: {
					200: {
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										id: { type: "string", format: "uuid" },
										name: { type: "string", minLength: 3 },
									},
									required: ["id", "name"],
									additionalProperties: false,
								},
							},
						},
					},
				},
			},
		},
	])("When give $input return $output", ({ input, output }) => {
		const handlerConfig = getHandlerConfig(input)
		if (!handlerConfig) throw new Error("No config found!")
		expect(configToOperation(handlerConfig)).toBe(output)
	})
})

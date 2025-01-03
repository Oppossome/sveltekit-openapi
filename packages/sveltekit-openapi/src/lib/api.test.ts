import { z } from "zod"

import { api, Endpoint } from "./api.js"

// MARK: API

describe("API", () => {})

// MARK: Endpoint

describe("Endpoint", () => {
	const testAPI = api({ info: { title: "testApi", version: "0.0.0" } })

	describe("generateOperation", () => {
		test.each<{
			name: string
			input: Endpoint
			output: Record<string, unknown>
		}>([
			{
				name: "Ok - Standard API",
				input: new Endpoint(
					testAPI,
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
					() => new Response(),
				),
				output: {
					tags: ["user"],
					summary: "Create user",
					description: "This can only be done by the logged in user.",
					operationId: "createUser",
					requestBody: {
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
		])("$name", async ({ input, output }) => {
			expect(await input.generateOperation()).toEqual(output)
		})
	})
})

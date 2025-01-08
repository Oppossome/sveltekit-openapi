import { z } from "zod"

import { defineAPI, Endpoint, type Types } from "./api.js"
import { collectEndpoints } from "./collect.js"
import { endpointToOperation, apiToOAPIDocument, zodToJsonObjectSchema } from "./translate.js"

// MARK: Mocks

const mocks = vi.hoisted(() => ({
	collectEndpoints: vi.fn<typeof collectEndpoints>(),
}))

vi.mock("./collect.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./collect.js")>()),
	collectEndpoints: mocks.collectEndpoints,
}))

// MARK: zodToJsonObjectSchema

describe("zodToJsonObjectSchema", () => {
	test.each<{ name: string; input: z.AnyZodObject; output: unknown }>([
		{
			name: "Ok",
			input: z
				.object({
					name: z.string(),
					age: z.number(),
				})
				.describe("Test"),
			output: {
				type: "object",
				description: "Test",
				properties: {
					age: {
						type: "number",
					},
					name: {
						type: "string",
					},
				},
				required: ["name", "age"],
				additionalProperties: false,
			},
		},
		{
			name: "Empty",
			input: z.object({}),
			output: {
				type: "object",
				properties: {},
				additionalProperties: false,
			},
		},
	])("$name", ({ input, output }) => {
		const translatedSchema = zodToJsonObjectSchema(input)
		expect(translatedSchema).toEqual(output)
	})
})

// MARK: endpointToOperation

describe("endpointToOperation", () => {
	const testAPI = defineAPI({ info: { title: "testApi", version: "0.0.0" } })

	test.each<{ name: string; input: Types.AnyEndpoint; output: Record<string, unknown> }>([
		{
			name: "Standard Endpoint",
			input: new Endpoint(
				testAPI,
				{
					tags: ["user"],
					summary: "Create user",
					description: "This can only be done by the logged in user.",
					operationId: "createUser",
					parameters: {
						query: z.object({
							optional: z.boolean().optional(),
							required: z.boolean(),
						}),
					},
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
				parameters: [
					{
						in: "query",
						name: "optional",
						required: false,
						type: "boolean",
					},
					{
						in: "query",
						name: "required",
						required: true,
						type: "boolean",
					},
				],
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
		const generatedOutput = await endpointToOperation(input)
		expect(generatedOutput).toEqual(output)
	})
})

// MARK: apiToOAPIDocument

describe("apiToOAPIDocument", () => {
	test("Ok", async () => {
		const api1 = defineAPI({ info: { title: "testApi", version: "0.0.0" } })
		const endpoint1 = new Endpoint(api1, { responses: {} }, () => new Response())
		const endpoint1Operation = endpointToOperation(endpoint1)

		const api2 = defineAPI({ info: { title: "testApi", version: "0.0.0" } })
		const endpoint2 = new Endpoint(api2, { responses: {} }, () => new Response())
		const endpoint2Operation = endpointToOperation(endpoint2)

		mocks.collectEndpoints.mockReturnValue(
			Promise.resolve({
				"/api1/test": { get: endpoint1, post: endpoint1 },
				"/api2/test": { get: endpoint2, post: endpoint2 },
				"/mixed/test": { get: endpoint1, post: endpoint2 },
			}),
		)

		expect(await apiToOAPIDocument(api1)).toEqual({
			openapi: "3.0.0",
			info: {
				title: "testApi",
				version: "0.0.0",
			},
			paths: {
				"/api1/test": {
					get: endpoint1Operation,
					post: endpoint1Operation,
				},
				"/mixed/test": {
					get: endpoint1Operation,
				},
			},
		})

		expect(await apiToOAPIDocument(api2)).toEqual({
			openapi: "3.0.0",
			info: {
				title: "testApi",
				version: "0.0.0",
			},
			paths: {
				"/api2/test": {
					get: endpoint2Operation,
					post: endpoint2Operation,
				},
				"/mixed/test": {
					post: endpoint2Operation,
				},
			},
		})
	})
})

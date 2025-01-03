import type { OpenAPIV3 } from "openapi-types"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import type { API, Endpoint } from "./api.js"
import { collectEndpoints } from "./collect.js"

const basicJSONObjectSchema = z
	.object({
		type: z.literal("object"),
		properties: z.record(z.string(), z.unknown()),
		required: z.array(z.string()),
	})
	.partial()
	.passthrough()

export function zodToJsonObjectSchema(input: z.AnyZodObject) {
	const translatedSchema = zodToJsonSchema(input, { target: "openApi3" }) as unknown
	return basicJSONObjectSchema.parse(translatedSchema) as OpenAPIV3.SchemaObject
}

/**
 * Translates a {@link Endpoint} into its OpenAPI operation representation.
 */
export function endpointToOperation(endpoint: Endpoint): OpenAPIV3.OperationObject {
	const { parameters, requestBody, responses, ...config } = endpoint._config
	const operation: OpenAPIV3.OperationObject = { ...config, responses: {} }

	for (const paramType of ["path", "query"] as const) {
		if (parameters?.[paramType]) {
			const paramsSchema = zodToJsonObjectSchema(parameters[paramType])
			for (const [param, paramSchema] of Object.entries(paramsSchema)) {
				operation.parameters ??= []
				operation.parameters.push({
					name: param,
					in: paramType,
					required: paramsSchema.required && paramsSchema.required.includes(param),
					...paramSchema,
				})
			}
		}
	}

	if (requestBody) {
		const requestSchema = zodToJsonObjectSchema(requestBody)
		operation.requestBody = {
			content: {
				"application/json": {
					schema: requestSchema,
				},
			},
		}
	}

	for (const [statusCode, zodSchema] of Object.entries(responses)) {
		const responseSchema = zodToJsonObjectSchema(zodSchema)
		//@ts-expect-error TODO: Mandetory description field
		operation.responses[statusCode] = {
			content: {
				"application/json": {
					schema: responseSchema,
				},
			},
		}
	}

	return operation
}

// MARK: apiToOAPIDocument

export async function apiToOAPIDocument(api: API): Promise<OpenAPIV3.Document> {
	const document: OpenAPIV3.Document = { ...api._baseDocument, openapi: "3.0.0", paths: {} }

	const collectedEndpoints = await collectEndpoints()
	for (const [path, endpoints] of Object.entries(collectedEndpoints)) {
		for (const [method, endpoint] of Object.entries(endpoints)) {
			if (endpoint._api !== api) continue

			document.paths[path] ??= {}
			document.paths[path][method as OpenAPIV3.HttpMethods] = endpointToOperation(endpoint)
		}
	}

	return document
}

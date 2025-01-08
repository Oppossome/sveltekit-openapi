import type { OpenAPIV3 } from "openapi-types"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import type { API, Types } from "./api.js"
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
export function endpointToOperation(endpoint: Types.AnyEndpoint): OpenAPIV3.OperationObject {
	const { parameters, requestBody, responses, ...config } = endpoint._config
	const operation: OpenAPIV3.OperationObject = { ...config, responses: {} }

	for (const paramType of ["path", "query"] as const) {
		if (parameters?.[paramType]) {
			const paramsSchema = zodToJsonObjectSchema(parameters[paramType])
			if (!paramsSchema.properties) continue // No properties to iterate over

			for (const [param, schema] of Object.entries(paramsSchema.properties)) {
				operation.parameters ??= []
				operation.parameters.push({
					...schema,
					name: param,
					in: paramType,
					required: paramsSchema.required && paramsSchema.required.includes(param),
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

	for (const [statusCode, statusConfig] of Object.entries(responses)) {
		const responseSchema = zodToJsonObjectSchema(statusConfig.content)
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

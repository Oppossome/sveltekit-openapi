import { z } from "zod"
import { error, json, type RequestEvent, type RequestHandler } from "@sveltejs/kit"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { OpenAPIV3 } from "openapi-types"

import { isJSONSchemaObject } from "./utils.js"

// MARK: HandlerConfig
/**
 * The endpoint definition object. This object is used to define the endpoint and associated
 * parameters, request body, and responses. This object is additionally used to generate the OpenAPI
 * documentation for the endpoint.
 */
export interface HandlerConfig<
	Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Path extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Query extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
> {
	tags?: string[]
	summary?: string
	description?: string
	operationId?: string
	parameters?: {
		path?: Path
		query?: Query
	}
	requestBody?: Body
	responses: Responses
}

// MARK: HandlerCallback
/**
 * Represents the handler
 */
export type HandlerCallback<
	Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Path extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Query extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
> = (
	event: Omit<RequestEvent, "params"> & {
		json: ReturnType<typeof createJsonFn<Responses>>
		params: {
			body: Body extends z.AnyZodObject ? z.output<Body> : undefined
			path: Path extends z.AnyZodObject ? z.output<Path> : undefined
			query: Query extends z.AnyZodObject ? z.output<Query> : undefined
		}
	},
) => ReturnType<RequestHandler>

// MARK: getHandlerConfig

const configKey = Symbol("sveltekit-openapi-endpoint")
export type Handler = RequestHandler & { [configKey]: HandlerConfig<any, any, any, any> }

export function getHandlerConfig(input: unknown): HandlerConfig | undefined
export function getHandlerConfig(input: Handler): HandlerConfig
export function getHandlerConfig(input: unknown) {
	if (typeof input === "function" && configKey in input) {
		return input[configKey] as HandlerConfig
	}
}

// MARK: defineHandler

function createJsonFn<Responses extends Record<number, z.AnyZodObject>>(
	config: HandlerConfig<Responses, any, any, any>,
) {
	return <Status extends keyof Responses & number>(
		statusOrInit: Status | (ResponseInit & { status: Status }),
		body: z.input<Responses[Status]>,
	) => {
		const responseInit = typeof statusOrInit === "number" ? { status: statusOrInit } : statusOrInit
		const responseBody = config.responses[responseInit.status].parse(body)
		return json(responseBody, responseInit)
	}
}

export function defineHandler<
	Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Path extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Query extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
>(
	config: HandlerConfig<Responses, Body, Path, Query>,
	callback: HandlerCallback<Responses, Body, Path, Query>,
) {
	const requestHandler: Handler = async (event) => {
		type Event = Parameters<HandlerCallback<Responses, Body, Path, Query>>[0]
		const params = { body: undefined, path: undefined, query: undefined } as Event["params"]

		if (config?.requestBody) {
			const bodyJson = await event.request.json()
			const parsedBodyJson = await config.requestBody.safeParseAsync(bodyJson)
			if (!parsedBodyJson.success) return error(400)

			params.body = parsedBodyJson.data as Event["params"]["body"]
		}

		if (config.parameters?.query) {
			const queryParams = Object.fromEntries(event.url.searchParams)
			const parsedQueryParams = await config.parameters.query.safeParseAsync(queryParams)
			if (!parsedQueryParams.success) return error(400)

			params.query = parsedQueryParams.data as Event["params"]["query"]
		}

		if (config.parameters?.path) {
			const parsedPathParams = await config.parameters.path.safeParseAsync(event.params)
			if (!parsedPathParams.success) return error(400)

			params.path = parsedPathParams.data as Event["params"]["path"]
		}

		return await callback({
			...event,
			params,
			json: createJsonFn(config),
		})
	}

	// Attach the endpoint configuration for external retrival
	requestHandler[configKey] = config
	return requestHandler
}

// MARK: collectHandlers

const httpMethods = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"] as const
type HTTPMethod = (typeof httpMethods)[number]

type CollectedHandlers = {
	[path: string]: {
		[Method in HTTPMethod]?: HandlerConfig
	}
}

export async function collectHandlers(): Promise<CollectedHandlers> {
	const collection: CollectedHandlers = {}

	const serverFiles = import.meta.glob("/src/routes/**/+server.(ts|js)")
	for (const [filePath, fileImport] of Object.entries(serverFiles)) {
		const fileContents = (await fileImport()) as Record<string, unknown> | undefined
		if (typeof fileContents !== "object") {
			console.log(`File ${filePath} didn't return object. Skipping!`)
			continue
		}

		const collectionEntry: CollectedHandlers[string] = {}
		for (const [name, value] of Object.entries(fileContents)) {
			const httpMethod = name.toUpperCase() as HTTPMethod
			if (!httpMethods.includes(httpMethod)) continue

			const handerConfig = getHandlerConfig(value)
			if (!handerConfig) continue

			collectionEntry[httpMethod] = handerConfig
		}

		if (Object.keys(collectionEntry).length === 0) {
			continue
		}

		const routeMatch = filePath.match(/\/src\/routes(\/.*)\/\+server\.(?:js|ts)$/)
		if (!routeMatch) {
			console.debug(`File ${filePath} didn't match pattern. Skipping!`)
			continue
		}

		collection[routeMatch[1]] = collectionEntry
	}

	return collection
}

// MARK: configToOperation

export function configToOperation({
	parameters: configParameters,
	requestBody: configRequestBody,
	responses: configResponses,
	...configRest
}: HandlerConfig): OpenAPIV3.OperationObject {
	const operation: OpenAPIV3.OperationObject = { ...configRest, responses: {} }

	if (configParameters?.path) {
		const pathSchema = zodToJsonSchema(configParameters.path, { target: "openApi3" }) as unknown
		if (isJSONSchemaObject(pathSchema) && pathSchema.properties) {
			for (const [propName, propDetails] of Object.entries(pathSchema.properties)) {
				operation.parameters ??= []
				operation.parameters.push({
					name: propName,
					in: "path",
					required: pathSchema.required && pathSchema.required.includes(propName),
					// @ts-expect-error - TODO: Fix This
					...propDetails,
				})
			}
		}
	}

	if (configParameters?.query) {
		const querySchema = zodToJsonSchema(configParameters.query, { target: "openApi3" }) as unknown
		if (isJSONSchemaObject(querySchema) && querySchema.properties) {
			for (const [propName, propDetails] of Object.entries(querySchema.properties)) {
				operation.parameters ??= []
				operation.parameters.push({
					name: propName,
					in: "path",
					required: querySchema.required && querySchema.required.includes(propName),
					// @ts-expect-error - TODO: Fix This
					...propDetails,
				})
			}
		}
	}

	if (configRequestBody) {
		const bodySchema = zodToJsonSchema(configRequestBody, { target: "openApi3" }) as unknown
		if (isJSONSchemaObject(bodySchema)) {
			operation.requestBody = {
				content: {
					"application/json": {
						schema: bodySchema as OpenAPIV3.SchemaObject,
					},
				},
			}
		}
	}

	for (const [respStatus, respZodSchema] of Object.entries(configResponses)) {
		const responseSchema = zodToJsonSchema(respZodSchema, { target: "openApi3" }) as unknown
		if (isJSONSchemaObject(responseSchema)) {
			operation.responses[respStatus] = {
				content: {
					"application/json": {
						schema: responseSchema as OpenAPIV3.SchemaObject,
					},
				},
			}
		}
	}

	return operation
}

// MARK: generateDocument

export async function generateDocument(
	basics: Omit<OpenAPIV3.Document, "openapi" | "components" | "paths">,
): Promise<OpenAPIV3.Document> {
	const document: OpenAPIV3.Document = {
		openapi: "3.0.0",
		...basics,
		paths: {},
	}

	const collectedHandlers = await collectHandlers()
	for (const [path, handlers] of Object.entries(collectedHandlers)) {
		for (const [method, config] of Object.entries(handlers)) {
			document.paths[path] ??= {}

			// @ts-expect-error - TODO
			document.paths[path][method.toLowerCase()] = configToOperation(config)
		}
	}

	console.log(document)
	return document
}

import { error, json, type RequestHandler } from "@sveltejs/kit"
import { OpenAPIV3 } from "openapi-types"
import type { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

import type * as Types from "./api.types.js"
import { isJSONSchemaObject } from "./utils.js"
import { collectEndpoints } from "./collect.js"
export type * as Types from "./api.types.js"

// MARK: endpointJsonFn

export function endpointJsonFn<
	Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
>(config: Types.EndpointConfig<any, Responses, any, any, any>) {
	return <Status extends keyof Responses & number>(
		statusOrInit: Status | (ResponseInit & { status: Status }),
		body: z.input<Responses[Status]>,
	) => {
		const responseInit = typeof statusOrInit === "number" ? { status: statusOrInit } : statusOrInit
		const responseBody = config.responses[responseInit.status].parse(body)
		return json(responseBody, responseInit)
	}
}

// MARK: Endpoint

export class Endpoint<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
	Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Path extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	Query extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
> {
	_api: API<Tags> // Used for collection
	#config: Types.EndpointConfig<Tags, Responses, Body, Path, Query>
	#callback: Types.EndpointCallback<Responses, Body, Path, Query>

	constructor(
		api: API<Tags>,
		config: Types.EndpointConfig<NoInfer<Tags>, Responses, Body, Path, Query>,
		callback: Types.EndpointCallback<Responses, Body, Path, Query>,
	) {
		this._api = api
		this.#config = config
		this.#callback = callback
	}

	requestHandler = Endpoint.#applyLookupSymbol(this, async (event) => {
		type Event = Parameters<Types.EndpointCallback<Responses, Body, Path, Query>>[0]
		const params = { body: undefined, path: undefined, query: undefined } as Event["params"]

		if (this.#config.requestBody) {
			const bodyJson = await event.request.json()
			const parsedBody = await this.#config.requestBody.safeParseAsync(bodyJson)
			if (!parsedBody.success) return error(400)

			params.body = parsedBody.data as Event["params"]["body"]
		}

		if (this.#config.parameters?.query) {
			const queryParams = Object.fromEntries(event.url.searchParams)
			const parsedQueryParams = await this.#config.parameters.query.safeParseAsync(queryParams)
			if (!parsedQueryParams.success) return error(400)

			params.query = parsedQueryParams.data as Event["params"]["query"]
		}

		if (this.#config.parameters?.path) {
			const parsedPathParams = await this.#config.parameters.path.safeParseAsync(event.params)
			if (!parsedPathParams.success) return error(400)

			params.path = parsedPathParams.data as Event["params"]["path"]
		}

		return await this.#callback({
			json: endpointJsonFn(this.#config),
			...event,
			params,
		})
	})

	async generateOperation(): Promise<OpenAPIV3.OperationObject> {
		const { parameters, requestBody, responses, ...configRest } = this.#config
		const operation: OpenAPIV3.OperationObject = { ...configRest, responses: {} }

		if (parameters?.path) {
			const pathSchema = zodToJsonSchema(parameters.path, { target: "openApi3" }) as unknown
			if (isJSONSchemaObject(pathSchema) && pathSchema.properties) {
				for (const [name, details] of Object.entries(pathSchema.properties)) {
					operation.parameters ??= []
					operation.parameters.push({
						name: name,
						in: "path",
						required: pathSchema.required && pathSchema.required.includes(name),
						// @ts-expect-error - TODO
						...details,
					})
				}
			}
		}

		if (parameters?.query) {
			const querySchema = zodToJsonSchema(parameters.query, { target: "openApi3" }) as unknown

			if (isJSONSchemaObject(querySchema) && querySchema.properties) {
				for (const [name, details] of Object.entries(querySchema.properties)) {
					operation.parameters ??= []
					operation.parameters.push({
						name,
						in: "query",
						required: querySchema.required && querySchema.required.includes(name),
						// @ts-expect-error - TODO
						...details,
					})
				}
			}
		}

		if (requestBody) {
			const bodySchema = zodToJsonSchema(requestBody, { target: "openApi3" }) as unknown
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

		for (const [status, schema] of Object.entries(responses)) {
			const responseSchema = zodToJsonSchema(schema, { target: "openApi3" }) as unknown
			if (isJSONSchemaObject(responseSchema)) {
				operation.responses[status] = {
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

	static #lookupSymbol = Symbol()
	static #applyLookupSymbol(
		endpoint: Endpoint<any, any, any, any>,
		input: RequestHandler,
	): RequestHandler {
		// @ts-expect-error - Intentionally untyped
		input[Endpoint.#lookupSymbol] = endpoint
		return input
	}

	static _lookup(input: unknown) {
		if (typeof input === "function" && Endpoint.#lookupSymbol in input) {
			// @ts-expect-error - Intentionally untyped
			return input[Endpoint.#lookupSymbol] as Endpoint
		}
	}
}

// MARK: API Class

export class API<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
> {
	#baseDocument: Types.BaseV3Document<Tags>

	constructor(baseDocument: Types.BaseV3Document<Tags>) {
		this.#baseDocument = baseDocument
	}

	endpoint<
		Responses extends Record<number, z.AnyZodObject> = Record<number, z.AnyZodObject>,
		Body extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
		Path extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
		Query extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
	>(
		config: Types.EndpointConfig<Tags, Responses, Body, Path, Query>,
		callback: Types.EndpointCallback<Responses, Body, Path, Query>,
	) {
		return new Endpoint(this, config, callback).requestHandler
	}

	async generateDocument(): Promise<OpenAPIV3.Document> {
		const document: OpenAPIV3.Document = {
			...this.#baseDocument,
			openapi: "3.0.0",
			paths: {},
		}

		const collectedEndpoints = await collectEndpoints()
		for (const [path, endpoints] of Object.entries(collectedEndpoints)) {
			for (const [method, endpoint] of Object.entries(endpoints)) {
				if (endpoint._api !== this) continue
				document.paths[path] ??= {}

				// @ts-expect-error - TODO
				document.paths[path][method] = await endpoint.generateOperation()
			}
		}

		return document
	}

	static create<Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined>(
		document: Types.BaseV3Document<Tags>,
	) {
		return new API(document)
	}
}

// MARK: api()

export const api = API.create

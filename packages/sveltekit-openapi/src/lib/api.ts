import { error, json, type RequestHandler } from "@sveltejs/kit"
import type { OpenAPIV3 } from "openapi-types"
import type { z } from "zod"

import type * as Types from "./api.types.js"
import { apiToOAPIDocument } from "./translate.js"

// MARK: endpointJsonFn

export function endpointJsonFn<
	Responses extends Record<number, Types.EndpointResponse> = Record<number, Types.EndpointResponse>,
>(config: Types.EndpointConfig<any, Responses, any, any, any>) {
	return <Status extends keyof Responses & number>(
		statusOrInit: Status | (ResponseInit & { status: Status }),
		body: z.input<Responses[Status]["content"]>,
	) => {
		const responseInit = typeof statusOrInit === "number" ? { status: statusOrInit } : statusOrInit
		const responseBody = config.responses[responseInit.status].content.parse(body)
		return json(responseBody, responseInit)
	}
}

// MARK: Endpoint

export class Endpoint<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
	Responses extends Record<number, Types.EndpointResponse> = Record<number, Types.EndpointResponse>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
> {
	_api: API<Tags> // Used for collection
	_config: Types.EndpointConfig<Tags, Responses, Body, Path, Query>
	#callback: Types.EndpointCallback<Responses, Body, Path, Query>

	constructor(
		api: API<Tags>,
		config: Types.EndpointConfig<NoInfer<Tags>, Responses, Body, Path, Query>,
		callback: Types.EndpointCallback<Responses, Body, Path, Query>,
	) {
		this._api = api
		this._config = config
		this.#callback = callback
	}

	requestHandler = Endpoint.#applyLookupSymbol(this, async (event) => {
		type Event = Parameters<Types.EndpointCallback<Responses, Body, Path, Query>>[0]
		const params = { body: undefined, path: undefined, query: undefined } as Event["params"]

		if (this._config.requestBody) {
			const bodyJson = await event.request.json()
			const parsedBody = await this._config.requestBody.safeParseAsync(bodyJson)
			if (!parsedBody.success) return error(400)

			params.body = parsedBody.data as Event["params"]["body"]
		}

		if (this._config.parameters?.query) {
			const queryParams = Object.fromEntries(event.url.searchParams)
			const parsedQueryParams = await this._config.parameters.query.safeParseAsync(queryParams)
			if (!parsedQueryParams.success) return error(400)

			params.query = parsedQueryParams.data as Event["params"]["query"]
		}

		if (this._config.parameters?.path) {
			const parsedPathParams = await this._config.parameters.path.safeParseAsync(event.params)
			if (!parsedPathParams.success) return error(400)

			params.path = parsedPathParams.data as Event["params"]["path"]
		}

		return await this.#callback({
			json: endpointJsonFn(this._config),
			...event,
			params,
		})
	})

	static #lookupSymbol = Symbol()
	static #applyLookupSymbol(endpoint: Types.AnyEndpoint, input: RequestHandler): RequestHandler {
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
	_baseDocument: Types.BaseV3Document<Tags>

	constructor(baseDocument: Types.BaseV3Document<Tags>) {
		this._baseDocument = baseDocument
	}

	defineEndpoint<
		Responses extends Record<number, Types.EndpointResponse> = Record<
			number,
			Types.EndpointResponse
		>,
		Body extends z.AnyZodObject | undefined = undefined,
		Path extends z.AnyZodObject | undefined = undefined,
		Query extends z.AnyZodObject | undefined = undefined,
	>(
		config: Types.EndpointConfig<Tags, Responses, Body, Path, Query>,
		callback: Types.EndpointCallback<Responses, Body, Path, Query>,
	) {
		return new Endpoint(this, config, callback).requestHandler
	}

	async generateSpec(): Promise<OpenAPIV3.Document> {
		return apiToOAPIDocument(this)
	}
}

// MARK: defineAPI()

export function defineAPI<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
>(document: Types.BaseV3Document<Tags>) {
	return new API(document)
}

export * as Types from "./api.types.js"

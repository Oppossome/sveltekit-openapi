import { error, json, type RequestHandler } from "@sveltejs/kit"
import { OpenAPIV3 } from "openapi-types"
import type { z } from "zod"

import type * as Types from "./api.types.js"
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

	static create<Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined>(
		document: Types.BaseV3Document<Tags>,
	) {
		return new API(document)
	}
}

// MARK: api()

export const api = API.create

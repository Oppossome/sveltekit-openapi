import { z } from "zod"
import { error, json, type RequestEvent, type RequestHandler } from "@sveltejs/kit"

import type { MaybePromise, Merge } from "./helpers/util.js"

// MARK: Types

/**
 * The endpoint definition object. This object is used to define the endpoint and associated
 * parameters, request body, and responses. This object is additionally used to generate the OpenAPI
 * documentation for the endpoint.
 */
export interface EndpointConfig<
	Responses extends Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
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

export type EndpointEvent<
	Responses extends Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
> = Merge<
	RequestEvent,
	{
		json: ReturnType<typeof _defineJson<Responses>>
		params: {
			body: Body extends z.AnyZodObject ? z.output<Body> : undefined
			path: Path extends z.AnyZodObject ? z.output<Path> : undefined
			query: Query extends z.AnyZodObject ? z.output<Query> : undefined
		}
	}
>

export type EndpointCallback<
	Responses extends Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
> = (event: EndpointEvent<Responses, Body, Path, Query>) => MaybePromise<Response>

// MARK: define

export function define<
	Responses extends Record<number, z.AnyZodObject>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
>(
	config: EndpointConfig<Responses, Body, Path, Query>,
	callback: EndpointCallback<Responses, Body, Path, Query>,
): RequestHandler {
	return async (event) => {
		type Event = EndpointEvent<Responses, Body, Path, Query>
		const params = { body: undefined, path: undefined, query: undefined } as Event["params"]

		// Process request body
		if (config?.requestBody) {
			const bodyJson = await event.request.json()
			const parsedBodyJson = await config.requestBody.safeParseAsync(bodyJson)
			if (!parsedBodyJson.success) return error(400)

			params.body = parsedBodyJson.data as Event["params"]["body"]
		}

		// Process query parameters
		if (config.parameters?.query) {
			const queryParams = Object.fromEntries(event.url.searchParams)
			const parsedQueryParams = await config.parameters.query.safeParseAsync(queryParams)
			if (!parsedQueryParams.success) return error(400)

			params.query = parsedQueryParams.data as Event["params"]["query"]
		}

		// Process path parameters
		if (config.parameters?.path) {
			const parsedPathParams = await config.parameters.path.safeParseAsync(event.params)
			if (!parsedPathParams.success) return error(400)

			params.path = parsedPathParams.data as Event["params"]["path"]
		}

		return await callback({
			...event,
			params,
			json: _defineJson(config),
		})
	}
}

// MARK: _defineJson

export function _defineJson<Responses extends Record<number, z.AnyZodObject>>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	config: EndpointConfig<Responses, any, any, any>,
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

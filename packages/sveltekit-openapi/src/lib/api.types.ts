import type { RequestEvent } from "@sveltejs/kit"
import type { OpenAPIV3 } from "openapi-types"
import type { z } from "zod"

import type { Endpoint, endpointJsonFn } from "./api.js"

// MARK: Endpoint Types

export interface EndpointResponse<
	Schema extends z.AnyZodObject | undefined = z.AnyZodObject | undefined,
> {
	description?: string
	content: Schema
}

export interface EndpointConfig<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
	Responses extends Record<number, EndpointResponse> = Record<number, EndpointResponse>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
> {
	tags?: Tags extends OpenAPIV3.TagObject[] ? Tags[number]["name"][] : string[]
	summary?: string
	description?: string
	operationId?: string
	deprecated?: boolean
	parameters?: {
		path?: Path
		query?: Query
	}
	requestBody?: Body
	responses: Responses
}

export type EndpointCallbackJsonFn<
	Responses extends Record<number, EndpointResponse> = Record<number, EndpointResponse>,
> = <Status extends keyof Responses & number>(
	statusOrInit: Status | (ResponseInit & { status: Status }),
	...rest: Responses[Status]["content"] extends z.AnyZodObject
		? [body: z.input<Responses[Status]["content"]>]
		: []
) => Promise<Response>

export type EndpointCallback<
	Responses extends Record<number, EndpointResponse> = Record<number, EndpointResponse>,
	Body extends z.AnyZodObject | undefined = undefined,
	Path extends z.AnyZodObject | undefined = undefined,
	Query extends z.AnyZodObject | undefined = undefined,
> = (
	event: Omit<RequestEvent, "params"> & {
		json: ReturnType<typeof endpointJsonFn<Responses>>
		params: {
			body: Body extends z.AnyZodObject ? z.output<Body> : undefined
			path: Path extends z.AnyZodObject ? z.output<Path> : undefined
			query: Query extends z.AnyZodObject ? z.output<Query> : undefined
		}
	},
) => Promise<Response> | Response

export type AnyEndpoint = Endpoint<
	OpenAPIV3.TagObject[] | undefined,
	Record<number, EndpointResponse>,
	z.AnyZodObject | undefined,
	z.AnyZodObject | undefined,
	z.AnyZodObject | undefined
>

// MARK: API Types

export type BaseV3Document<
	Tags extends OpenAPIV3.TagObject[] | undefined = OpenAPIV3.TagObject[] | undefined,
> = Omit<OpenAPIV3.Document<{ tags?: Tags }>, "openapi" | "paths" | "components">

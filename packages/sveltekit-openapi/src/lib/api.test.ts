import { z } from "zod"
import type { RequestEvent } from "@sveltejs/kit"

import { defineAPI, Endpoint, type Types } from "./api.js"

describe("Endpoint.requestHandler", () => {
	const testAPI = defineAPI({ info: { title: "testApi", version: "0.0.0" } })
	const testFn = vi.fn<Types.EndpointCallback<any, any, any, any>>(() => new Response())

	const testConfig: {
		endpoint: Types.AnyEndpoint
		cases: {
			name: string
			input: {
				path?: Record<string, string>
				query?: Record<string, string>
				body?: BodyInit
			}
			output: Record<string, unknown>
		}[]
	}[] = [
		{
			endpoint: new Endpoint(
				testAPI,
				{
					operationId: "Query, Path Parameters",
					parameters: {
						path: z.object({ path: z.string() }).partial(),
						query: z.object({ query: z.string() }).partial(),
					},
					responses: {},
				},
				testFn,
			),
			cases: [
				{
					name: "Path and Query Parameters Provided",
					input: { path: { path: "123" }, query: { query: "345" } },
					output: { body: undefined, path: { path: "123" }, query: { query: "345" } },
				},
				{
					name: "No Path or Query Parameters Provided",
					input: { path: {}, query: {} },
					output: { body: undefined, path: { path: undefined }, query: { query: undefined } },
				},
			],
		},
		{
			endpoint: new Endpoint(
				testAPI,
				{
					operationId: "Request Body",
					requestBody: z.object({ body: z.string() }).partial(),
					responses: {},
				},
				testFn,
			),
			cases: [
				{
					name: "Request Body Provided",
					input: { body: JSON.stringify({ body: "123" }) },
					output: { body: { body: "123" }, path: undefined, query: undefined },
				},
				{
					name: "No body provided",
					input: { body: JSON.stringify({}) },
					output: { body: {}, path: undefined, query: undefined },
				},
			],
		},
	]

	for (const { endpoint, cases } of testConfig) {
		for (const { name, input, output } of cases) {
			test(`${endpoint._config.operationId}: ${name}`, async () => {
				const search = new URLSearchParams(input.query ?? {})
				const myRequestEvent: Pick<RequestEvent, "request" | "params" | "url"> = {
					params: input.path ?? {},
					url: new URL(`http://www.example.com/test${search.toString() ? `?${search}` : ""}`),
					request: new Request("http://www.example.com/test", {
						method: input.body ? "POST" : "GET",
						body: input.body ?? null,
					}),
				}

				// @ts-expect-error - For testing, we only pass in what we interact with
				await endpoint.requestHandler(myRequestEvent)
				if (!testFn.mock.lastCall) throw new Error("requestHandler did not call the callback")
				expect(testFn.mock.lastCall?.[0].params).toEqual(output)
			})
		}
	}
})

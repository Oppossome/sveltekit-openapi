import { api, Endpoint } from "./api.js"
import { collectEndpoints, resolveRoutes } from "./collect.js"

const ROUTE_PREFIX = "~/projects/svelte-app/src/routes"

describe("collectEndpoints", () => {
	test("It should extract endpoints from all routes", async () => {
		const testApi = api({ info: { title: "TestAPI", version: "0.0.0" } })
		const testEndpoint = new Endpoint(testApi, { responses: {} }, () => new Response())
		const collectedEndpoints = await collectEndpoints(() => ({
			[`${ROUTE_PREFIX}/api/todos/+server.js`]: async () => ({
				GET: testEndpoint.requestHandler,
				POST: testEndpoint.requestHandler,
			}),
			[`${ROUTE_PREFIX}/api/todos/[todo_id]/+server.ts`]: async () => ({
				GET: testEndpoint.requestHandler,
				POST: testEndpoint.requestHandler,
				PATCH: testEndpoint.requestHandler,
			}),
		}))

		expect(collectedEndpoints).toEqual({
			"/api/todos": { get: testEndpoint, post: testEndpoint },
			"/api/todos/{todo_id}": { get: testEndpoint, post: testEndpoint, patch: testEndpoint },
		})
	})
})

describe("resolveRoutes", () => {
	test.each<{ input: string; output: string[] }>([
		// Hexidecimal Character
		{
			input: "/user/[user_id][x+3a]ban/+server.ts",
			output: ["/user/{user_id}:ban"],
		},
		// Unicode Character
		{
			input: "/emoji/[u+d83e][u+dd2a]/+server.ts",
			output: ["/emoji/🤪"],
		},
		// Regular route
		{
			input: "/api/todos/+server.ts",
			output: ["/api/todos"],
		},
		// Parameter route
		{
			input: "/api/todos/[todo_id]/+server.ts",
			output: ["/api/todos/{todo_id}"],
		},
		// Validated parameter route
		{
			input: "/api/todos/[todo_id=uuid]/+server.ts",
			output: ["/api/todos/{todo_id}"],
		},
		// // TODO: Optional parameter route
		// {
		// 	input: "/api/todos/[todo_id]/test/+server.ts",
		// 	output: ["/api/todos/test", "/api/todos/{todo_id}/test"],
		// },
		// Route grouping
		{
			input: "/(api)/todos/+server.ts",
			output: ["/todos"],
		},
	])('resolveRoutes("$input") returns $output', ({ input, output }) => {
		const path = `${ROUTE_PREFIX}${input}`
		expect(resolveRoutes(path)).toEqual(output)
	})
})

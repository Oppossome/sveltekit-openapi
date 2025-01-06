<p align="center">
  <h1 align="center">SvelteKit-OpenAPI</h1>
  <p align="center">
    Easily declare OpenAPI-compliant SvelteKit routes with automatic endpoint validation and seamless OpenAPI specification generation.
  </p>
</p>

<p align="center">
  <a href="https://github.com/Oppossome/sveltekit-openapi/actions/workflows/lint-and-test.yml?query=branch:main"><img src="https://github.com/Oppossome/sveltekit-openapi/actions/workflows/lint-and-test.yml/badge.svg?event=push&branch=main"></a>
  <a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/oppossome/sveltekit-openapi" alt="License"></a>
</p>

<br/>
<br/>

## Table Of Contents

- [Table of contents](#table-of-contents)
- [Installation](#installation)
- [Usage](#usage)
  - [`defineAPI()` / `new API()`](#defineapi--new-api)
  - [`API.defineEndpoint()`](#apidefineendpoint)
  - [`API.generateSpec()`](#apigeneratespec)
- [Examples](#example)

## Installation

```
npm install sveltekit-openapi
yarn add sveltekit-openapi
pnpm add sveltekit-openapi
```

## Usage

### `defineAPI()` / `new API()`

Use `defineAPI` or `new API` to declare a new `API` object. This object is the main entry point for declaring your API routes.

```typescript
const myAPI = defineAPI({
	info: {
		title: "My API",
		description: "My API Description",
		version: "0.0.1",
	},
	servers: [{ url: "http://localhost:5173" }],
})
```

### `API.defineEndpoint()`

Use `API.defineEndpoint()` to define a new endpoint. This is used as a [SvelteKit Request Handler](https://svelte.dev/docs/kit/routing#server) and is called whenever a request is made to the endpoint. Provided parameters are automatically validated against the provided [Zod](https://github.com/colinhacks/zod) schemas.

```typescript
export const POST = myAPI.defineEndpoint({
  operationId: "createUser",
  summary: "Create a new user",
  parameters: {
    query: z.object({
      my_query_param: z.string().optional(),
    }),
    path: z.object({
      my_path_param: z.string().optional(),
    }),
  }
  requestBody: z.object({
    name: z.string().min(3),
    age: z.number(),
  }),
  // Only the responses object is required
  responses: {
    201: z.object({
      user: z.object({
        id: z.string(),
        name: z.string(),
        age: z.number(),
      })
    }),
  }
}, ({ params, json }) => {
  // The params object is stictly typed based on the provided parameters schema
  // In this case, it would be:
  // { query: { my_query_param: string | undefined }, path: { my_path_param: string | undefined }, body: { name: string, age: number } }
  console.log(params.query.my_query_param)
  console.log(params.path.my_path_param)

  // The provided json function is a strictly typed version of SvelteKit's json function
  // It automatically validates the provided object against the response schema
  return json(201, {
    user: {
      id: "123",
      ...params.body,
    }
  })
})
```

### `API.generateSpec()`

Generates an OpenAPI specification object based on the defined endpoints. Often used in conjunction with a SvelteKit endpoint to serve the specification.

```typescript
// `src/routes/api/openapi.json/+server.ts`
import { json, type RequestHandler } from "@sveltejs/kit"

import { myAPI } from "$lib/server/api"

// Serve our OpenAPI specification at `/api/openapi.json`
export const GET: RequestHandler = async () => {
	const myAPISpec = await myAPI.generateSpec()
	return json(myAPISpec)
}
```

### `SwaggerUI` Component

A [swagger-ui](https://www.npmjs.com/package/swagger-ui) wrapper component is provided to easily render the OpenAPI specification in a SvelteKit route.

```svelte
<script lang="ts">
	import { SwaggerUI } from "sveltekit-openapi/ui"
</script>

<SwaggerUI url="/api/openapi.json" />
```

## Examples

- [Todos API](https://stackblitz.com/github/oppossome/sveltekit-openapi/tree/main/examples/todos-api?file=README.md)

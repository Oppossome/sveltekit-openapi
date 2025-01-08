import { defineAPI } from "sveltekit-openapi"

export const api = defineAPI({
	info: {
		title: "SvelteKit-OpenAPI Testing API",
		version: "0.0.1",
	},
	servers: [{ url: "http://localhost:5173" }],
})

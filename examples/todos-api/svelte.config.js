import { readFileSync } from "fs"
import { resolve } from "path"

import adapter from "@sveltejs/adapter-auto"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/**
 * Because the examples are additionally used for validation of the API,
 * we utilize aliases in the monorepo context to ensure the version of the
 * package we're working against is always up to date.
 */
function getAliases() {
	try {
		const packageFile = JSON.parse(readFileSync("../../package.json", "utf-8"))
		if (packageFile.name === "sveltekit-openapi-monorepo") {
			return {
				"sveltekit-openapi": resolve("../../packages/sveltekit-openapi/src/lib/index.js"),
				"sveltekit-openapi/*": resolve("../../packages/sveltekit-openapi/src/lib/"),
				"sveltekit-openapi/ui": resolve("../../packages/sveltekit-openapi/src/lib/ui/index.js"),
				"sveltekit-openapi/ui/*": resolve("../../packages/sveltekit-openapi/src/lib/ui/index.js"),
			}
		}
	} catch {
		//
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		alias: getAliases(),
	},
}

export default config

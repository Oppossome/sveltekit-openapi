import { resolve } from "path"

import adapter from "@sveltejs/adapter-auto"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		alias: {
			/**
			 * In order to facilitate a smooth development process, the package
			 * is aliased to sveltekit-openapi
			 *
			 * TODO:
			 * Which gets replaced with a built version of the application in
			 * CI to ensure the released application works.
			 */
			"sveltekit-openapi": resolve("./src/lib/index.js"),
			"sveltekit-openapi/*": resolve("./src/lib/"),
			"sveltekit-openapi/ui": resolve("./src/lib/ui/index.js"),
			"sveltekit-openapi/ui/*": resolve("./src/lib/ui/"),
		},
	},
}

export default config

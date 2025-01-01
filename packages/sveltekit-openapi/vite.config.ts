import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		/**
		 * Ensures no state is leaked between tests.
		 * https://vitest.dev/config/#mockreset
		 */
		mockReset: true,
		globals: true,
		include: ["src/**/*.{test,spec}.{js,ts}"],
	},
})

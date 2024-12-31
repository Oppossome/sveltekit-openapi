import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		minify: false,
		output: {
			// remove hashes from output paths
			// https://github.com/vitejs/vite/issues/378
			entryFileNames: `assets/[name].js`,
			chunkFileNames: `assets/[name].js`,
			assetFileNames: `assets/[name].[ext]`,
		},
	},
})

import { Endpoint } from "./api.js"

// MARK: collectEndpoints

const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const
type HTTPMethod = (typeof httpMethods)[number]

export interface CollectedEndpoints {
	[path: string]: {
		[Method in HTTPMethod]?: Endpoint
	}
}

/**
 * Returns every {@link Endpoint} by scanning through the server routes
 * of the application.
 *
 * @param imported Utilized by tests because [can't mock import.meta.glob](https://github.com/vitest-dev/vitest/discussions/3564#discussioncomment-7884395)
 * @returns The collected endpoints
 */
export async function collectEndpoints(
	imported?: Record<string, () => Promise<Record<string, unknown>>>,
): Promise<CollectedEndpoints> {
	const collected: CollectedEndpoints = {}

	const importedFiles = imported ?? import.meta.glob("/src/routes/**/+server.(ts|js)")
	for (const [filePath, fileImport] of Object.entries(importedFiles)) {
		const fileContents = await fileImport()
		if (!fileContents || typeof fileContents !== "object") {
			console.log(`File ${filePath} didn't return object. Skipping!`)
			continue
		}

		const collectionEntry: CollectedEndpoints[string] = {}
		for (const [name, value] of Object.entries(fileContents)) {
			const httpMethod = name.toLowerCase() as HTTPMethod
			if (!httpMethods.includes(httpMethod)) continue

			const endpoint = Endpoint._lookup(value)
			if (!endpoint) continue

			collectionEntry[httpMethod] = endpoint
		}

		// If we collected any endpoint handlers, apply all of its routes to our collection
		if (Object.entries(collectionEntry).length) {
			for (const route of resolveRoutes(filePath)) {
				collected[route] = collectionEntry
			}
		}
	}

	return collected
}

// MARK: resolveRoutes

export function resolveRoutes(filePath: string): string[] {
	const rawPath = filePath.match(/\/src\/routes(\/.*)\/\+server\.(?:js|ts)$/)?.[1]
	if (!rawPath) return []

	// Strip and translate SvelteKit routing paths into their real locations
	const cleansedPath = rawPath
		.replace(/\[x\+([0-9A-F]{2})\]/gi, (_, code) => String.fromCharCode(parseInt(code, 16))) // Hex Code
		.replace(/\[u\+([0-9A-F]+)\]/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))) // Unicode
		.replace(/\/?\(.*?\)/g, "") // Route Groups
		.replace(/\[(\w+)(?:=\w+)?\]/g, "{$1}") // Parameter Validation
		.replace(/\[\[(\w+)(?:=\w+)?\]\]/g, "{{$1}}") // Optional Parameter Validation

	// TODO: Optional Parameter Splitting

	return [cleansedPath]
}

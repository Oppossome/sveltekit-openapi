import { Endpoint } from "./api.js"

const httpMethods = ["get", "put", "post", "delete", "options", "head", "patch", "trace"] as const
type HTTPMethod = (typeof httpMethods)[number]

export interface CollectedEndpoints {
	[path: string]: {
		[Method in HTTPMethod]?: Endpoint
	}
}

export async function collectEndpoints(importFn = import.meta.glob): Promise<CollectedEndpoints> {
	const collected: CollectedEndpoints = {}

	const serverFiles = importFn("/src/routes/**/+server.(ts|js)")
	for (const [filePath, fileImport] of Object.entries(serverFiles)) {
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

		if (Object.entries(collectionEntry).length === 0) {
			continue
		}

		for (const route of resolveRoutes(filePath)) {
			collected[route] = collectionEntry
		}
	}

	return collected
}

// MARK: resolveRoutes

export function resolveRoutes(filePath: string): string[] {
	const rawPath = filePath.match(/\/src\/routes(\/.*)\/\+server\.(?:js|ts)$/)?.[1]
	if (!rawPath) return []

	const cleansedPath = rawPath
		.replace(/\[x\+([0-9A-F]{2})\]/gi, (_, code) => String.fromCharCode(parseInt(code, 16))) // Hex Code
		.replace(/\[u\+([0-9A-F]+)\]/gi, (_, code) => String.fromCodePoint(parseInt(code, 16))) // Unicode
		.replace(/\/?\(.*?\)/g, "") // Route Groups
		.replace(/\[(\w+)(?:=\w+)?\]/g, "{$1}") // Parameter Validation
		.replace(/\[\[(\w+)(?:=\w+)?\]\]/g, "{{$1}}") // Optional Parameter Validation

	// TODO: Optional Parameter Splitting

	return [cleansedPath]
}

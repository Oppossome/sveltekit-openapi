import type { JSONSchema7 } from "json-schema"

export function isJSONSchemaObject(input: unknown): input is JSONSchema7 {
	if (!input || typeof input !== "object") return false
	return "type" in input && input.type === "object"
}

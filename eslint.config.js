import prettier from "eslint-config-prettier"
import js from "@eslint/js"
import svelte from "eslint-plugin-svelte"
import globals from "globals"
import ts from "typescript-eslint"
import importPlugin from "eslint-plugin-import"

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs["flat/recommended"],
	prettier,
	...svelte.configs["flat/prettier"],
	importPlugin.flatConfigs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
	},
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
			},
		},
	},
	{
		settings: {
			"import/resolver": {
				typescript: true,
			},
		},
		rules: {
			// see: https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/order.md
			"import/order": [
				"error",
				{
					named: { import: true },
					"newlines-between": "always",
					pathGroups: [
						// SvelteKit environment variables
						{
							pattern: "$env/**",
							group: "external",
							position: "after",
						},
						{
							pattern: "$app/**",
							group: "external",
							position: "after",
						},
						// SvelteKit src/lib alias
						{
							pattern: "$lib/**",
							group: "internal",
							position: "after",
						},
					],
					groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
				},
			],
			"import/no-unresolved": [
				"error",
				{
					ignore: ["^\\$env", "^\\$app"],
				},
			],
			// eslint-plugin-import has an issue with incorrectly simplifying svelte/store imports into svelte
			// https://github.com/import-js/eslint-plugin-import/issues/1479
			"import/no-duplicates": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "all",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		ignores: ["build/", ".svelte-kit/", "dist/"],
	},
)

<script lang="ts">
	import { untrack } from "svelte"
	import SwaggerUI, { type SwaggerUIOptions } from "swagger-ui"
	import "swagger-ui/dist/swagger-ui.css"

	type Props = Omit<SwaggerUIOptions, "dom_id" | "domNode">

	let swaggerOpts: Props = $props()
	let rootElement: HTMLDivElement | undefined = $state()

	$effect(() => {
		if (rootElement) {
			/**
			 * Since SwaggerUI does not provide a way to update or remount the UI
			 * after it has been mounted, we completely re-render the {@link rootElement}
			 * whenever the options change. Therefore, we only want to update
			 * when the {@link rootElement} changes to prevent double-rendering.
			 */
			const untrackedOpts = untrack(() => swaggerOpts)
			SwaggerUI({ ...untrackedOpts, domNode: rootElement })
		}
	})
</script>

{#key swaggerOpts}
	<div bind:this={rootElement}></div>
{/key}

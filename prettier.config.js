/**
 * @type {import('prettier').Config}
 */
export default {
	/**
	 * Utilizing tabs as they're better for accessibility
	 *  see: https://x.com/Rich_Harris/status/1541761871585464323
	 *
	 * Dislike how they render on github? That can be fixed!
	 * 	see: https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-user-account-settings/managing-your-tab-size-rendering-preference
	 */
	useTabs: true,
	semi: false,
	plugins: ["prettier-plugin-svelte"],
	overrides: [
		{
			files: "*.svelte",
			options: { parser: "svelte" },
		},
	],
}

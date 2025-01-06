/**
 * Our example packages serve a dual purpose: they are both standalone examples and validation tools for the package.
 * Due to our release process, the version of sveltekit-openapi on npm may lag behind the repository version,
 * leading to invalid installations. To prevent this, we update those dependencies to workspace versions,
 * which is only applicable within our workspace.
 */
const WORKSPACE_PACKAGES = ["sveltekit-openapi"]

function readPackage(pkg) {
	for (const dependencyType of ["devDependencies", "dependencies"]) {
		for (const workspacePackage of WORKSPACE_PACKAGES) {
			if (pkg[dependencyType]?.[workspacePackage] === undefined) continue
			pkg[dependencyType][workspacePackage] = "workspace:*"
		}
	}

	return pkg
}

module.exports = {
	hooks: {
		readPackage,
	},
}

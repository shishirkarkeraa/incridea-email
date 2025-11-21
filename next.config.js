/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
if (!process.env.SKIP_ENV_VALIDATION && process.env.npm_lifecycle_event !== "lint") {
	await import("./src/env.js");
}

/** @type {import("next").NextConfig} */
const config = {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "idtisg3yhk.ufs.sh",
			},
		],
	},
};

export default config;

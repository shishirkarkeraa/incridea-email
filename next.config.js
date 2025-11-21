/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
if (!process.env.SKIP_ENV_VALIDATION && process.env.npm_lifecycle_event !== "lint") {
	await import("./src/env.ts");
}

/** @type {import("next").NextConfig} */
const config = {};

export default config;

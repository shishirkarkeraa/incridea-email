// @ts-check
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** @type {readonly ["TLSv1.2", "TLSv1.3"]} */
const TLS_VERSIONS = ["TLSv1.2", "TLSv1.3"];

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    SMTP_HOST: z.string(),
    SMTP_PORT: z.coerce.number(),
    SMTP_USER: z.string(),
    SMTP_PASSWORD: z.string(),
    SMTP_SECURE: z.coerce.boolean().default(false),
    SMTP_REQUIRE_TLS: z.coerce.boolean().default(true),
    SMTP_TLS_MIN_VERSION: z.enum(TLS_VERSIONS).default("TLSv1.2"),
    SMTP_TLS_REJECT_UNAUTHORIZED: z.coerce.boolean().default(true),
    EMAIL_FROM_ADDRESS: z.string().email(),
    EMAIL_FROM_NAME: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_REQUIRE_TLS: process.env.SMTP_REQUIRE_TLS,
    SMTP_TLS_MIN_VERSION: process.env.SMTP_TLS_MIN_VERSION,
    SMTP_TLS_REJECT_UNAUTHORIZED: process.env.SMTP_TLS_REJECT_UNAUTHORIZED,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

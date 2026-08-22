import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { db } from "@/core/db/client";
import * as schema from "@/core/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  // Allow phone/demo access via reverse tunnels (e.g. trycloudflare.com).
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",").filter(Boolean) ??
      []),
  ],
  trustedProxyHeaders: true,
});

export type Session = typeof auth.$Infer.Session;

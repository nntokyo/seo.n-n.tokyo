import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // CI or tooling may provide DATABASE_URL directly without a local .env file.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

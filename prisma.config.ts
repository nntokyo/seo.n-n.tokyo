import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // CI or tooling may provide DATABASE_URL directly without a local .env file.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Prisma 7 does not need a connection to generate the client. Migrate commands
  // still report a clear configuration error if DATABASE_URL is not supplied.
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});

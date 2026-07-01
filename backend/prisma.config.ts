// prisma.config.ts — Prisma v7 configuration
// The datasource.url here is used only by Prisma CLI commands (migrate, db push, db execute).
// The actual runtime connection uses the PrismaPg adapter in src/config/prisma.js.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
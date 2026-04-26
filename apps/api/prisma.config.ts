import { defineConfig } from "prisma/config";

// 确保在读取配置前加载 .env（仅限本地开发）
if (process.env.NODE_ENV !== 'production') {
  import("dotenv/config");
}

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_NON_POOLING;

if (!databaseUrl && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: DATABASE_URL is not defined in environment variables!');
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.cjs"
  },
  datasource: {
    url: databaseUrl,
  },
});

import { defineConfig } from "prisma/config";

// 生产环境由平台注入变量，本地开发环境手动加载
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_NON_POOLING;

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

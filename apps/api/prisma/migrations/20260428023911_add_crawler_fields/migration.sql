/*
  Warnings:

  - A unique constraint covering the columns `[original_url]` on the table `posts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "canonical_url" TEXT,
ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "original_url" TEXT,
ADD COLUMN     "platform" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "posts_original_url_key" ON "posts"("original_url");

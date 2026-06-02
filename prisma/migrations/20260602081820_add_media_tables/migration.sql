/*
  Warnings:

  - You are about to drop the column `path` on the `Media` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `Media` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `directory` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `extension` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Media` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `Media` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Media" DROP COLUMN "path",
ADD COLUMN     "collectionName" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "directory" TEXT NOT NULL,
ADD COLUMN     "extension" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "MediaConversion" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "directory" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaConversion_mediaId_name_key" ON "MediaConversion"("mediaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Media_uuid_key" ON "Media"("uuid");

-- CreateIndex
CREATE INDEX "Media_modelType_modelId_collectionName_idx" ON "Media"("modelType", "modelId", "collectionName");

-- AddForeignKey
ALTER TABLE "MediaConversion" ADD CONSTRAINT "MediaConversion_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

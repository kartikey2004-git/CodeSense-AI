/*
  Warnings:

  - You are about to drop the column `commitAuhorName` on the `Commit` table. All the data in the column will be lost.
  - Added the required column `commitAuthorName` to the `Commit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Commit" DROP COLUMN "commitAuhorName",
ADD COLUMN     "commitAuthorName" TEXT NOT NULL;

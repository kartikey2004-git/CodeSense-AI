/*
  Warnings:

  - A unique constraint covering the columns `[projectId,commitHash]` on the table `Commit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Commit_projectId_commitHash_key" ON "Commit"("projectId", "commitHash");

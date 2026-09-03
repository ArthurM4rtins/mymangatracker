-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "ProfileLike_profileUserId_idx" ON "ProfileLike"("profileUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileLike_userId_profileUserId_key" ON "ProfileLike"("userId", "profileUserId");

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLike" ADD CONSTRAINT "ProfileLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileLike" ADD CONSTRAINT "ProfileLike_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- À mão (issue #74): relação é entre dois usuários, a si mesmo não.
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_nao_a_si_mesmo" CHECK ("followerId" <> "followingId");
ALTER TABLE "ProfileLike" ADD CONSTRAINT "ProfileLike_nao_a_si_mesmo" CHECK ("userId" <> "profileUserId");

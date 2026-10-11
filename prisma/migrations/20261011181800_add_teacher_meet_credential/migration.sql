CREATE TABLE "teacher_meet_credentials" (
    "userId" TEXT NOT NULL,
    "refreshTokenEnc" TEXT NOT NULL,
    "googleSubject" VARCHAR(255),
    "googleEmail" VARCHAR(320),
    "scope" VARCHAR(500) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_meet_credentials_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "teacher_meet_credentials" ADD CONSTRAINT "teacher_meet_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "teacher_meet_connect_states" (
    "userId" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_meet_connect_states_pkey" PRIMARY KEY ("userId")
);

CREATE UNIQUE INDEX "teacher_meet_connect_states_stateHash_key" ON "teacher_meet_connect_states"("stateHash");

CREATE INDEX "teacher_meet_connect_states_expiresAt_idx" ON "teacher_meet_connect_states"("expiresAt");

ALTER TABLE "teacher_meet_connect_states" ADD CONSTRAINT "teacher_meet_connect_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

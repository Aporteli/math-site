-- CreateTable
CREATE TABLE "livekit_diagnostic_sessions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "roomKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "health" TEXT NOT NULL DEFAULT 'unknown',
    "activeRoomName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacherUserId" TEXT,
    "teacherName" TEXT,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "reconnects" INTEGER NOT NULL DEFAULT 0,
    "disconnects" INTEGER NOT NULL DEFAULT 0,
    "avgRttMs" DOUBLE PRECISION,
    "maxRttMs" DOUBLE PRECISION,
    "avgPacketLossPct" DOUBLE PRECISION,
    "maxPacketLossPct" DOUBLE PRECISION,
    "serverRegion" TEXT,
    "serverNodeId" TEXT,
    "serverVersion" TEXT,
    "serverSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livekit_diagnostic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livekit_diagnostic_participants" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "secondary" BOOLEAN NOT NULL DEFAULT false,
    "connectionState" TEXT NOT NULL DEFAULT 'unknown',
    "quality" TEXT NOT NULL DEFAULT 'unknown',
    "reconnects" INTEGER NOT NULL DEFAULT 0,
    "disconnects" INTEGER NOT NULL DEFAULT 0,
    "reconnectingSince" TIMESTAMP(3),
    "rttMs" DOUBLE PRECISION,
    "avgRttMs" DOUBLE PRECISION,
    "maxRttMs" DOUBLE PRECISION,
    "rttSumMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rttSampleCount" INTEGER NOT NULL DEFAULT 0,
    "sendLossPct" DOUBLE PRECISION,
    "avgSendLossPct" DOUBLE PRECISION,
    "maxSendLossPct" DOUBLE PRECISION,
    "sendLossSumPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sendLossSampleCount" INTEGER NOT NULL DEFAULT 0,
    "receiveLossPct" DOUBLE PRECISION,
    "avgReceiveLossPct" DOUBLE PRECISION,
    "maxReceiveLossPct" DOUBLE PRECISION,
    "receiveLossSumPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receiveLossSampleCount" INTEGER NOT NULL DEFAULT 0,
    "jitterMs" DOUBLE PRECISION,
    "avgJitterMs" DOUBLE PRECISION,
    "maxJitterMs" DOUBLE PRECISION,
    "jitterSumMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jitterSampleCount" INTEGER NOT NULL DEFAULT 0,
    "audioBitrateKbps" DOUBLE PRECISION,
    "audioTrackState" TEXT,
    "micPublishing" BOOLEAN NOT NULL DEFAULT false,
    "subscribedAudioCount" INTEGER NOT NULL DEFAULT 0,
    "iceState" TEXT,
    "iceSubscriberState" TEXT,
    "dtlsState" TEXT,
    "candidateRoute" TEXT,
    "reportedNetworkType" TEXT,
    "reportedRegion" TEXT,
    "reportedNodeId" TEXT,
    "serverState" TEXT,
    "serverRegion" TEXT,
    "serverAudioPublished" BOOLEAN,
    "serverSeenAt" TIMESTAMP(3),
    "lastDisconnectReason" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "samples" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "livekit_diagnostic_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livekit_diagnostic_events" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "participant" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dedupeKey" TEXT,
    "detail" JSONB,

    CONSTRAINT "livekit_diagnostic_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "livekit_diagnostic_sessions_publicId_key" ON "livekit_diagnostic_sessions"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "livekit_diagnostic_sessions_activeRoomName_key" ON "livekit_diagnostic_sessions"("activeRoomName");

-- CreateIndex
CREATE INDEX "livekit_diagnostic_sessions_courseId_startedAt_idx" ON "livekit_diagnostic_sessions"("courseId", "startedAt");

-- CreateIndex
CREATE INDEX "livekit_diagnostic_sessions_status_lastActivityAt_idx" ON "livekit_diagnostic_sessions"("status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "livekit_diagnostic_participants_sessionId_role_idx" ON "livekit_diagnostic_participants"("sessionId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "livekit_diagnostic_participants_sessionId_identity_key" ON "livekit_diagnostic_participants"("sessionId", "identity");

-- CreateIndex
CREATE INDEX "livekit_diagnostic_events_sessionId_occurredAt_idx" ON "livekit_diagnostic_events"("sessionId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "livekit_diagnostic_events_sessionId_dedupeKey_key" ON "livekit_diagnostic_events"("sessionId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "livekit_diagnostic_participants" ADD CONSTRAINT "livekit_diagnostic_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "livekit_diagnostic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livekit_diagnostic_events" ADD CONSTRAINT "livekit_diagnostic_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "livekit_diagnostic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

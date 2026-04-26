-- Progressive conversation summary (LangChain SummaryBufferMemory pattern).
-- Stores a 2-3 sentence digest of the oldest messages that no longer fit in
-- the verbatim window passed to the system prompt. Lets the mentor remember
-- decisions / names / arcs from turn 3 even at turn 50, without bloating
-- the prompt with the full history.

ALTER TABLE "Conversation"
  ADD COLUMN "summarySoFar"            TEXT,
  ADD COLUMN "summarizedUpToMessageId" TEXT;

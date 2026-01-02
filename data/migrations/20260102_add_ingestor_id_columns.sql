-- Copyright © 2025-26 l5yth & contributors
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

-- Migration: Add ingestor_id tracking to data tables
-- This allows tracking which ingestor contributed each data record

-- Add ingestor_id to messages table
ALTER TABLE messages ADD COLUMN ingestor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_ingestor_id ON messages(ingestor_id);

-- Add ingestor_id to positions table
ALTER TABLE positions ADD COLUMN ingestor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_positions_ingestor_id ON positions(ingestor_id);

-- Add ingestor_id to telemetry table
ALTER TABLE telemetry ADD COLUMN ingestor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_telemetry_ingestor_id ON telemetry(ingestor_id);

-- Add ingestor_id to neighbors table
ALTER TABLE neighbors ADD COLUMN ingestor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_neighbors_ingestor_id ON neighbors(ingestor_id);

-- Add ingestor_id to traces table
ALTER TABLE traces ADD COLUMN ingestor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_traces_ingestor_id ON traces(ingestor_id);

-- 001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
   email TEXT UNIQUE NOT NULL,
   stripe_customer_id TEXT,
   membership_type TEXT NOT NULL DEFAULT 'free', -- free | premium
   membership_expires_at TIMESTAMP WITH TIME ZONE,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_users_membership_expires ON users(membership_expires_at);

CREATE TABLE markets (
   id TEXT PRIMARY KEY, -- polymarket marketId
   title TEXT,
   category TEXT,
   market_type TEXT, 
   series_id TEXT, -- crucial for fetching the previous 50 periods
   timeframe TEXT DEFAULT '1d', -- e.g. 5m, 15m, 1h, 1d, 1w
   labels JSONB DEFAULT '["Yes", "No"]'::jsonb, -- e.g. ["Yes", "No"] or ["Up", "Down"]
   first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
   last_synced TIMESTAMP WITH TIME ZONE,
   status TEXT, -- active | resolved | closed
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_markets_series_id ON markets(series_id);

CREATE TABLE resolutions (
   id TEXT NOT NULL, -- resolution event id from API
   market_id TEXT NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
   series_id TEXT NOT NULL, -- Denormalized for rapid sequence fetching
   outcome BOOLEAN NOT NULL, -- TRUE = YES, FALSE = NO
   resolved_at TIMESTAMP WITH TIME ZONE NOT NULL,
   source_hash TEXT, -- detect malicious edits
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

   PRIMARY KEY (market_id, id)
);

-- Index to fetch the last N resolutions for a given series rapidly
CREATE INDEX idx_resolutions_series_time
ON resolutions(series_id, resolved_at DESC);

CREATE TABLE favorites (
   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
   market_id TEXT REFERENCES markets(id) ON DELETE CASCADE,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
   PRIMARY KEY(user_id, market_id)
);

CREATE TABLE fetch_locks (
   series_id TEXT PRIMARY KEY,
   locked_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

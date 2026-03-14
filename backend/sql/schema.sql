CREATE TABLE IF NOT EXISTS user_shares (
  user_id UUID PRIMARY KEY,
  session_token TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  share_b TEXT NOT NULL,
  pos_token TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_shares_device_fingerprint_idx
ON user_shares (device_fingerprint);

CREATE INDEX IF NOT EXISTS user_shares_pos_token_idx
ON user_shares (pos_token);

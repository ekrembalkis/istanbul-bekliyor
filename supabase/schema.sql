-- İstanbul Bekliyor Campaign Management Schema
-- Run this in Supabase SQL Editor

-- Planned tweets table
CREATE TABLE tweets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL,
  tweet_date DATE NOT NULL,
  theme TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  nano_prompt TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ready', 'posted', 'skipped')),
  hashtags TEXT[] DEFAULT ARRAY['#İstanbulBekliyor'],
  algorithm_score INTEGER DEFAULT 0,
  algorithm_notes TEXT[],
  engagement_likes INTEGER DEFAULT 0,
  engagement_replies INTEGER DEFAULT 0,
  engagement_reposts INTEGER DEFAULT 0,
  engagement_views INTEGER DEFAULT 0,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('arrest_date', '"2025-03-19"'),
  ('account_handle', '"@istbekliyor"'),
  ('display_name', '"İSTANBUL BEKLİYOR"'),
  ('primary_hashtag', '"#İstanbulBekliyor"'),
  ('brand_colors', '{"red": "#E30A17", "white": "#FFFFFF", "dark": "#0C0C12", "gold": "#D4A843"}');

-- Image storage bucket (run in Supabase dashboard > Storage)
-- Create bucket: "tweet-images" (public)

-- Enable Row Level Security
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- For simplicity: allow all operations (single user app)
-- In production, add proper auth policies
CREATE POLICY "Allow all on tweets" ON tweets FOR ALL USING (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tweets_updated_at
  BEFORE UPDATE ON tweets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

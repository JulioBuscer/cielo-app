CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_uri TEXT,
  is_default INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS babies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  birth_date INTEGER NOT NULL,
  photo_uri TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS diaper_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  pee_intensity INTEGER DEFAULT 0,
  poop_intensity INTEGER DEFAULT 0,
  has_blood INTEGER DEFAULT 0,
  has_mucus INTEGER DEFAULT 0,
  has_diarrhea INTEGER DEFAULT 0,
  color TEXT,
  consistency TEXT,
  image_uri TEXT,
  image_thumb_uri TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS feeding_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  duration_min INTEGER,
  amount_ml REAL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS growth_logs (
  id TEXT PRIMARY KEY NOT NULL,
  baby_id TEXT NOT NULL REFERENCES babies(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  timestamp INTEGER NOT NULL,
  weight_grams INTEGER,
  height_mm INTEGER,
  head_circ_mm INTEGER,
  notes TEXT
);

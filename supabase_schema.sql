-- ========================================================
-- GRADELY — THE COLEMAN INDEX
-- Complete Supabase SQL Schema & Seed Data
-- ========================================================

-- ─── EXTENSIONS & UTILITIES ──────────────────────────────
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── TABLE 1: programmes ────────────────────────────────
CREATE TABLE programmes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'coming_soon'
    CHECK (status IN ('live', 'coming_soon', 'disabled')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── TABLE 2: years ─────────────────────────────────────
CREATE TABLE years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  year_number INTEGER NOT NULL CHECK (year_number IN (1,2,3)),
  label TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── TABLE 3: courses ────────────────────────────────────
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID REFERENCES years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  semester INTEGER NOT NULL CHECK (semester IN (1,2)),
  is_non_graded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── TABLE 4: grade_scale ───────────────────────────────
CREATE TABLE grade_scale (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade TEXT NOT NULL UNIQUE,
  points DECIMAL(4,2) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ─── TABLE 5: classifications ───────────────────────────
CREATE TABLE classifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  min_gpa DECIMAL(4,2) NOT NULL,
  max_gpa DECIMAL(4,2) NOT NULL,
  color TEXT NOT NULL,
  badge_style TEXT DEFAULT 'gold',
  consequence TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ─── TABLE 6: app_settings ──────────────────────────────
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── TABLE 7: admin_users ───────────────────────────────
CREATE TABLE admin_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'editor'
    CHECK (role IN ('superadmin', 'editor')),
  position TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── SEED DATA — PROGRAMMES ──────────────────────────────
INSERT INTO programmes (name, code, status) VALUES
('General Nursing', 'RGN', 'live'),
('Midwifery', 'MID', 'coming_soon'),
('Nursing Assistants Certificate', 'NAC', 'coming_soon');

-- ─── SEED DATA — GRADE SCALE ─────────────────────────────
INSERT INTO grade_scale
  (grade, points, description, sort_order) VALUES
('A',  4.00, 'Excellent',      1),
('A-', 3.75, 'Very Good',      2),
('B+', 3.50, 'Good Plus',      3),
('B',  3.00, 'Good',           4),
('B-', 2.50, 'Above Average',  5),
('C+', 2.00, 'Average Plus',   6),
('C',  1.50, 'Average',        7),
('D',  1.00, 'Below Average',  8),
('F',  0.00, 'Fail',           9);

-- ─── SEED DATA — CLASSIFICATIONS (RGN) ───────────────────
INSERT INTO classifications
  (programme_id, label, min_gpa, max_gpa,
   color, badge_style, consequence, sort_order)
SELECT
  p.id,
  c.label, c.min_gpa, c.max_gpa,
  c.color, c.badge_style, c.consequence, c.sort_order
FROM programmes p
CROSS JOIN (VALUES
  ('First Class',          3.60, 4.00, '#f5a623', 'gold',   NULL,                      1),
  ('Second Class Upper',   3.00, 3.59, '#1e3a5f', 'blue',   NULL,                      2),
  ('Second Class Lower',   2.50, 2.99, '#22c55e', 'green',  NULL,                      3),
  ('Third Class',          2.00, 2.49, '#7c3aed', 'purple', NULL,                      4),
  ('Pass',                 1.00, 1.99, '#9ca3af', 'grey',   NULL,                      5),
  ('Fail',                 0.00, 0.99, '#ef4444', 'red',    'Academic dismissal risk', 6)
) AS c(label, min_gpa, max_gpa, color, badge_style, consequence, sort_order)
WHERE p.code = 'RGN';

-- ─── SEED DATA — YEARS (RGN) ─────────────────────────────
INSERT INTO years
  (programme_id, year_number, label, is_locked)
SELECT
  p.id, y.year_number, y.label, y.is_locked
FROM programmes p
CROSS JOIN (VALUES
  (1, 'Year 1', false),
  (2, 'Year 2', false),
  (3, 'Year 3', false)
) AS y(year_number, label, is_locked)
WHERE p.code = 'RGN';

-- ─── SEED DATA — COURSES (RGN YEAR 1) ────────────────────
INSERT INTO courses
  (year_id, name, code, credits,
   semester, is_non_graded, sort_order)
SELECT
  yr.id,
  c.name, c.code, c.credits,
  c.semester, c.is_non_graded, c.sort_order
FROM years yr
JOIN programmes p ON yr.programme_id = p.id
CROSS JOIN (VALUES
  ('Professional Adjustment in Nursing',            'ADJ 111', 2, 1, false, 1),
  ('Basic Nursing',                                 'BNS 111', 3, 1, false, 2),
  ('Anatomy and Physiology I',                      'HAP 111', 3, 1, false, 3),
  ('Microbiology and Infection Prevention/Control', 'MIP 111', 2, 1, false, 4),
  ('Nursing and Midwifery Health Informatics',      'NMI 111', 2, 1, false, 5),
  ('Therapeutic Communication',                     'TCM 111', 3, 1, false, 6),
  ('First Aid, Emergency and Disaster Management',  'FED 121', 3, 2, false, 7),
  ('Introductory French Language',                  'IFL 041', 0, 2, true,  8),
  ('Introductory Sign Language',                    'ISL 041', 0, 2, true,  9),
  ('Behavioural Science',                           'PNM 121', 2, 2, false, 10),
  ('Anatomy and Physiology II',                     'RGN 121', 3, 2, false, 11),
  ('Advanced Nursing I',                            'RGN 122', 2, 2, false, 12),
  ('Nursing Process',                               'RGN 123', 3, 2, false, 13),
  ('Child Protection and Abuse',                    'RGN 124', 3, 2, false, 14),
  ('Statistics',                                    'STA 121', 2, 2, false, 15)
) AS c(name, code, credits,
       semester, is_non_graded, sort_order)
WHERE p.code = 'RGN' AND yr.year_number = 1;

-- ─── SEED DATA — COURSES (RGN YEAR 2) ────────────────────
INSERT INTO courses
  (year_id, name, code, credits,
   semester, is_non_graded, sort_order)
SELECT
  yr.id,
  c.name, c.code, c.credits,
  c.semester, c.is_non_graded, c.sort_order
FROM years yr
JOIN programmes p ON yr.programme_id = p.id
CROSS JOIN (VALUES
  ('Nutrition and Dietetics',                        'NAD 122', 3, 1, false, 1),
  ('Anatomy and Physiology III',                     'RGN 211A', 2, 1, false, 2),
  ('Advanced Nursing II',                            'RGN 211', 2, 1, false, 3),
  ('Medical Nursing I',                              'RGN 213', 3, 1, false, 4),
  ('Surgical Nursing I',                             'RGN 215', 3, 1, false, 5),
  ('Pharmacology, Therapeutics and Pharmacovigilance I', 'RGN 217', 3, 1, false, 6),
  ('Gerontology',                                    'RGN 232', 2, 1, false, 7),
  ('Medical Nursing II',                             'H RGN 060', 3, 2, false, 8),
  ('Psychiatric Nursing',                            'H RGN 066', 3, 2, false, 9),
  ('Surgical Nursing II',                            'H RGN 070', 3, 2, false, 10),
  ('Pharmacology, Therapeutics and Pharmacovigilance II', 'PTP 221', 3, 2, false, 11),
  ('Research Methods',                               'RES 221', 3, 2, false, 12),
  ('Community-Based Rehabilitation',                 'RGN 321', 3, 2, false, 13),
  ('Supply Chain Management',                        'SCM 311', 2, 2, false, 14)
) AS c(name, code, credits,
       semester, is_non_graded, sort_order)
WHERE p.code = 'RGN' AND yr.year_number = 2;

-- ─── SEED DATA — APP SETTINGS ─────────────────────────────
INSERT INTO app_settings (key, value) VALUES
('app_version',    '2.0.0'),
('app_name',       'Gradely'),
('app_tagline',    'The Coleman Index'),
('app_subtitle',   'A Student Initiative for Academic Clarity'),
('app_url',        'https://vitalscore-dnmtc.vercel.app'),
('college_name',   'Dunkwa On Offin Nursing & Midwifery Training College'),
('college_short',  'DONMTC'),
('built_by',       'Jonas Coleman, SRC PRO'),
('changelog',      'v2.0.0 — Full rebuild with live curriculum management by admin');

-- ─── ROW LEVEL SECURITY ──────────────────────────────────
-- Enable RLS
ALTER TABLE programmes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE years             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_scale       ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;

-- Students: public read access
CREATE POLICY "Public read programmes"      ON programmes      FOR SELECT USING (true);
CREATE POLICY "Public read years"           ON years           FOR SELECT USING (true);
CREATE POLICY "Public read courses"         ON courses         FOR SELECT USING (true);
CREATE POLICY "Public read grade_scale"     ON grade_scale     FOR SELECT USING (true);
CREATE POLICY "Public read classifications" ON classifications FOR SELECT USING (true);
CREATE POLICY "Public read app_settings"    ON app_settings    FOR SELECT USING (true);

-- Admins: full access when authenticated
CREATE POLICY "Admin all programmes"      ON programmes      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all years"           ON years           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all courses"         ON courses         FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all grade_scale"     ON grade_scale     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all classifications" ON classifications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all app_settings"    ON app_settings    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all admin_users"     ON admin_users     FOR ALL USING (auth.role() = 'authenticated');

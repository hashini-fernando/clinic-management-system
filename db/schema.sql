-- ============================================================
-- ABC Health Clinic - Complete Database Schema
-- PostgreSQL
--
-- HOW TO USE:
-- 1. Open pgAdmin
-- 2. Create database: clinic_db
-- 3. Create user:
--      CREATE USER clinic_user WITH PASSWORD 'clinic_pass';
--      GRANT ALL PRIVILEGES ON DATABASE clinic_db TO clinic_user;
-- 4. Open Query Tool on clinic_db
-- 5. Paste this entire file and press F5
-- ============================================================


-- ============================================================
-- TRIGGER FUNCTION
-- Auto updates updated_at on every UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- CORE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: doctors
-- Stores ALL clinic staff — doctors, receptionists, admins
-- Used for authentication and role based access
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id             SERIAL       PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL DEFAULT 'doctor'
                   CHECK (role IN ('doctor', 'staff', 'admin')),
    specialization VARCHAR(100),
    is_active      BOOLEAN      DEFAULT true,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- TABLE: patients
-- Stores patient demographic information
-- Registered by staff/admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    age        INTEGER      NOT NULL CHECK (age > 0 AND age < 150),
    gender     VARCHAR(10)  CHECK (gender IN ('male', 'female', 'other')),
    phone      VARCHAR(20),
    address    TEXT,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- TABLE: visits
-- Each row = one clinic visit
-- doctor_id links to the doctor who handled the visit
-- status flow: pending → unconfirmed → completed
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id           SERIAL      PRIMARY KEY,
    patient_id   INTEGER     NOT NULL,
    doctor_id    INTEGER,
    raw_input    TEXT        NOT NULL,
    visit_date   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    doctor_notes TEXT,
    status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN (
                     'pending',
                     'unconfirmed',
                     'completed',
                     'cancelled'
                 )),
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_visits_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_visits_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_patient_id
    ON visits(patient_id);

CREATE INDEX IF NOT EXISTS idx_visits_doctor_id
    ON visits(doctor_id);

CREATE INDEX IF NOT EXISTS idx_visits_status
    ON visits(status);

CREATE TRIGGER trg_visits_updated_at
    BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- TABLE: parsed_items
-- AI classified items from doctor notes
-- item_type: drug | lab_test | observation
-- confidence: AI certainty (0.0-1.0) stored for analysis
--             NOT shown on patient documents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parsed_items (
    id          SERIAL       PRIMARY KEY,
    visit_id    INTEGER      NOT NULL,
    item_type   VARCHAR(20)  NOT NULL
                CHECK (item_type IN ('drug', 'lab_test', 'observation')),
    name        VARCHAR(255) NOT NULL,
    dosage      VARCHAR(100),
    frequency   VARCHAR(100),
    duration    VARCHAR(100),
    notes       TEXT,
    rxnorm_code VARCHAR(50),
    icd10_code  VARCHAR(20),
    confidence  DECIMAL(4,2) DEFAULT 0,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_parsed_items_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_parsed_items_visit_id
    ON parsed_items(visit_id);

CREATE INDEX IF NOT EXISTS idx_parsed_items_item_type
    ON parsed_items(item_type);


-- ------------------------------------------------------------
-- TABLE: billing
-- One bill per visit (1-to-1 with visits)
-- status: unpaid | paid | waived
-- Generated automatically when doctor confirms visit
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing (
    id           SERIAL        PRIMARY KEY,
    visit_id     INTEGER       NOT NULL UNIQUE,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status       VARCHAR(20)   DEFAULT 'unpaid'
                 CHECK (status IN ('unpaid', 'paid', 'waived')),
    paid_at      TIMESTAMP,
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_billing_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_billing_updated_at
    BEFORE UPDATE ON billing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ------------------------------------------------------------
-- TABLE: billing_items
-- Individual line items in a bill
-- item_type: consultation | drug | lab_test
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_items (
    id          SERIAL        PRIMARY KEY,
    billing_id  INTEGER       NOT NULL,
    description VARCHAR(255)  NOT NULL,
    item_type   VARCHAR(20)   NOT NULL
                CHECK (item_type IN ('consultation', 'drug', 'lab_test')),
    unit_price  DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity    INTEGER       NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_billing_items_billing
        FOREIGN KEY (billing_id)
        REFERENCES billing(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_billing_items_billing_id
    ON billing_items(billing_id);


-- ------------------------------------------------------------
-- TABLE: ai_summary
-- Stores AI accuracy metrics per visit
-- Populated when doctor confirms (Human-in-the-Loop)
-- 1-to-1 with visits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_summary (
    id                    SERIAL       PRIMARY KEY,
    visit_id              INTEGER      NOT NULL,

    -- AI counts before doctor review
    ai_drugs_count        INTEGER      DEFAULT 0,
    ai_labs_count         INTEGER      DEFAULT 0,
    ai_obs_count          INTEGER      DEFAULT 0,

    -- Doctor confirmed counts after review
    confirmed_drugs_count INTEGER      DEFAULT 0,
    confirmed_labs_count  INTEGER      DEFAULT 0,
    confirmed_obs_count   INTEGER      DEFAULT 0,

    -- Simple accuracy per label
    drug_accuracy         DECIMAL(5,2) DEFAULT 0,
    lab_accuracy          DECIMAL(5,2) DEFAULT 0,
    obs_accuracy          DECIMAL(5,2) DEFAULT 0,
    overall_accuracy      DECIMAL(5,2) DEFAULT 0,

    -- Multi-label PRF metrics (macro averaged)
    precision_score       DECIMAL(5,2) DEFAULT 0,
    recall_score          DECIMAL(5,2) DEFAULT 0,
    f1_score              DECIMAL(5,2) DEFAULT 0,

    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_summary_visit
        FOREIGN KEY (visit_id)
        REFERENCES visits(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_ai_summary_visit
        UNIQUE (visit_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_summary_visit_id
    ON ai_summary(visit_id);

CREATE TRIGGER trg_ai_summary_updated_at
    BEFORE UPDATE ON ai_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- LOOKUP / REFERENCE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: drug_price_list
-- Drug prices looked up by name during billing
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drug_price_list (
    id         SERIAL        PRIMARY KEY,
    drug_name  VARCHAR(255)  NOT NULL UNIQUE,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- TABLE: lab_price_list
-- Lab test prices looked up by name during billing
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_price_list (
    id         SERIAL        PRIMARY KEY,
    test_name  VARCHAR(255)  NOT NULL UNIQUE,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 20.00,
    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- TABLE: consultation_types
-- Consultation fee types and prices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consultation_types (
    id         SERIAL        PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL UNIQUE,
    price      DECIMAL(10,2) NOT NULL DEFAULT 30.00,
    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- TABLE: drug_codes
-- Maps brand/common names to RXNorm standard codes
-- Used during visit confirmation for standardization
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drug_codes (
    id            SERIAL       PRIMARY KEY,
    common_name   VARCHAR(255) NOT NULL,
    standard_name VARCHAR(255) NOT NULL,
    rxnorm_code   VARCHAR(50),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drug_codes_common_name
    ON drug_codes(LOWER(common_name));


-- ------------------------------------------------------------
-- TABLE: icd10_codes
-- WHO ICD-10 diagnosis codes reference
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS icd10_codes (
    id          SERIAL      PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    description TEXT        NOT NULL,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO clinic_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clinic_user;
GRANT USAGE ON SCHEMA public TO clinic_user;


-- ============================================================
-- SEED DATA
-- ============================================================

-- Demo accounts
-- Password for ALL accounts: clinic123
-- Hash: bcrypt cost 10
INSERT INTO doctors (name, email, password_hash, role, specialization) VALUES
(
    'Dr. John Silva',
    'doctor@clinic.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'doctor',
    'General Practitioner'
),
(
    'Sarah Admin',
    'admin@clinic.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    NULL
),
(
    'Mary Reception',
    'staff@clinic.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'staff',
    NULL
)
ON CONFLICT (email) DO NOTHING;


-- Consultation fee
INSERT INTO consultation_types (name, price) VALUES
    ('General Consultation', 30.00)
ON CONFLICT (name) DO NOTHING;


-- Drug prices
INSERT INTO drug_price_list (drug_name, unit_price) VALUES
    ('Paracetamol (PCM)',  2.50),
    ('Amoxicillin',        8.00),
    ('Amlodipine',         5.00),
    ('Metformin',          4.00),
    ('Atorvastatin',       7.00),
    ('Aspirin',            2.00),
    ('Omeprazole',         6.00),
    ('Losartan',           9.00),
    ('Ciprofloxacin',     10.00),
    ('Ibuprofen',          3.50),
    ('Salbutamol',         6.00),
    ('Insulin Mixtard',   15.00),
    ('Metformin (Glucophage)', 4.00)
ON CONFLICT (drug_name) DO NOTHING;


-- Lab prices
INSERT INTO lab_price_list (test_name, unit_price) VALUES
    ('CBC',              15.00),
    ('FBC',              15.00),
    ('FBS',              12.00),
    ('PPBS',             12.00),
    ('HbA1c',            25.00),
    ('LFT',              20.00),
    ('RFT',              20.00),
    ('KFT',              20.00),
    ('Lipid Profile',    30.00),
    ('ECG',              20.00),
    ('CXR',              25.00),
    ('UFR',              10.00),
    ('ESR',               8.00),
    ('Troponin',         35.00),
    ('Echo',             60.00),
    ('Ultrasound',       40.00),
    ('Thyroid Profile',  30.00),
    ('Blood Culture',    40.00),
    ('Urine Culture',    30.00),
    ('Throat Swab',      20.00),
    ('FBC',              15.00)
ON CONFLICT (test_name) DO NOTHING;


-- Drug codes (brand to RXNorm)
INSERT INTO drug_codes (common_name, standard_name, rxnorm_code) VALUES
    ('Paracetamol',      'Paracetamol (PCM)', '161'),
    ('PCM',              'Paracetamol (PCM)', '161'),
    ('Panadol',          'Paracetamol (PCM)', '161'),
    ('Glucophage',       'Metformin',         '6809'),
    ('Metformin',        'Metformin',         '6809'),
    ('Ventolin',         'Salbutamol',        '41493'),
    ('Salbutamol',       'Salbutamol',        '41493'),
    ('Amoxicillin',      'Amoxicillin',       '723'),
    ('Amlodipine',       'Amlodipine',        '17767'),
    ('Atorvastatin',     'Atorvastatin',      '83367'),
    ('Aspirin',          'Aspirin',           '1191'),
    ('Ciprofloxacin',    'Ciprofloxacin',     '2551'),
    ('Losartan',         'Losartan',          '203160'),
    ('Omeprazole',       'Omeprazole',        '7646'),
    ('Insulin Mixtard',  'Insulin Mixtard',   ''),
    ('Ibuprofen',        'Ibuprofen',         '5640')
ON CONFLICT DO NOTHING;


-- ICD10 codes
INSERT INTO icd10_codes (code, description) VALUES
    ('J06.9', 'Acute upper respiratory infection'),
    ('J18.9', 'Pneumonia'),
    ('I10',   'Essential hypertension'),
    ('E11.9', 'Type 2 diabetes mellitus'),
    ('E78.5', 'Hyperlipidaemia'),
    ('I25.9', 'Chronic ischaemic heart disease'),
    ('N39.0', 'Urinary tract infection'),
    ('K21.0', 'Gastro-oesophageal reflux disease'),
    ('R50.9', 'Fever'),
    ('R05',   'Cough'),
    ('R51',   'Headache'),
    ('I21.9', 'Acute myocardial infarction'),
    ('J02.9', 'Acute pharyngitis'),
    ('J03.9', 'Acute tonsillitis')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- VERIFY — check all tables created
-- ============================================================

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
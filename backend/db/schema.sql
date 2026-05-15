-- ============================================================
-- FlyNow BMS — PostgreSQL Schema
-- Now Travel & Tours Limited (FlyNowTravels)
-- All 6 modules: CRM, Bookings, Visas, Invoices, Documents, Staff
-- ============================================================

-- NOTE: gen_random_uuid() is built into PostgreSQL 13+ — no extension needed.
-- pg_trgm must be allowlisted in Azure Portal → flynowtravels-db → Server parameters
--   azure.extensions = pg_trgm   (save & restart before running this script)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- MODULE 0: REFERENCE / LOOKUP TABLES
-- ============================================================

CREATE TABLE countries (
    code        CHAR(2)      PRIMARY KEY,  -- ISO 3166-1 alpha-2
    name        VARCHAR(100) NOT NULL,
    calling_code VARCHAR(10),
    requires_visa BOOLEAN    DEFAULT true
);

CREATE TABLE visa_types (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code CHAR(2)      NOT NULL REFERENCES countries(code),
    name         VARCHAR(150) NOT NULL,  -- e.g. "UK Standard Visitor Visa"
    description  TEXT,
    embassy_url  VARCHAR(500),
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Document checklist templates per visa type
CREATE TABLE visa_checklist_items (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_type_id UUID         NOT NULL REFERENCES visa_types(id) ON DELETE CASCADE,
    item_name    VARCHAR(200) NOT NULL,  -- e.g. "International Passport (6 months validity)"
    is_mandatory BOOLEAN      DEFAULT true,
    notes        TEXT,
    sort_order   SMALLINT     DEFAULT 0
);

-- ============================================================
-- MODULE 1: STAFF (used for auth/audit cross-cutting)
-- ============================================================

CREATE TABLE staff (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entra_oid     VARCHAR(200) UNIQUE NOT NULL, -- Entra ID object ID from JWT (oid claim)
    email         VARCHAR(200) UNIQUE NOT NULL,
    full_name     VARCHAR(200) NOT NULL,
    role          VARCHAR(50)  NOT NULL CHECK (role IN (
                      'BMS.Admin','BMS.Manager','BMS.Finance','BMS.HR','BMS.Visa','BMS.Sales'
                  )),
    branch        VARCHAR(100) DEFAULT 'Head Office',
    phone         VARCHAR(20),
    department    VARCHAR(100),
    date_joined   DATE,
    is_active     BOOLEAN      DEFAULT true,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE leave_requests (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id       UUID         NOT NULL REFERENCES staff(id),
    leave_type     VARCHAR(50)  NOT NULL CHECK (leave_type IN ('Annual','Sick','Maternity','Paternity','Emergency','Unpaid')),
    start_date     DATE         NOT NULL,
    end_date       DATE         NOT NULL,
    days_count     SMALLINT     NOT NULL,
    reason         TEXT,
    status         VARCHAR(20)  NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    approved_by    UUID         REFERENCES staff(id),
    approved_at    TIMESTAMPTZ,
    approver_note  TEXT,
    created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: CUSTOMER RECORDS (CRM)
-- ============================================================

CREATE TYPE customer_type AS ENUM ('Individual','SME Corporate','Enterprise','VIP','Group');
CREATE TYPE customer_source AS ENUM ('Walk-in','Phone','WhatsApp','Website Form','Referral','Email','Social Media','Other');

CREATE TABLE customers (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identity
    first_name          VARCHAR(100)    NOT NULL,
    last_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(200)    UNIQUE,
    phone               VARCHAR(30)     NOT NULL,
    whatsapp            VARCHAR(30),
    customer_type       customer_type   NOT NULL DEFAULT 'Individual',
    -- Corporate link
    company_name        VARCHAR(200),
    job_title           VARCHAR(100),
    -- Passport
    passport_number     VARCHAR(50),
    passport_expiry     DATE,
    nationality         CHAR(2)         REFERENCES countries(code),
    date_of_birth       DATE,
    gender              CHAR(1)         CHECK (gender IN ('M','F','O')),
    -- Address
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    -- Meta
    notes               TEXT,
    source              customer_source DEFAULT 'Walk-in',
    assigned_to         UUID            REFERENCES staff(id),
    is_active           BOOLEAN         DEFAULT true,
    created_by          UUID            REFERENCES staff(id),
    created_at          TIMESTAMPTZ     DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     DEFAULT NOW()
);

-- Full-text search index on customer names and email
CREATE INDEX idx_customers_name_search ON customers USING GIN (
    to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email,'') || ' ' || COALESCE(company_name,''))
);
CREATE INDEX idx_customers_passport ON customers(passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX idx_customers_passport_expiry ON customers(passport_expiry) WHERE passport_expiry IS NOT NULL;

-- Customer interaction log (calls, emails, walk-ins, WhatsApp)
CREATE TYPE interaction_channel AS ENUM ('Phone','Email','WhatsApp','Walk-in','Teams','Portal','Other');

CREATE TABLE customer_interactions (
    id           UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID                NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    staff_id     UUID                NOT NULL REFERENCES staff(id),
    channel      interaction_channel NOT NULL,
    summary      TEXT                NOT NULL,
    outcome      TEXT,
    follow_up_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ         DEFAULT NOW()
);

CREATE INDEX idx_interactions_customer ON customer_interactions(customer_id);

-- ============================================================
-- MODULE 3: BOOKINGS & ENQUIRY TRACKER
-- ============================================================

CREATE TYPE booking_service AS ENUM ('Flight','Hotel','Flight+Hotel','Visa Only','Tour Package','Airport Transfer','Travel Insurance','Other');
CREATE TYPE booking_status  AS ENUM ('Enquiry','Quote Sent','Payment Pending','Confirmed','Ticketed','Completed','Cancelled','Refunded');

CREATE TABLE bookings (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    reference        VARCHAR(20)     UNIQUE NOT NULL,  -- e.g. FNB-2026-00001
    customer_id      UUID            NOT NULL REFERENCES customers(id),
    assigned_to      UUID            REFERENCES staff(id),
    service_type     booking_service NOT NULL,
    status           booking_status  NOT NULL DEFAULT 'Enquiry',
    -- Travel details
    origin           VARCHAR(100),
    destination      VARCHAR(100),   -- can be multiple cities (JSON stored as text)
    travel_date      DATE,
    return_date      DATE,
    pax_count        SMALLINT        DEFAULT 1,
    pax_names        JSONB,          -- array of passenger names + passport numbers
    -- GDS / Supplier details
    pnr              VARCHAR(20),    -- Amadeus/Sabre PNR
    airline          VARCHAR(100),
    flight_numbers   VARCHAR(200),
    hotel_name       VARCHAR(200),
    hotel_confirmation VARCHAR(100),
    -- Financials
    cost_price       NUMERIC(14,2),  -- what FlyNow paid supplier
    selling_price    NUMERIC(14,2),  -- what customer pays
    currency         CHAR(3)         DEFAULT 'NGN',
    -- Notes & Docs
    internal_notes   TEXT,
    customer_notes   TEXT,
    -- Timestamps
    quote_sent_at    TIMESTAMPTZ,
    confirmed_at     TIMESTAMPTZ,
    ticketed_at      TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_by       UUID            REFERENCES staff(id),
    created_at       TIMESTAMPTZ     DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     DEFAULT NOW()
);

-- Auto-generate booking reference: FNB-YYYY-NNNNN
CREATE SEQUENCE booking_seq START 1;
CREATE OR REPLACE FUNCTION generate_booking_ref() RETURNS TRIGGER AS $$
BEGIN
    NEW.reference := 'FNB-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('booking_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_ref
    BEFORE INSERT ON bookings
    FOR EACH ROW WHEN (NEW.reference IS NULL OR NEW.reference = '')
    EXECUTE FUNCTION generate_booking_ref();

CREATE INDEX idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX idx_bookings_assigned   ON bookings(assigned_to);

-- ============================================================
-- MODULE 4: VISA APPLICATION TRACKER
-- ============================================================

CREATE TYPE visa_stage AS ENUM (
    'Enquiry',
    'Checklist Sent',
    'Documents Received',
    'Documents Under Review',
    'Submitted to Embassy',
    'Appointment Booked',
    'Processing',
    'Approved',
    'Rejected',
    'Ready for Collection',
    'Delivered',
    'Cancelled'
);

CREATE TABLE visa_applications (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    reference         VARCHAR(20)  UNIQUE NOT NULL,  -- e.g. FNV-2026-00001
    customer_id       UUID         NOT NULL REFERENCES customers(id),
    booking_id        UUID         REFERENCES bookings(id),  -- link if part of a booking
    visa_type_id      UUID         NOT NULL REFERENCES visa_types(id),
    assigned_to       UUID         REFERENCES staff(id),
    stage             visa_stage   NOT NULL DEFAULT 'Enquiry',
    -- Application details
    applicant_count   SMALLINT     DEFAULT 1,
    travel_purpose    VARCHAR(200),
    intended_travel_date DATE,
    -- Embassy & appointment
    embassy_ref       VARCHAR(100),
    appointment_date  DATE,
    appointment_time  TIME,
    appointment_notes TEXT,
    -- Outcome
    outcome_date      DATE,
    visa_valid_from   DATE,
    visa_valid_to     DATE,
    rejection_reason  TEXT,
    -- SharePoint document folder URL for this application
    sharepoint_folder_url TEXT,
    -- Fees
    service_fee       NUMERIC(12,2),
    embassy_fee       NUMERIC(12,2),
    courier_fee       NUMERIC(12,2),
    currency          CHAR(3)      DEFAULT 'NGN',
    -- Timestamps
    internal_notes    TEXT,
    created_by        UUID         REFERENCES staff(id),
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE SEQUENCE visa_seq START 1;
CREATE OR REPLACE FUNCTION generate_visa_ref() RETURNS TRIGGER AS $$
BEGIN
    NEW.reference := 'FNV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('visa_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visa_ref
    BEFORE INSERT ON visa_applications
    FOR EACH ROW WHEN (NEW.reference IS NULL OR NEW.reference = '')
    EXECUTE FUNCTION generate_visa_ref();

-- Stage change history
CREATE TABLE visa_stage_history (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_id         UUID        NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
    from_stage      visa_stage,
    to_stage        visa_stage  NOT NULL,
    changed_by      UUID        REFERENCES staff(id),
    note            TEXT,
    notification_sent BOOLEAN   DEFAULT false,
    changed_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Document checklist per application (which items submitted)
CREATE TABLE visa_document_submissions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_id         UUID        NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
    checklist_item_id UUID      NOT NULL REFERENCES visa_checklist_items(id),
    is_submitted    BOOLEAN     DEFAULT false,
    sharepoint_file_id VARCHAR(500),  -- Graph API drive item ID
    file_name       VARCHAR(300),
    submitted_at    TIMESTAMPTZ,
    notes           TEXT
);

CREATE INDEX idx_visa_customer   ON visa_applications(customer_id);
CREATE INDEX idx_visa_stage      ON visa_applications(stage);
CREATE INDEX idx_visa_assigned   ON visa_applications(assigned_to);
CREATE INDEX idx_visa_appointment ON visa_applications(appointment_date) WHERE appointment_date IS NOT NULL;

-- ============================================================
-- MODULE 5: INVOICING & PAYMENTS
-- ============================================================

CREATE TYPE invoice_status AS ENUM ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled','Refunded');
CREATE TYPE payment_method AS ENUM ('Paystack Online','Bank Transfer','POS','Cash','Cheque','Crypto');

CREATE TABLE invoices (
    id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number   VARCHAR(20)     UNIQUE NOT NULL,  -- e.g. FNI-2026-00001
    booking_id       UUID            REFERENCES bookings(id),
    visa_id          UUID            REFERENCES visa_applications(id),
    customer_id      UUID            NOT NULL REFERENCES customers(id),
    -- Amounts
    subtotal         NUMERIC(14,2)   NOT NULL DEFAULT 0,
    vat_rate         NUMERIC(5,2)    DEFAULT 7.5,  -- Nigerian VAT
    vat_amount       NUMERIC(14,2)   DEFAULT 0,
    discount_amount  NUMERIC(14,2)   DEFAULT 0,
    total_amount     NUMERIC(14,2)   NOT NULL,
    amount_paid      NUMERIC(14,2)   DEFAULT 0,
    balance_due      NUMERIC(14,2)   GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    currency         CHAR(3)         DEFAULT 'NGN',
    -- Status
    status           invoice_status  NOT NULL DEFAULT 'Draft',
    due_date         DATE,
    -- Paystack
    paystack_ref     VARCHAR(200),
    paystack_link    VARCHAR(500),  -- hosted payment page URL
    -- Zoho Books
    zoho_invoice_id  VARCHAR(100),  -- synced Zoho invoice ID
    -- Meta
    notes            TEXT,
    sent_at          TIMESTAMPTZ,
    paid_at          TIMESTAMPTZ,
    created_by       UUID            REFERENCES staff(id),
    created_at       TIMESTAMPTZ     DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     DEFAULT NOW()
);

CREATE SEQUENCE invoice_seq START 1;
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number := 'FNI-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- Line items on each invoice
CREATE TABLE invoice_line_items (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id   UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description  VARCHAR(500) NOT NULL,
    quantity     NUMERIC(8,2) DEFAULT 1,
    unit_price   NUMERIC(14,2) NOT NULL,
    line_total   NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Payment records
CREATE TABLE payments (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID           NOT NULL REFERENCES invoices(id),
    amount          NUMERIC(14,2)  NOT NULL,
    currency        CHAR(3)        DEFAULT 'NGN',
    payment_method  payment_method NOT NULL,
    reference       VARCHAR(200),  -- Paystack reference or bank teller
    paystack_data   JSONB,         -- raw webhook payload from Paystack
    paid_at         TIMESTAMPTZ    DEFAULT NOW(),
    recorded_by     UUID           REFERENCES staff(id),
    notes           TEXT
);

CREATE INDEX idx_invoices_customer  ON invoices(customer_id);
CREATE INDEX idx_invoices_status    ON invoices(status);
CREATE INDEX idx_invoices_due_date  ON invoices(due_date) WHERE status NOT IN ('Paid','Cancelled','Refunded');
CREATE INDEX idx_payments_invoice   ON payments(invoice_id);

-- ============================================================
-- MODULE 6: DOCUMENT VAULT (metadata — files live in SharePoint)
-- ============================================================

CREATE TYPE doc_category AS ENUM (
    'Customer Passport','Customer Visa','Customer Photo','Customer Bank Statement',
    'Customer Flight Ticket','Customer Hotel Voucher','Customer Insurance',
    'Company IATA Certificate','Company Registration','Company Contract',
    'Staff ID','Staff Contract','Other'
);

CREATE TABLE documents (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    category             doc_category NOT NULL,
    -- Ownership: link to customer OR staff OR company
    customer_id          UUID         REFERENCES customers(id) ON DELETE CASCADE,
    visa_id              UUID         REFERENCES visa_applications(id) ON DELETE CASCADE,
    booking_id           UUID         REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id             UUID         REFERENCES staff(id) ON DELETE CASCADE,
    -- File details
    file_name            VARCHAR(300) NOT NULL,
    file_size_kb         INTEGER,
    mime_type            VARCHAR(100),
    -- SharePoint identifiers (via Graph API)
    sharepoint_site_id   VARCHAR(500),
    sharepoint_drive_id  VARCHAR(500),
    sharepoint_item_id   VARCHAR(500) UNIQUE,  -- Graph API driveItem ID
    sharepoint_web_url   VARCHAR(1000),         -- Direct SharePoint URL
    -- Expiry tracking
    expires_at           DATE,
    expiry_alert_sent    BOOLEAN      DEFAULT false,
    -- Meta
    notes                TEXT,
    uploaded_by          UUID         REFERENCES staff(id),
    created_at           TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_documents_customer  ON documents(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_documents_visa      ON documents(visa_id) WHERE visa_id IS NOT NULL;
CREATE INDEX idx_documents_expiry    ON documents(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- AUDIT LOG (cross-cutting)
-- ============================================================

CREATE TABLE audit_log (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID        REFERENCES staff(id),
    staff_email VARCHAR(200),
    action      VARCHAR(100) NOT NULL,  -- e.g. 'CREATE_BOOKING', 'UPDATE_VISA_STAGE'
    entity_type VARCHAR(50),            -- e.g. 'booking', 'visa', 'invoice'
    entity_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity  ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_staff   ON audit_log(staff_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- SEED: Countries (key Nigeria-relevant destinations)
-- ============================================================

INSERT INTO countries (code, name, calling_code, requires_visa) VALUES
    ('NG','Nigeria','+234',false),
    ('GB','United Kingdom','+44',true),
    ('US','United States','+1',true),
    ('AE','United Arab Emirates','+971',true),
    ('CA','Canada','+1',true),
    ('DE','Germany','+49',true),
    ('FR','France','+33',true),
    ('NL','Netherlands','+31',true),
    ('GH','Ghana','+233',false),
    ('ZA','South Africa','+27',false),
    ('KE','Kenya','+254',false),
    ('ET','Ethiopia','+251',false),
    ('TH','Thailand','+66',true),
    ('TR','Turkey','+90',false),
    ('CN','China','+86',true),
    ('IN','India','+91',true),
    ('SA','Saudi Arabia','+966',true),
    ('EG','Egypt','+20',false),
    ('MA','Morocco','+212',false),
    ('BR','Brazil','+55',false)
ON CONFLICT (code) DO NOTHING;

-- SEED: Common visa types
INSERT INTO visa_types (country_code, name, description) VALUES
    ('GB','UK Standard Visitor Visa','Short-stay visits up to 6 months'),
    ('GB','UK Student Visa (Tier 4)','For courses longer than 6 months'),
    ('US','US B1/B2 Visitor Visa','Business and tourism'),
    ('US','US F1 Student Visa','Academic study in the US'),
    ('AE','UAE Visit Visa (30 days)','Short-term tourism or business'),
    ('AE','UAE Visit Visa (60 days)','Extended tourism or family visit'),
    ('CA','Canada Tourist Visa (TRV)','Temporary Resident Visa'),
    ('DE','Schengen Visa — Germany','Access to Schengen Area via Germany'),
    ('FR','Schengen Visa — France','Access to Schengen Area via France'),
    ('NL','Schengen Visa — Netherlands','Access to Schengen Area via Netherlands'),
    ('SA','Saudi Arabia Umrah Visa','Religious pilgrimage visit'),
    ('SA','Saudi Arabia Work Visa','Employment purposes'),
    ('CN','China Tourist Visa (L)','Tourism and leisure'),
    ('IN','India e-Visa','Electronic travel authorisation');

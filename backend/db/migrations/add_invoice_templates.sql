-- Migration: invoice template support
-- Adds two-template invoice system (Contract A and Ad-hoc B)
-- and extends invoice_number to support NTT/CLIENT/PS424-2026 format

-- 1. Extend invoice_number column (was VARCHAR(20), NTT/NLNG/PS434-2026 = 18 chars; room to grow)
-- Drop trigger first — PostgreSQL blocks ALTER TYPE on columns used in trigger WHEN clauses
DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
ALTER TABLE invoices ALTER COLUMN invoice_number TYPE VARCHAR(60);
-- Recreate the trigger
CREATE TRIGGER trg_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

-- 2. Add template and calculation fields
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS template_type    VARCHAR(20)  NOT NULL DEFAULT 'adhoc',
  ADD COLUMN IF NOT EXISTS personnel_salary NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS consumables      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS overhead_amount  NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS profit_rate      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS profit_amount    NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS bill_to_name     VARCHAR(300),
  ADD COLUMN IF NOT EXISTS bill_to_address  TEXT;

-- 3. Reset the invoice sequence to 435 so auto-generated numbers continue
--    from after the last manually used NTT/NLNG/PS434-2026
--    (only matters for the fallback FNI-YYYY-NNNNN format)
SELECT setval('invoice_seq', 435, false);

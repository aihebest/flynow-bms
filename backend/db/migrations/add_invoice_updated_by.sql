-- Migration: add updated_by to invoices for audit trail
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(id);

-- Migration: make customers.phone nullable
-- Phone is no longer required when quick-adding a customer from a form

ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;

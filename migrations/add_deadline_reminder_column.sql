-- Migration: add_deadline_reminder_column.sql
-- Description: Adds deadline_reminder_sent column to homework table to prevent duplicate notifications

ALTER TABLE homework ADD COLUMN IF NOT EXISTS deadline_reminder_sent BOOLEAN DEFAULT false;

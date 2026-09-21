-- Migration: add_otp_purpose_and_verification_columns.sql
-- Description: Adds is_verified to users, otp_purpose column and NULL user_id support to password_reset_otp

ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `is_verified` BOOLEAN DEFAULT false;
ALTER TABLE `password_reset_otp` ADD COLUMN IF NOT EXISTS `otp_purpose` ENUM('registration','password_reset') NOT NULL DEFAULT 'password_reset';
ALTER TABLE `password_reset_otp` MODIFY COLUMN `user_id` INT NULL;

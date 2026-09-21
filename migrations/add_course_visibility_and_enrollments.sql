-- Migration: Course Visibility, Monetization & Enrollment Requests

ALTER TABLE `users` ADD COLUMN `phone_number` VARCHAR(20) NULL;

ALTER TABLE `classrooms` ADD COLUMN `visibility` ENUM('public','private') NOT NULL DEFAULT 'private';
ALTER TABLE `classrooms` ADD COLUMN `is_paid` BOOLEAN DEFAULT false;
ALTER TABLE `classrooms` ADD COLUMN `price` DECIMAL(10,2) NULL;
ALTER TABLE `classrooms` ADD COLUMN `cover_photo_url` VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS `enrollment_requests` (
  request_id INT PRIMARY KEY AUTO_INCREMENT,
  classroom_id INT NOT NULL,
  user_id INT NOT NULL,
  payment_method VARCHAR(50),
  payer_phone_number VARCHAR(20),
  transaction_id VARCHAR(100),
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

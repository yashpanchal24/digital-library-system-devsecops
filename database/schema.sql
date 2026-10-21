-- ============================================================
-- Digital Library Management System - MySQL schema (MySQL 8.0+)
-- Run:  mysql -u root -p < database/schema.sql
-- ============================================================

DROP DATABASE IF EXISTS digital_library;
CREATE DATABASE digital_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE digital_library;

-- ------------------------------------------------------------
-- D1 - User Database
-- ------------------------------------------------------------
CREATE TABLE users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100) NOT NULL,
  student_id  VARCHAR(30)  NOT NULL,
  email       VARCHAR(120) NOT NULL,
  password    VARCHAR(255) NOT NULL,            -- bcrypt hash only
  role        ENUM('STUDENT','ADMIN') NOT NULL DEFAULT 'STUDENT',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_student_id (student_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- D2 - Book Database
-- is_deleted = soft-delete flag so that deleting a book never
-- breaks borrowing history (history keeps pointing to the row).
-- ------------------------------------------------------------
CREATE TABLE books (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title               VARCHAR(200) NOT NULL,
  author              VARCHAR(150) NOT NULL,
  isbn                VARCHAR(20)  NOT NULL,
  category            VARCHAR(80)  NOT NULL,
  description         TEXT,
  quantity            INT UNSIGNED NOT NULL DEFAULT 1,
  available_quantity  INT UNSIGNED NOT NULL DEFAULT 1,
  is_deleted          TINYINT(1)   NOT NULL DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_books_isbn (isbn),
  KEY idx_books_category (category),
  CONSTRAINT chk_books_available CHECK (available_quantity <= quantity)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- D3 - Borrowing Database
-- ON DELETE RESTRICT on both keys: rows are never physically
-- removed while history exists.
-- ------------------------------------------------------------
CREATE TABLE borrow_requests (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  book_id        INT UNSIGNED NOT NULL,
  status         ENUM('PENDING','APPROVED','REJECTED','RETURNED') NOT NULL DEFAULT 'PENDING',
  request_date   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_date  TIMESTAMP NULL DEFAULT NULL,
  returned_date  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_borrow_user (user_id),
  KEY idx_borrow_book (book_id),
  KEY idx_borrow_status (status),
  CONSTRAINT fk_borrow_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_borrow_book FOREIGN KEY (book_id) REFERENCES books(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Demo users (passwords are bcrypt hashes, cost 10)
--   admin@library.com   / Admin@123
--   student@library.com / Student@123
-- ------------------------------------------------------------
INSERT INTO users (full_name, student_id, email, password, role) VALUES
('Library Admin', 'ADMIN001', 'admin@library.com',
 '$2b$10$BkuPiJttCECY.gCFNNkKKumg5rmzEt7pBf9Wuff6mg/Z01CsxetPS', 'ADMIN'),
('Demo Student', 'STU034', 'student@library.com',
 '$2b$10$MAXL6OKiElEXD9pZmi7WxeQKSqnNSCObE.eTNaFACrFp8Fdz66Ai2', 'STUDENT');

-- ------------------------------------------------------------
-- Sample books
-- ------------------------------------------------------------
INSERT INTO books (title, author, isbn, category, description, quantity, available_quantity) VALUES
('Introduction to Algorithms', 'Thomas H. Cormen', '9780262046305', 'Computer Science', 'Comprehensive reference on algorithms and data structures, widely used in university courses.', 5, 5),
('Clean Code', 'Robert C. Martin', '9780132350884', 'Software Engineering', 'A handbook of agile software craftsmanship with practical advice on writing readable code.', 4, 4),
('Database System Concepts', 'Abraham Silberschatz', '9780078022159', 'Databases', 'Foundational text covering relational models, SQL, transactions and storage.', 3, 3),
('Operating System Concepts', 'Abraham Silberschatz', '9781119800361', 'Computer Science', 'Covers processes, memory management, file systems and security in operating systems.', 3, 3),
('Computer Networking: A Top-Down Approach', 'James F. Kurose', '9780136681557', 'Networking', 'Explains networking concepts layer by layer, starting from the application layer.', 2, 2),
('Software Engineering', 'Ian Sommerville', '9780133943030', 'Software Engineering', 'Covers software processes, agile methods, requirements, design and testing.', 4, 4),
('Agile Estimating and Planning', 'Mike Cohn', '9780131479418', 'Software Engineering', 'Practical guide to story points, velocity, release and iteration planning.', 2, 2),
('Systems Analysis and Design', 'Kenneth E. Kendall', '9780134552095', 'Systems Analysis', 'Introduces data flow diagrams, process modelling and system development methods.', 3, 3),
('Python Crash Course', 'Eric Matthes', '9781718502703', 'Programming', 'Hands-on, project-based introduction to Python programming.', 6, 6),
('Eloquent JavaScript', 'Marijn Haverbeke', '9781593279509', 'Programming', 'Modern introduction to JavaScript, programming and the browser.', 3, 3),
('Discrete Mathematics and Its Applications', 'Kenneth H. Rosen', '9781259676512', 'Mathematics', 'Standard text on logic, sets, graph theory, counting and proofs.', 4, 4),
('The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 'Software Engineering', 'Classic tips and techniques for becoming an effective programmer.', 1, 1);

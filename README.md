# Digital Library Management System

Full-stack college project for **DFD-Based Analysis and Agile Planning of a Digital Library System** (Roll No. 34).

## Requirements
- Node.js 18+
- MySQL 8+

## 1. Install dependencies
```bash
npm install
```

## 2. Create the database
Open MySQL and run:
```sql
SOURCE /full/path/to/database/schema.sql;
```
Or from a terminal:
```bash
mysql -u root -p < database/schema.sql
```

## 3. Configure environment
Copy `.env.example` to `.env` and set your MySQL password and a JWT secret.

## 4. Start
```bash
npm start
```
Open http://localhost:3000

## Demo accounts
Admin: admin@library.com / Admin@123
Student: student@library.com / Student@123

## Main workflow
Student logs in → Books → Request Book → Admin logs in → Requests → Approve → Student My Books → Return.

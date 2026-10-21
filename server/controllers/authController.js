const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

function tokenFor(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
}

exports.register = async (req, res) => {
  try {
    const { full_name, student_id, email, password } = req.body;
    if (!full_name || !student_id || !email || !password) return res.status(400).json({ message: 'All fields are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR student_id = ?', [email.trim().toLowerCase(), student_id.trim()]);
    if (existing.length) return res.status(409).json({ message: 'Email or Student ID already exists.' });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (full_name, student_id, email, password, role) VALUES (?, ?, ?, ?, \'STUDENT\')', [full_name.trim(), student_id.trim(), email.trim().toLowerCase(), hash]);
    res.status(201).json({ message: 'Registration successful.', id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Registration failed.' }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const [rows] = await pool.query('SELECT id, full_name, student_id, email, password, role FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) return res.status(401).json({ message: 'Invalid email or password.' });
    const user = rows[0]; delete user.password;
    res.json({ token: tokenFor(user), user });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Login failed.' }); }
};

exports.me = async (req, res) => {
  const [rows] = await pool.query('SELECT id, full_name, student_id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) return res.status(404).json({ message: 'User not found.' });
  res.json(rows[0]);
};

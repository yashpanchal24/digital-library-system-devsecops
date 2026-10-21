const pool = require('../config/db');

exports.list = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    let sql = 'SELECT id,title,author,isbn,category,description,quantity,available_quantity,created_at FROM books WHERE is_deleted=0';
    const params = [];
    if (q) { sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)'; const s = `%${q}%`; params.push(s,s,s); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY title';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Unable to load books.' }); }
};

exports.getOne = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM books WHERE id=? AND is_deleted=0', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Book not found.' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  try {
    const { title, author, isbn, category, description='', quantity } = req.body;
    const qty = Number(quantity);
    if (!title || !author || !isbn || !category || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ message: 'Valid title, author, ISBN, category and quantity are required.' });
    const [r] = await pool.query('INSERT INTO books (title,author,isbn,category,description,quantity,available_quantity) VALUES (?,?,?,?,?,?,?)', [title.trim(),author.trim(),isbn.trim(),category.trim(),description,qty,qty]);
    res.status(201).json({ message:'Book added.', id:r.insertId });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message:'ISBN already exists.' }); console.error(err); res.status(500).json({ message:'Unable to add book.' }); }
};

exports.update = async (req, res) => {
  try {
    const { title, author, isbn, category, description='', quantity } = req.body;
    const qty = Number(quantity);
    if (!title || !author || !isbn || !category || !Number.isInteger(qty) || qty < 1) return res.status(400).json({ message:'Invalid book data.' });
    const [old] = await pool.query('SELECT quantity,available_quantity FROM books WHERE id=? AND is_deleted=0', [req.params.id]);
    if (!old.length) return res.status(404).json({ message:'Book not found.' });
    const borrowed = old[0].quantity - old[0].available_quantity;
    if (qty < borrowed) return res.status(400).json({ message:`Quantity cannot be less than currently borrowed copies (${borrowed}).` });
    const available = qty - borrowed;
    await pool.query('UPDATE books SET title=?,author=?,isbn=?,category=?,description=?,quantity=?,available_quantity=? WHERE id=?', [title.trim(),author.trim(),isbn.trim(),category.trim(),description,qty,available,req.params.id]);
    res.json({ message:'Book updated.' });
  } catch (err) { if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message:'ISBN already exists.' }); console.error(err); res.status(500).json({ message:'Unable to update book.' }); }
};

exports.remove = async (req, res) => {
  try { const [r] = await pool.query('UPDATE books SET is_deleted=1 WHERE id=? AND is_deleted=0', [req.params.id]); if (!r.affectedRows) return res.status(404).json({message:'Book not found.'}); res.json({message:'Book deleted.'}); }
  catch (err) { console.error(err); res.status(500).json({message:'Unable to delete book.'}); }
};

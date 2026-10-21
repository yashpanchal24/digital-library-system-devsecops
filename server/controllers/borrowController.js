const pool = require('../config/db');

exports.requestBook = async (req,res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const bookId = Number(req.body.book_id);
    if (!Number.isInteger(bookId)) { await conn.rollback(); return res.status(400).json({message:'Invalid book.'}); }
    const [books] = await conn.query('SELECT id,available_quantity,is_deleted FROM books WHERE id=? FOR UPDATE',[bookId]);
    if (!books.length || books[0].is_deleted) { await conn.rollback(); return res.status(404).json({message:'Book not found.'}); }
    if (books[0].available_quantity < 1) { await conn.rollback(); return res.status(400).json({message:'Book is currently unavailable.'}); }
    const [active] = await conn.query("SELECT id FROM borrow_requests WHERE user_id=? AND book_id=? AND status IN ('PENDING','APPROVED')",[req.user.id,bookId]);
    if (active.length) { await conn.rollback(); return res.status(409).json({message:'You already have an active request for this book.'}); }
    const [r] = await conn.query('INSERT INTO borrow_requests (user_id,book_id,status) VALUES (?,?,\'PENDING\')',[req.user.id,bookId]);
    await conn.commit(); res.status(201).json({message:'Borrow request submitted.',id:r.insertId});
  } catch(err){ await conn.rollback(); console.error(err); res.status(500).json({message:'Unable to submit request.'}); } finally { conn.release(); }
};

exports.my = async (req,res) => {
  const [rows] = await pool.query(`SELECT br.id,br.status,br.request_date,br.approved_date,br.returned_date,b.id book_id,b.title,b.author,b.category FROM borrow_requests br JOIN books b ON b.id=br.book_id WHERE br.user_id=? ORDER BY br.request_date DESC`,[req.user.id]);
  res.json(rows);
};

exports.returnBook = async (req,res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT id,book_id,status FROM borrow_requests WHERE id=? AND user_id=? FOR UPDATE",[req.params.id,req.user.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({message:'Borrow record not found.'}); }
    if (rows[0].status !== 'APPROVED') { await conn.rollback(); return res.status(400).json({message:'Only approved borrowed books can be returned.'}); }
    await conn.query("UPDATE borrow_requests SET status='RETURNED',returned_date=CURRENT_TIMESTAMP WHERE id=?",[req.params.id]);
    await conn.query('UPDATE books SET available_quantity=available_quantity+1 WHERE id=? AND available_quantity < quantity',[rows[0].book_id]);
    await conn.commit(); res.json({message:'Book returned successfully.'});
  } catch(err){ await conn.rollback(); console.error(err); res.status(500).json({message:'Unable to return book.'}); } finally { conn.release(); }
};

const pool = require('../config/db');

exports.dashboard = async (req,res) => {
  const [[books]] = await pool.query('SELECT COUNT(*) total_books, COALESCE(SUM(available_quantity),0) available_copies, COALESCE(SUM(quantity-available_quantity),0) borrowed_copies FROM books WHERE is_deleted=0');
  const [[students]] = await pool.query("SELECT COUNT(*) total_students FROM users WHERE role='STUDENT'");
  const [[pending]] = await pool.query("SELECT COUNT(*) pending_requests FROM borrow_requests WHERE status='PENDING'");
  res.json({...books,...students,...pending});
};

exports.students = async (req,res) => { const [rows] = await pool.query("SELECT id,full_name,student_id,email,created_at FROM users WHERE role='STUDENT' ORDER BY created_at DESC"); res.json(rows); };

exports.requests = async (req,res) => { const [rows] = await pool.query(`SELECT br.id,br.status,br.request_date,br.approved_date,br.returned_date,u.full_name,u.student_id,u.email,b.title,b.author,b.id book_id FROM borrow_requests br JOIN users u ON u.id=br.user_id JOIN books b ON b.id=br.book_id ORDER BY br.request_date DESC`); res.json(rows); };

exports.approve = async (req,res) => {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const [rows]=await conn.query("SELECT br.id,br.book_id,br.status,b.available_quantity FROM borrow_requests br JOIN books b ON b.id=br.book_id WHERE br.id=? FOR UPDATE",[req.params.id]); if(!rows.length){await conn.rollback();return res.status(404).json({message:'Request not found.'});} if(rows[0].status!=='PENDING'){await conn.rollback();return res.status(400).json({message:'Only pending requests can be approved.'});} if(rows[0].available_quantity<1){await conn.rollback();return res.status(400).json({message:'Book is no longer available.'});} await conn.query("UPDATE borrow_requests SET status='APPROVED',approved_date=CURRENT_TIMESTAMP WHERE id=?",[req.params.id]); await conn.query('UPDATE books SET available_quantity=available_quantity-1 WHERE id=?',[rows[0].book_id]); await conn.commit(); res.json({message:'Request approved.'}); }
  catch(err){await conn.rollback();console.error(err);res.status(500).json({message:'Unable to approve request.'});} finally{conn.release();}
};

exports.reject = async (req,res) => { const [r]=await pool.query("UPDATE borrow_requests SET status='REJECTED' WHERE id=? AND status='PENDING'",[req.params.id]); if(!r.affectedRows)return res.status(400).json({message:'Only pending requests can be rejected.'}); res.json({message:'Request rejected.'}); };
exports.history = async (req,res) => { const [rows]=await pool.query(`SELECT br.id,br.status,br.request_date,br.approved_date,br.returned_date,u.full_name,u.student_id,b.title,b.author FROM borrow_requests br JOIN users u ON u.id=br.user_id JOIN books b ON b.id=br.book_id ORDER BY br.request_date DESC`); res.json(rows); };

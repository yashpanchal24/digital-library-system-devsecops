require('dotenv').config();
const express=require('express'); const cors=require('cors'); const path=require('path'); const pool=require('./config/db');
const app=express(); const PORT=Number(process.env.PORT||3000);
app.use(cors()); app.use(express.json()); app.use(express.urlencoded({extended:true}));
app.use('/api/auth',require('./routes/authRoutes')); app.use('/api/books',require('./routes/bookRoutes')); app.use('/api/borrow',require('./routes/borrowRoutes')); app.use('/api/admin',require('./routes/adminRoutes'));
app.get('/api/health',async(req,res)=>{try{await pool.query('SELECT 1');res.json({ok:true,message:'Digital Library API is running.'});}catch(e){res.status(500).json({ok:false,message:'Database connection failed.'});}});
app.use(express.static(path.join(__dirname,'..','client')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'..','client','index.html')));
app.listen(PORT,()=>console.log(`Digital Library running at http://localhost:${PORT}`));

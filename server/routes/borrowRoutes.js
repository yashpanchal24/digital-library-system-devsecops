const router=require('express').Router(); const c=require('../controllers/borrowController'); const auth=require('../middleware/auth'); const role=require('../middleware/role');
router.post('/',auth,role('STUDENT'),c.requestBook); router.get('/my',auth,role('STUDENT'),c.my); router.put('/:id/return',auth,role('STUDENT'),c.returnBook); module.exports=router;

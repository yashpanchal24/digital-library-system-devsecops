const router=require('express').Router(); const c=require('../controllers/bookController'); const auth=require('../middleware/auth'); const role=require('../middleware/role');
router.get('/',c.list); router.get('/:id',c.getOne); router.post('/',auth,role('ADMIN'),c.create); router.put('/:id',auth,role('ADMIN'),c.update); router.delete('/:id',auth,role('ADMIN'),c.remove); module.exports=router;

const { Router } = require('express');
const authCtrl = require('./auth.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/profile', auth, authCtrl.getProfile);
router.put('/profile', auth, authCtrl.updateProfile);
router.put('/password', auth, authCtrl.changePassword);

module.exports = router;

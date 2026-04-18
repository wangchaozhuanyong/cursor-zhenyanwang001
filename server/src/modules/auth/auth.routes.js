const { Router } = require('express');
const ctrl = require('./auth.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, ctrl.updateProfile);
router.post('/logout', auth, ctrl.logout);

module.exports = router;

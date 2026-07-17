const express = require('express');
const { executeCode } = require('../controllers/execution.controller');
const router = express.Router();

router.post('/', executeCode);

module.exports = router;

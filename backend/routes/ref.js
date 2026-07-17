const express = require('express');
const router = express.Router();

const OWNER_CODES = { h: 'hadded', f: 'faiq', m: 'moiz', a: 'ali' };

router.get('/:code', (req, res) => {
  const owner = OWNER_CODES[String(req.params.code || '').toLowerCase()];
  if (!owner) return res.redirect('/');
  res.redirect(`/?owner=${owner}`);
});

module.exports = router;

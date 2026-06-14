const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const { isMissingTableError } = require('../lib/dbUtils');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return res.json({ data: [] });
      throw error;
    }

    res.json({ data: data || [] });
  } catch (error) {
    console.error('[Themes] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (isMissingTableError(error)) return res.status(404).json({ error: 'Theme not found' });
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Theme not found' });

    res.json(data);
  } catch (error) {
    console.error('[Themes] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const config = req.body?.config;

    if (!name) return res.status(400).json({ error: 'name is required and must be a non-empty string' });
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config is required and must be an object' });

    const { data, error } = await supabase
      .from('themes')
      .insert({ name, config, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('[Themes] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const config = req.body?.config;

    if (!name) return res.status(400).json({ error: 'name is required and must be a non-empty string' });
    if (!config || typeof config !== 'object') return res.status(400).json({ error: 'config is required and must be an object' });

    const { data, error } = await supabase
      .from('themes')
      .update({ name, config, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Theme not found' });

    res.json(data);
  } catch (error) {
    console.error('[Themes] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('themes')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Theme deleted' });
  } catch (error) {
    console.error('[Themes] Error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

module.exports = router;

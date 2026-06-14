const express = require('express');
const supabase = require('../config/supabase');
const { authenticate, authorize } = require('../middleware/auth');
const redis = require('../lib/redisClient');

const router = express.Router();

const FALLBACK_REPLY = 'Thanks for reaching out. James will personally review your message and reply shortly. In the meantime, feel free to browse the collection or reach us on WhatsApp for faster response.';

function isMissingChatTables(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('chat_conversations') && (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation'));
}

function respondMissingTables(res, error) {
  console.error('[Chat API Error]', error?.message || error);
  return res.status(503).json({
    error: 'Chat tables are not initialized. Run the chat migration SQL and try again.'
  });
}

// Customer sends a message
router.post('/', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const visitorId = String(req.body?.visitorId || '').trim();

    const fields = {};
    if (!message) fields.message = 'Message is required';
    else if (message.length > 1000) fields.message = 'Message must be under 1000 characters';
    if (!visitorId) fields.visitorId = 'Visitor ID is required';
    else if (visitorId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(visitorId)) fields.visitorId = 'Invalid visitor ID format';
    if (Object.keys(fields).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields });
    }

    // Remove any very old conversations for this visitor (older than 24 hours)
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('chat_conversations')
        .delete()
        .eq('visitor_id', visitorId)
        .lt('last_message_at', cutoff);
    } catch (e) {
      // non-fatal cleanup error
      console.warn('[Chat Cleanup Error]', e?.message || e);
    }

    // Find the most recent conversation for this visitor (reuse instead of creating duplicates)
    let { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!conversation) {
      const { data: newConvo, error: convoErr } = await supabase
        .from('chat_conversations')
        .insert({ visitor_id: visitorId, status: 'open' })
        .select('*')
        .single();

      if (convoErr) throw convoErr;
      conversation = newConvo;
    } else if (conversation.status === 'closed') {
      // reopen a closed conversation instead of creating a new one
      const { error: reopenErr } = await supabase
        .from('chat_conversations')
        .update({ status: 'open' })
        .eq('id', conversation.id);
      if (reopenErr) throw reopenErr;
      conversation.status = 'open';
    }

    // Check if this is the first message in the conversation (for auto-reply)
    const { count: existingMsgCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversation.id);

    // Insert customer message
    const { error: msgErr } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        sender: 'customer',
        message
      });

    if (msgErr) throw msgErr;

    // Update last_message_at
    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    // Only send auto-reply on the very first message of the conversation
    const isFirstMessage = (existingMsgCount || 0) === 0;
    res.json({ reply: isFirstMessage ? FALLBACK_REPLY : null, conversationId: conversation.id });
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat API Error]', error.message || error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// Customer polls for new admin replies
router.get('/poll/:visitorId', async (req, res) => {
  try {
    const visitorId = String(req.params.visitorId || '').trim();
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required.' });

    const cacheKey = `chat:poll:${visitorId}`;
    const result = await redis.getOrFetch(cacheKey, 8, async () => {
      const { data: conversation } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('visitor_id', visitorId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!conversation) return { messages: [] };

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, message, created_at')
        .eq('conversation_id', conversation.id)
        .eq('sender', 'admin')
        .eq('seen', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (messages && messages.length > 0) {
        const ids = messages.map((m) => m.id);
        await supabase.from('chat_messages').update({ seen: true }).in('id', ids);
      }

      return { messages: messages || [] };
    });
    res.json(result);
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Poll Error]', error.message || error);
    res.status(500).json({ error: 'Failed to poll messages.' });
  }
});

// Admin: get all conversations
router.get('/conversations', authenticate, authorize('admin'), async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const cacheKey = `chat:conversations:${status}`;

    const result = await redis.getOrFetch(cacheKey, 15, async () => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('status', status)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const seen = new Set();
      const deduped = [];
      for (const convo of (data || [])) {
        if (!convo || !convo.visitor_id) { deduped.push(convo); continue; }
        if (seen.has(convo.visitor_id)) continue;
        seen.add(convo.visitor_id);
        deduped.push(convo);
      }

      const conversations = await Promise.all(deduped.map(async (convo) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .eq('sender', 'customer')
          .eq('seen', false);
        return { ...convo, unread_count: count || 0 };
      }));
      return { conversations };
    });
    res.json(result);
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Conversations Error]', error.message || error);
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

// Admin: get messages for a conversation
router.get('/conversations/:id/messages', authenticate, authorize('admin'), async (req, res) => {
  try {
    const conversationId = req.params.id;

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark customer messages as seen
    await supabase
      .from('chat_messages')
      .update({ seen: true })
      .eq('conversation_id', conversationId)
      .eq('sender', 'customer')
      .eq('seen', false);

    res.json({ messages: data || [] });
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Messages Error]', error.message || error);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// Admin: send reply
router.post('/conversations/:id/reply', authenticate, authorize('admin'), async (req, res) => {
  try {
    const conversationId = req.params.id;
    const message = String(req.body?.message || '').trim();

    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const { error: msgErr } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender: 'admin',
        message
      });

    if (msgErr) throw msgErr;

    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    res.json({ success: true });
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Reply Error]', error.message || error);
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

// Admin: close conversation
router.patch('/conversations/:id/close', authenticate, authorize('admin'), async (req, res) => {
  try {
    const conversationId = req.params.id;

    const { error } = await supabase
      .from('chat_conversations')
      .update({ status: 'closed' })
      .eq('id', conversationId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Close Error]', error.message || error);
    res.status(500).json({ error: 'Failed to close conversation.' });
  }
});

// Admin: delete conversation and its messages
router.delete('/conversations/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Delete messages first
    const { error: msgErr } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (msgErr) throw msgErr;

    // Delete conversation
    const { error: convoErr } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (convoErr) throw convoErr;

    res.json({ success: true });
  } catch (error) {
    if (isMissingChatTables(error)) return respondMissingTables(res, error);
    console.error('[Chat Delete Error]', error.message || error);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

module.exports = router;

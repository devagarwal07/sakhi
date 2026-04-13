'use strict';

const supabase = require('../config/supabase');
const logger = require('../utils/logger');

// ──────────────────────────────────────────────────────────────────────────────
// SOS Namespace — /sos
// ──────────────────────────────────────────────────────────────────────────────
function registerSosSocket(io) {
  const sosNs = io.of('/sos');

  sosNs.on('connection', (socket) => {
    const { userId, role } = socket.data.user;
    logger.info('sosSocket — connected', { userId, role, socketId: socket.id });

    // Auto-join personal sos room
    socket.join(`user:${userId}`);

    // ── Event: sos:join ───────────────────────────────────────────────────────
    socket.on('sos:join', async ({ sos_id }) => {
      if (!sos_id) return;

      // Validate this SOS belongs to the user (or user is admin)
      if (role !== 'admin') {
        const { data } = await supabase
          .from('sos_events')
          .select('user_id')
          .eq('id', sos_id)
          .limit(1);
        if (!data?.[0] || data[0].user_id !== userId) {
          return socket.emit('error', { code: 'FORBIDDEN' });
        }
      }

      socket.join(`sos:${sos_id}`);
      socket.emit('joined', { sos_id });
      logger.info('sosSocket — joined SOS room', { userId, sos_id });
    });

    // ── Event: sos:message — rider/driver sends update ────────────────────────
    socket.on('sos:message', async ({ sos_id, message }) => {
      if (!sos_id || !message) return;
      socket.to(`sos:${sos_id}`).emit('sos:message', {
        sos_id,
        sender_id: userId,
        sender_role: role,
        message,
        sent_at: new Date().toISOString(),
      });
    });

    // ── Event: sos:agent_message — admin sends message ────────────────────────
    socket.on('sos:agent_message', ({ sos_id, message }) => {
      if (!sos_id || !message || role !== 'admin') return;
      sosNs.to(`sos:${sos_id}`).emit('sos:agent_message', {
        sos_id,
        message,
        sent_at: new Date().toISOString(),
      });
    });

    // ── Event: sos:resolve — admin resolves SOS ───────────────────────────────
    socket.on('sos:resolve', async ({ sos_id }) => {
      if (!sos_id || role !== 'admin') return;

      await supabase
        .from('sos_events')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', sos_id);

      sosNs.to(`sos:${sos_id}`).emit('sos:resolved', { sos_id });
      logger.info('sosSocket — SOS resolved', { sos_id, adminId: userId });
    });

    socket.on('disconnect', () => {
      logger.info('sosSocket — disconnected', { userId, socketId: socket.id });
    });
  });
}

module.exports = { registerSosSocket };

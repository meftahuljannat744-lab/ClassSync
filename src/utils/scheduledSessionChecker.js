const db = require('../config/db');
const { createNotification } = require('./notificationHelper');

const checkScheduledSessions = async () => {
  try {
    const [dueSessions] = await db.query(
      `SELECT ls.session_id, ls.session_title, ls.classroom_id, c.classroom_name
       FROM live_sessions ls
       JOIN classrooms c ON ls.classroom_id = c.classroom_id
       WHERE ls.scheduled_time <= NOW()
         AND ls.started_at IS NULL
         AND ls.ended_at IS NULL
         AND ls.is_active = false`
    );

    for (const session of dueSessions) {
      await db.query(
        `UPDATE live_sessions SET started_at = NOW(), is_active = true WHERE session_id = ?`,
        [session.session_id]
      );

      const [members] = await db.query(
        `SELECT user_id FROM classroom_members WHERE classroom_id = ? AND is_active = true`,
        [session.classroom_id]
      );

      for (const m of members) {
        await createNotification(
          m.user_id,
          'live_session',
          'Live Class Started',
          `Live class "${session.session_title}" is starting now in ${session.classroom_name}`,
          `/live.html?id=${session.session_id}`
        );
      }
      console.log(`Auto-triggered scheduled live session ID ${session.session_id} (${session.session_title}).`);
    }
  } catch (err) {
    console.error('Scheduled session check error:', err);
  }
};

const startScheduledSessionChecker = () => {
  checkScheduledSessions();
  setInterval(checkScheduledSessions, 30000); // Check every 30 seconds
};

module.exports = { startScheduledSessionChecker };

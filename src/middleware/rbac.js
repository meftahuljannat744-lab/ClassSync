const db = require('../config/db');

/**
 * Helper to fetch user's role in a given classroom
 * Roles: 'instructor', 'TA', 'learner'
 */
const getUserClassroomRole = async (userId, classroomId) => {
  if (!userId || !classroomId) return null;

  const [rows] = await db.query(
    `SELECT role FROM classroom_members WHERE user_id = ? AND classroom_id = ? AND is_active = true`,
    [userId, classroomId]
  );

  return rows.length > 0 ? rows[0].role : null;
};

/**
 * Middleware factory to enforce classroom role access
 * @param {Array<string>} allowedRoles e.g. ['instructor'], ['instructor', 'TA'], ['instructor', 'TA', 'learner']
 * @param {string} [entityType] optional entity type for ID lookup if param isn't direct classroom_id
 */
const requireClassroomRole = (allowedRoles = [], entityType = 'classroom') => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const userId = req.user.user_id;
      let classroomId = null;

      // 1. Direct classroom ID param or body
      if (entityType === 'classroom') {
        classroomId = req.params.id || req.params.classroomId || req.body.classroom_id;
      }
      // 2. Entity lookup
      else if (entityType === 'homework') {
        const hwId = req.params.id || req.params.homeworkId || req.body.homework_id;
        if (hwId) {
          const [hw] = await db.query(`SELECT classroom_id FROM homework WHERE homework_id = ?`, [hwId]);
          if (hw.length > 0) classroomId = hw[0].classroom_id;
        }
      } else if (entityType === 'question') {
        const qId = req.params.id || req.params.questionId || req.body.question_id;
        if (qId) {
          const [q] = await db.query(
            `SELECT h.classroom_id FROM questions q JOIN homework h ON q.homework_id = h.homework_id WHERE q.question_id = ?`,
            [qId]
          );
          if (q.length > 0) classroomId = q[0].classroom_id;
        }
      } else if (entityType === 'submission') {
        const subId = req.params.id || req.params.submissionId;
        if (subId) {
          const [sub] = await db.query(
            `SELECT h.classroom_id 
             FROM submissions s 
             JOIN questions q ON s.question_id = q.question_id 
             JOIN homework h ON q.homework_id = h.homework_id 
             WHERE s.submission_id = ?`,
            [subId]
          );
          if (sub.length > 0) classroomId = sub[0].classroom_id;
        }
      } else if (entityType === 'live-session') {
        const sessionId = req.params.id || req.params.sessionId;
        if (sessionId) {
          const [session] = await db.query(`SELECT classroom_id FROM live_sessions WHERE session_id = ?`, [sessionId]);
          if (session.length > 0) classroomId = session[0].classroom_id;
        }
      } else if (entityType === 'attendance') {
        const attId = req.params.id;
        if (attId) {
          const [att] = await db.query(
            `SELECT s.classroom_id FROM attendance a JOIN live_sessions s ON a.session_id = s.session_id WHERE a.attendance_id = ?`,
            [attId]
          );
          if (att.length > 0) classroomId = att[0].classroom_id;
        }
      } else if (entityType === 'plagiarism-flag') {
        const flagId = req.params.id;
        if (flagId) {
          const [flag] = await db.query(
            `SELECT h.classroom_id FROM plagiarism_flags f JOIN questions q ON f.question_id = q.question_id JOIN homework h ON q.homework_id = h.homework_id WHERE f.flag_id = ?`,
            [flagId]
          );
          if (flag.length > 0) classroomId = flag[0].classroom_id;
        }
      } else if (entityType === 'problem') {
        const probId = req.params.id;
        if (probId) {
          const [prob] = await db.query(`SELECT classroom_id FROM problems WHERE problem_id = ?`, [probId]);
          if (prob.length > 0) classroomId = prob[0].classroom_id;
        }
      } else if (entityType === 'resource') {
        const resId = req.params.id;
        if (resId) {
          const [resRow] = await db.query(`SELECT classroom_id FROM resources WHERE resource_id = ?`, [resId]);
          if (resRow.length > 0) classroomId = resRow[0].classroom_id;
        }
      } else if (entityType === 'alert') {
        const alertId = req.params.id;
        if (alertId) {
          const [al] = await db.query(`SELECT classroom_id FROM learner_alerts WHERE alert_id = ?`, [alertId]);
          if (al.length > 0) classroomId = al[0].classroom_id;
        }
      } else if (entityType === 'enrollment-request') {
        const reqId = req.params.id;
        if (reqId) {
          const [er] = await db.query(`SELECT classroom_id FROM enrollment_requests WHERE request_id = ?`, [reqId]);
          if (er.length > 0) classroomId = er[0].classroom_id;
        }
      }

      if (!classroomId) {
        return res.status(404).json({ success: false, message: 'Classroom target for action not found' });
      }

      const role = await getUserClassroomRole(userId, classroomId);

      if (!role) {
        return res.status(403).json({ success: false, message: 'Forbidden: You are not a member of this classroom' });
      }

      // Check case-insensitive match (e.g. 'TA' vs 'ta')
      const normalizedRole = role.toLowerCase();
      const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

      if (!normalizedAllowed.includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Action requires role [${allowedRoles.join(', ')}], but your role is '${role}'`
        });
      }

      req.classroomRole = role;
      req.classroomId = classroomId;
      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ success: false, message: 'Internal RBAC authorization error' });
    }
  };
};

module.exports = { getUserClassroomRole, requireClassroomRole };

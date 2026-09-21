const db = require('../config/db');
const { createNotification } = require('../utils/notificationHelper');

// POST /api/submissions/:id/grade - Grade submission & trigger notification
const gradeSubmission = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { score, feedback, is_draft } = req.body;
    const instructorId = req.user.user_id;

    // Get submission & learner
    const [subs] = await db.query(
      `SELECT s.learner_id, s.question_id, q.question_text, q.homework_id, h.title AS homework_title
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });

    const submission = subs[0];

    // Check if grade already exists
    const [existing] = await db.query(`SELECT grade_id FROM grades WHERE submission_id = ?`, [submissionId]);

    let gradeId;
    if (existing.length > 0) {
      gradeId = existing[0].grade_id;
      await db.query(
        `UPDATE grades
         SET instructor_id = ?, score = ?, feedback = ?, is_draft = ?, updated_at = NOW()
         WHERE submission_id = ?`,
        [instructorId, score, feedback || '', is_draft ? true : false, submissionId]
      );
    } else {
      const [result] = await db.query(
        `INSERT INTO grades (submission_id, instructor_id, score, feedback, is_draft)
         VALUES (?, ?, ?, ?, ?)`,
        [submissionId, instructorId, score, feedback || '', is_draft ? true : false]
      );
      gradeId = result.insertId;
    }

    // Auto-create notification if not draft
    if (!is_draft) {
      await createNotification(
        submission.learner_id,
        'grade',
        'Grade Received',
        `Your submission for "${submission.homework_title}" has been graded: ${score} points.`,
        `/homework.html?id=${submission.homework_id}`
      );
    }

    res.json({
      success: true,
      message: is_draft ? 'Grade draft saved' : 'Grade submitted & notification sent to learner',
      data: { grade_id: gradeId, score }
    });
  } catch (error) {
    console.error('Error grading submission:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/submissions/:id/code-reviews - Add inline code review comment
const addCodeReview = async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { line_start, line_end, comment } = req.body;
    const reviewerId = req.user.user_id;

    if (!line_start || !line_end || !comment) {
      return res.status(400).json({ success: false, message: 'line_start, line_end, and comment are required' });
    }

    const [subs] = await db.query(
      `SELECT s.learner_id, q.homework_id, h.title AS homework_title
       FROM submissions s
       JOIN questions q ON s.question_id = q.question_id
       JOIN homework h ON q.homework_id = h.homework_id
       WHERE s.submission_id = ?`,
      [submissionId]
    );

    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });

    const [result] = await db.query(
      `INSERT INTO code_reviews (submission_id, reviewer_id, line_start, line_end, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [submissionId, reviewerId, line_start, line_end, comment]
    );

    // Auto-create notification for learner
    await createNotification(
      subs[0].learner_id,
      'code_review',
      'New Inline Code Comment',
      `An instructor/TA added a code comment on lines ${line_start}-${line_end} in "${subs[0].homework_title}".`,
      `/homework.html?id=${subs[0].homework_id}`
    );

    res.status(201).json({
      success: true,
      message: 'Code review comment added',
      data: { review_id: result.insertId }
    });
  } catch (error) {
    console.error('Error adding code review:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/submissions/:id/code-reviews - List code reviews for submission
const getCodeReviews = async (req, res) => {
  try {
    const submissionId = req.params.id;

    const [rows] = await db.query(
      `SELECT cr.*, u.full_name AS reviewer_name, u.profile_picture_url AS reviewer_avatar
       FROM code_reviews cr
       JOIN users u ON cr.reviewer_id = u.user_id
       WHERE cr.submission_id = ?
       ORDER BY cr.line_start ASC, cr.created_at ASC`,
      [submissionId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching code reviews:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/classrooms/:id/gradings - Consolidated submissions view across all homeworks in classroom
const getConsolidatedGradings = async (req, res) => {
  try {
    const classroomId = req.params.id;
    const { filter, sort } = req.query;

    let sql = `
      SELECT 
        s.submission_id,
        q.homework_id,
        h.title AS homework_title,
        s.question_id,
        q.question_text AS question_title,
        q.points AS max_score,
        s.learner_id,
        u.full_name AS learner_name,
        u.email AS learner_email,
        s.submitted_at,
        s.is_late,
        s.submission_type,
        g.score,
        g.is_draft,
        CASE WHEN g.grade_id IS NOT NULL THEN true ELSE false END AS is_graded
      FROM submissions s
      JOIN questions q ON s.question_id = q.question_id
      JOIN homework h ON q.homework_id = h.homework_id
      JOIN users u ON s.learner_id = u.user_id
      LEFT JOIN grades g ON s.submission_id = g.submission_id
      WHERE h.classroom_id = ?
    `;

    const params = [classroomId];

    if (filter === 'graded') {
      sql += ` AND g.grade_id IS NOT NULL`;
    } else if (filter === 'ungraded') {
      sql += ` AND g.grade_id IS NULL`;
    }

    if (sort === 'learner') {
      sql += ` ORDER BY u.full_name ASC, s.submitted_at DESC`;
    } else if (sort === 'homework') {
      sql += ` ORDER BY h.title ASC, s.submitted_at DESC`;
    } else {
      sql += ` ORDER BY s.submitted_at DESC`;
    }

    const [submissions] = await db.query(sql, params);

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Error fetching consolidated gradings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  gradeSubmission,
  addCodeReview,
  getCodeReviews,
  getConsolidatedGradings
};


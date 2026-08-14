const express = require('express');
const { nanoid } = require('nanoid');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const router = express.Router();

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
function generateToken(len) {
  const n = len || Number(process.env.SESSION_TOKEN_LENGTH) || 6;
  let out = '';
  for (let i = 0; i < n; i++) {
    out += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return out;
}

// POST /api/session/start  { subject }  (auth required)
router.post('/start', auth, async (req, res) => {
  try {
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ message: 'subject is required' });

    const token = generateToken();
    const session = await Session.create({
      teacher: req.teacherId,
      subject,
      token,
      active: true
    });

    return res.status(201).json({
      sessionId: session._id,
      subject: session.subject,
      token: session.token,
      startedAt: session.startedAt
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/session/:id/end  (auth required)
router.post('/:id/end', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacher: req.teacherId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    session.active = false;
    session.endedAt = new Date();
    await session.save();

    const count = await Attendance.countDocuments({ session: session._id });

    return res.json({ sessionId: session._id, active: session.active, presentCount: count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/session/:id/attendance  (auth required) - live list for teacher UI
router.get('/:id/attendance', auth, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacher: req.teacherId });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const records = await Attendance.find({ session: session._id }).sort({ markedAt: 1 });
    return res.json({
      sessionId: session._id,
      subject: session.subject,
      active: session.active,
      students: records.map(r => ({ rollNo: r.rollNo, name: r.studentName, markedAt: r.markedAt }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/session/history  (auth required) - teacher's past sessions
router.get('/history', auth, async (req, res) => {
  try {
    const sessions = await Session.find({ teacher: req.teacherId }).sort({ startedAt: -1 }).limit(100);
    const result = await Promise.all(sessions.map(async (s) => {
      const count = await Attendance.countDocuments({ session: s._id });
      return {
        sessionId: s._id,
        subject: s.subject,
        active: s.active,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        presentCount: count
      };
    }));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/session/by-token/:token  (public) - used by student app to resolve
// the BLE-broadcast token into a real sessionId + subject name.
router.get('/by-token/:token', async (req, res) => {
  try {
    const session = await Session.findOne({ token: req.params.token, active: true }).sort({ startedAt: -1 });
    if (!session) return res.status(404).json({ message: 'No active session for this token' });

    return res.json({
      sessionId: session._id,
      subject: session.subject,
      active: session.active
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

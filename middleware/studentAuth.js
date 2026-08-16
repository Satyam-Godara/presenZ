const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const JWT_SECRET =
  process.env.JWT_SECRET || 'change_this_secret_in_production';

module.exports = async function studentAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Student authentication required'
      });
    }

    const token = header.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'student') {
      return res.status(403).json({
        message: 'Student access required'
      });
    }

    const student = await Student.findById(decoded.id)
      .populate('group', 'name');

    if (!student) {
      return res.status(401).json({
        message: 'Student account no longer exists'
      });
    }

    req.student = student;
    req.studentId = student._id;

    next();

  } catch (err) {
    console.error(err);

    return res.status(401).json({
      message: 'Invalid or expired student token'
    });
  }
};
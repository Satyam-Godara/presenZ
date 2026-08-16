const express = require('express');

const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');

const router = express.Router();


// ============================================================
// GET /api/teacher/groups
// ============================================================

router.get('/groups', auth, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacherId)
      .populate('assignedGroups', 'name');

    if (!teacher) {
      return res.status(404).json({
        message: 'Teacher not found'
      });
    }

    const groups = teacher.assignedGroups.map(group => ({
      id: group._id,
      name: group.name
    }));

    return res.json(groups);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});


module.exports = router;
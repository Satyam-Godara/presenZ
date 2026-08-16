// const express = require('express');
// const Session = require('../models/Session');
// const Student = require('../models/Student');
// const Attendance = require('../models/Attendance');

// const router = express.Router();

// // POST /api/attendance/mark  (public - called by TEACHER's phone after it
// // verifies a student's BLE advertisement contains a valid session token)
// // body: { sessionId, token, rollNo, name }
// router.post('/mark', async (req, res) => {
//   try {
//     const { sessionId, token, rollNo, name } = req.body;
//     if (!sessionId || !token || !rollNo) {
//       return res.status(400).json({ message: 'sessionId, token, rollNo are required' });
//     }

//     const session = await Session.findById(sessionId);
//     if (!session || !session.active) {
//       return res.status(409).json({ message: 'Session is not active' });
//     }
//     if (session.token !== token) {
//       return res.status(401).json({ message: 'Invalid session token' });
//     }

//     // upsert student directory (name may be sent on first mark)
//     if (name) {
//       await Student.findOneAndUpdate(
//         { rollNo },
//         { rollNo, name },
//         { upsert: true, new: true }
//       );
//     }

//     const record = await Attendance.findOneAndUpdate(
//       { session: session._id, rollNo },
//       { session: session._id, rollNo, studentName: name, $setOnInsert: { markedAt: new Date() } },
//       { upsert: true, new: true, setDefaultsOnInsert: true }
//     );

//     return res.status(200).json({
//       status: 'present',
//       sessionId: session._id,
//       subject: session.subject,
//       rollNo: record.rollNo,
//       markedAt: record.markedAt
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// // GET /api/attendance/status?sessionId=...&rollNo=...  (public)
// // Used by the STUDENT's phone to confirm the teacher actually marked them,
// // so it can save the record into its own local history.
// router.get('/status', async (req, res) => {
//   try {
//     const { sessionId, rollNo } = req.query;
//     if (!sessionId || !rollNo) {
//       return res.status(400).json({ message: 'sessionId and rollNo are required' });
//     }

//     const record = await Attendance.findOne({ session: sessionId, rollNo });
//     if (!record) {
//       return res.json({ present: false });
//     }

//     const session = await Session.findById(sessionId);
//     return res.json({
//       present: true,
//       subject: session ? session.subject : null,
//       markedAt: record.markedAt
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// // GET /api/attendance/history/:rollNo  (public) - full history for a student
// router.get('/history/:rollNo', async (req, res) => {
//   try {
//     const records = await Attendance.find({ rollNo: req.params.rollNo })
//       .populate('session', 'subject startedAt')
//       .sort({ markedAt: -1 })
//       .limit(200);

//     return res.json(records.map(r => ({
//       sessionId: r.session ? r.session._id : null,
//       subject: r.session ? r.session.subject : null,
//       markedAt: r.markedAt
//     })));
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;

const express = require('express');

const Session = require('../models/Session');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

const studentAuth = require('../middleware/studentAuth');

const router = express.Router();


// ============================================================
// POST /api/attendance/mark
//
// Called by teacher phone after BLE response.
//
// body:
// {
//   sessionId,
//   token,
//   rollNo
// }
// ============================================================

router.post('/mark', async (req, res) => {
  try {
    const {
      sessionId,
      token,
      rollNo
    } = req.body;

    if (!sessionId || !token || !rollNo) {
      return res.status(400).json({
        message: 'sessionId, token, rollNo are required'
      });
    }


    // ----------------------------------------
    // Find active session
    // ----------------------------------------

    const session = await Session.findById(sessionId);

    if (!session || !session.active) {
      return res.status(409).json({
        message: 'Session is not active'
      });
    }


    // ----------------------------------------
    // Validate token
    // ----------------------------------------

    if (session.token !== token) {
      return res.status(401).json({
        message: 'Invalid session token'
      });
    }


    // ----------------------------------------
    // Find registered student
    // ----------------------------------------

    const student = await Student.findOne({
      rollNo: rollNo.trim()
    });

    if (!student) {
      return res.status(404).json({
        code: 'STUDENT_NOT_REGISTERED',
        message: 'Student is not registered'
      });
    }


    // ----------------------------------------
    // CRITICAL:
    // Student group must equal session group
    // ----------------------------------------

    if (
      student.group.toString() !==
      session.group.toString()
    ) {
      return res.status(403).json({
        code: 'GROUP_MISMATCH',
        message: 'Student does not belong to this session group'
      });
    }


    // ----------------------------------------
    // Mark attendance
    // ----------------------------------------

    const record = await Attendance.findOneAndUpdate(
      {
        session: session._id,
        rollNo: student.rollNo
      },

      {
        session: session._id,
        rollNo: student.rollNo,
        studentName: student.name,

        $setOnInsert: {
          markedAt: new Date()
        }
      },

      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );


    return res.status(200).json({
      status: 'present',
      sessionId: session._id,
      subject: session.subject,
      rollNo: student.rollNo,
      markedAt: record.markedAt
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});


// ============================================================
// GET /api/attendance/status?sessionId=...
//
// Student authenticated endpoint
// ============================================================

router.get('/status', studentAuth, async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        message: 'sessionId is required'
      });
    }


    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        message: 'Session not found'
      });
    }


    const record = await Attendance.findOne({
      session: session._id,
      rollNo: req.student.rollNo
    });


    if (!record) {
      return res.json({
        present: false
      });
    }


    return res.json({
      present: true,
      subject: session.subject,
      markedAt: record.markedAt
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});


// ============================================================
// GET /api/attendance/history
//
// Student can only retrieve THEIR OWN history.
// ============================================================

router.get('/history', studentAuth, async (req, res) => {
  try {

    const records = await Attendance.find({
      rollNo: req.student.rollNo
    })
      .populate('session', 'subject startedAt group')
      .sort({ markedAt: -1 })
      .limit(200);


    return res.json(
      records.map(record => ({
        sessionId: record.session
          ? record.session._id
          : null,

        subject: record.session
          ? record.session.subject
          : null,

        markedAt: record.markedAt
      }))
    );

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});


module.exports = router;
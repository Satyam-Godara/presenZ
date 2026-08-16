const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Group = require('../models/Group');

require('dotenv').config();

const router = express.Router();

// POST /api/auth/register  { name, email, password }
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }

    const existing = await Teacher.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Teacher already registered with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await Teacher.create({ name, email: email.toLowerCase(), passwordHash ,assignedGroups: []});

    return res.status(201).json({ id: teacher._id, name: teacher.name, email: teacher.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email, password are required' });
    }

    const teacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (!teacher) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, teacher.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: teacher._id,
        role:'teacher'
      },
      process.env.JWT_SECRET || 'change_this_secret_in_production',
      { expiresIn: '7d' }
    );

    // populate assigned groups of the teaher
    const populatedTeacher = await Teacher.findById(teacher._id)
      .populate('assignedGroups', 'name');

    return res.json({
      token,
      teacher: { id: teacher._id, name: teacher.name, email: teacher.email,assignedGroups:
          populatedTeacher.assignedGroups.map(group => ({
            id: group._id,
            name: group.name
          })) }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// ============================================================
// STUDENT CHECK ROLL NUMBER
// POST /api/auth/student/check
//
// { rollNo }
// ============================================================


router.post('/student/check', async (req,res)=>{
  try{
    const { rollNo } = req.body;

    if( !rollNo ) return res.status(400).json({message:'rollNo is required'});
    const student = await Student.findOne({rollNo : rollNo.trim()}).populate('group','name');

    if( !student ) return res.json({exists:false});

    return res.json({
      exists:true,
      student:{
        id: student._id,
        rollNo:student.rollNo,
        name:student.name,
        email:student.email,
        groupId:student.group?._id || null,
        groupName:student.group?.name || null
      }
    });

  } catch(err){
    console.error(err);
    return res.status(500).json({message:'Server error'});
  }
})



// ============================================================
// STUDENT LOGIN
// POST /api/auth/student/login
//
// { rollNo, androidId }
// ============================================================

router.post('/student/login', async (req, res) => {
  try {
    const { rollNo, androidId } = req.body;

    if (!rollNo || !androidId) {
      return res.status(400).json({
        message: 'rollNo and androidId are required'
      });
    }

    const student = await Student.findOne({
      rollNo: rollNo.trim()
    }).populate('group', 'name');

    if (!student) {
      return res.status(404).json({
        code: 'STUDENT_NOT_REGISTERED',
        message: 'Student is not registered'
      });
    }

    if (student.androidId !== androidId) {
      return res.status(403).json({
        code: 'DEVICE_MISMATCH',
        message: 'This student account is bound to another device'
      });
    }

    const token = jwt.sign(
      {
        id: student._id,
        role: 'student'
      },
      process.env.JWT_SECRET || 'change_this_secret_in_production',
      {
        expiresIn: '30d'
      }
    );

    return res.json({
      token,

      student: {
        id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        email: student.email,
        groupId: student.group?._id || null,
        groupName: student.group?.name || null
      }
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: 'Server error'
    });
  }
});


// ============================================================
// STUDENT REGISTER
// POST /api/auth/student/register
//
// {
//   rollNo,
//   name,
//   email,
//   groupId,
//   androidId
// }
// ============================================================

router.post('/student/register', async (req, res) => {
  try {
    const {
      rollNo,
      name,
      email,
      groupId,
      androidId
    } = req.body;

    if (
      !rollNo ||
      !name ||
      !email ||
      !groupId ||
      !androidId
    ) {
      return res.status(400).json({
        message:
          'rollNo, name, email, groupId and androidId are required'
      });
    }

    const normalizedRollNo = rollNo.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedAndroidId = androidId.trim();

    // ----------------------------------------
    // Roll number must be unique
    // ----------------------------------------

    const existingStudent = await Student.findOne({
      rollNo: normalizedRollNo
    });

    if (existingStudent) {
      return res.status(409).json({
        code: 'STUDENT_ALREADY_REGISTERED',
        message: 'Student with this roll number already exists'
      });
    }


    // ----------------------------------------
    // Verify group
    // ----------------------------------------

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(400).json({
        message: 'Invalid group'
      });
    }


    // ----------------------------------------
    // Android ID cannot belong to another user
    // ----------------------------------------

    const existingDevice = await Student.findOne({
      androidId: normalizedAndroidId
    });

    if (existingDevice) {
      return res.status(409).json({
        code: 'DEVICE_ALREADY_BOUND',
        message: 'This device is already bound to another student'
      });
    }


    // ----------------------------------------
    // Email uniqueness
    // ----------------------------------------

    const existingEmail = await Student.findOne({
      email: normalizedEmail
    });

    if (existingEmail) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'This email is already registered'
      });
    }


    // ----------------------------------------
    // Create student
    // ----------------------------------------

    const student = await Student.create({
      rollNo: normalizedRollNo,
      name: name.trim(),
      email: normalizedEmail,
      group: group._id,
      androidId: normalizedAndroidId
    });


    // ----------------------------------------
    // Issue JWT immediately
    // ----------------------------------------

    const token = jwt.sign(
      {
        id: student._id,
        role: 'student'
      },
      process.env.JWT_SECRET || 'change_this_secret_in_production',
      {
        expiresIn: '30d'
      }
    );


    return res.status(201).json({
      token,

      student: {
        id: student._id,
        rollNo: student.rollNo,
        name: student.name,
        email: student.email,
        groupId: group._id,
        groupName: group.name
      }
    });

  } catch (err) {
    console.error(err);

    // MongoDB duplicate key protection
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'Student data already exists'
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
});




module.exports = router;

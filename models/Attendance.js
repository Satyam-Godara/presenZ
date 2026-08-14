const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  rollNo: { type: String, required: true, trim: true },
  studentName: { type: String, trim: true },
  markedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// A student can only be marked present once per session
attendanceSchema.index({ session: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

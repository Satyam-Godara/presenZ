const mongoose = require('mongoose');

// Students are not authenticated in this MVP - they are upserted
// the first time they mark attendance from the app.
const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);

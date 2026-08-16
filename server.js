require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const attendanceRoutes = require('./routes/attendance');
const teacherRoutes = require('./routes/teacher');
const groupRoutes = require('./routes/group');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'presenZ backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/group', groupRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

const PORT = process.env.PORT || 4000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[presenZ] backend listening on port ${PORT}`);
  });
});

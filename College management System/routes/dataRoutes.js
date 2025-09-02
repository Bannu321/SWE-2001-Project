const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Event = require('../models/eventModel');
const Settings = require('../models/settingsModel');
const Marks = require('../models/marksModel');
const Attendance = require('../models/attendanceModel');
const { protect, admin } = require('../middleware/authMiddleware');

// --- Settings Routes ---
router.route('/settings').get(protect, async (req, res) => { try { let s = await Settings.findOne({ singleton: 'singleton' }); if (!s) s = await Settings.create({}); res.json(s); } catch (e) { console.error("Error fetching settings:", e); res.status(500).json({ message: 'Server Error' }); } });
router.route('/settings').post(protect, admin, async (req, res) => { try { const d = req.body; const u = await Settings.findOneAndUpdate({ singleton: 'singleton' }, d, { new: true, upsert: true }); res.json(u); } catch (e) { console.error("Error updating settings:", e); res.status(500).json({ message: 'Server Error' }); } });

// --- Admin-Only Routes ---
router.get('/stats', protect, admin, async (req, res) => { try { const s = await User.countDocuments({ role: 'student' }); const f = await User.countDocuments({ role: { $in: ['faculty', 'staff'] } }); const c = await Course.countDocuments({}); res.json({ students: s, faculty: f, courses: c }); } catch (e) { console.error("Error fetching stats:", e); res.status(500).json({ message: 'Server Error' }); } });
router.get('/users', protect, admin, async (req, res) => { try { const u = await User.find({}).select('-password').sort({ name: 1 }); res.json(u); } catch (e) { console.error("Error fetching users:", e); res.status(500).json({ message: 'Server Error'}); } });
router.post('/students', protect, admin, async (req, res) => { try { const { name, email, roleId, password } = req.body; if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' }); const u = await User.create({ name, email, roleId, password, role: 'student' }); res.status(201).json(u); } catch (e) { console.error("Error adding student:", e); res.status(500).json({ message: 'Server Error' }); } });
router.post('/staff', protect, admin, async (req, res) => { try { const { name, email, roleId, password } = req.body; if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' }); const u = await User.create({ name, email, roleId, password, role: 'staff' }); res.status(201).json(u); } catch (e) { console.error("Error adding staff:", e); res.status(500).json({ message: 'Server Error' }); } });
router.post('/courses', protect, admin, async (req, res) => { try { const { courseCode, courseName, credits } = req.body; if (await Course.findOne({ courseCode })) return res.status(400).json({ message: 'Course code exists' }); const c = await Course.create({ courseCode, courseName, credits }); res.status(201).json(c); } catch (e) { console.error("Error adding course:", e); res.status(500).json({ message: 'Server Error' }); } });
// CORRECTED EVENT CREATION ROUTE
router.post('/events', protect, admin, async (req, res) => { try { const { title, date, category, location, facultyCoordinator } = req.body; const eventData = { title, date, category, location, facultyCoordinator: facultyCoordinator || null }; const e = await Event.create(eventData); res.status(201).json(e); } catch (error) { console.error("Error adding event:", error); res.status(500).json({ message: 'Server Error' }); } });

// --- General Protected Routes ---
router.get('/courses', protect, async (req, res) => { try { const c = await Course.find({}).sort({ courseCode: 1 }).populate('faculty', 'name'); res.json(c); } catch (e) { console.error("Error fetching courses:", e); res.status(500).json({ message: 'Server Error' }); } });
// CORRECTED EVENT FETCHING ROUTE
router.get('/events', protect, async (req, res) => { try { const e = await Event.find({}).sort({ date: -1 }).populate('facultyCoordinator', 'name'); res.json(e); } catch (e) { console.error("Error fetching events:", e); res.status(500).json({ message: 'Server Error' }); } });
router.get('/users/:id', protect, async (req, res) => { try { if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) return res.status(401).json({ message: 'Not authorized' }); const u = await User.findById(req.params.id).select('-password'); if(u) res.json(u); else res.status(404).json({ message: 'User not found' }); } catch (e) { console.error("Error fetching single user:", e); res.status(500).json({ message: 'Server Error' }); } });

// --- Faculty Routes ---
router.put('/courses/:id/select', protect, async (req, res) => { try { if (req.user.role === 'student') return res.status(401).json({ message: 'Not authorized' }); const c = await Course.findById(req.params.id); if (!c) return res.status(404).json({ message: 'Course not found' }); if (c.faculty && c.faculty.toString() !== req.user._id.toString()) return res.status(400).json({ message: 'Course already assigned' }); c.faculty = req.user._id; c.schedule = { days: req.body.days, time: req.body.time }; res.json(await c.save()); } catch (e) { console.error("Error selecting course:", e); res.status(500).json({ message: 'Server Error' }); } });
router.get('/courses/:id/roster', protect, async (req, res) => { try { if (req.user.role === 'student') return res.status(401).json({ message: 'Not authorized' }); const c = await Course.findById(req.params.id).populate('students', 'name email roleId'); if (!c) return res.status(404).json({ message: 'Course not found.' }); res.json(c.students); } catch (e) { console.error("Error fetching roster:", e); res.status(500).json({ message: 'Server Error' }); } });

// --- Student Routes ---
router.post('/courses/:id/register', protect, async (req, res) => { try { if (req.user.role !== 'student') return res.status(401).json({ message: 'Only students can register.' }); const c = await Course.findById(req.params.id); const s = await User.findById(req.user._id); if (!c || !s) return res.status(404).json({ message: 'Course or student not found.' }); if (c.students.includes(s._id) || s.courses.includes(c._id)) return res.status(400).json({ message: 'Already registered.' }); c.students.push(s._id); s.courses.push(c._id); await c.save(); await s.save(); res.json({ message: 'Successfully registered.' }); } catch (e) { console.error("Error registering for course:", e); res.status(500).json({ message: 'Server Error' }); } });

// --- Marks Routes ---
router.get('/my/marks', protect, async (req, res) => { try { if (req.user.role !== 'student') return res.status(401).json({ message: 'Not authorized' }); const m = await Marks.find({ student: req.user._id }).populate('course', 'courseCode courseName'); res.json(m); } catch (e) { res.status(500).json({ message: "Server Error" }); } });
router.get('/courses/:id/marks', protect, async (req, res) => { try { const c = await Course.findById(req.params.id); if (!c.faculty || c.faculty.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' }); const m = await Marks.find({ course: req.params.id }).populate('student', 'name email roleId'); res.json(m); } catch (e) { res.status(500).json({ message: "Server Error" }); } });
router.put('/marks/:studentId/:courseId', protect, async (req, res) => { try { const { courseId, studentId } = req.params; const c = await Course.findById(courseId); if (!c.faculty || c.faculty.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' }); const m = await Marks.findOneAndUpdate({ student: studentId, course: courseId }, { $set: req.body }, { new: true, upsert: true, setDefaultsOnInsert: true }); res.json(m); } catch (e) { res.status(500).json({ message: "Server Error" }); } });

// --- Attendance Routes ---
router.get('/my/attendance', protect, async (req, res) => { try { if (req.user.role !== 'student') return res.status(401).json({ message: 'Not authorized' }); const docs = await Attendance.find({ student: req.user._id }).populate('course', 'courseCode courseName'); const results = docs.map(d => { const total = d.records.length; if (total === 0) return { course: d.course, percentage: 100, present: 0, total: 0 }; const present = d.records.filter(r => r.status === 'Present').length; return { course: d.course, percentage: Math.round((present / total) * 100), present, total }; }); res.json(results); } catch (e) { res.status(500).json({ message: "Server Error" }); } });
router.post('/attendance/:courseId', protect, async (req, res) => { try { const { courseId } = req.params; const { date, attendanceData } = req.body; const c = await Course.findById(courseId); if (!c.faculty || c.faculty.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' }); const today = new Date(date).setHours(0, 0, 0, 0); for (const item of attendanceData) { let doc = await Attendance.findOne({ student: item.studentId, course: courseId }); if (!doc) doc = new Attendance({ student: item.studentId, course: courseId, records: [] }); doc.records = doc.records.filter(r => new Date(r.date).setHours(0,0,0,0) !== today); doc.records.push({ date: today, status: item.status }); await doc.save(); } res.json({ message: 'Attendance submitted successfully' }); } catch (e) { console.error("Error submitting attendance:", e); res.status(500).json({ message: "Server Error" }); } });
router.get('/courses/:id/attendance', protect, async (req, res) => { try { const course = await Course.findById(req.params.id).populate('students', 'name'); if (!course.faculty || course.faculty.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' }); const attendanceDocs = await Attendance.find({ course: req.params.id }); const recordsByDate = {}; attendanceDocs.forEach(doc => { doc.records.forEach(rec => { const dateStr = new Date(rec.date).toISOString().split('T')[0]; if (!recordsByDate[dateStr]) recordsByDate[dateStr] = {}; recordsByDate[dateStr][doc.student.toString()] = rec.status; }); }); res.json({ roster: course.students, records: recordsByDate }); } catch (error) { res.status(500).json({ message: 'Server Error' }); } });

// --- Event Registration ---
router.post('/events/:id/register', protect, async (req, res) => { try { if (req.user.role !== 'student') return res.status(401).json({ message: 'Only students can register' }); const event = await Event.findById(req.params.id); const student = await User.findById(req.user._id); if (!event || !student) return res.status(404).json({ message: 'Event or student not found' }); if (event.registeredStudents.includes(student._id) || student.registeredEvents.includes(event._id)) return res.status(400).json({ message: 'Already registered' }); event.registeredStudents.push(student._id); student.registeredEvents.push(event._id); await event.save(); await student.save(); res.json({ message: 'Registered for event' }); } catch (e) { console.error("Error registering for event:", e); res.status(500).json({ message: 'Server Error' }); } });

// --- Event Routes ---

// Create event (admin only)
router.post('/events', protect, admin, async (req, res) => {
  try {
    const { title, date, category, location, facultyCoordinator } = req.body;
    const eventData = {
      title,
      date,
      category,
      location,
      facultyCoordinator: facultyCoordinator || null
    };
    const e = await Event.create(eventData);
    res.status(201).json(e);
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Fetch all events (protected)
router.get('/events', protect, async (req, res) => {
  try {
    const e = await Event.find({})
      .sort({ date: -1 })
      .populate('facultyCoordinator', 'name');
    res.json(e);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Fetch single event
router.get('/events/:id', protect, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('facultyCoordinator', 'name');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update event (admin only)
router.put('/events/:id', protect, admin, async (req, res) => {
  try {
    const { title, date, category, location, facultyCoordinator } = req.body;
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { title, date, category, location, facultyCoordinator },
      { new: true }
    );
    if (!updatedEvent) return res.status(404).json({ message: 'Event not found' });
    res.json(updatedEvent);
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete event (admin only)
router.delete('/events/:id', protect, admin, async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Event registration (students)
router.post('/events/:id/register', protect, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(401).json({ message: 'Only students can register' });

    const event = await Event.findById(req.params.id);
    const student = await User.findById(req.user._id);
    if (!event || !student) return res.status(404).json({ message: 'Event or student not found' });

    if (event.registeredStudents.includes(student._id) ||
        student.registeredEvents.includes(event._id)) {
      return res.status(400).json({ message: 'Already registered' });
    }

    event.registeredStudents.push(student._id);
    student.registeredEvents.push(event._id);

    await event.save();
    await student.save();

    res.json({ message: 'Registered for event' });
  } catch (err) {
    console.error("Error registering for event:", err);
    res.status(500).json({ message: 'Server Error' });
  }
});



module.exports = router;


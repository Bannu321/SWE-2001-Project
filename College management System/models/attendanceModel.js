const mongoose = require('mongoose');

// This schema stores individual attendance records for one student on one day.
const attendanceRecordSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Absent'],
        required: true
    }
});

// This is the main schema. It links a student to a course and holds all their attendance records for that course.
const attendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    records: [attendanceRecordSchema] // An array of daily attendance records
}, {
    timestamps: true,
    // Ensure a student has only one attendance document per course
    index: { student: 1, course: 1 },
    unique: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;

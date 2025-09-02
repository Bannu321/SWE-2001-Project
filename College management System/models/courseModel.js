const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseCode: { type: String, required: true, unique: true, uppercase: true },
    courseName: { type: String, required: true },
    credits: { type: Number, required: true },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    schedule: {
        days: [String],
        time: String
    },
    // NEW: Array to store IDs of students enrolled in this course
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;


const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    // NEW: Link to the faculty member coordinating the event
    facultyCoordinator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // NEW: Array to store IDs of students who registered
    registeredStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;


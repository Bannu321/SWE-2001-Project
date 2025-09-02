const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // A unique identifier to ensure we only have one settings document
    singleton: { type: String, default: 'singleton', unique: true },
    collegeName: { type: String, default: 'College Management System' },
    address: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
});

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
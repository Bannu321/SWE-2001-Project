const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    course: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' },
    quiz1: { type: Number, min: 0, max: 10, default: null },
    quiz2: { type: Number, min: 0, max: 10, default: null },
    quiz3: { type: Number, min: 0, max: 10, default: null },
    cat1: { type: Number, min: 0, max: 50, default: null },
    cat2: { type: Number, min: 0, max: 50, default: null },
    fat: { type: Number, min: 0, max: 100, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true }, // IMPORTANT: This allows virtual fields to be included in JSON responses
    toObject: { virtuals: true }
});

// VIRTUAL for Internal Marks Percentage (30% weightage)
marksSchema.virtual('internalPercentage').get(function() {
    let totalQuizMarks = 0;
    let quizCount = 0;
    if (this.quiz1 !== null) { totalQuizMarks += this.quiz1; quizCount++; }
    if (this.quiz2 !== null) { totalQuizMarks += this.quiz2; quizCount++; }
    if (this.quiz3 !== null) { totalQuizMarks += this.quiz3; quizCount++; }
    if (quizCount === 0) return 0;
    // Average of quizzes (out of 10) is scaled to 30.
    return ((totalQuizMarks / quizCount) / 10) * 30;
});

// VIRTUAL for CAT Marks Percentage (30% weightage)
marksSchema.virtual('catPercentage').get(function() {
    let totalCatMarks = 0;
    let catCount = 0;
    if (this.cat1 !== null) { totalCatMarks += this.cat1; catCount++; }
    if (this.cat2 !== null) { totalCatMarks += this.cat2; catCount++; }
    if (catCount === 0) return 0;
    // Average of CATs (out of 50) is scaled to 30.
    return ((totalCatMarks / catCount) / 50) * 30;
});

// VIRTUAL for FAT Marks Percentage (40% weightage)
marksSchema.virtual('fatPercentage').get(function() {
    if (this.fat === null) return 0;
    return (this.fat / 100) * 40;
});

// VIRTUAL for Total Percentage
marksSchema.virtual('totalPercentage').get(function() {
    const total = this.internalPercentage + this.catPercentage + this.fatPercentage;
    return parseFloat(total.toFixed(2)); // Return percentage with 2 decimal places
});

const Marks = mongoose.model('Marks', marksSchema);
module.exports = Marks;


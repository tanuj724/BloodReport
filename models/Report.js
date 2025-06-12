const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patient: {
        name: String,
        age: Number,
        gender: String
    },
    testTypes: [String],
    readings: Object,
    aiAnalysis: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Report', reportSchema);

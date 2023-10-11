const mongoose = require("mongoose");

const collabSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    item_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "item",
        required: true
    },
    role: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model("collab", collabSchema);
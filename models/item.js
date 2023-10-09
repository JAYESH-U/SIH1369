const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        data: {
            type: Buffer,
            required: true
        },
        ContentType: {
            type: String,
            required: true
        },
    },
    report: {
        data: {
            type: Buffer,
            required: true
        },
        ContentType: {
            type: String,
            required: true
        },
    },
    description: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    },
    college_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admin",
        required: true
    },
    link: String
}, { timestamps: true });

module.exports = mongoose.model("item", itemSchema);
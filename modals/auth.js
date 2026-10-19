import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }, 
    email: {
        type: String,
        required: true,
        unique: true,      
        lowercase: true    
    },
    channel: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    joined: {
        type: Date,
        default: Date.now
    },
    image: {
        type: String,
        required: true
    }
});

export default mongoose.model("User", userSchema);
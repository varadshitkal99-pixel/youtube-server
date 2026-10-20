import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Firebase user id, used to match a signed-in user to this record
    uid: { type: String, unique: true, sparse: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    image: { type: String, default: "" },

    // Channel info: empty until the user creates their channel
    channel: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, maxlength: 1000, default: "" },

    joined: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
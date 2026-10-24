import express from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Video from "../models/Video.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Only these types are accepted. The saved filename is random and its
// extension comes from this list, never from what the user uploaded.
const VIDEO_TYPES = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};
const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = VIDEO_TYPES[file.mimetype] || IMAGE_TYPES[file.mimetype] || "";
    cb(null, crypto.randomUUID() + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 2 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.fieldname === "video"
        ? VIDEO_TYPES[file.mimetype]
        : file.fieldname === "thumbnail"
        ? IMAGE_TYPES[file.mimetype]
        : false;
    if (allowed) return cb(null, true);
    cb(new Error(`Unsupported file type for "${file.fieldname}".`));
  },
}).fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

const removeFiles = (files) => {
  files.forEach((f) => fs.unlink(f.path, () => {}));
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const router = express.Router();

// POST /api/videos  (multipart/form-data)
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    const files = req.files || {};
    const video = files.video?.[0];
    const thumbnail = files.thumbnail?.[0];
    const saved = [video, thumbnail].filter(Boolean);

    try {
      if (err) {
        removeFiles(saved);
        const message =
          err.code === "LIMIT_FILE_SIZE"
            ? "Video is too large (max 100 MB)."
            : err.message;
        return res.status(400).json({ message });
      }

      const title = String(req.body.title || "").trim();
      const description = String(req.body.description || "").trim();
      const uid = String(req.body.uid || "").trim();

      if (!video) {
        removeFiles(saved);
        return res.status(400).json({ message: "A video file is required." });
      }
      if (!title || title.length > 100) {
        removeFiles(saved);
        return res.status(400).json({ message: "Title is required (max 100 characters)." });
      }
      if (description.length > 5000) {
        removeFiles(saved);
        return res.status(400).json({ message: "Description is too long (max 5000 characters)." });
      }
      if (!uid) {
        removeFiles(saved);
        return res.status(401).json({ message: "You must be signed in to upload." });
      }
      if (thumbnail && thumbnail.size > MAX_IMAGE_BYTES) {
        removeFiles(saved);
        return res.status(400).json({ message: "Thumbnail is too large (max 5 MB)." });
      }

      const doc = await Video.create({
        title,
        description,
        category: String(req.body.category || "General").trim() || "General",
        videoUrl: `/uploads/${video.filename}`,
        thumbnailUrl: thumbnail ? `/uploads/${thumbnail.filename}` : "",
        mimeType: video.mimetype,
        size: video.size,
        uploaderUid: uid,
        uploaderName: String(req.body.name || "").trim(),
        uploaderImage: String(req.body.image || "").trim(),
        channel: String(req.body.channel || "").trim(),
      });

      res.status(201).json(doc);
    } catch (e) {
      removeFiles(saved);
      console.error("Upload failed:", e);
      res.status(500).json({ message: "Could not save the video." });
    }
  });
});

// GET /api/videos?page=1&limit=12&category=Coding&q=react
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const filter = {};
    if (req.query.category && req.query.category !== "All") {
      filter.category = String(req.query.category);
    }
    if (req.query.q) {
      filter.title = { $regex: escapeRegex(String(req.query.q)), $options: "i" };
    }

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Video.countDocuments(filter),
    ]);

    res.json({ videos, page, total, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    console.error("List failed:", e);
    res.status(500).json({ message: "Could not load videos." });
  }
});

// GET /api/videos/:id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Video not found." });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found." });
    res.json(video);
  } catch (e) {
    console.error("Fetch failed:", e);
    res.status(500).json({ message: "Could not load the video." });
  }
});

export default router;
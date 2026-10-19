import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv-parser";
import mongoose from "mongoose";
import userroutes from "./routes/auth.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(userroutes);
app.use(express.json({limit: "30mb", extended: true}));
app.use(express.urlencoded({limit: "30mb", extended: true}));

app.get("/", (req, res) => {
    res.send("yotube server is running");
});

app.use(bodyParser.json());
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})

const DB_URL = process.env.DB_URL;
mongoose.connect(DB_URL).then(() => {
    console.log("Database connected successfully");
}).catch((error) => {
    console.log("Error connecting to database:", error);
});
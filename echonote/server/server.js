const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve static files (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "../public")));

// MongoDB connect
mongoose.connect("mongodb://127.0.0.1:27017/echonote");

// Model
const Note = require("./models/Note");

// ✅ Home route → send index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Add note
app.post("/add", async (req, res) => {
  const newNote = new Note({ text: req.body.text });
  await newNote.save();
  res.json({ message: "Note saved" });
});

// Get notes
app.get("/notes", async (req, res) => {
  const notes = await Note.find();
  res.json(notes);
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const app = express();
const PORT = 3000;

app.use(express.json());

// Create uploads folder automatically
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// PDF storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

// Accept only PDF files
const upload = multer({
  storage: storage,

  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

// Test backend
app.get("/", (req, res) => {
  res.send("Welcome to AccessLearn!");
});

// PDF upload + text extraction
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);

    const parser = new PDFParse({
      data: dataBuffer
    });

    const data = await parser.getText();

    res.json({
      message: "PDF uploaded and text extracted successfully!",
      text: data.text
    });

    await parser.destroy();

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to extract PDF text."
    });
  }
});

// API for sending extracted text to AI module
app.post("/api/ai/process", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      message: "No text provided"
    });
  }

  res.json({
    message: "Text successfully sent to AI module",
    text: text
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`AccessLearn server is running on port ${PORT}`);
});
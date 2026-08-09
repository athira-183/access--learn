const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { PDFParse } = require("pdf-parse");
const { createWorker } = require("tesseract.js");
const cors = require("cors");

require("dotenv").config();
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors());

const PORT = 3000;
const execFileAsync = promisify(execFile);

app.use(express.json());

// Create uploads folders automatically
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync("uploads/ocr")) {
    fs.mkdirSync("uploads/ocr", { recursive: true });
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

// OCR scanned PDFs with Poppler + Tesseract
async function runOCR(pdfPath) {
    const uniqueName = `page-${Date.now()}`;
    const outputPrefix = path.join("uploads", "ocr", uniqueName);

    await execFileAsync("pdftoppm", [
    "-png",
    "-r",
    "300",
    "-gray",
    pdfPath,
    outputPrefix
]);

    const imageFiles = fs.readdirSync(path.join("uploads", "ocr"))
        .filter(file => file.startsWith(uniqueName) && file.endsWith(".png"))
        .sort();

    if (imageFiles.length === 0) {
        throw new Error("Could not convert PDF pages into images.");
    }

    const worker = await createWorker("eng");
    let extractedText = "";

    try {
        for (const imageFile of imageFiles) {
            const imagePath = path.join("uploads", "ocr", imageFile);

            console.log(`Reading scanned page: ${imageFile}`);

            const result = await worker.recognize(imagePath);
            extractedText += result.data.text + "\n";
        }
    } finally {
        await worker.terminate();

        for (const imageFile of imageFiles) {
            const imagePath = path.join("uploads", "ocr", imageFile);

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
    }

    return extractedText.trim();
}

// Test backend
app.get("/", (req, res) => {
    res.send("Welcome to AccessLearn!");
});

// PDF Upload + Text Extraction
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
    let parser;

    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No PDF file uploaded"
            });
        }

        const dataBuffer = fs.readFileSync(req.file.path);

        parser = new PDFParse({
            data: dataBuffer
        });

        const data = await parser.getText();
        let extractedText = data.text ? data.text.trim() : "";

        const textWithoutPageLabels = extractedText
            .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "")
            .trim();

        let extractionMethod;

        if (textWithoutPageLabels) {
            extractedText = textWithoutPageLabels;
            extractionMethod = "pdf-parse";
        } else {
            console.log("No embedded text found. Starting OCR...");

            extractedText = await runOCR(req.file.path);
            extractionMethod = "OCR (Poppler + Tesseract)";
        }

        if (!extractedText || !extractedText.trim()) {
            return res.status(400).json({
                message: "PDF uploaded, but no readable text was found."
            });
        }

        res.json({
            message: "PDF uploaded and text extracted successfully!",
            extractionMethod: extractionMethod,
            text: extractedText
        });
    } catch (error) {
        console.error("PDF processing error:", error);

        res.status(500).json({
            message: "Failed to upload or extract PDF text.",
            error: error.message
        });
    } finally {
        if (parser) {
            await parser.destroy();
        }
    }
});

// API for sending extracted text to AI module
app.post("/api/ai/process", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "No text provided"
            });
        }
        console.log("Extracted text length:", text.length);
        const response = await openai.responses.create({
            model: "gpt-5.5",
            input: `You are an educational assistant helping students with dyslexia.

Create simplified study notes from the following study material.

Requirements:
- Cover every major topic from the entire material.
- Do not leave out major topics just to make the notes shorter.
- Use clear headings for different topics.
- Use bullet points under each heading.
- Explain difficult words using simple language.
- Keep sentences short and easy to read.
- Include important definitions, formulas, laws, examples, and key facts.
- Remove unnecessary repetition.
- Keep the information accurate to the provided material.
- Make the notes detailed enough for a student to study from.
- For a document of this length, aim for approximately 400–700 words.

Study material:\n\n${text}`,
        });

        res.json({
            summary: response.output_text,
        });

    } catch (error) {
        console.error("AI processing error:", error);

        res.status(500).json({
            message: "Failed to process text.",
            error: error.message,
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`AccessLearn server is running on port ${PORT}`);
});

const pdfUpload = document.getElementById("pdfUpload");
const fileName = document.getElementById("fileName");
const uploadButton = document.getElementById("uploadButton");

// Show selected file name
if (pdfUpload && fileName) {
    pdfUpload.addEventListener("change", function () {
        if (pdfUpload.files.length > 0) {
            fileName.textContent = pdfUpload.files[0].name;
        } else {
            fileName.textContent = "No file selected";
        }
    });
}

// Upload PDF to backend
if (uploadButton && pdfUpload) {
    uploadButton.addEventListener("click", async function () {

        if (pdfUpload.files.length === 0) {
            alert("Please select a PDF first.");
            return;
        }

        const file = pdfUpload.files[0];

        // Make sure it is a PDF
        if (file.type !== "application/pdf") {
            alert("Please select a PDF file.");
            return;
        }

        const formData = new FormData();
        formData.append("pdf", file);

        uploadButton.disabled = true;
        uploadButton.textContent = "Uploading...";

        try {

            const response = await fetch(
                "http://localhost:3000/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Upload failed");
            }
        //Send extracted text to AI
            const aiResponse = await fetch(
    "http://localhost:3000/api/ai/process",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: result.text
        })
    }
);

const aiResult = await aiResponse.json();
// Send extracted text to AI for quiz generation
const quizResponse = await fetch(
    "http://localhost:3000/api/ai/quiz",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: result.text
        })
    }
);

const quizResult = await quizResponse.json();

if (!quizResponse.ok) {
    throw new Error(quizResult.message || "Quiz generation failed");
}

console.log("Generated quiz:", quizResult.quiz);
sessionStorage.setItem("quiz", quizResult.quiz);

if (!aiResponse.ok) {
    throw new Error(aiResult.message || "AI processing failed");
}

sessionStorage.setItem("summary", aiResult.summary);

            
           

            // Move to processing page
            window.location.href = "processing.html";

        } catch (error) {

            console.error("Upload error:", error);

            alert("Failed to upload PDF: " + error.message);

            uploadButton.disabled = false;
            uploadButton.textContent = "Upload PDF";
        }
    });
}

const summaryBox = document.getElementById("summaryBox");

if (summaryBox) {
    const summary = sessionStorage.getItem("summary");

    if (summary) {

        const formattedSummary = summary
            // Convert ## headings
            .replace(/^## (.+)$/gm, "<h3>$1</h3>")

            // Convert ### headings
            .replace(/^### (.+)$/gm, "<h4>$1</h4>")

            // Convert bullet points
            .replace(/^- (.+)$/gm, "<li>$1</li>")

            // Convert bold text
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")

            // Add a list around consecutive bullet points
            .replace(/(<li>.*<\/li>\s*)+/g, "<ul>$&</ul>")
            
            // Convert remaining line breaks
            .replace(/\n/g, "<br>")
            .replace(/<\/(h3|h4|li|ul)><br>/g, "</$1>");

        summaryBox.innerHTML = formattedSummary;

    } else {

        summaryBox.innerHTML = "<p>No summary available.</p>";

    }
}
// ===== Font Size Controls =====

const decreaseFont = document.getElementById("decreaseFont");
const resetFont = document.getElementById("resetFont");
const increaseFont = document.getElementById("increaseFont");

let currentFontSize = 18;

if (decreaseFont && resetFont && increaseFont && summaryBox) {

    decreaseFont.addEventListener("click", () => {
        if (currentFontSize > 14) {
            currentFontSize -= 2;
            summaryBox.style.fontSize = currentFontSize + "px";
        }
    });

    resetFont.addEventListener("click", () => {
        currentFontSize = 18;
        summaryBox.style.fontSize = currentFontSize + "px";
    });

    increaseFont.addEventListener("click", () => {
        if (currentFontSize < 26) {
            currentFontSize += 2;
            summaryBox.style.fontSize = currentFontSize + "px";
        }
    });
}
// ===== Theme Toggle =====

const themeToggle = document.getElementById("themeToggle");

// Apply saved theme when page loads
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}

// Toggle theme
if (themeToggle) {
    themeToggle.addEventListener("click", function () {

        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "dark");
            themeToggle.textContent = "☀️ Light Mode";
        } else {
            localStorage.setItem("theme", "light");
            themeToggle.textContent = "🌙 Dark Mode";
        }
    });

    // Set correct button text
    if (document.body.classList.contains("dark-mode")) {
        themeToggle.textContent = "☀️ Light Mode";
    }
}
const dyslexiaFontBtn = document.getElementById("dyslexiaFontBtn");

if (dyslexiaFontBtn) {
    dyslexiaFontBtn.addEventListener("click", () => {
        document.body.classList.toggle("dyslexia-font");
    });
}

// ===== Read Aloud =====

const readAloud = document.getElementById("readAloud");

if (readAloud && summaryBox) {

    readAloud.addEventListener("click", () => {

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
            readAloud.textContent = "🔊 Read Aloud";
            return;
        }

        const text = summaryBox.innerText;

        if (!text.trim()) {
            return;
        }

        const speech = new SpeechSynthesisUtterance(text);

        speech.rate = 0.9;
        speech.pitch = 1;

        speech.onend = () => {
            readAloud.textContent = "🔊 Read Aloud";
        };

        speechSynthesis.speak(speech);

        readAloud.textContent = "⏹ Stop";
    });
}
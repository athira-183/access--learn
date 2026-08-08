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

            // Temporarily store extracted text
            sessionStorage.setItem("extractedText", result.text);

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
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

// Upload button
if (uploadButton && pdfUpload) {
    uploadButton.addEventListener("click", function () {

        if (pdfUpload.files.length === 0) {
            alert("Please select a PDF first.");
            return;
        }

        window.location.href = "processing.html";

    });
}
const pdfUpload = document.getElementById("pdfUpload");
const fileName = document.getElementById("fileName");

pdfUpload.addEventListener("change", function () {

    if (pdfUpload.files.length > 0) {
        fileName.textContent = pdfUpload.files[0].name;
    } else {
        fileName.textContent = "No file selected";
    }

});
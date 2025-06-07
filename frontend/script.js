// DOM Elements
const resultOutput = document.getElementById("resultOutput");
const transcriptionBox = document.getElementById("transcriptionBox");
const loadingSpinner = document.getElementById("loadingSpinner");

const BASE_URL = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "https://verifyit-backend-vkmt.onrender.com";

const modes = ["voiceMode", "textMode", "imageMode"];

function showMode(modeId) {
    modes.forEach(mode => {
        document.getElementById(mode).style.display = (mode === modeId) ? "block" : "none";
    });
    resultOutput.textContent = "...";
    transcriptionBox.textContent = "...";
}

// TEXT FACT CHECKING
async function submitText() {
    const input = document.getElementById("inputText").value.trim();
    if (!input) return alert("Enter some text.");

    resultOutput.textContent = "Checking...";
    loadingSpinner.style.display = "inline-block";

    try {
        const response = await fetch(`${BASE_URL}/factcheck/text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: input }),
        });

        const data = await response.json();
        resultOutput.textContent = data.result || data.error || "Unknown error";
    } catch (err) {
        resultOutput.textContent = "Unable to process text. Try again.";
    } finally {
        loadingSpinner.style.display = "none";
    }
}

// AUDIO FILE UPLOAD
async function uploadAudio() {
    const fileInput = document.getElementById("audioInput");
    const file = fileInput.files[0];
    if (!file) return alert("Select an audio file.");

    const formData = new FormData();
    formData.append("file", file);

    resultOutput.textContent = "Uploading & checking...";
    loadingSpinner.style.display = "inline-block";

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${BASE_URL}/factcheck/audio`, {
            method: "POST",
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await response.json();
        transcriptionBox.textContent = data.transcription || "(No transcription)";
        resultOutput.textContent = data.result || data.error;
    } catch (err) {
        resultOutput.textContent = "Unable to process audio. Try again.";
    } finally {
        loadingSpinner.style.display = "none";
    }
}

// AUDIO RECORDING SETUP
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const recordBtn = document.getElementById("recordBtn");

    if (!isRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = async () => {
            const blob = new Blob(audioChunks, { type: "audio/webm" });
            const player = document.getElementById("player");
            player.src = URL.createObjectURL(blob);
            player.style.display = "block";

            const formData = new FormData();
            formData.append("file", blob, "recording.webm");

            resultOutput.textContent = "Processing recording...";
            loadingSpinner.style.display = "inline-block";

            try {
                const response = await fetch(`${BASE_URL}/factcheck/audio`, {
                    method: "POST",
                    body: formData,
                });
                const data = await response.json();
                transcriptionBox.textContent = data.transcription || "(No transcription)";
                resultOutput.textContent = data.result || data.error;
            } catch (err) {
                resultOutput.textContent = "Unable to process audio.";
            } finally {
                loadingSpinner.style.display = "none";
            }
        };

        mediaRecorder.start();
        isRecording = true;
        recordBtn.textContent = "⏹"; // Just the stop icon
        document.getElementById("recordLabel").textContent = "Stop recording";
    } else {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.textContent = "🎤";
        document.getElementById("recordLabel").textContent = "Click to start recording";
    }
}

function removeAudioFile() {
    document.getElementById("audioInput").value = "";
    document.getElementById("player").style.display = "none";
}

// IMAGE FACT CHECKING
async function uploadImage() {
    const fileInput = document.getElementById("imageInput");
    const caption = document.getElementById("captionInput").value;
    const file = fileInput.files[0];

    if (!file) return alert("Select an image first.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    resultOutput.textContent = "Checking image...";
    loadingSpinner.style.display = "inline-block";

    try {
        const response = await fetch(`${BASE_URL}/factcheck/image`, {
            method: "POST",
            body: formData,
        });

        const data = await response.json();
        resultOutput.textContent = data.result || data.error;
    } catch (err) {
        resultOutput.textContent = "Unable to process image.";
    } finally {
        loadingSpinner.style.display = "none";
    }
}

function removeImageFile() {
    document.getElementById("imageInput").value = "";
}

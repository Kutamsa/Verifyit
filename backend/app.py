from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import os
import uvicorn
from dotenv import load_dotenv
from openai import OpenAI
from fastapi.responses import JSONResponse
import base64

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextInput(BaseModel):
    text: str

@app.get("/")
def root():
    return {"message": "Verify It backend is running!"}

@app.post("/factcheck/text")
async def factcheck_text(input: TextInput):
    prompt = f"Fact-check this text and provide a clear answer:\n\n{input.text}"
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You're a helpful fact-checking assistant."},
                {"role": "user", "content": prompt}
            ]
        )
        return {"result": response.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}


@app.post("/factcheck/audio")
async def factcheck_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
            text = transcript.text

        prompt = f"Fact-check this audio content (transcribed):\n\n{text}"
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You're a Telugu fact-checking assistant."},
                {"role": "user", "content": prompt}
            ]
        )

        return {
            "transcription": text,
            "result": response.choices[0].message.content
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        os.remove(tmp_path)

import base64

@app.post("/factcheck/image")
async def factcheck_image(
    file: UploadFile = File(...),
    caption: str = Form("")
):
    try:
        # Read image bytes and base64 encode
        image_bytes = await file.read()
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        # Construct messages with embedded image in data URI format
        messages = [
            {"role": "system", "content": "You are a fact-checking assistant."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": caption or "Please fact-check this image."},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{file.content_type};base64,{b64_image}"
                        }
                    }
                ],
            }
        ]

        response = client.chat.completions.create(
            model="gpt-4o-mini",  # or "gpt-4-vision-preview" if available
            messages=messages,
            max_tokens=500
        )

        return {"result": response.choices[0].message.content}

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)



if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Use PORT env var or default 8000 for local testing
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)

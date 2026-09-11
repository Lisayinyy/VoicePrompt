"""Local-only JSON-lines worker. Audio and transcripts never go to a cloud API."""
import contextlib
import json
import os
import sys
import time
import wave

# Installed models must be complete; inference must never fetch files implicitly.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
protocol = sys.stdout
model = None

for line in sys.stdin:
    started = time.monotonic()
    request = {}
    try:
        request = json.loads(line)
        with contextlib.redirect_stdout(sys.stderr):
            import numpy as np
            warming = request.get("op") == "warm"
            if warming:
                samples = np.zeros(16000, dtype=np.int16)
            else:
                with wave.open(request["path"], "rb") as audio:
                    if (audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (16000, 1, 2):
                        raise ValueError("Expected 16 kHz mono PCM WAV")
                    samples = np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2")
            duration = len(samples) / 16000
            if not 0 < duration <= 305:
                raise ValueError("Recordings must be between 0 and 305 seconds")
            # Only reject digital silence; do not discard quiet but real speech.
            silent = not warming and int(np.max(np.abs(samples.astype(np.int32)))) == 0
            cold = model is None
            load_ms = 0
            if not silent:
                import mlx.core as mx
                from mlx_audio.stt import load
                mx.reset_peak_memory()
                if model is None:
                    before = time.monotonic()
                    model = load(sys.argv[1])
                    load_ms = round((time.monotonic() - before) * 1000)
                result = model.generate(
                    samples.astype(np.float32) / 32768.0,
                    language={"zh": "Chinese", "en": "English", "auto": None}[request["language"]],
                    hotwords=request.get("terms", []),
                    temperature=0.0, max_tokens=1 if warming else 4096, chunk_duration=305.0,
                    verbose=False,
                )
                if not warming and result.generation_tokens >= 4096:
                    raise ValueError("Transcript exceeded the token limit; please use a shorter recording")
                text = "" if warming else result.text.strip()
                peak_mb = round(mx.get_peak_memory() / 1024 / 1024)
                mx.clear_cache()
            else:
                text = ""
                peak_mb = 0
        response = {"id": request["id"], "text": text, "durationSeconds": duration,
                    "coldStart": cold, "loadMs": load_ms, "warmup": warming,
                    "inferenceMs": round((time.monotonic() - started) * 1000), "peakMemoryMB": peak_mb,
                    "chunks": 0 if silent else 1}
    except Exception as error:
        # Avoid logging audio/transcripts or including arbitrary model output in errors.
        response = {"id": request.get("id"), "error": f"Local Qwen ASR failed ({type(error).__name__}): {str(error)[:200]}"}
    protocol.write(json.dumps(response, ensure_ascii=False) + "\n")
    protocol.flush()

# ── Stage 0: export MiniFASNetV1SE → ONNX ────────────────────────────────────
# Torch is only needed here. The ONNX file (~3 MB) is copied into the runtime
# image; torch itself is NOT present at runtime (onnxruntime handles inference).
FROM python:3.11-slim AS antispoof_builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git git-lfs ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir torch==2.2.0 \
        --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir onnx numpy

# Clone repo — git-lfs pulls the actual .pth weight files (not LFS pointers)
RUN git lfs install && \
    git clone --depth 1 https://github.com/minivision-ai/Silent-Face-Anti-Spoofing /sfa && \
    cd /sfa && git lfs pull

RUN mkdir -p /app/models/anti_spoof
COPY scripts/export_antispoof_onnx.py /export.py
RUN python /export.py


# ── Stage 1: Python dependency builder ───────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.title="Inspector"
LABEL org.opencontainers.image.description="ID verification pipeline — open-source, CPU-ready"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Application source
COPY api/        api/
COPY services/   services/
COPY utils/      utils/
COPY models/     models/
COPY scripts/    scripts/
COPY config.py   .
COPY verify_cli.py .

# Anti-spoof ONNX model from Stage 0 (no torch needed at runtime)
COPY --from=antispoof_builder /app/models/anti_spoof/ /app/models/anti_spoof/

# Pre-download InsightFace model weights
RUN python - <<'EOF'
from insightface.app import FaceAnalysis
app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace models downloaded OK")
EOF

# Warm up MediaPipe
RUN python - <<'EOF'
import mediapipe as mp
mp.solutions.face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
print("MediaPipe warmed up OK")
EOF

# Verify anti-spoof ONNX loads cleanly
RUN python - <<'EOF'
import onnxruntime as ort, os
path = "/app/models/anti_spoof/minifasnet_v1se_80x80.onnx"
sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
print(f"MiniFASNetV1SE ONNX ready — input: {sess.get_inputs()[0].shape}")
EOF

RUN mkdir -p /tmp/inspector_uploads

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOAD_DIR=/tmp/inspector_uploads

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

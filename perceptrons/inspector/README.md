# Inspector — ID Verification Pipeline

Lightweight, production-ready face-matching pipeline for ID cards and selfies.
**Zero paid APIs. Runs on CPU.**

---

## Architecture

```
ID Image ──► FaceDetector (RetinaFace via InsightFace)
                    │
                    └──► DetectedFace.embedding (ArcFace 512-dim, L2-normalised)
                                                          │
Selfie ──► FaceDetector ──────────────────────────────────┤
                                                          ▼
                                               CosineSimilarity
                                                     │
                                          MatchResult (score, is_match, confidence)
                                                     │
Video (opt.) ──► LivenessChecker ────────────────────┘
                 (MediaPipe EAR + head yaw)
                                                     │
                                              /verify response
```

---

## Model Choices

| Task | Library | Model | Why |
|------|---------|-------|-----|
| Face detection | `insightface` | RetinaFace (det_500m) | Best CPU speed/accuracy trade-off; ONNX backend |
| Face embedding | `insightface` | ArcFace MobileFaceNet | 512-dim, state of the art LFW accuracy; same package |
| Liveness | `mediapipe` | Face Mesh 478 landmarks | No ML training needed; runs at 30 fps on CPU |

**Why InsightFace over DeepFace / face_recognition?**
- Single install brings detection + embedding in one ONNX graph — no dlib compile issues.
- `buffalo_sc` model pack is ~30 MB and takes <50 ms per frame on a modern CPU.
- ArcFace outperforms FaceNet on most benchmarks with no extra effort.

---

## Quick Start

### Docker (recommended)

```bash
# Build image — downloads InsightFace + MediaPipe models at build time (~300 MB)
docker compose build

# Start the API server
docker compose up -d

# Check it's healthy
curl http://localhost:8000/health

# Tail logs
docker compose logs -f inspector
```

The named volume `insightface_models` persists the downloaded weights across
rebuilds so you only pay the download cost once.

### Verify an ID from your host machine

```bash
curl -X POST http://localhost:8000/verify \
  -F "id_image=@/path/to/id_card.jpg" \
  -F "selfie=@/path/to/selfie.jpg"

# With a video selfie (liveness check)
curl -X POST http://localhost:8000/verify \
  -F "id_image=@/path/to/id_card.jpg" \
  -F "selfie=@/path/to/selfie.mp4"
```

### CLI inside the container

```bash
docker compose exec inspector \
  python verify_cli.py --id /data/id.jpg --selfie /data/selfie.mp4
```

### Local Python (no Docker)

```bash
pip install -r requirements.txt
cp .env.example .env
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1
```

---

## API

### `POST /verify`

**Form-data fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id_image` | image file (JPEG/PNG/WebP) | yes | Photo of the ID card |
| `selfie` | image or video (JPEG/PNG/MP4/WebM/MOV) | yes | User selfie |

**Response:**

```json
{
  "face_detected": true,
  "id_face_detected": true,
  "selfie_face_detected": true,
  "id_blur_score": 145.3,
  "selfie_blur_score": 312.7,
  "match_score": 0.4821,
  "is_match": true,
  "confidence": "medium",
  "liveness_passed": true,
  "liveness_blinks": 2,
  "liveness_head_movement": 8.4,
  "liveness_frames_analysed": 24,
  "error": null
}
```

**curl example:**
```bash
curl -X POST http://localhost:8000/verify \
  -F "id_image=@id_card.jpg" \
  -F "selfie=@selfie.mp4"
```

---

## Edge Case Handling

| Scenario | Handling |
|----------|----------|
| No face in ID | Pipeline aborts; `error: "no_face_detected"` |
| Multiple faces in ID | Largest face by bounding-box area is picked (printed photo dominates) |
| Low-quality / blurry ID | CLAHE + denoising enhancement retried automatically if blur < 30 |
| Dark / overexposed image | CLAHE normalises local contrast before detection |
| Tiny face crop | Faces smaller than `MIN_FACE_SIZE_PX` are discarded with a warning |
| Video with no face in frame | Frames without landmarks are skipped; liveness fails if all frames miss |

---

## Performance

### CPU (no GPU)
- First request: ~3–5 s (model load)
- Subsequent requests: ~150–400 ms per image pair
- Video (30 frames @ 5 fps): ~500–800 ms extra for liveness

### Speeding it up

1. **Pre-load models at startup** — `FaceDetector()` and `LivenessChecker()` are singletons;
   the API server loads them on first request. Call them in a startup event to avoid cold starts:
   ```python
   @app.on_event("startup")
   async def warmup():
       FaceDetector()
       LivenessChecker()
   ```

2. **Switch to `buffalo_l`** if you have a GPU — accuracy improves significantly.

3. **Embedding cache** — if the same ID is submitted multiple times (e.g., re-verification),
   cache `embedding` keyed by a hash of the ID image bytes in Redis.

4. **Batch selfies** — InsightFace supports batched inference; call `app.get_batch()` if
   processing more than one selfie at once.

5. **Worker count** — keep `--workers 1` on CPU servers to avoid RAM spikes.
   Use Gunicorn + uvicorn workers only when RAM > 2 GB per worker.

---

## Folder Structure

```
Inspector/
├── api/
│   ├── main.py         # FastAPI app + /verify endpoint
│   └── schemas.py      # Pydantic response models
├── services/
│   ├── face_detector.py  # RetinaFace detection + ArcFace embedding (InsightFace)
│   ├── face_matcher.py   # Cosine similarity + threshold decision
│   ├── liveness_checker.py  # MediaPipe EAR blink + head-yaw movement
│   └── pipeline.py       # Orchestration of all services
├── utils/
│   ├── image_utils.py  # Load, resize, enhance, blur-score
│   └── video_utils.py  # Frame extraction from video
├── models/             # Placeholder — InsightFace saves weights to ~/.insightface/
├── config.py           # Pydantic Settings (overridable via .env)
├── verify_cli.py       # Standalone CLI for testing
├── requirements.txt
└── .env.example
```

---

## Confidence Score (Bonus)

Instead of a binary result the API returns a `confidence` field:

| `match_score` | `confidence` | Suggested action |
|---------------|-------------|------------------|
| ≥ 0.50 | `high` | Auto-approve |
| 0.35 – 0.50 | `medium` | Auto-approve or queue for human review |
| < 0.35 | `low` | Reject or mandatory human review |

---

## Future Scaling

- **Replace liveness with a challenge-response flow** — prompt user to look left/right; compare
  head-pose angle with the issued challenge.
- **Add document OCR** — use `easyocr` or `paddleocr` (both open-source) to extract name/DOB
  from the ID and cross-validate with user-provided data.
- **Add anti-spoofing model** — `Silent-Face-Anti-Spoofing` (MiniVision, MIT licence) detects
  print/screen attacks without any extra API.
- **Horizontal scaling** — Redis embedding cache + stateless workers behind a load balancer.
- **Async GPU batching** — queue requests; flush every 50 ms to GPU for high-throughput.

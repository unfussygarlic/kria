# Inspector — CLAUDE.md

Complete context for AI agents picking up this project. Read this before touching any code.

---

## What This Project Is

Inspector is a **production-ready, fully open-source ID verification pipeline** with no paid API dependencies. Given a photo of an identity document and a selfie (image or short video), it:

0. Classifies the ID document type using OCR (Tesseract) — detects Aadhaar, PAN, Passport, Driving License, Voter ID.
1. Detects the face on the ID card and in the selfie using RetinaFace.
2. Generates 512-dim ArcFace embeddings for both faces.
3. Computes cosine similarity to decide if they're the same person.
4. Runs passive liveness detection (blink + head movement) on selfie video.
5. Runs anti-spoofing to reject fraud attempts (printed ID used as selfie, duplicate image submission).

**Stack:** FastAPI backend · InsightFace (RetinaFace + ArcFace MobileFaceNet) · MediaPipe FaceMesh · MinivisionAI MiniFASNetV1SE (ONNX) · Tesseract OCR · nginx frontend · Docker Compose.

**License constraint:** Every model/library is MIT or Apache 2.0 — safe for commercial use. MinivisionAI Silent-Face-Anti-Spoofing is MIT licensed.

---

## Directory Structure

```
Inspector/
├── api/
│   ├── main.py           # FastAPI app, /verify and /health endpoints
│   └── schemas.py        # Pydantic response model (VerifyResponse)
├── services/
│   ├── face_detector.py  # FaceDetector singleton — RetinaFace via InsightFace
│   ├── face_matcher.py   # compare_embeddings() — cosine similarity
│   ├── liveness_checker.py # LivenessChecker singleton — MediaPipe blink+yaw
│   ├── anti_spoof.py     # Orchestrates all anti-spoof checks
│   ├── silent_face.py    # SilentFaceChecker singleton — MiniFASNetV1SE ONNX
│   ├── id_classifier.py  # classify_id_document() — Tesseract OCR, Indian ID types
│   └── pipeline.py       # run_verification() — top-level orchestrator
├── utils/
│   ├── image_utils.py    # load, resize, enhance, blur estimation
│   └── video_utils.py    # extract_frames() from video files
├── frontend/
│   ├── index.html        # Single-page UI
│   ├── app.js            # Camera capture, drag-drop, fetch, result rendering
│   └── style.css         # Styling
├── nginx/
│   └── default.conf      # Reverse proxy: / → static, /verify|/health → backend
├── models/
│   └── anti_spoof/
│       └── minifasnet_v1se_80x80.onnx  # Built at Docker build time (not in git)
├── scripts/
│   └── export_antispoof_onnx.py  # Build-time: exports PyTorch .pth → ONNX
├── config.py             # Pydantic Settings — all tuneable parameters
├── verify_cli.py         # CLI for testing without running the server
├── requirements.txt
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Inspector + nginx services
├── .env                  # Local overrides (not committed)
└── .env.example          # Template for operators
```

---

## Request Flow

```
Browser / curl
    │
    ▼
nginx :3000 (or :80)
    │ proxy_pass /verify → inspector:8000
    ▼
FastAPI  api/main.py  POST /verify
    │  validates content-type, size (<10 MB)
    │  decodes image bytes or extracts video frames
    ▼
services/pipeline.py  run_verification()
    │
    ├─ 1. FaceDetector.detect_id_face(id_image)
    │     └─ InsightFace RetinaFace + ArcFace embedding (L2-normalised)
    │     └─ Retries with CLAHE+denoise if blur_score < 30
    │
    ├─ 2. FaceDetector.detect_best(selfie_image)
    │
    ├─ 3. anti_spoof.run_all_checks()
    │     ├─ check_duplicate()          pHash Hamming distance (< 8 → reject)
    │     ├─ check_silent_face()        MiniFASNetV1SE on selfie (must be live)
    │     └─ check_id_is_document()     MiniFASNetV1SE on ID (must be printed doc)
    │
    ├─ 4. compare_embeddings()          cosine similarity of ArcFace vectors
    │
    └─ 5. LivenessChecker.check_frames()   EAR blinks + head yaw (video only)

    ▼
VerifyResponse JSON → browser
```

---

## Services In Detail

### `services/face_detector.py`

**Class:** `FaceDetector` (singleton via `__new__`)

**Model:** InsightFace `buffalo_sc` pack (default) — bundles:
- `det_500m.onnx` — RetinaFace-M face detector (~1 MB)
- `w600k_mbf.onnx` — MobileFaceNet ArcFace recogniser (~20 MB)

Switch to `buffalo_l` (~500 MB, more accurate) via `INSIGHTFACE_MODEL=buffalo_l`.

**Key methods:**
- `detect_all(image)` → `list[DetectedFace]` sorted by det_score desc. Skips faces smaller than `MIN_FACE_SIZE_PX`. Adds 15% padding to crops. L2-normalises all embeddings at detection time.
- `detect_best(image)` → `Optional[DetectedFace]` — highest-confidence face.
- `detect_id_face(image)` → `(Optional[DetectedFace], str)` — for ID cards: picks the largest face by area if multiple detected.

**`DetectedFace` dataclass fields:**
- `embedding: np.ndarray` — 512-dim unit vector
- `bbox: tuple[int,int,int,int]` — (x1, y1, x2, y2)
- `det_score: float` — RetinaFace confidence [0,1]
- `crop: np.ndarray` — BGR crop with 15% padding
- `blur_score: float` — Laplacian variance (< 30 = too blurry)
- `is_sharp_enough: bool` — `blur_score >= 30.0`
- `area: int` — pixel area of bbox

**Detection size:** `det_size=(640, 640)` — good balance of speed and small-face recall on CPU.

---

### `services/face_matcher.py`

**Function:** `compare_embeddings(emb1, emb2)` → `MatchResult`

Cosine similarity = dot product (embeddings are pre-normalised). Range [-1, 1].

**Confidence bands:**
- `>= 0.50` → `high` (~0.1% FAR on buffalo_sc / LFW)
- `0.35–0.50` → `medium` (~1% FAR)
- `< 0.35` → `low`

**`is_match`** = `score >= MATCH_THRESHOLD` (default 0.35).

**`MatchResult` fields:** `score`, `is_match`, `confidence`

---

### `services/liveness_checker.py`

**Class:** `LivenessChecker` (singleton)

**Model:** MediaPipe FaceMesh — 478 landmarks, `refine_landmarks=True`.

**Two signals:**
1. **EAR blink detection** — Eye Aspect Ratio (Soukupová & Čech 2016). Landmarks: left eye `[362,385,387,263,373,380]`, right eye `[33,160,158,133,153,144]`. A blink = EAR drops below `EAR_BLINK_THRESHOLD` (default 0.20) then recovers.
2. **Head yaw** — z-depth difference between ear landmarks 234 (left) and 454 (right), scaled by 100. Cumulative absolute change across frames.

**Pass condition (OR):** `blinks >= LIVENESS_MIN_BLINKS` (default 1) OR `head_movement >= LIVENESS_MIN_HEAD_MOVEMENT` (default 5.0).

**`LivenessResult` fields:** `liveness_passed`, `blink_count`, `head_movement`, `frames_analysed`, `reason`

Only runs when a video selfie is supplied. For image selfies, `liveness_passed` is `null` in the response.

---

### `services/silent_face.py`

**Class:** `SilentFaceChecker` (singleton)

**Model:** `MiniFASNetV1SE` from MinivisionAI Silent-Face-Anti-Spoofing (MIT license).

**Model file:** `models/anti_spoof/minifasnet_v1se_80x80.onnx` — built at Docker image build time by `scripts/export_antispoof_onnx.py`. Not in git. ~3 MB.

**Class index mapping** (from original training labels):
- Index 0 → fake (print attack)
- Index 1 → **live (real face)** ← this is what we want
- Index 2 → fake (video replay)

`live_score = softmax(logits)[1]`

**Preprocessing pipeline:**
1. Crop a region `2.7×` the face bbox size from centre (the `2.7` matches the model filename convention from the original repo).
2. Resize to 80×80.
3. BGR → RGB, divide by 255.
4. ImageNet normalisation: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225].
5. HWC → CHW, add batch dim.

**Brightness guard:** If `cv2.cvtColor(crop, BGR2GRAY).mean() < ANTISPOOF_MIN_BRIGHTNESS` (default 40), skip inference and return `is_live=True, live_score=None`. The model was trained on well-lit CASIA-SURF images and gives near-zero live scores on dark webcam frames, causing false positives.

**`LivenessScore` fields:** `live_score: float`, `is_live: bool`, `raw_probs: list[float]`

**`is_live`** = `live_score >= ANTISPOOF_THRESHOLD` (default 0.30).

**Important:** The model may not generalise well to all webcam types (trained on CASIA-SURF which uses specific smartphone cameras). If you see consistent false positives (real selfie flagged as spoof with low scores like 0.05), set `ANTISPOOF_MODEL_ENABLED=False`.

---

### `services/anti_spoof.py`

**Orchestrator:** `run_all_checks(id_image, selfie_image, selfie_face_crop, selfie_bbox, id_bbox)` → `AntiSpoofResult`

**Three checks applied in order:**

**Check 1 — pHash duplicate guard** (always runs, ~1 ms):
- Computes perceptual hash (16×16, imagehash library) of both images.
- If Hamming distance < 8 → `reason="duplicate_submission"`.
- Catches the fraud case of submitting the same image in both fields.

**Check 2 — MiniFASNetV1SE on selfie** (skipped if `ANTISPOOF_MODEL_ENABLED=False`, ~20 ms CPU):
- Selfie must be a live face → `is_live=True`.
- If `is_live=False` → `reason="face_spoof_detected"` (printed/screen attack).

**Check 3 — MiniFASNetV1SE on ID field** (dual anti-spoof logic, ~20 ms CPU):
- The ID card contains a **printed** face. The model will classify it as "spoof" (`is_live=False`). That is **expected and correct** — it means a real physical document is present.
- `id_is_document=True` when model says `is_live=False` (document confirmed).
- `id_is_document=False` when model says `is_live=True` (suspicious — a live face was submitted in the ID field).
- This is **informational only** — it does not block verification. Logged as a warning.

**The insight behind dual logic:**
The MiniFASNetV1SE is essentially a document detector in disguise. For the ID field, "spoof detected" is the **good** outcome. For the selfie field, "live face" is the **good** outcome. This cross-validates both submissions simultaneously.

**`AntiSpoofResult` dataclass:**
- `is_spoof: bool`
- `reason: str` — `"duplicate_submission"` | `"face_spoof_detected"` | `""`
- `detail: str` — human-readable
- `live_score: Optional[float]` — selfie live score from MiniFASNet
- `id_is_document: Optional[bool]` — True = ID confirmed as printed doc
- `id_live_score: Optional[float]` — ID field live score from MiniFASNet

---

### `services/pipeline.py`

**Function:** `run_verification(id_image, selfie_image, selfie_frames=None)` → `VerificationResult`

Pipeline steps:
1. `detect_id_face(id_image)` — abort early with `id_face_detected=False` if no face.
2. If `not id_face.is_sharp_enough` — retry with `enhance_low_quality()` (CLAHE + denoise). Keep the sharper result.
3. `detect_best(selfie_image)` — abort with `selfie_face_detected=False` if no face.
4. `run_all_checks(...)` — if spoof detected, return early (still with face metadata).
5. `compare_embeddings(id_face.embedding, selfie_face.embedding)`.
6. `check_frames(selfie_frames)` if video frames supplied.

**`VerificationResult.to_dict()`** merges all sub-results into a flat dict matching `VerifyResponse`. If `spoof.is_spoof=True`, forces `is_match=False` and `confidence="low"` regardless of embedding similarity.

---

### `api/main.py`

**Endpoints:**
- `POST /verify` — multipart form: `id_image` (JPEG/PNG/WebP) + `selfie` (JPEG/PNG/WebP/MP4/WebM/MOV). Both ≤ 10 MB.
- `GET /health` → `{"status": "ok"}`

For video selfies: extracts up to 60 frames at 5 fps; uses the middle frame as the representative selfie image for embedding; all frames go to liveness checker.

Temp video files are written to `UPLOAD_DIR` (`/tmp/inspector_uploads` by default) and deleted in a `finally` block.

**Single worker only:** `--workers 1`. InsightFace + MediaPipe together use ~300–600 MB RAM on first request. Multiple workers would multiply that.

---

### `api/schemas.py`

**`VerifyResponse`** fields (all returned in JSON):

| Field | Type | Description |
|---|---|---|
| `face_detected` | bool | True if face found in both images |
| `id_face_detected` | bool | Face found in ID card |
| `selfie_face_detected` | bool | Face found in selfie |
| `id_blur_score` | float? | Laplacian variance of ID face crop |
| `selfie_blur_score` | float? | Laplacian variance of selfie face crop |
| `match_score` | float? | Cosine similarity [-1, 1] |
| `is_match` | bool | Score ≥ MATCH_THRESHOLD |
| `confidence` | str | "high" / "medium" / "low" |
| `liveness_passed` | bool? | null if no video supplied |
| `liveness_blinks` | int? | Blinks detected |
| `liveness_head_movement` | float? | Cumulative yaw change |
| `liveness_frames_analysed` | int? | Frames processed |
| `spoof_detected` | bool | Any anti-spoof check failed |
| `spoof_reason` | str? | `duplicate_submission` / `face_spoof_detected` |
| `live_score` | float? | Selfie live probability [0,1] |
| `id_confirmed_as_document` | bool? | True = ID is a printed doc |
| `id_live_score` | float? | ID field live probability [0,1] (lower = more doc-like) |
| `error` | str? | Machine-readable error code if pipeline aborted |

---

## Configuration (`config.py`)

All settings are Pydantic `BaseSettings` — readable from environment variables or `.env` file.

| Setting | Default | Description |
|---|---|---|
| `INSIGHTFACE_MODEL` | `"buffalo_sc"` | `"buffalo_sc"` (fast, ~30 MB) or `"buffalo_l"` (accurate, ~500 MB) |
| `MATCH_THRESHOLD` | `0.35` | Cosine similarity cut-off. Raise to 0.45–0.50 for stricter matching |
| `MIN_FACE_SIZE_PX` | `50` | Minimum face bbox dimension in pixels |
| `MAX_IMAGE_LONG_SIDE` | `1920` | Downscale images larger than this before detection |
| `LIVENESS_MIN_BLINKS` | `1` | Minimum blinks required to pass liveness |
| `LIVENESS_MIN_HEAD_MOVEMENT` | `5.0` | Minimum cumulative yaw change to pass liveness |
| `EAR_BLINK_THRESHOLD` | `0.20` | EAR below this = eye closed |
| `ANTISPOOF_MODEL_ENABLED` | `True` | Set `False` to skip MiniFASNetV1SE (pHash check still runs). Use when webcam causes false positives |
| `ANTISPOOF_THRESHOLD` | `0.30` | MiniFASNetV1SE live-score threshold. Raise toward 0.60 to tighten security |
| `ANTISPOOF_MIN_BRIGHTNESS` | `40` | Skip anti-spoof model if face crop mean brightness < this (avoids false positives on dark images) |
| `UPLOAD_DIR` | `"/tmp/inspector_uploads"` | Temp dir for video uploads |

**To override:** edit `.env` at the project root. Changes take effect on the next request (uvicorn `--reload` picks up Python source changes; env changes require `docker-compose restart inspector`).

---

## Docker Setup

### Multi-stage Dockerfile

**Stage 0 — `antispoof_builder`** (`python:3.11-slim`):
- Installs `git`, `git-lfs`, `torch==2.2.0` (CPU-only wheel), `onnx`, `numpy`.
- Clones MinivisionAI/Silent-Face-Anti-Spoofing with `git lfs pull` (the `.pth` weight files are in Git LFS; raw GitHub URLs return 404 for LFS objects).
- Runs `scripts/export_antispoof_onnx.py` to export the lightest 80x80 MiniFASNetV1SE `.pth` → `minifasnet_v1se_80x80.onnx`.
- PyTorch is **not present at runtime** — only the ONNX file is copied forward.

**Stage 1 — `builder`** (`python:3.11-slim`):
- Installs all Python packages from `requirements.txt` into `/install`.

**Stage 2 — `runtime`** (`python:3.11-slim`):
- Copies Python packages from Stage 1.
- Copies source code.
- Copies `minifasnet_v1se_80x80.onnx` from Stage 0.
- Pre-downloads InsightFace `buffalo_sc` model weights (so first request is fast).
- Warms up MediaPipe FaceMesh.
- Verifies the ONNX model loads without error.

### `docker-compose.yml`

Two services:

**`inspector`** (FastAPI backend):
- Runs `uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload`
- Not exposed directly — nginx proxies to it
- Hot-reload via volume mounts: `./api`, `./services`, `./utils`, `./config.py`, `./.env`
- Model weights in named volume `insightface_models` (persists across container restarts)
- CPU limited to 3.0 cores, 2 GB RAM

**`frontend`** (nginx):
- Exposed on `host:3000`
- Serves `./frontend/` as static files
- Proxies `/verify` and `/health` to `inspector:8000`
- `client_max_body_size 50M` for video uploads

### Running

```bash
# First time — builds the image (takes ~5-10 min, downloads models)
docker-compose up --build

# Subsequent starts
docker-compose up -d

# View logs
docker-compose logs -f inspector

# Restart after env var changes (not just code changes)
docker-compose restart inspector

# Rebuild image (needed if Dockerfile or requirements.txt changed)
docker-compose down && docker-compose up --build
```

**Access:** Open `http://localhost:3000` in the browser.

### Hot Reload

Python source files (`api/`, `services/`, `utils/`, `config.py`) are bind-mounted into the container. Uvicorn's `--reload` flag watches for changes and restarts the worker automatically — no rebuild needed for code changes.

Environment variable changes (in `docker-compose.yml`'s `environment:` block or `.env`) require `docker-compose restart inspector` because uvicorn does not re-read env vars on reload.

---

### CLI Testing (without server)

```bash
# Inside container
docker exec -it inspector python verify_cli.py --id /path/to/id.jpg --selfie /path/to/selfie.jpg
docker exec -it inspector python verify_cli.py --id /path/to/id.jpg --selfie /path/to/selfie.mp4

# Or from host if Python environment is set up locally
python verify_cli.py --id id.jpg --selfie selfie.jpg
```

Outputs pretty-printed JSON to stdout.

### API Testing via curl

```bash
curl -s -X POST http://localhost:3000/verify \
  -F "id_image=@id_card.jpg" \
  -F "selfie=@selfie.jpg" | python3 -m json.tool
```

---

## Key Design Decisions

### Why no PyTorch at runtime?
PyTorch adds ~800 MB to the image and ~2 s cold-start. The ONNX model is ~3 MB and runs via onnxruntime in ~20 ms on CPU. PyTorch is only used in the Docker build stage for the ONNX export.

### Why single worker?
InsightFace loads ~300–600 MB of model weights on first request. Multiple workers multiply this. A single worker + async I/O handles typical verification throughput fine.

### Why `buffalo_sc` over `buffalo_l`?
`buffalo_sc` is 30 MB vs ~500 MB. For ID verification (ID photo to selfie comparison) the accuracy difference is small. `buffalo_l` uses a ResNet-50 backbone vs MobileFaceNet — worth switching for high-stakes production deployments with very degraded ID photos.

### Why MiniFASNetV1SE over FFT/LBP heuristics?
FFT anti-aliasing and LBP texture checks were tried first. They produced too many false positives on legitimate dark webcam images and JPEG artifacts. The trained ML model has far better calibration for this specific task.

### Dual anti-spoof logic
The MiniFASNetV1SE model is trained to distinguish "live face in front of camera" from "printed face / screen replay". By design:
- Running it on the **selfie field** and expecting `is_live=True` catches printed ID photos used as selfies.
- Running it on the **ID card field** and expecting `is_live=False` confirms the submission is a physical document (a printed face). If it says "live" for the ID field, someone is holding their real face as the ID.

### pHash vs pixel comparison for duplicate detection
pHash is rotation/scale/compression tolerant. A pixel-level comparison would fail to catch the same image re-encoded at different quality levels. Hamming distance < 8 out of 256 bits catches perceptually identical images while tolerating minor re-encoding differences.

---

## Known Issues and Fixes Applied

### MiniFASNet false positives on dark webcam images
**Symptom:** Live selfie gets `live_score=0.050`, flagged as spoof.  
**Root cause:** Model trained on CASIA-SURF (smartphone cameras, controlled lighting). Out-of-distribution for many webcams.  
**Fix applied:** Brightness guard in `silent_face.py` — skips model if face crop mean brightness < `ANTISPOOF_MIN_BRIGHTNESS` (default 40). Added `ANTISPOOF_MODEL_ENABLED` flag to disable neural checks entirely while keeping pHash.  
**Current state:** `ANTISPOOF_MODEL_ENABLED=False` set in `docker-compose.yml` `environment:` block. Set to `True` when testing in controlled lighting conditions.

### DataParallel prefix in model weights
**Symptom:** `RuntimeError: loading state_dict` — keys like `module.conv1.weight` not found.  
**Root cause:** Model was saved with `torch.nn.DataParallel` which prefixes all keys with `module.`.  
**Fix:** `state = {k.removeprefix("module."): v for k, v in state.items()}` in `export_antispoof_onnx.py`.

### `num_batches_tracked` strict mismatch
**Symptom:** `RuntimeError: unexpected key in state_dict: bn1.num_batches_tracked`.  
**Root cause:** Newer PyTorch BatchNorm adds this key; the original weights don't have it.  
**Fix:** `model.load_state_dict(state, strict=False)`.

### Git LFS — `.pth` file returns 404 from raw GitHub URL
**Symptom:** `wget` of the raw GitHub URL for the `.pth` file downloads a 134-byte LFS pointer, not the actual weights.  
**Fix:** `git lfs install && git clone --depth 1 <repo> && git lfs pull` in the Dockerfile.

### `onnx` module not found during Docker build
**Symptom:** `ModuleNotFoundError: No module named 'onnx'` during `python /export.py`.  
**Root cause:** Using `--index-url` for the PyTorch CPU wheel overrides PyPI, blocking `onnx` from being installed in the same `pip install` command.  
**Fix:** Separate `pip install` command for `onnx numpy` after the torch install.

### Stale bind-mount inode after editing config.py
**Symptom:** `AttributeError: 'Settings' object has no attribute 'ANTISPOOF_MIN_BRIGHTNESS'` after adding a new setting.  
**Root cause:** Some editors (vim, etc.) write a new inode on save. The Docker bind mount tracks the inode, not the filename, so the container still sees the old file.  
**Fix:** `docker-compose restart inspector` (not just `reload`).

### Wrong key rename during ONNX export
**Symptom:** `size mismatch for prob.weight: copying a param with shape [3,128] from checkpoint, the shape in current model is [128,512]`.  
**Root cause:** Attempted to rename `prob` → `linear` thinking they were the same layer. The model has BOTH `linear` (512→128 FC) AND `prob` (128→3 classifier) — renaming swapped them.  
**Fix:** Remove the key rename; only strip the `module.` prefix.

---

## Frontend

Single-page application at `frontend/`. No build step — plain JS, no framework.

**UI flow:**
1. User opens `http://localhost:3000`
2. ID card section: camera capture, file upload, or drag-and-drop. Uses `facingMode: 'environment'` (rear camera).
3. Selfie section: photo mode or video mode (MediaRecorder API). Uses `facingMode: 'user'` (front camera).
4. "Verify Identity" button enabled once both are captured.
5. `POST /verify` with `FormData`. Shows spinner during request.
6. Results rendered: verdict (✓/✗), match score with colour-coded bar, confidence, liveness, blur scores, anti-spoof score, ID document confirmation, raw JSON accordion.

**Anti-spoof banner:** Shown in red when `spoof_detected=true`, with human-readable text for each `spoof_reason` code.

**ID document card:** Shows `id_confirmed_as_document` — green "Yes ✓ (score: X.XXX)" or red "Suspicious ✗ (score: X.XXX)".

---

## Potential Improvements / Next Steps

- **`ANTISPOOF_MODEL_ENABLED=True` in production:** The neural anti-spoof check is currently disabled due to false positives on consumer webcams. For a production deployment with known-good cameras or controlled capture, re-enable it.
- **`buffalo_l` model:** Swap in the larger InsightFace model pack for better accuracy on low-quality ID photos.
- **Challenge-response liveness:** Prompt the user to turn left/right or smile — stronger than passive blink detection.
- **Depth-based liveness:** Add a depth sensor signal or use a model that reasons about 3D face structure.
- **Rate limiting:** Add nginx `limit_req_zone` or a FastAPI middleware to prevent brute-force attempts.
- **CORS hardening:** `allow_origins=["*"]` in `api/main.py` — tighten to the actual frontend origin in production.
- **Persistent logging / audit trail:** Currently logs to stdout only. Add structured logging to a database for compliance.
- **GPU support:** In `docker-compose.yml`, add `deploy.resources.reservations.devices` and swap `onnxruntime` → `onnxruntime-gpu` in `requirements.txt`. All model inference code already tries `CUDAExecutionProvider` first.
- **Webhook / async results:** For mobile where uploads are slow, consider returning a job ID and polling or pushing results.
- **ID field fraud signal in response:** `id_confirmed_as_document=False` is currently only logged as a warning. Consider adding it to the spoof banner in the frontend and optionally blocking verification.

---

## Model Files

| File | Location | Size | How obtained |
|---|---|---|---|
| RetinaFace + ArcFace (`buffalo_sc`) | `/root/.insightface/models/buffalo_sc/` | ~30 MB | Downloaded at image build time by InsightFace |
| MiniFASNetV1SE | `/app/models/anti_spoof/minifasnet_v1se_80x80.onnx` | ~3 MB | Exported at image build time from MinivisionAI repo |
| MediaPipe FaceMesh | Bundled with mediapipe package | ~10 MB | pip install |

The InsightFace models are stored in a named Docker volume (`insightface_models`) so they survive container recreation without re-downloading.

---

## Environment Variables Reference

Set in `docker-compose.yml` `environment:` block OR in `.env` file at project root (`.env` is bind-mounted into the container).

Priority: `docker-compose.yml environment:` overrides `.env` file.

```bash
# .env example
ANTISPOOF_MODEL_ENABLED=False   # disable neural anti-spoof
MATCH_THRESHOLD=0.40            # stricter matching
ANTISPOOF_THRESHOLD=0.45        # tighter liveness gate
INSIGHTFACE_MODEL=buffalo_l     # use larger, more accurate model
```

After changing env vars, run `docker-compose restart inspector`.

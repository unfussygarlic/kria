"""
Build-time script — export MiniFASNetV1SE to ONNX.

Imports the model architecture directly from the cloned repo (/sfa/src)
so the state_dict keys always match the trained weights exactly.

Lightest available 80x80 model is selected automatically.
"""
import glob
import os
import sys

import torch

# Use the repo's own architecture code — avoids any key mismatch.
sys.path.insert(0, "/sfa/src")
from model_lib.MiniFASNet import MiniFASNetV1SE  # noqa: E402

# ── Find the lightest 80x80 MiniFASNetV1SE model ──────────────────
MODEL_DIR  = "/sfa/resources/anti_spoof_models"
OUT_DIR    = "/app/models/anti_spoof"
ONNX_PATH  = os.path.join(OUT_DIR, "minifasnet_v1se_80x80.onnx")

os.makedirs(OUT_DIR, exist_ok=True)

# List all available 80x80 V1SE models and pick smallest file
candidates = glob.glob(os.path.join(MODEL_DIR, "*80x80*MiniFASNetV1SE*.pth"))
if not candidates:
    raise FileNotFoundError(
        f"No *80x80*MiniFASNetV1SE*.pth found in {MODEL_DIR}\n"
        f"Files present: {os.listdir(MODEL_DIR)}"
    )

# Sort by file size, pick smallest (fastest on CPU)
PTH_PATH = min(candidates, key=os.path.getsize)
print(f"Using model: {os.path.basename(PTH_PATH)}  ({os.path.getsize(PTH_PATH)//1024} KB)")

# ── Load + export ─────────────────────────────────────────────────
# conv6_kernel=(5,5) for 80x80 input (matches original parse_model_name logic)
model = MiniFASNetV1SE(conv6_kernel=(5, 5), num_classes=3, img_channel=3)
state = torch.load(PTH_PATH, map_location="cpu")

# Model was saved with DataParallel — strip the 'module.' prefix from every key.
# strict=False silently ignores 'num_batches_tracked' extras added by newer PyTorch BN.
state = {k.removeprefix("module."): v for k, v in state.items()}
result = model.load_state_dict(state, strict=False)
if result.missing_keys:
    # Any genuinely missing weights — worth knowing about
    print(f"  WARNING — missing keys ({len(result.missing_keys)}): {result.missing_keys[:3]}")
print(f"  INFO    — extra keys ignored: {len(result.unexpected_keys)}")
model.eval()

dummy = torch.randn(1, 3, 80, 80)

torch.onnx.export(
    model, dummy, ONNX_PATH,
    input_names=["input"],
    output_names=["logits"],
    opset_version=12,
    do_constant_folding=True,
)

size_kb = os.path.getsize(ONNX_PATH) // 1024
print(f"ONNX exported → {ONNX_PATH}  ({size_kb} KB)")

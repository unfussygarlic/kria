#!/usr/bin/env python3
"""
Quick CLI for testing the pipeline without starting the server.

Usage:
  python verify_cli.py --id path/to/id.jpg --selfie path/to/selfie.jpg
  python verify_cli.py --id path/to/id.jpg --selfie path/to/selfie.mp4
"""
import argparse
import json
import sys
from pathlib import Path

from utils.image_utils import load_image_path
from utils.video_utils import extract_frames
from services.pipeline import run_verification


def main() -> None:
    parser = argparse.ArgumentParser(description="Inspector — ID face verification")
    parser.add_argument("--id",     required=True, help="Path to ID card image")
    parser.add_argument("--selfie", required=True, help="Path to selfie image or video")
    args = parser.parse_args()

    id_path     = Path(args.id)
    selfie_path = Path(args.selfie)

    if not id_path.exists():
        print(f"[ERROR] ID file not found: {id_path}", file=sys.stderr)
        sys.exit(1)
    if not selfie_path.exists():
        print(f"[ERROR] Selfie file not found: {selfie_path}", file=sys.stderr)
        sys.exit(1)

    id_image = load_image_path(id_path)

    video_exts = {".mp4", ".webm", ".mov", ".avi"}
    is_video = selfie_path.suffix.lower() in video_exts

    if is_video:
        frames = extract_frames(selfie_path)
        if not frames:
            print("[ERROR] Could not extract frames from video", file=sys.stderr)
            sys.exit(1)
        selfie_image = frames[len(frames) // 2]
    else:
        selfie_image = load_image_path(selfie_path)
        frames = None

    result = run_verification(
        id_image=id_image,
        selfie_image=selfie_image,
        selfie_frames=frames,
    )

    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()

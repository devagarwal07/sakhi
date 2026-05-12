"""
Face Liveness Microservice for Sakhi Driver App

Uses MediaPipe Face Mesh (468 landmarks) for real-time:
  - Face detection + boundary check
  - Blink detection via Eye Aspect Ratio (EAR)
  - Head turn detection via nose tip X position
  - Smile detection via mouth corner distance
  - Gender estimation via face width/height ratio

Endpoints:
  POST /analyze-frame   — single-frame analysis (called every ~700ms)
  POST /verify-final    — final selfie verification + gender decision
  GET  /health          — health check
"""

import base64
import io
import time
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Sakhi Face Liveness", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MediaPipe Face Mesh ────────────────────────────────────────────────────────
mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,      # tracking mode — stable, no per-frame jitter
    max_num_faces=1,              # single face only (more stable like original face.py)
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,  # required when static_image_mode=False
)

# ── Landmark indices ───────────────────────────────────────────────────────────
LEFT_EYE  = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

NOSE_TIP      = 1
LEFT_MOUTH    = 61
RIGHT_MOUTH   = 291
UPPER_LIP     = 13
LOWER_LIP     = 14
LEFT_CHEEK    = 234
RIGHT_CHEEK   = 454
FOREHEAD      = 10
CHIN          = 152

# ── Helper functions (from face.py) ────────────────────────────────────────────

def _distance(p1, p2):
    return float(np.linalg.norm(np.array(p1) - np.array(p2)))


def _eye_ratio(landmarks, eye_points, w, h):
    """Eye Aspect Ratio — low value (<0.20) means eye is closed."""
    pts = []
    for p in eye_points:
        lm = landmarks[p]
        pts.append((lm.x * w, lm.y * h))
    v1 = _distance(pts[1], pts[5])
    v2 = _distance(pts[2], pts[4])
    hz = _distance(pts[0], pts[3])
    if hz < 1e-6:
        return 0.3  # fallback
    return (v1 + v2) / (2.0 * hz)


def _estimate_gender(face_width, face_height):
    """Lightweight heuristic from face.py — ratio-based."""
    if face_height < 1:
        return "Unknown", 50.0
    ratio = face_width / face_height
    # Higher ratio → wider face → male heuristic
    if ratio > 0.78:
        conf = min(95, 50 + (ratio - 0.78) * 300)
        return "Male", round(conf, 1)
    else:
        conf = min(95, 50 + (0.78 - ratio) * 300)
        return "Female", round(conf, 1)


def _decode_base64_image(b64: str) -> np.ndarray:
    """Decode base64 string → OpenCV BGR image.
    Flips horizontally to match front-camera mirroring (same as face.py cv2.flip(frame,1)).
    Without this, left/right are inverted — boundary & head-turn detection break.
    """
    img_bytes = base64.b64decode(b64)
    arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return cv2.flip(img, 1)  # mirror to match front-cam orientation


def _compute_face_state(landmarks, w, h, face_index=0):
    """Extract all face measurements from MediaPipe landmarks."""
    lm = landmarks

    # ── Bounding box (normalised 0-1) ──────────────────────────────────────
    xs = [l.x for l in lm]
    ys = [l.y for l in lm]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)
    face_w = (x_max - x_min) * w
    face_h = (y_max - y_min) * h

    # ── Boundary check (does face fit in our oval?) ────────────────────────
    face_cx = (x_min + x_max) / 2
    face_cy = (y_min + y_max) / 2
    oval_cx, oval_cy, rx, ry = 0.50, 0.40, 0.38, 0.50
    ellipse_val = ((face_cx - oval_cx) / rx) ** 2 + ((face_cy - oval_cy) / ry) ** 2
    face_norm_w = x_max - x_min
    size_ok = 0.22 < face_norm_w < 0.85
    in_boundary = ellipse_val <= 1.3 and size_ok

    # ── Eye Aspect Ratio ──────────────────────────────────────────────────
    left_ear  = _eye_ratio(lm, LEFT_EYE, w, h)
    right_ear = _eye_ratio(lm, RIGHT_EYE, w, h)
    avg_ear   = (left_ear + right_ear) / 2
    eyes_open = avg_ear > 0.20

    # ── Head pose (nose tip X normalised) ─────────────────────────────────
    nose_x = lm[NOSE_TIP].x     # 0-1, centre ≈ 0.5
    nose_y = lm[NOSE_TIP].y

    # Yaw: original face.py uses nose_x > w*0.65 in pixels.
    # Normalised equivalent: nose_x > 0.65 (right turn) or < 0.35 (left turn)
    yaw_offset = (nose_x - 0.50) * 100

    # ── Smile detection (mouth width in pixels) ────────────────────────────
    # Original face.py threshold: mouth_width > 90px at webcam resolution.
    # Mobile front-cam is typically 480–640px wide, same threshold works.
    left_m  = lm[LEFT_MOUTH]
    right_m = lm[RIGHT_MOUTH]
    mouth_width = _distance(
        (left_m.x * w, left_m.y * h),
        (right_m.x * w, right_m.y * h)
    )
    # Use pixel value like original (>90px), not ratio — ratio is unstable at mobile res
    smile_ratio = mouth_width / max(face_w, 1)  # kept for debug output
    is_smiling = mouth_width > 90

    # ── Gender ────────────────────────────────────────────────────────────
    gender_label, gender_conf = _estimate_gender(face_w, face_h)

    # ── Sunglasses heuristic ──────────────────────────────────────────────
    # If both EARs are very flat (< 0.15) but face confidence is high,
    # likely sunglasses or occluded eyes
    sunglasses = avg_ear < 0.14 and face_norm_w > 0.25

    return {
        "in_boundary": in_boundary,
        "confidence": 99.0,  # MediaPipe doesn't give a per-face confidence score

        "bounding_box": {
            "left":   round(x_min, 4),
            "top":    round(y_min, 4),
            "width":  round(x_max - x_min, 4),
            "height": round(y_max - y_min, 4),
        },

        "eyes_open": eyes_open,
        "ear": round(avg_ear, 4),

        "nose_x": round(nose_x, 4),
        "yaw_offset": round(yaw_offset, 2),

        "smile": is_smiling,
        "smile_ratio": round(smile_ratio, 4),
        "mouth_width_px": round(mouth_width, 1),

        "sunglasses": sunglasses,

        "gender": gender_label,
        "gender_confidence": gender_conf,

        "face_width_px": round(face_w, 1),
        "face_height_px": round(face_h, 1),
    }


# ── Request / Response models ─────────────────────────────────────────────────

class FrameRequest(BaseModel):
    image_base64: str


class FrameResponse(BaseModel):
    face_detected: bool
    face_count: int
    in_boundary: bool = False
    multiple_faces: bool = False
    confidence: float = 0.0
    bounding_box: Optional[dict] = None
    eyes_open: bool = True
    ear: float = 0.3
    nose_x: float = 0.5
    yaw_offset: float = 0.0
    smile: bool = False
    smile_ratio: float = 0.0
    mouth_width_px: float = 0.0
    sunglasses: bool = False
    gender: str = "Unknown"
    gender_confidence: float = 50.0
    face_width_px: float = 0.0
    face_height_px: float = 0.0


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": "mediapipe_face_mesh_468"}


@app.post("/analyze-frame", response_model=FrameResponse)
def analyze_frame(req: FrameRequest):
    """
    Accepts a single camera frame as base64 JPEG.
    Returns full face state for the liveness state machine.
    Called every ~700ms by the driver app.
    """
    try:
        img = _decode_base64_image(req.image_base64)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not decode image")

    h, w, _ = img.shape
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return FrameResponse(face_detected=False, face_count=0, in_boundary=False)

    face_count = len(results.multi_face_landmarks)

    if face_count > 1:
        return FrameResponse(
            face_detected=True,
            face_count=face_count,
            multiple_faces=True,
            in_boundary=False,
        )

    # Single face — compute full state
    landmarks = results.multi_face_landmarks[0].landmark
    state = _compute_face_state(landmarks, w, h)

    return FrameResponse(
        face_detected=True,
        face_count=1,
        **state,
    )


@app.post("/verify-final")
def verify_final(req: FrameRequest):
    """
    Final verification frame — runs the same analysis but returns
    a decision (approved / rejected / retry).
    """
    try:
        img = _decode_base64_image(req.image_base64)
    except Exception:
        raise HTTPException(status_code=422, detail="Could not decode image")

    h, w, _ = img.shape
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return {"status": "retry", "reason": "no_face_detected"}

    if len(results.multi_face_landmarks) > 1:
        return {"status": "retry", "reason": "multiple_faces"}

    landmarks = results.multi_face_landmarks[0].landmark
    state = _compute_face_state(landmarks, w, h)

    if state["sunglasses"]:
        return {"status": "retry", "reason": "sunglasses_detected"}

    if not state["eyes_open"]:
        return {"status": "retry", "reason": "eyes_not_open"}

    # Gender decision
    gender = state["gender"]
    conf   = state["gender_confidence"]

    if gender == "Female" and conf >= 55:
        return {
            "status": "approved",
            "gender": gender,
            "gender_confidence": conf,
        }
    elif gender == "Male" and conf >= 70:
        return {
            "status": "rejected",
            "reason": "not_eligible",
            "gender": gender,
            "gender_confidence": conf,
        }
    else:
        return {
            "status": "retry",
            "reason": "gender_low_confidence",
            "gender": gender,
            "gender_confidence": conf,
        }


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050, log_level="info")

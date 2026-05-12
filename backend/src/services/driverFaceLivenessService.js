'use strict';

/**
 * driverFaceLivenessService
 *
 * Handles face-liveness + gender verification for DRIVERS.
 * Flow:
 *   1. Driver captures a selfie via the in-app guided camera (expo-camera).
 *   2. The image is uploaded to this endpoint (multipart/form-data).
 *   3. We run AWS Rekognition DetectFaces to:
 *        a) Confirm a clear, single face is present (liveness proxy).
 *        b) Predict gender with confidence.
 *   4. If female with high confidence → approved.
 *      If male with high confidence → rejected_not_eligible.
 *      Otherwise → retry or manual review.
 *   5. The best-quality captured photo is saved to S3 and its URL
 *      is stored as `selfie_url` on the drivers record.
 */

const {
    RekognitionClient,
    DetectFacesCommand,
} = require('@aws-sdk/client-rekognition');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const supabase  = require('../config/supabase');
const logger    = require('../utils/logger');
const { s3 }    = require('../middleware/upload');

const rekognition = new RekognitionClient({
    region:      process.env.AWS_REGION,
    credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// ── Config ────────────────────────────────────────────────────────────────────
function envNumber(name, fallback) {
    const v = Number(process.env[name]);
    return Number.isFinite(v) ? v : fallback;
}
function envInt(name, fallback) {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

function s3Url(key) {
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

function mapGender(value) {
    if (value === 'Female') return 'F';
    if (value === 'Male')   return 'M';
    return 'unknown';
}

// ── Upload selfie to S3 ───────────────────────────────────────────────────────
async function uploadSelfieToS3(driverId, imageBuffer, mimeType = 'image/jpeg') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw Object.assign(new Error('AWS_S3_BUCKET not configured'), { code: 'CONFIG_ERROR', status: 500 });

    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const key = `drivers/${driverId}/selfie_${Date.now()}.${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket:      bucket,
        Key:         key,
        Body:        imageBuffer,
        ContentType: mimeType,
    }));

    return { key, url: s3Url(key) };
}

// ── Get driver face state ─────────────────────────────────────────────────────
async function getDriverFaceState(driverId) {
    const { data, error } = await supabase
        .from('drivers')
        .select('verification_status, face_verification_attempts, face_review_required, face_decision_reason')
        .eq('id', driverId)
        .limit(1);

    if (error) {
        logger.error('driverFaceLivenessService.getDriverFaceState — DB error', { error: error.message });
        throw Object.assign(new Error('Failed to load driver'), { code: 'DB_ERROR', status: 500 });
    }

    const row = data?.[0];
    if (!row) throw Object.assign(new Error('Driver not found'), { code: 'NOT_FOUND', status: 404 });

    return {
        verificationStatus: row.verification_status,
        attempts:           row.face_verification_attempts ?? 0,
        faceReviewRequired: !!row.face_review_required,
        faceDecisionReason: row.face_decision_reason,
    };
}

// ── Main verification function ────────────────────────────────────────────────
/**
 * verifyDriverSelfie
 *
 * @param {string} driverId
 * @param {Buffer} imageBuffer   Raw image bytes (from multer memoryStorage)
 * @param {string} mimeType      e.g. 'image/jpeg'
 *
 * @returns {{ status, liveness_confidence?, gender?, gender_confidence?, selfie_url?, reason? }}
 *   status: 'approved' | 'rejected' | 'retry' | 'manual_review'
 */
async function verifyDriverSelfie(driverId, imageBuffer, mimeType = 'image/jpeg') {
    const maxAttempts = envInt('FACE_VERIFICATION_MAX_ATTEMPTS', 10);  // generous for drivers in dev
    const minGender   = envNumber('FACE_GENDER_MIN_CONFIDENCE', 90);

    const { verificationStatus, attempts, faceReviewRequired, faceDecisionReason } = await getDriverFaceState(driverId);

    // Guard: already approved
    if (verificationStatus === 'approved') {
        throw Object.assign(new Error('Driver is already verified'), { code: 'ALREADY_VERIFIED', status: 409 });
    }

    // Guard: hard rejected (ineligible)
    if (verificationStatus === 'rejected' && faceDecisionReason === 'rejected_not_eligible') {
        throw Object.assign(new Error('Driver is not eligible'), { code: 'NOT_ELIGIBLE', status: 403 });
    }

    // Guard: manual review locked
    if (faceReviewRequired) {
        throw Object.assign(new Error('Manual review pending for this account'), { code: 'MANUAL_REVIEW_REQUIRED', status: 403 });
    }

    // Guard: max attempts
    if (attempts >= maxAttempts) {
        await supabase.from('drivers')
            .update({ face_review_required: true, verification_status: 'pending' })
            .eq('id', driverId);
        throw Object.assign(
            new Error(`Max attempts (${maxAttempts}) reached — manual review required`),
            { code: 'MANUAL_REVIEW_REQUIRED', status: 403 }
        );
    }

    const attemptNo = attempts + 1;

    // Increment attempt counter immediately
    await supabase.from('drivers').update({
        face_verification_attempts: attemptNo,
        verification_status:        'pending',
        gender_verified:            false,
        face_review_required:       false,
        face_decision_reason:       null,
    }).eq('id', driverId);

    // ── 1. Upload selfie to S3 ───────────────────────────────────────────────
    let selfieUrl = null;
    try {
        const uploaded = await uploadSelfieToS3(driverId, imageBuffer, mimeType);
        selfieUrl = uploaded.url;
    } catch (err) {
        logger.error('driverFaceLivenessService — S3 upload failed', { error: err.message });
        // Non-fatal for the decision, but we won't have a stored photo
    }

    // ── 2. Rekognition DetectFaces ───────────────────────────────────────────
    let faceDetails;
    try {
        const result = await rekognition.send(new DetectFacesCommand({
            Image:      { Bytes: imageBuffer },
            Attributes: ['ALL'],
        }));
        faceDetails = result?.FaceDetails ?? [];
    } catch (err) {
        logger.error('driverFaceLivenessService — Rekognition DetectFaces error', { error: err.message });
        throw Object.assign(new Error('Face analysis failed'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    // ── 3. Face presence + liveness checks ──────────────────────────────────
    const retryRemaining = Math.max(0, maxAttempts - attemptNo);

    if (!faceDetails.length) {
        // No face detected — retry
        const shouldRetry = attemptNo < maxAttempts;
        await supabase.from('drivers').update({
            selfie_url:          selfieUrl,
            face_decision_reason: 'no_face_detected',
            face_review_required: !shouldRetry,
        }).eq('id', driverId);

        return {
            status:           shouldRetry ? 'retry' : 'manual_review',
            reason:           'no_face_detected',
            attempts_used:    attemptNo,
            max_attempts:     maxAttempts,
            retry_remaining:  shouldRetry ? retryRemaining : 0,
            selfie_url:       selfieUrl,
        };
    }

    if (faceDetails.length > 1) {
        // Multiple faces — retry
        const shouldRetry = attemptNo < maxAttempts;
        await supabase.from('drivers').update({
            selfie_url:          selfieUrl,
            face_decision_reason: 'multiple_faces',
            face_review_required: !shouldRetry,
        }).eq('id', driverId);

        return {
            status:           shouldRetry ? 'retry' : 'manual_review',
            reason:           'multiple_faces',
            attempts_used:    attemptNo,
            max_attempts:     maxAttempts,
            retry_remaining:  shouldRetry ? retryRemaining : 0,
            selfie_url:       selfieUrl,
        };
    }

    const face           = faceDetails[0];
    const livenessConf   = Number(face.Confidence ?? 0);   // face detection confidence (proxy for clarity)
    const eyesOpen       = (face.EyesOpen?.Value ?? false) && (face.EyesOpen?.Confidence ?? 0) > 70;
    const sunglasses     = face.Sunglasses?.Value ?? false;

    // Low-quality frame: eyes not open or sunglasses
    if (!eyesOpen || sunglasses) {
        const shouldRetry = attemptNo < maxAttempts;
        const reason = sunglasses ? 'sunglasses_detected' : 'eyes_not_open';

        await supabase.from('drivers').update({
            selfie_url:          selfieUrl,
            face_decision_reason: reason,
            face_review_required: !shouldRetry,
        }).eq('id', driverId);

        return {
            status:          shouldRetry ? 'retry' : 'manual_review',
            reason,
            attempts_used:   attemptNo,
            max_attempts:    maxAttempts,
            retry_remaining: shouldRetry ? retryRemaining : 0,
            selfie_url:      selfieUrl,
        };
    }

    // ── 4. Gender decision ───────────────────────────────────────────────────
    const g              = face.Gender;
    const gender         = mapGender(g?.Value);
    const genderConf     = Number(g?.Confidence ?? 0);

    const isFemaleHigh = gender === 'F' && genderConf >= minGender;
    const isMaleHigh   = gender === 'M' && genderConf >= minGender;

    if (isFemaleHigh) {
        await supabase.from('drivers').update({
            gender_verified:         true,
            verification_status:     'approved',
            face_review_required:    false,
            selfie_url:              selfieUrl,
            profile_photo_url:       selfieUrl,   // best shot becomes profile photo
            face_liveness_confidence: livenessConf,
            face_gender:             gender,
            face_gender_confidence:  genderConf,
            face_decision_reason:    'approved_female',
            face_verification_attempts: attemptNo,
        }).eq('id', driverId);

        logger.info('driverFaceLivenessService — approved female', { driverId, genderConf, livenessConf });

        return {
            status:              'approved',
            liveness_confidence: livenessConf,
            gender,
            gender_confidence:   genderConf,
            selfie_url:          selfieUrl,
        };
    }

    if (isMaleHigh) {
        await supabase.from('drivers').update({
            gender_verified:         false,
            verification_status:     'rejected',
            face_review_required:    false,
            selfie_url:              selfieUrl,
            face_liveness_confidence: livenessConf,
            face_gender:             gender,
            face_gender_confidence:  genderConf,
            face_decision_reason:    'rejected_not_eligible',
        }).eq('id', driverId);

        logger.warn('driverFaceLivenessService — rejected (male)', { driverId, genderConf });

        return {
            status:              'rejected',
            reason:              'not_eligible',
            liveness_confidence: livenessConf,
            gender,
            gender_confidence:   genderConf,
            selfie_url:          selfieUrl,
        };
    }

    // Low-confidence gender → retry / manual review
    const shouldRetry = attemptNo < maxAttempts;
    await supabase.from('drivers').update({
        gender_verified:         false,
        verification_status:     'pending',
        face_review_required:    !shouldRetry,
        selfie_url:              selfieUrl,
        face_liveness_confidence: livenessConf,
        face_gender:             gender,
        face_gender_confidence:  genderConf,
        face_decision_reason:    'gender_low_confidence',
    }).eq('id', driverId);

    return {
        status:          shouldRetry ? 'retry' : 'manual_review',
        reason:          'gender_low_confidence',
        liveness_confidence: livenessConf,
        gender,
        gender_confidence:   genderConf,
        attempts_used:   attemptNo,
        max_attempts:    maxAttempts,
        retry_remaining: shouldRetry ? retryRemaining : 0,
        selfie_url:      selfieUrl,
    };
}

// ── Real-time frame analysis (for live liveness polling) ─────────────────────
/**
 * analyzeFrame
 *
 * Accepts a single JPEG frame (as Buffer) and runs DetectFaces with ALL
 * attributes.  Returns lightweight face-state JSON used by the mobile
 * app's liveness state-machine to gate step advancement.
 *
 * Called by POST /drivers/face-analyze every ~600 ms during verification.
 * No DB writes — read-only, lightweight.
 *
 * @param {Buffer} imageBuffer
 * @returns {Object} faceState
 */
async function analyzeFrame(imageBuffer) {
    let faceDetails;
    try {
        const result = await rekognition.send(new DetectFacesCommand({
            Image:      { Bytes: imageBuffer },
            Attributes: ['ALL'],
        }));
        faceDetails = result?.FaceDetails ?? [];
    } catch (err) {
        logger.error('driverFaceLivenessService.analyzeFrame — Rekognition error', { error: err.message });
        throw Object.assign(new Error('Face analysis failed'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    const faceCount = faceDetails.length;

    if (faceCount === 0) {
        return { face_detected: false, face_count: 0, in_boundary: false };
    }

    if (faceCount > 1) {
        return { face_detected: true, face_count: faceCount, multiple_faces: true, in_boundary: false };
    }

    const face = faceDetails[0];
    const box  = face.BoundingBox ?? {};

    // ── Boundary check ────────────────────────────────────────────────────────
    // Our UI oval: centre (0.5, 0.40), rx=0.36, ry=0.497 (in normalised coords)
    // Front camera is mirrored, but bounding box coords are in the raw image space.
    const faceCX = (box.Left ?? 0) + (box.Width ?? 0) / 2;
    const faceCY = (box.Top  ?? 0) + (box.Height ?? 0) / 2;
    const ovalCX = 0.50, ovalCY = 0.40, rx = 0.38, ry = 0.50;
    const ellipseVal = Math.pow((faceCX - ovalCX) / rx, 2) + Math.pow((faceCY - ovalCY) / ry, 2);
    const sizeOk     = (box.Width ?? 0) > 0.25 && (box.Width ?? 0) < 0.85;
    const in_boundary = ellipseVal <= 1.3 && sizeOk;

    return {
        face_detected:          true,
        face_count:             1,
        in_boundary,
        confidence:             Number(face.Confidence ?? 0),

        // Bounding box (0-1 normalised)
        bounding_box: {
            left:   box.Left   ?? 0,
            top:    box.Top    ?? 0,
            width:  box.Width  ?? 0,
            height: box.Height ?? 0,
        },

        // Eyes
        eyes_open:             face.EyesOpen?.Value   ?? true,
        eyes_open_confidence:  face.EyesOpen?.Confidence ?? 0,

        // Head pose  (degrees)
        pose_yaw:   face.Pose?.Yaw   ?? 0,   // left/right rotation
        pose_pitch: face.Pose?.Pitch ?? 0,   // up/down tilt
        pose_roll:  face.Pose?.Roll  ?? 0,   // tilt

        // Smile
        smile:             face.Smile?.Value      ?? false,
        smile_confidence:  face.Smile?.Confidence ?? 0,

        // Quality flags
        sunglasses:         face.Sunglasses?.Value    ?? false,
        face_occluded:      face.FaceOccluded?.Value  ?? false,
        mouth_open:         face.MouthOpen?.Value     ?? false,

        // Gender (for final decision step)
        gender:             face.Gender?.Value      ?? null,
        gender_confidence:  face.Gender?.Confidence ?? 0,
    };
}

module.exports = { verifyDriverSelfie, analyzeFrame };


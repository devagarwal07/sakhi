'use strict';

const {
    RekognitionClient,
    CreateFaceLivenessSessionCommand,
    GetFaceLivenessSessionResultsCommand,
    DetectFacesCommand,
} = require('@aws-sdk/client-rekognition');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

const supabase = require('../config/supabase');
const logger = require('../utils/logger');
const { s3 } = require('../middleware/upload');

const rekognition = new RekognitionClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

function envNumber(name, fallback) {
    const v = Number(process.env[name]);
    return Number.isFinite(v) ? v : fallback;
}

function envInt(name, fallback) {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

function s3PublicUrlForKey(key) {
    const region = process.env.AWS_REGION;
    const bucket = process.env.AWS_S3_BUCKET;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function mapRekognitionGender(value) {
    if (value === 'Female') return 'F';
    if (value === 'Male') return 'M';
    return 'unknown';
}

function isMissingColumnOrRelationError(sbError) {
    const code = sbError?.code;
    const msg = String(sbError?.message || '');
    // Postgres: 42703 undefined_column, 42P01 undefined_table
    return code === '42703' || code === '42P01' || /does not exist/i.test(msg);
}

async function getUserFaceState(userId) {
    const { data, error } = await supabase
        .from('users')
        .select('verification_status, face_verification_attempts, face_review_required, face_decision_reason, face_liveness_session_id')
        .eq('id', userId)
        .limit(1);

    if (error) {
        logger.error(`faceLivenessService.getUserFaceState — DB error: ${error.message || 'unknown error'}`);

        // Most common cause in fresh DBs: migration not applied, so face_* columns don't exist.
        if (isMissingColumnOrRelationError(error)) {
            throw Object.assign(
                new Error(
                    'Face verification schema is missing in the database. Apply migration backend/migrations/20260508_rider_face_liveness_onboarding.sql in Supabase.'
                ),
                { code: 'MIGRATION_REQUIRED', status: 500 }
            );
        }

        throw Object.assign(new Error('Failed to load user'), { code: 'DB_ERROR', status: 500 });
    }

    const row = data?.[0];
    if (!row) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND', status: 404 });

    return {
        verificationStatus: row.verification_status,
        attempts: row.face_verification_attempts ?? 0,
        faceReviewRequired: !!row.face_review_required,
        faceDecisionReason: row.face_decision_reason,
        currentSessionId: row.face_liveness_session_id,
    };
}

async function uploadReferenceImageToS3(userId, sessionId, bytes) {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
        throw Object.assign(new Error('AWS_S3_BUCKET is not configured'), { code: 'CONFIG_ERROR', status: 500 });
    }

    const safeSession = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `verifications/${userId}/liveness_reference_${safeSession || Date.now()}.jpg`;

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: Buffer.from(bytes),
            ContentType: 'image/jpeg',
        })
    );

    return { key, url: s3PublicUrlForKey(key) };
}

/**
 * createSession
 * Creates a Rekognition Face Liveness SessionId for the rider.
 * NOTE: The mobile client must use AWS's FaceLivenessDetector (native) and
 * short-lived AWS credentials (typically via Cognito Identity Pool) to run the capture.
 */
async function createSession(userId) {
    const maxAttempts = envInt('FACE_VERIFICATION_MAX_ATTEMPTS', 3);

    const { verificationStatus, attempts, faceReviewRequired, faceDecisionReason } = await getUserFaceState(userId);

    if (verificationStatus === 'approved') {
        throw Object.assign(new Error('User is already verified'), { code: 'ALREADY_VERIFIED', status: 409 });
    }

    if (verificationStatus === 'rejected' && faceDecisionReason === 'rejected_not_eligible') {
        throw Object.assign(new Error('User is not eligible'), { code: 'NOT_ELIGIBLE', status: 403 });
    }

    if (faceReviewRequired) {
        // face_review_required=true in DB — admin must reset via PATCH /admin/users/:id/face-reset
        logger.warn('faceLivenessService.createSession — blocked: face_review_required=true', { userId });
        throw Object.assign(new Error('Manual review is pending for this account'), { code: 'MANUAL_REVIEW_REQUIRED', status: 403 });
    }

    if (attempts >= maxAttempts) {
        await supabase
            .from('users')
            .update({ face_review_required: true, verification_status: 'pending', verification_method: 'face_liveness' })
            .eq('id', userId);

        logger.warn('faceLivenessService.createSession — blocked: max attempts reached', { userId, attempts, maxAttempts });
        throw Object.assign(new Error(`Max attempts (${maxAttempts}) reached; manual review required`), {
            code: 'MANUAL_REVIEW_REQUIRED',
            status: 403,
        });
    }

    let sessionId;
    try {
        const resp = await rekognition.send(new CreateFaceLivenessSessionCommand({}));
        sessionId = resp?.SessionId;
    } catch (err) {
        logger.error('faceLivenessService.createSession — Rekognition error', { error: err.message });
        throw Object.assign(new Error('Failed to start liveness session'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    if (!sessionId) {
        throw Object.assign(new Error('Failed to start liveness session'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    const attemptNo = attempts + 1;

    const { error: updErr } = await supabase
        .from('users')
        .update({
            face_verification_attempts: attemptNo,
            face_review_required: false,
            face_liveness_session_id: sessionId,
            face_liveness_confidence: null,
            face_gender: null,
            face_gender_confidence: null,
            face_reference_photo_url: null,
            face_decision_reason: null,
            face_reviewed_by: null,
            face_reviewed_at: null,
            verification_status: 'pending',
            verification_method: 'face_liveness',
            gender_verified: false,
        })
        .eq('id', userId);

    if (updErr) {
        logger.error('faceLivenessService.createSession — DB update error', { error: updErr });
        throw Object.assign(new Error('Failed to persist liveness session'), { code: 'DB_ERROR', status: 500 });
    }

    return {
        session_id: sessionId,
        attempt: attemptNo,
        max_attempts: maxAttempts,
        region: process.env.AWS_REGION,
    };
}

/**
 * completeSession
 * Fetches the liveness result + runs Rekognition gender attribute on the reference image.
 * Returns: approved | rejected | retry | manual_review
 */
async function completeSession(userId, sessionId) {
    const maxAttempts = envInt('FACE_VERIFICATION_MAX_ATTEMPTS', 3);
    // Rekognition confidences are on a 0..100 scale.
    const minLiveness = envNumber('FACE_LIVENESS_MIN_CONFIDENCE', 95);
    const minGender = envNumber('FACE_GENDER_MIN_CONFIDENCE', 90);

    const { attempts, currentSessionId } = await getUserFaceState(userId);

    if (!sessionId) {
        throw Object.assign(new Error('session_id is required'), { code: 'VALIDATION_ERROR', status: 422 });
    }

    if (currentSessionId && String(currentSessionId) !== String(sessionId)) {
        throw Object.assign(new Error('Invalid session_id'), { code: 'INVALID_SESSION', status: 403 });
    }

    let result;
    try {
        result = await rekognition.send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
    } catch (err) {
        logger.error('faceLivenessService.completeSession — Rekognition error', { error: err.message, sessionId });
        throw Object.assign(new Error('Failed to fetch liveness results'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    const livenessConfidence = Number(result?.Confidence ?? 0);
    const referenceBytes = result?.ReferenceImage?.Bytes;

    let referencePhotoUrl = null;
    if (referenceBytes) {
        try {
            const uploaded = await uploadReferenceImageToS3(userId, sessionId, referenceBytes);
            referencePhotoUrl = uploaded.url;
        } catch (err) {
            logger.error('faceLivenessService.completeSession — reference upload failed', { error: err.message });
            // Non-fatal: manual review image might be missing, but we can still decide.
        }
    }

    const retryRemaining = Math.max(0, maxAttempts - attempts);

    // 1) Liveness decision
    if (!Number.isFinite(livenessConfidence) || livenessConfidence < minLiveness) {
        const shouldRetry = attempts < maxAttempts;
        const update = {
            face_liveness_confidence: Number.isFinite(livenessConfidence) ? livenessConfidence : null,
            face_reference_photo_url: referencePhotoUrl,
            face_decision_reason: 'liveness_low_confidence',
            verification_status: 'pending',
            verification_method: 'face_liveness',
            gender_verified: false,
            face_review_required: !shouldRetry,
        };

        await supabase.from('users').update(update).eq('id', userId);

        return {
            status: shouldRetry ? 'retry' : 'manual_review',
            reason: 'liveness_low_confidence',
            liveness_confidence: livenessConfidence,
            attempts_used: attempts,
            max_attempts: maxAttempts,
            retry_remaining: shouldRetry ? retryRemaining : 0,
        };
    }

    // 2) Gender attribute (Rekognition DetectFaces)
    let gender = 'unknown';
    let genderConfidence = 0;

    if (referenceBytes) {
        try {
            const detect = await rekognition.send(
                new DetectFacesCommand({
                    Image: { Bytes: referenceBytes },
                    Attributes: ['ALL'],
                })
            );
            const g = detect?.FaceDetails?.[0]?.Gender;
            gender = mapRekognitionGender(g?.Value);
            genderConfidence = Number(g?.Confidence ?? 0);
        } catch (err) {
            logger.error('faceLivenessService.completeSession — DetectFaces error', { error: err.message });
            gender = 'unknown';
            genderConfidence = 0;
        }
    }

    const isFemaleHigh = gender === 'F' && genderConfidence >= minGender;
    const isMaleHigh = gender === 'M' && genderConfidence >= minGender;

    if (isFemaleHigh) {
        const { error } = await supabase
            .from('users')
            .update({
                gender_verified: true,
                verification_status: 'approved',
                verification_method: 'face_liveness',
                face_review_required: false,
                face_liveness_session_id: sessionId,
                face_liveness_confidence: livenessConfidence,
                face_gender: gender,
                face_gender_confidence: genderConfidence,
                face_reference_photo_url: referencePhotoUrl,
                face_decision_reason: 'approved_female',
            })
            .eq('id', userId);

        if (error) {
            logger.error('faceLivenessService.completeSession — DB approve error', { error });
            throw Object.assign(new Error('Failed to update verification status'), { code: 'DB_ERROR', status: 500 });
        }

        return {
            status: 'approved',
            liveness_confidence: livenessConfidence,
            gender,
            gender_confidence: genderConfidence,
        };
    }

    if (isMaleHigh) {
        await supabase
            .from('users')
            .update({
                gender_verified: false,
                verification_status: 'rejected',
                verification_method: 'face_liveness',
                face_review_required: false,
                face_liveness_session_id: sessionId,
                face_liveness_confidence: livenessConfidence,
                face_gender: gender,
                face_gender_confidence: genderConfidence,
                face_reference_photo_url: referencePhotoUrl,
                face_decision_reason: 'rejected_not_eligible',
            })
            .eq('id', userId);

        return {
            status: 'rejected',
            reason: 'not_eligible',
            liveness_confidence: livenessConfidence,
            gender,
            gender_confidence: genderConfidence,
        };
    }

    // 3) Low-confidence gender → retry up to max attempts, else manual review
    const shouldRetry = attempts < maxAttempts;
    await supabase
        .from('users')
        .update({
            gender_verified: false,
            verification_status: 'pending',
            verification_method: 'face_liveness',
            face_review_required: !shouldRetry,
            face_liveness_session_id: sessionId,
            face_liveness_confidence: livenessConfidence,
            face_gender: gender,
            face_gender_confidence: genderConfidence,
            face_reference_photo_url: referencePhotoUrl,
            face_decision_reason: 'gender_low_confidence',
        })
        .eq('id', userId);

    return {
        status: shouldRetry ? 'retry' : 'manual_review',
        reason: 'gender_low_confidence',
        liveness_confidence: livenessConfidence,
        gender,
        gender_confidence: genderConfidence,
        attempts_used: attempts,
        max_attempts: maxAttempts,
        retry_remaining: shouldRetry ? retryRemaining : 0,
    };
}

/**
 * verifyFacePhoto
 * Photo-only gender check — no streaming challenge.
 * Takes a base64 JPEG/PNG, calls DetectFaces, checks gender,
 * then updates the user's verification status accordingly.
 *
 * Returns: { status: 'approved' | 'rejected' | 'retry' | 'manual_review', ... }
 */
async function verifyFacePhoto(userId, imageBase64) {
    const maxAttempts = envInt('FACE_VERIFICATION_MAX_ATTEMPTS', 5);
    const minGender   = envNumber('FACE_GENDER_MIN_CONFIDENCE', 90);

    const { verificationStatus, attempts, faceDecisionReason } = await getUserFaceState(userId);

    if (verificationStatus === 'approved') {
        throw Object.assign(new Error('User is already verified'), { code: 'ALREADY_VERIFIED', status: 409 });
    }

    if (verificationStatus === 'rejected' && faceDecisionReason === 'rejected_not_eligible') {
        throw Object.assign(new Error('User is not eligible'), { code: 'NOT_ELIGIBLE', status: 403 });
    }

    if (attempts >= maxAttempts) {
        await supabase
            .from('users')
            .update({ face_review_required: true, verification_status: 'pending', verification_method: 'face_photo' })
            .eq('id', userId);
        throw Object.assign(
            new Error(`Max attempts (${maxAttempts}) reached; manual review required`),
            { code: 'MANUAL_REVIEW_REQUIRED', status: 403 }
        );
    }

    // Decode base64 → Buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBytes = Buffer.from(base64Data, 'base64');

    const attemptNo = attempts + 1;

    // Persist attempt increment immediately
    await supabase
        .from('users')
        .update({
            face_verification_attempts: attemptNo,
            verification_method: 'face_photo',
            verification_status: 'pending',
            gender_verified: false,
            face_decision_reason: null,
        })
        .eq('id', userId);

    // ── Upload reference photo to S3 ──────────────────────────────────────
    let referencePhotoUrl = null;
    try {
        const key = `verifications/${userId}/face_photo_${Date.now()}.jpg`;
        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: imageBytes,
            ContentType: 'image/jpeg',
        }));
        referencePhotoUrl = s3PublicUrlForKey(key);
    } catch (err) {
        logger.error('verifyFacePhoto — S3 upload failed (non-fatal)', { error: err.message });
    }

    // ── AWS DetectFaces ───────────────────────────────────────────────────
    let gender = 'unknown';
    let genderConfidence = 0;
    let faceCount = 0;

    try {
        const detect = await rekognition.send(
            new DetectFacesCommand({
                Image: { Bytes: imageBytes },
                Attributes: ['ALL'],
            })
        );
        faceCount = detect?.FaceDetails?.length ?? 0;
        const g = detect?.FaceDetails?.[0]?.Gender;
        gender = mapRekognitionGender(g?.Value);
        genderConfidence = Number(g?.Confidence ?? 0);
    } catch (err) {
        logger.error('verifyFacePhoto — DetectFaces error', { error: err.message });
        throw Object.assign(new Error('Failed to analyse image. Please try again.'), { code: 'REKOGNITION_ERROR', status: 502 });
    }

    // No face detected
    if (faceCount === 0) {
        await supabase.from('users').update({
            face_decision_reason: 'no_face_detected',
            face_reference_photo_url: referencePhotoUrl,
        }).eq('id', userId);
        return {
            status: 'retry',
            reason: 'no_face_detected',
            attempts_used: attemptNo,
            max_attempts: maxAttempts,
        };
    }

    // Multiple faces
    if (faceCount > 1) {
        await supabase.from('users').update({
            face_decision_reason: 'multiple_faces',
            face_reference_photo_url: referencePhotoUrl,
        }).eq('id', userId);
        return {
            status: 'retry',
            reason: 'multiple_faces',
            attempts_used: attemptNo,
            max_attempts: maxAttempts,
        };
    }

    const isFemaleHigh = gender === 'F' && genderConfidence >= minGender;
    const isMaleHigh   = gender === 'M' && genderConfidence >= minGender;

    if (isFemaleHigh) {
        await supabase.from('users').update({
            gender_verified: true,
            verification_status: 'approved',
            verification_method: 'face_photo',
            face_review_required: false,
            face_gender: gender,
            face_gender_confidence: genderConfidence,
            face_reference_photo_url: referencePhotoUrl,
            face_decision_reason: 'approved_female',
        }).eq('id', userId);
        return { status: 'approved', gender, gender_confidence: genderConfidence };
    }

    if (isMaleHigh) {
        await supabase.from('users').update({
            gender_verified: false,
            verification_status: 'rejected',
            verification_method: 'face_photo',
            face_review_required: false,
            face_gender: gender,
            face_gender_confidence: genderConfidence,
            face_reference_photo_url: referencePhotoUrl,
            face_decision_reason: 'rejected_not_eligible',
        }).eq('id', userId);
        return { status: 'rejected', reason: 'not_eligible', gender, gender_confidence: genderConfidence };
    }

    // Low-confidence gender → retry
    const shouldRetry = attemptNo < maxAttempts;
    await supabase.from('users').update({
        gender_verified: false,
        verification_status: 'pending',
        verification_method: 'face_photo',
        face_review_required: !shouldRetry,
        face_gender: gender,
        face_gender_confidence: genderConfidence,
        face_reference_photo_url: referencePhotoUrl,
        face_decision_reason: 'gender_low_confidence',
    }).eq('id', userId);

    return {
        status: shouldRetry ? 'retry' : 'manual_review',
        reason: 'gender_low_confidence',
        gender,
        gender_confidence: genderConfidence,
        attempts_used: attemptNo,
        max_attempts: maxAttempts,
    };
}

module.exports = { createSession, completeSession, verifyFacePhoto };

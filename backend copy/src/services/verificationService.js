'use strict';

const axios = require('axios');
const { RekognitionClient, CompareFacesCommand } = require('@aws-sdk/client-rekognition');
const supabase = require('../config/supabase');
const fcmService = require('./fcmService');
const logger = require('../utils/logger');

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Shared: check Aadhaar gender via Sandbox.co.in API.
 * TODO: Extract aadhaar number from image via OCR; for now accepts aadhaarNumber param.
 * Returns 'F', 'M', or 'unknown'.
 */
async function checkAadhaarGender(aadhaarNumber) {
  // TODO: integrate real OCR (e.g. AWS Textract) to extract aadhaar number from image
  // For now, this calls Sandbox.co.in with a provided/extracted number
  if (!aadhaarNumber) return 'unknown';

  try {
    const response = await axios.post(
      'https://api.sandbox.co.in/kyc/aadhaar/okyc/otp',
      { '@entity': 'in.co.sandbox.kyc.aadhaar.okyc.otp.request', aadhaar_number: aadhaarNumber },
      {
        headers: {
          Authorization: process.env.SANDBOX_API_KEY || '',
          'x-api-version': '1.0',
          'Content-Type': 'application/json',
        },
      }
    );
    const gender = response.data?.data?.gender;
    return gender || 'unknown';
  } catch (err) {
    logger.error('verificationService.checkAadhaarGender — API error', { error: err?.response?.data || err.message });
    return 'unknown';
  }
}

/**
 * Apply gender verification result to the users record.
 * Returns the final verification_status.
 */
async function applyGenderResult(userId, gender, method, extraFields = {}) {
  const genderVerified = gender === 'F';
  const verificationStatus = genderVerified ? 'approved' : 'rejected';

  const { error } = await supabase
    .from('users')
    .update({
      gender_verified: genderVerified,
      verification_status: verificationStatus,
      verification_method: method,
      ...extraFields,
    })
    .eq('id', userId);

  if (error) {
    logger.error('verificationService.applyGenderResult — DB error', { error });
    throw Object.assign(new Error('Failed to update verification status'), { code: 'DB_ERROR', status: 500 });
  }

  return verificationStatus;
}

// ──────────────────────────────────────────────────────────────────────────────
// RIDER: Aadhaar Upload Verification
// ──────────────────────────────────────────────────────────────────────────────

/**
 * verifyAadhaarUpload
 * Called after multer-s3 has uploaded aadhaar front + back to S3.
 * req.files has { front: [{ location }], back: [{ location }] }
 */
async function verifyAadhaarUpload(userId, files) {
  const frontUrl = files?.front?.[0]?.location;
  const backUrl = files?.back?.[0]?.location;

  if (!frontUrl || !backUrl) {
    throw Object.assign(new Error('Both front and back Aadhaar images are required.'), {
      code: 'MISSING_FILES',
      status: 422,
    });
  }

  // 1 & 2 — Save S3 URLs + set initial status
  await supabase
    .from('users')
    .update({
      aadhaar_front_url: frontUrl,
      aadhaar_back_url: backUrl,
      verification_method: 'aadhaar',
      verification_status: 'pending',
    })
    .eq('id', userId);

  // 3 — Check gender via Aadhaar API (stub: no aadhaar number extracted yet)
  // TODO: use OCR to extract aadhaar number from the uploaded front image
  const gender = await checkAadhaarGender(null);

  // 4 — Apply result
  const status = await applyGenderResult(userId, gender, 'aadhaar');

  // 5 — FCM notification
  const title = status === 'approved' ? 'Verification Approved ✅' : 'Verification Rejected';
  const body =
    status === 'approved'
      ? 'Your Aadhaar gender verification was successful. You can now book rides!'
      : 'We could not verify your gender via Aadhaar. Please try facial verification.';

  await fcmService.sendToUser(userId, 'rider', { title, body, data: { type: 'GENDER_VERIFIED' } });

  logger.info('verificationService.verifyAadhaarUpload — done', { userId, status });
  return { status };
}

// ──────────────────────────────────────────────────────────────────────────────
// RIDER: Facial Verification
// ──────────────────────────────────────────────────────────────────────────────

/**
 * verifyFacial
 * Called after multer-s3 uploads selfie to S3.
 * req.file has { location, key } (from multer-s3 single)
 */
async function verifyFacial(userId, selfieFile) {
  const selfieUrl = selfieFile?.location;
  const selfieKey = selfieFile?.key;

  if (!selfieKey) {
    throw Object.assign(new Error('Selfie file is required.'), { code: 'MISSING_FILE', status: 422 });
  }

  // Fetch user to get aadhaar_front_url
  const { data: users } = await supabase.from('users').select('aadhaar_front_url').eq('id', userId).limit(1);
  const aadhaarFrontUrl = users?.[0]?.aadhaar_front_url;

  if (!aadhaarFrontUrl) {
    throw Object.assign(new Error('Please upload your Aadhaar card first before facial verification.'), {
      code: 'AADHAAR_NOT_UPLOADED',
      status: 400,
    });
  }

  // Extract S3 key from aadhaar_front_url (format: https://bucket.s3.region.amazonaws.com/key)
  const aadhaarKey = new URL(aadhaarFrontUrl).pathname.slice(1);

  // 1 — Save selfie URL
  await supabase.from('users').update({ verification_method: 'facial' }).eq('id', userId);

  // 2 — Rekognition CompareFaces
  let similarity = 0;
  try {
    const command = new CompareFacesCommand({
      SourceImage: { S3Object: { Bucket: process.env.AWS_S3_BUCKET, Name: selfieKey } },
      TargetImage: { S3Object: { Bucket: process.env.AWS_S3_BUCKET, Name: aadhaarKey } },
      SimilarityThreshold: 70, // we check >= 80 in JS
    });
    const result = await rekognition.send(command);
    similarity = result.FaceMatches?.[0]?.Similarity ?? 0;
  } catch (err) {
    logger.error('verificationService.verifyFacial — Rekognition error', { error: err.message });
    throw Object.assign(new Error('Face comparison failed. Please try again.'), { code: 'REKOGNITION_ERROR', status: 500 });
  }

  // 3 — Similarity check
  if (similarity < 80) {
    await supabase
      .from('users')
      .update({ verification_status: 'rejected', verification_method: 'facial' })
      .eq('id', userId);

    await fcmService.sendToUser(userId, 'rider', {
      title: 'Facial Verification Failed',
      body: 'Your selfie did not match your Aadhaar photo. Please try again.',
      data: { type: 'GENDER_REJECTED' },
    });

    return { status: 'rejected', reason: 'face_mismatch' };
  }

  // 4 — Face matched: run gender check
  const gender = await checkAadhaarGender(null); // TODO: extract from aadhaar image

  const status = await applyGenderResult(userId, gender, 'facial');

  await fcmService.sendToUser(userId, 'rider', {
    title: status === 'approved' ? 'Verification Approved ✅' : 'Verification Rejected',
    body:
      status === 'approved'
        ? 'Your facial verification was successful. You can now book rides!'
        : 'We could not confirm your gender. Please contact support.',
    data: { type: status === 'approved' ? 'GENDER_VERIFIED' : 'GENDER_REJECTED' },
  });

  logger.info('verificationService.verifyFacial — done', { userId, similarity, status });
  return { status };
}

module.exports = { verifyAadhaarUpload, verifyFacial };

'use strict';

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('../utils/logger');

const s3 = new S3Client({
  region:      process.env.AWS_REGION      || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

/**
 * Generate a pre-signed GET URL for a private S3 object.
 * All driver/rider document access must go through this.
 *
 * @param {string} key       - S3 object key (e.g. "drivers/uuid/kyc/dl.jpg")
 * @param {number} expiresIn - Expiry in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} Pre-signed URL
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  if (!BUCKET) {
    logger.warn('s3Service.getPresignedUrl — AWS_S3_BUCKET not configured');
    throw Object.assign(new Error('S3 not configured'), { code: 'S3_NOT_CONFIGURED', status: 503 });
  }

  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}

/**
 * Extract the S3 key from a full S3 URL.
 * e.g. https://bucket.s3.region.amazonaws.com/drivers/id/kyc/dl.jpg → "drivers/id/kyc/dl.jpg"
 *
 * @param {string} url - Full S3 URL (as stored in DB)
 * @returns {string|null}
 */
function extractKeyFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\//, ''); // strip leading slash
  } catch {
    return null;
  }
}

/**
 * Given a record with S3 URL fields, replace them with pre-signed URLs.
 * Fields checked: dl_url, rc_url, insurance_url, aadhaar_url,
 *                 aadhaar_front_url, aadhaar_back_url, profile_photo_url.
 *
 * @param {object} record - DB row object
 * @param {number} expiresIn
 * @returns {Promise<object>} Record with presigned URLs
 */
async function presignRecord(record, expiresIn = 3600) {
  const S3_URL_FIELDS = [
    'dl_url', 'rc_url', 'insurance_url', 'aadhaar_url',
    'aadhaar_front_url', 'aadhaar_back_url', 'profile_photo_url',
  ];

  const result = { ...record };

  await Promise.all(
    S3_URL_FIELDS.map(async (field) => {
      if (!result[field]) return;
      const key = extractKeyFromUrl(result[field]);
      if (!key) return;
      try {
        result[field] = await getPresignedUrl(key, expiresIn);
      } catch {
        // Leave original URL if presigning fails
      }
    })
  );

  return result;
}

module.exports = { getPresignedUrl, extractKeyFromUrl, presignRecord };

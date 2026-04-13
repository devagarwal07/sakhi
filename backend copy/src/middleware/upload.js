'use strict';

const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

// ── S3 Client ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── File filter: only JPEG & PNG ──────────────────────────────────────────────
function imageFilter(_req, file, cb) {
  if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPEG and PNG files are allowed.'), { code: 'INVALID_FILE_TYPE', status: 422 }));
  }
}

// ── Helper: build a multer-s3 upload instance ─────────────────────────────────
function createS3Upload(keyFn) {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata(_req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: keyFn,
    }),
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });
}

// ── Export the S3 client so services can reuse it ────────────────────────────
module.exports.s3 = s3;

// ── uploadAadhaar — fields: front, back ───────────────────────────────────────
module.exports.uploadAadhaar = createS3Upload((req, file, cb) => {
  const userId = req.user.userId;
  const name = file.fieldname === 'front' ? 'aadhaar_front.jpg' : 'aadhaar_back.jpg';
  cb(null, `verifications/${userId}/${name}`);
}).fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 },
]);

// ── uploadSelfie — single field: selfie ───────────────────────────────────────
module.exports.uploadSelfie = createS3Upload((req, _file, cb) => {
  cb(null, `verifications/${req.user.userId}/selfie.jpg`);
}).single('selfie');

// ── uploadDriverDocs — fields: dl, rc, insurance, aadhaar, profile_photo ─────
module.exports.uploadDriverDocs = createS3Upload((req, file, cb) => {
  const driverId = req.user.userId;
  const nameMap = {
    dl: 'dl.jpg',
    rc: 'rc.jpg',
    insurance: 'insurance.jpg',
    aadhaar: 'aadhaar.jpg',
    profile_photo: 'profile.jpg',
  };
  const fileName = nameMap[file.fieldname] || `${file.fieldname}.jpg`;
  cb(null, `drivers/${driverId}/kyc/${fileName}`);
}).fields([
  { name: 'dl', maxCount: 1 },
  { name: 'rc', maxCount: 1 },
  { name: 'insurance', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'profile_photo', maxCount: 1 },
]);

'use strict';

const { STSClient, GetSessionTokenCommand } = require('@aws-sdk/client-sts');
const logger = require('../utils/logger');

const sts = new STSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

function envInt(name, fallback) {
    const v = parseInt(process.env[name] || '', 10);
    return Number.isFinite(v) ? v : fallback;
}

/**
 * Issues short-lived AWS credentials using GetSessionToken.
 * No IAM role or trust policy needed — just requires the IAM user
 * (AWS_ACCESS_KEY_ID) to have rekognitionstreaming:StartFaceLivenessSession.
 *
 * Simpler than AssumeRole: no FACE_LIVENESS_ROLE_ARN required.
 */
async function getStreamingCredentials(_userId) {
    const durationSeconds = Math.min(129600, Math.max(900,
        envInt('FACE_LIVENESS_STS_DURATION_SECONDS', 900)
    ));

    try {
        const resp = await sts.send(
            new GetSessionTokenCommand({ DurationSeconds: durationSeconds })
        );

        const c = resp?.Credentials;
        if (!c?.AccessKeyId || !c?.SecretAccessKey || !c?.SessionToken) {
            throw new Error('STS GetSessionToken did not return complete credentials');
        }

        return {
            accessKeyId:     c.AccessKeyId,
            secretAccessKey: c.SecretAccessKey,
            sessionToken:    c.SessionToken,
            expiration:      c.Expiration,
        };
    } catch (err) {
        logger.error('faceLivenessCredentialsService — GetSessionToken error', { error: err.message });
        throw Object.assign(
            new Error(`STS error: ${err.message}`),
            { code: 'STS_ERROR', status: 502 }
        );
    }
}

module.exports = { getStreamingCredentials };

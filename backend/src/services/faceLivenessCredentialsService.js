'use strict';

const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
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
 * Issues short-lived AWS credentials for Rekognition Streaming.
 * These are used by the FaceLivenessDetectorCore web client to call
 * rekognitionstreaming:StartFaceLivenessSession.
 */
async function getStreamingCredentials(userId) {
    const roleArn = process.env.FACE_LIVENESS_ROLE_ARN;
    if (!roleArn) {
        throw Object.assign(new Error('FACE_LIVENESS_ROLE_ARN is not configured'), { code: 'CONFIG_ERROR', status: 500 });
    }

    const durationSeconds = Math.min(3600, Math.max(900, envInt('FACE_LIVENESS_STS_DURATION_SECONDS', 900)));

    // Restrict token to only the action needed for client-side streaming.
    const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: ['rekognitionstreaming:StartFaceLivenessSession'],
                Resource: '*',
            },
        ],
    });

    try {
        const resp = await sts.send(
            new AssumeRoleCommand({
                RoleArn: roleArn,
                RoleSessionName: `sakhi-liveness-${String(userId).slice(0, 8)}-${Date.now()}`,
                DurationSeconds: durationSeconds,
                Policy: policy,
            })
        );

        const c = resp?.Credentials;
        if (!c?.AccessKeyId || !c?.SecretAccessKey || !c?.SessionToken) {
            throw new Error('STS did not return complete credentials');
        }

        return {
            accessKeyId: c.AccessKeyId,
            secretAccessKey: c.SecretAccessKey,
            sessionToken: c.SessionToken,
            expiration: c.Expiration,
        };
    } catch (err) {
        logger.error('faceLivenessCredentialsService.getStreamingCredentials — STS error', { error: err.message });
        throw Object.assign(new Error('Failed to issue temporary credentials'), { code: 'STS_ERROR', status: 502 });
    }
}

module.exports = { getStreamingCredentials };

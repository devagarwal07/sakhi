import React, { useMemo, useState, useEffect } from 'react';
import { FaceLivenessDetectorCore } from '@aws-amplify/ui-react-liveness';

function parseQuery() {
    const g = window.__SAKHI_SESSION__ || {};
    const params = new URLSearchParams(window.location.search);
    return {
        sessionId: g.sessionId || params.get('sessionId') || params.get('session_id') || '',
        region:    g.region    || params.get('region')    || '',
    };
}

function postToNative(payload) {
    try {
        window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
    } catch {
        // no-op
    }
}

function formatUnknownError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && err.state) {
        const inner = err.error?.message || String(err.error || '');
        return `${err.state}${inner ? ': ' + inner : ''}`;
    }
    if (err instanceof Error) return err.message || String(err);
    try { return JSON.stringify(err, null, 2); } catch { return String(err); }
}

const SAKHI_TOKEN = (() => {
    try {
        if (window.__SAKHI_SESSION__?.token) return window.__SAKHI_SESSION__.token;
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        return params.get('token') || '';
    } catch {
        return '';
    }
})();

/* ── Custom start screen ────────────────────────────────── */
function SakhiStartScreen({ beginLivenessCheck }) {
    const steps = [
        { icon: '💡', text: 'Find good lighting — face the light source' },
        { icon: '📱', text: 'Hold phone at eye level, arm\'s length away' },
        { icon: '👤', text: 'Center your face in the oval' },
        { icon: '🌀', text: 'Follow the on-screen prompts' },
    ];
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            minHeight: '100vh', background: '#0a0a0a',
            padding: '32px 24px', boxSizing: 'border-box',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#9B59B6,#7D3C98)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: 32,
                    boxShadow: '0 8px 24px rgba(155,89,182,0.4)',
                }}>
                    🛡️
                </div>
                <h2 style={{ color: '#fff', margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>
                    Face Verification
                </h2>
                <p style={{ color: '#888', margin: 0, fontSize: 13 }}>
                    Quick scan to verify your identity
                </p>
            </div>

            {/* Steps */}
            <div style={{
                background: '#161616', borderRadius: 14,
                border: '1px solid #2a2a2a', padding: '20px 18px',
                marginBottom: 28,
            }}>
                <p style={{ color: '#9B59B6', fontSize: 11, fontWeight: 600, margin: '0 0 14px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Before you start
                </p>
                {steps.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                        <span style={{ color: '#ccc', fontSize: 13, lineHeight: 1.4 }}>{s.text}</span>
                    </div>
                ))}
            </div>

            {/* Note */}
            <div style={{
                background: 'rgba(155,89,182,0.08)', borderRadius: 10,
                border: '1px solid rgba(155,89,182,0.2)', padding: '12px 16px',
                marginBottom: 32,
            }}>
                <p style={{ color: '#bbb', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    ⚡ The scan takes about <strong style={{ color: '#9B59B6' }}>5–10 seconds</strong>. 
                    Keep your face steady. Screen will flash briefly — this is normal.
                </p>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 'auto' }}>
                <button
                    onClick={beginLivenessCheck}
                    style={{
                        width: '100%', padding: '16px',
                        background: 'linear-gradient(135deg,#9B59B6,#7D3C98)',
                        border: 'none', borderRadius: 14, cursor: 'pointer',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        boxShadow: '0 6px 20px rgba(155,89,182,0.4)',
                        letterSpacing: 0.3,
                    }}
                >
                    Begin Face Scan
                </button>
                <p style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
                    Secured by AWS Rekognition
                </p>
            </div>
        </div>
    );
}

/* ── Custom instructions displayed during the scan ──────── */
const DISPLAY_TEXT = {
    startScreenBeginCheckText:         'Begin Face Scan',
    hintMoveFaceFrontOfCameraText:     'Center your face in the oval',
    hintTooManyFacesText:              'Only one face should be visible',
    hintFaceDetectedText:              'Face detected — hold steady',
    hintCanNotIdentifyText:            'Face not found — move closer',
    hintTooCloseText:                  'Too close — move back a little',
    hintTooFarText:                    'Move closer to the camera',
    hintConnectingText:                'Connecting…',
    hintVerifyingText:                 'Verifying your face…',
    hintCheckCompleteText:             'Check complete ✓',
    hintIlluminationTooBrightText:     'Too bright — find softer light',
    hintIlluminationTooDarkText:       'Too dark — move to better light',
    hintIlluminationNormalText:        'Lighting looks good',
    hintHoldFaceForFreshnessText:      'Hold still — scanning…',
    photosensitivityWarningHeadingText:'Flashing light notice',
    photosensitivityWarningBodyText:   'The scan uses brief light flashes. If you are sensitive to flashing lights, please ask someone to assist you.',
    photosensitivityWarningInfoText:   'Cover your camera to skip the flash if needed.',
    photosensitivityWarningLabelText:  'Photosensitivity warning',
    cancelLivenessCheckText:           'Cancel',
    recordingIndicatorText:            'Recording',
    goodFitCaptionText:                'Good fit',
    tooFarCaptionText:                 'Too far',
};

/* ── Main App ────────────────────────────────────────────── */
export default function App() {
    const { sessionId, region } = useMemo(parseQuery, []);
    const [fatalError, setFatalError] = useState('');

    useEffect(() => {
        postToNative({ type: 'react_mounted' });
        postToNative({ type: 'debug', message: `sid=${sessionId?.slice(0,8)} reg=${region} tok=${!!SAKHI_TOKEN}` });
    }, []);

    const credentialProvider = async () => {
        const resp = await fetch('/auth/verify/face-liveness/credentials', {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...(SAKHI_TOKEN ? { Authorization: `Bearer ${SAKHI_TOKEN}` } : {}),
            },
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`Credentials error (${resp.status}): ${text}`);
        }

        const json = await resp.json();
        if (!json?.credentials?.accessKeyId) {
            throw new Error('Invalid credentials payload');
        }

        const creds = json.credentials;
        return {
            accessKeyId:     creds.accessKeyId,
            secretAccessKey: creds.secretAccessKey,
            sessionToken:    creds.sessionToken,
            expiration:      creds.expiration ? new Date(creds.expiration) : undefined,
        };
    };

    if (!sessionId || !region) {
        return (
            <div style={{ padding: 24, fontFamily: 'monospace', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
                <h3 style={{ color: '#ff6b6b', margin: '8px 0' }}>⚠ Session params missing</h3>
                <pre style={{ color: '#ffcc00', whiteSpace: 'pre-wrap', fontSize: 12 }}>
{`sessionId : ${JSON.stringify(sessionId)}
region    : ${JSON.stringify(region)}
hasToken  : ${!!SAKHI_TOKEN}`}
                </pre>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div style={{ padding: 24, fontFamily: 'monospace', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
                <h3 style={{ color: '#ff6b6b', margin: '8px 0' }}>⚠ Liveness error</h3>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#ffcc00', fontSize: 13 }}>{fatalError}</pre>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#0a0a0a' }}>
            <FaceLivenessDetectorCore
                sessionId={sessionId}
                region={region}
                config={{ credentialProvider }}
                disableStartScreen={false}
                displayText={DISPLAY_TEXT}
                components={{ StartScreen: SakhiStartScreen }}
                videoConstraints={{
                    facingMode: 'user',
                    width:  { ideal: 640 },
                    height: { ideal: 480 },
                }}
                onAnalysisComplete={async () => {
                    postToNative({ type: 'analysis_complete', sessionId });
                }}
                onError={(err) => {
                    const formatted = formatUnknownError(err);
                    setFatalError(formatted);
                    postToNative({ type: 'error', message: formatted });
                }}
            />
        </div>
    );
}

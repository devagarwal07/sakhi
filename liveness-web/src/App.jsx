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
    // LivenessError: { state: ErrorState, error: Error }
    if (err && typeof err === 'object' && err.state) {
        const inner = err.error?.message || String(err.error || '');
        return `${err.state}${inner ? ': ' + inner : ''}`;
    }
    if (err instanceof Error) return err.message || String(err);
    try { return JSON.stringify(err, null, 2); } catch { return String(err); }
}

// Auth token: prefer injected global (React Native inline mode), fall back to URL hash
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

export default function App() {
    const { sessionId, region } = useMemo(parseQuery, []);
    const [fatalError, setFatalError] = useState('');

    useEffect(() => {
        // Signal to native that React has mounted — hides the native loading overlay
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

        return json.credentials;
    };

    if (!sessionId || !region) {
        return (
            <div style={{ padding: 16, fontFamily: 'monospace', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
                <h3 style={{ color: '#ff6b6b', margin: '8px 0' }}>⚠ Session params missing</h3>
                <pre style={{ color: '#ffcc00', whiteSpace: 'pre-wrap', fontSize: 12 }}>
{`sessionId : ${JSON.stringify(sessionId)}
region    : ${JSON.stringify(region)}
hasToken  : ${!!SAKHI_TOKEN}
__SESSION__: ${JSON.stringify(window.__SAKHI_SESSION__)}`}
                </pre>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div style={{ padding: 16, fontFamily: 'monospace', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
                <h3 style={{ color: '#ff6b6b', margin: '8px 0' }}>⚠ Liveness error</h3>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#ffcc00', fontSize: 13 }}>{fatalError}</pre>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#000' }}>
            <FaceLivenessDetectorCore
                sessionId={sessionId}
                region={region}
                config={{ credentialProvider }}
                disableStartScreen={false}
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

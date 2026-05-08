import React, { useMemo, useState, useEffect } from 'react';
import { FaceLivenessDetectorCore } from '@aws-amplify/ui-react-liveness';

function parseQuery() {
    // When loaded inline in React Native WebView, params come from a global
    // injected via injectedJavaScriptBeforeContentLoaded. Fall back to URL
    // search params when the page is served from the backend (browser/dev).
    const g = window.__SAKHI_SESSION__ || {};
    const params = new URLSearchParams(window.location.search);
    return {
        sessionId: g.sessionId || params.get('sessionId') || params.get('session_id') || '',
        region:    g.region    || params.get('region')    || '',
    };
}

function postToNative(payload) {
    try {
        // React Native WebView bridge
        window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
    } catch {
        // no-op
    }
}

function formatUnknownError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err instanceof Error) {
        return [err.name, err.message, err.stack].filter(Boolean).join('\n');
    }
    try {
        const seen = new WeakSet();
        return JSON.stringify(
            err,
            (_key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (seen.has(value)) return '[Circular]';
                    seen.add(value);
                }
                return value;
            },
            2
        );
    } catch {
        return String(err);
    }
}

// Read the auth token — prefer the injected global (React Native inline mode),
// fall back to URL hash (#token=...) for server-served mode.
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
    const [status, setStatus] = useState('React mounted');

    // Post debug info to native immediately on mount
    useEffect(() => {
        const info = `sid=${sessionId?.slice(0,8)} reg=${region} tok=${!!SAKHI_TOKEN}`;
        setStatus(info);
        postToNative({ type: 'debug', message: info });
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
__SAKHI_SESSION__ : ${JSON.stringify(typeof window !== 'undefined' ? window.__SAKHI_SESSION__ : 'N/A')}`}
                </pre>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div style={{ padding: 16, fontFamily: 'monospace', background: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
                <h3 style={{ color: '#ff6b6b', margin: '8px 0' }}>⚠ Liveness error</h3>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#ffcc00', fontSize: 12 }}>{fatalError}</pre>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#000' }}>
            {/* Persistent debug bar — always visible on top of Amplify UI */}
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
                background: '#222', color: '#0f0', fontFamily: 'monospace',
                fontSize: 10, padding: '2px 6px', opacity: 0.9,
            }}>
                {status}
            </div>
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

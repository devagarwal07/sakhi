import React, { useMemo, useState } from 'react';
import { FaceLivenessDetectorCore } from '@aws-amplify/ui-react-liveness';

function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    return {
        sessionId: params.get('sessionId') || params.get('session_id') || '',
        region: params.get('region') || '',
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

// Read the auth token from the URL hash (#token=...).
// This is more reliable than injectedJavaScriptBeforeContentLoaded
// because it's always available before any JS runs.
const SAKHI_TOKEN = (() => {
    try {
        const hash = window.location.hash.slice(1); // remove leading #
        const params = new URLSearchParams(hash);
        return params.get('token') || '';
    } catch {
        return '';
    }
})();

export default function App() {
    const { sessionId, region } = useMemo(parseQuery, []);
    const [fatalError, setFatalError] = useState('');

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
            <div style={{ padding: 16, fontFamily: 'system-ui' }}>
                <h3 style={{ margin: '8px 0' }}>Missing parameters</h3>
                <div>Required: sessionId, region</div>
            </div>
        );
    }

    if (fatalError) {
        return (
            <div style={{ padding: 16, fontFamily: 'system-ui' }}>
                <h3 style={{ margin: '8px 0' }}>Liveness error</h3>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{fatalError}</pre>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh' }}>
            <FaceLivenessDetectorCore
                sessionId={sessionId}
                region={region}
                config={{ credentialProvider }}
                disableStartScreen={false}
                onAnalysisComplete={() => {
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

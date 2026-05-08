import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

import '@aws-amplify/ui-react/styles.css';
import '@aws-amplify/ui-react-liveness/styles.css';
import './overrides.css';

createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

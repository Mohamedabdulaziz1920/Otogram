// ✅ استيراد خطوط Cairo - يجب أن يكون في الأعلى
import '@fontsource/cairo/400.css';      // Regular
import '@fontsource/cairo/600.css';      // SemiBold
import '@fontsource/cairo/700.css';      // Bold
import '@fontsource/cairo/800.css';      // ExtraBold

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './touchFix.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
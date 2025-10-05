import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './touchFix.css'; // ← أضف هذا السطر
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

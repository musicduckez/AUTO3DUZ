import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n from './i18n';
import './index.css';

document.documentElement.lang = i18n.language;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

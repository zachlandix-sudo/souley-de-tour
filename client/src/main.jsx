import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from './utils/registerSW';
import { prefetchPages } from './routes/router';
import { watchInp } from './utils/inpDebug';

registerSW();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

window.addEventListener('load', prefetchPages, { once: true });
watchInp(); // logs every slow interaction in the console (dev, or add ?inp to the address); does nothing otherwise

/**
 * NANSEI Organics — Frontend Config
 *
 * HOW TO DEPLOY:
 *   1. Deploy your backend (Render / Railway / etc.)
 *   2. Set PRODUCTION_API below to your deployed backend URL
 *   3. All pages automatically use the right URL
 */

(function () {
  const PRODUCTION_API = 'https://nansei-backend.onrender.com/api';
  const LOCAL_API      = 'http://localhost:5000/api';

  // Auto-detect: if running on localhost/file:// → use local, else use production
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  window.API_BASE = isLocal ? LOCAL_API : PRODUCTION_API;
})();

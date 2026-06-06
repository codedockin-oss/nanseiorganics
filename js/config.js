/**
 * NANSEI Organics — Frontend Config
 *
 * HOW TO DEPLOY:
 *   1. Deploy your backend (Render / Railway / etc.)
 *   2. Set PRODUCTION_API below to your deployed backend URL
 *   3. All pages automatically use the right URL
 */

(function () {
  const PRODUCTION_API = 'https://nanseiorganics.onrender.com/api';
  const LOCAL_API      = 'http://localhost:5000/api';

  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  // Custom domain
  window.SITE_URL = 'https://www.nanseiorg.in';

  window.API_BASE = isLocal ? LOCAL_API : PRODUCTION_API;

  // Replace with your actual Google OAuth Client ID from console.cloud.google.com
  window.GOOGLE_CLIENT_ID = 'your_google_client_id_here.apps.googleusercontent.com';
})();

// LOCAL DEVELOPMENT ONLY — do not include this file in production.
// Sets the backend origin so the frontend can reach the PHP server
// running on a different port during split-server local dev.
//
// Include BEFORE api.js in any HTML page during local dev:
//   <script src="../js/dev-config.js"></script>
//   <script src="../js/api.js"></script>
//
// Remove (or just don't include) this script tag when deploying.
window.API_BASE = 'http://localhost:8000';

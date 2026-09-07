// LOCAL DEVELOPMENT ONLY - do not include this file in production.
window.API_BASE = 'http://localhost:8000';

// Mock admin credentials - dev only, removed when real backend is wired up.
window.__DEV_ADMINS = [
  { email: 'super@admin.com', password: 'admin123', role: 'super_admin', name: 'Super Admin' },
  { email: 'event@admin.com', password: 'admin123', role: 'event_admin', name: 'Event Admin' },
];

// Intercept adminLogin so the login page works without a running PHP server.
window.__devAdminLogin = function (email, password) {
  var match = (window.__DEV_ADMINS || []).find(function (a) {
    return a.email === email && a.password === password;
  });
  if (!match) throw new Error('Invalid email or password.');
  localStorage.setItem('rcy_gallery__admin_role', match.role);
  return { admin: { id: 1, name: match.name, email: match.email, role: match.role } };
};

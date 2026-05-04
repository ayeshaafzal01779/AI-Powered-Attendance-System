const CACHE_NAME = 'tri-ai-v1';
const ASSETS = [
  '/',
  '/static/css/student-dashboard.css',
  '/static/css/login.css',
  '/static/js/login.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // API calls cache mat karo — direct server pe jao
  if (e.request.url.includes('/chatbot') || 
      e.request.url.includes('/active_sessions') ||
      e.request.url.includes('/mark_attendance') ||
      e.request.url.includes('/login') ||
      e.request.method === 'POST') {
    e.respondWith(fetch(e.request, {credentials: 'include'}));
    return;
  }
  
  // Static files cache se do
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
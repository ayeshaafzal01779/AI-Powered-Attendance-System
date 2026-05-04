self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request, {credentials: 'include'})
    .catch(() => new Response('Offline'))
  );
});
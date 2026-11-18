'use strict';

function el(tag, text, className) {
  var node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function showLogin(message) {
  document.getElementById('loginCard').hidden = false;
  document.getElementById('inboxCard').hidden = true;
  document.getElementById('loginMsg').textContent = message || '';
}
function renderRecords(records) {
  var host = document.getElementById('records');
  host.replaceChildren();
  if (!records.length) { host.appendChild(el('p', 'No requests yet.')); return; }
  records.forEach(function (r) {
    var card = el('article', null, 'admin-record');
    card.appendChild(el('h3', (r.space || 'Design request') + ' · ' + r.id));
    card.appendChild(el('p', (r.name || 'No name') + ' · ' + (r.contact || 'No contact'), 'admin-meta'));
    card.appendChild(el('p', 'Received: ' + (r.createdAt || 'Unknown') + ' · Status: ' + (r.status || 'received') + ' · Review: ' + (r.review || 'manual'), 'admin-meta'));
    if (r.style) card.appendChild(el('p', 'Style: ' + r.style));
    if (r.notes) card.appendChild(el('p', r.notes));
    var media = el('div', null, 'admin-media');
    (r.media || []).forEach(function (m) {
      var src = '/api/admin/media?pathname=' + encodeURIComponent(m.pathname || '');
      var item;
      if (m.kind === 'video') { item = document.createElement('video'); item.controls = true; item.preload = 'metadata'; }
      else { item = document.createElement('img'); item.alt = m.name || 'Customer upload'; }
      item.src = src; media.appendChild(item);
    });
    if ((r.media || []).length) card.appendChild(media);
    host.appendChild(card);
  });
}
async function loadInbox() {
  var msg = document.getElementById('inboxMsg');
  msg.textContent = 'Loading requests…';
  try {
    var response = await fetch('/api/admin/rfqs', { credentials: 'same-origin' });
    if (response.status === 401) return showLogin('Sign in to view customer requests.');
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Inbox unavailable.');
    renderRecords(data.records || []);
    document.getElementById('loginCard').hidden = true;
    document.getElementById('inboxCard').hidden = false;
    msg.textContent = (data.records || []).length + ' request(s)';
  } catch (e) { msg.textContent = e.message || 'Inbox unavailable.'; }
}
document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var msg = document.getElementById('loginMsg');
  msg.textContent = 'Signing in…';
  try {
    var response = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
    document.getElementById('password').value = '';
    await loadInbox();
  } catch (e) { msg.textContent = e.message || 'Sign-in failed.'; }
});
document.getElementById('logoutBtn').addEventListener('click', async function () {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
  showLogin('You have signed out.');
});
loadInbox();

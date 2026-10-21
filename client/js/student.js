const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Check student login
if (!token || !user || user.role !== 'STUDENT') {
  window.location.href = '/login.html';
}

// Logout
function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Prevent going back to dashboard
  window.location.replace('/login.html');
}

// Attach logout after page loads
document.addEventListener('DOMContentLoaded', function () {
  const logoutButton = document.getElementById('logout');

  if (logoutButton) {
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      logoutUser();
    });
  }
});

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function get(path) {
  const r = await fetch('/api' + path, { headers });
  const d = await r.json();

  if (!r.ok) {
    throw Error(d.message || 'Request failed');
  }

  return d;
}

function stat(title, value) {
  return `
    <div class="stat">
      <span class="muted">${title}</span>
      <b>${value}</b>
    </div>
  `;
}

async function dashboard() {
  if (!document.getElementById('stats')) return;

  document.getElementById('welcome').textContent =
    `Welcome, ${user.full_name}`;

  const [books, borrow] = await Promise.all([
    get('/books'),
    get('/borrow/my')
  ]);

  const active = borrow.filter(x => x.status === 'APPROVED').length;
  const pending = borrow.filter(x => x.status === 'PENDING').length;
  const returned = borrow.filter(x => x.status === 'RETURNED').length;

  document.getElementById('stats').innerHTML =
    stat(
      'Available Books',
      books.reduce((a, b) => a + b.available_quantity, 0)
    ) +
    stat('My Books', active) +
    stat('Pending Requests', pending) +
    stat('Returned', returned);
}

async function books() {
  const box = document.getElementById('books');

  if (!box) return;

  async function load() {
    const q = document.getElementById('search').value;

    const rows = await get(
      '/books?q=' + encodeURIComponent(q)
    );

    box.innerHTML =
      rows.map(b => `
        <div class="book">
          <h3>${esc(b.title)}</h3>
          <p><b>${esc(b.author)}</b></p>
          <p>${esc(b.category)} · ISBN ${esc(b.isbn)}</p>
          <p>${esc(b.description || '')}</p>
          <p>
            <b>${b.available_quantity} / ${b.quantity}</b>
            available
          </p>

          <button
            class="btn"
            ${b.available_quantity < 1 ? 'disabled' : ''}
            onclick="borrow(${b.id})">
            Request Book
          </button>
        </div>
      `).join('') || '<p>No books found.</p>';
  }

  document.getElementById('search')
    .addEventListener('input', load);

  load();
}

async function borrow(id) {
  try {
    const r = await fetch('/api/borrow', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        book_id: id
      })
    });

    const d = await r.json();

    if (!r.ok) {
      throw Error(d.message);
    }

    document.getElementById('msg').className = 'ok';
    document.getElementById('msg').textContent = d.message;

  } catch (e) {
    document.getElementById('msg').className = 'error';
    document.getElementById('msg').textContent = e.message;
  }
}

async function myBooks() {
  const box = document.getElementById('mybooks');

  if (!box) return;

  const rows = await get('/borrow/my');

  box.innerHTML =
    '<table>' +
    '<tr>' +
    '<th>Book</th>' +
    '<th>Request</th>' +
    '<th>Status</th>' +
    '<th>Action</th>' +
    '</tr>' +

    rows.map(x => `
      <tr>
        <td>${esc(x.title)}</td>
        <td>${new Date(x.request_date).toLocaleString()}</td>
        <td>${x.status}</td>
        <td>
          ${
            x.status === 'APPROVED'
              ? `<button
                   class="btn"
                   onclick="returnBook(${x.id})">
                   Return
                 </button>`
              : '-'
          }
        </td>
      </tr>
    `).join('') +

    '</table>';
}

async function returnBook(id) {
  try {
    const r = await fetch(
      '/api/borrow/' + id + '/return',
      {
        method: 'PUT',
        headers
      }
    );

    const d = await r.json();

    if (!r.ok) {
      throw Error(d.message);
    }

    location.reload();

  } catch (e) {
    const message = document.getElementById('msg');

    if (message) {
      message.className = 'error';
      message.textContent = e.message;
    }
  }
}

async function history() {
  const box = document.getElementById('history');

  if (!box) return;

  const rows = await get('/borrow/my');

  box.innerHTML =
    '<table>' +
    '<tr>' +
    '<th>Book</th>' +
    '<th>Request</th>' +
    '<th>Approved</th>' +
    '<th>Returned</th>' +
    '<th>Status</th>' +
    '</tr>' +

    rows.map(x => `
      <tr>
        <td>${esc(x.title)}</td>
        <td>${fmt(x.request_date)}</td>
        <td>${fmt(x.approved_date)}</td>
        <td>${fmt(x.returned_date)}</td>
        <td>${x.status}</td>
      </tr>
    `).join('') +

    '</table>';
}

function fmt(v) {
  return v ? new Date(v).toLocaleString() : '-';
}

function esc(v) {
  return String(v ?? '').replace(
    /[&<>'"]/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[c])
  );
}

// Load dashboard data
dashboard().catch(e => console.error(e));
books().catch(e => console.error(e));
myBooks().catch(e => console.error(e));
history().catch(e => console.error(e));
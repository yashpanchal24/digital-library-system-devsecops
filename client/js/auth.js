const apiBase = '/api';

// LOGIN
async function submitLogin(form, admin) {
  form.addEventListener('submit', async e => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const m = document.getElementById('msg');

    try {
      const r = await fetch(apiBase + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message);
      }

      if (admin && d.user.role !== 'ADMIN') {
        throw new Error('This account is not an admin account.');
      }

      if (!admin && d.user.role !== 'STUDENT') {
        throw new Error('Please use the admin login.');
      }

      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));

      location.href = admin
        ? '/admin-dashboard.html'
        : '/student-dashboard.html';

    } catch (err) {
      m.className = 'error';
      m.textContent = err.message;
    }
  });
}


// STUDENT LOGIN
const lf = document.getElementById('loginForm');

if (lf) {
  submitLogin(lf, false);
}


// ADMIN LOGIN
const af = document.getElementById('adminLoginForm');

if (af) {
  submitLogin(af, true);
}


// REGISTER
const rf = document.getElementById('registerForm');

if (rf) {
  rf.addEventListener('submit', async e => {
    e.preventDefault();

    const body = {
      full_name: full_name.value,
      student_id: student_id.value,
      email: email.value,
      password: password.value
    };

    try {
      const r = await fetch(apiBase + '/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d.message);
      }

      document.getElementById('msg').className = 'ok';
      document.getElementById('msg').textContent =
        'Registration successful. You can now login.';

      rf.reset();

    } catch (err) {
      document.getElementById('msg').className = 'error';
      document.getElementById('msg').textContent = err.message;
    }
  });
}


// LOGOUT
const logoutButton = document.getElementById('logout');

if (logoutButton) {
  logoutButton.addEventListener('click', function () {

    // Remove logged-in user information
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Go back to login page
    window.location.href = '/login.html';
  });
}
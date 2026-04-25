/**
 * ─────────────────────────────────────────────────────
 *  Civic Infrastructure Tracker — Frontend App
 *  File: app.js
 * ─────────────────────────────────────────────────────
 *
 *  Single-page application controller.
 *  Communicates with the backend REST API at API_BASE_URL.
 *
 *  To change the backend address (e.g. for deployment),
 *  update only the API_BASE_URL constant below.
 * ─────────────────────────────────────────────────────
 */

// ─── Configuration ────────────────────────────────────────────────────────────
// Point this to wherever the backend server is running.
const API_BASE_URL = 'https://civic-infrastructure-complaint-and-8o38.onrender.com/api';

// ─── App State ────────────────────────────────────────────────────────────────
const STATE = {
  token:          localStorage.getItem('civicToken') || null,
  user:           JSON.parse(localStorage.getItem('civicUser') || 'null'),
  currentPage:    'dashboard',
  complaintsPage: 1,
  adminPage:      1,
};

// ─── API Helper ───────────────────────────────────────────────────────────────
/**
 * Sends a fetch request to the backend API.
 * @param {string} method      HTTP method (GET, POST, PATCH, …)
 * @param {string} endpoint    Path relative to API_BASE_URL (e.g. '/auth/login')
 * @param {object|FormData} body  Request body (plain object or FormData)
 * @param {boolean} isFormData   Pass true when body is a FormData (file upload)
 * @returns {Promise<object>}  Parsed JSON response
 * @throws {Error}             If the response is not ok
 */
async function api(method, endpoint, body = null, isFormData = false) {
  const headers = {};

  // Attach JWT token if we have one
  if (STATE.token) {
    headers['Authorization'] = `Bearer ${STATE.token}`;
  }

  // Let the browser set Content-Type for FormData (it adds the boundary)
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const options = { method, headers };
  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  const res  = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
/**
 * Shows a temporary notification toast.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration  ms before auto-dismiss
 */
function toast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─── Auth Tab Switching ───────────────────────────────────────────────────────
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const btn     = document.getElementById('loginBtn');
  const btnText = document.getElementById('loginBtnText');
  btn.disabled  = true;
  btnText.innerHTML = '<span class="loader"></span> Logging in...';

  try {
    const data = await api('POST', '/auth/login', {
      email:    document.getElementById('loginEmail').value.trim(),
      password: document.getElementById('loginPassword').value,
    });
    saveSession(data.token, data.user);
    toast(`Welcome back, ${data.user.name}! 👋`, 'success');
    showApp();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled      = false;
    btnText.textContent = 'Login';
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const btn     = document.getElementById('registerBtn');
  const btnText = document.getElementById('registerBtnText');
  btn.disabled  = true;
  btnText.innerHTML = '<span class="loader"></span> Creating account...';

  try {
    const data = await api('POST', '/auth/register', {
      name:     document.getElementById('regName').value.trim(),
      email:    document.getElementById('regEmail').value.trim(),
      password: document.getElementById('regPassword').value,
      phone:    document.getElementById('regPhone').value.trim(),
    });
    saveSession(data.token, data.user);
    toast('Account created! Welcome 🎉', 'success');
    showApp();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled        = false;
    btnText.textContent = 'Create Account';
  }
}

// ─── Session Management ───────────────────────────────────────────────────────
function saveSession(token, user) {
  STATE.token = token;
  STATE.user  = user;
  localStorage.setItem('civicToken', token);
  localStorage.setItem('civicUser',  JSON.stringify(user));
}

function logout() {
  STATE.token = null;
  STATE.user  = null;
  localStorage.removeItem('civicToken');
  localStorage.removeItem('civicUser');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  toast('Logged out successfully.', 'info');
}

// ─── Show App (after login / register) ───────────────────────────────────────
function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  // Set avatar initials from user name
  const initials = (STATE.user.name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  document.getElementById('navAvatar').textContent = initials;

  // Reveal admin nav link for admins
  if (STATE.user.role === 'admin') {
    document.getElementById('nav-admin').classList.remove('hidden');
  }

  navigate('dashboard');
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page) {
  STATE.currentPage = page;

  // Show the selected page section
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  // Highlight the active nav link
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');

  // Load data for the page
  if (page === 'dashboard')  loadDashboard();
  if (page === 'complaints') { STATE.complaintsPage = 1; loadComplaints(); }
  if (page === 'admin')      { STATE.adminPage = 1; loadAdminComplaints(); loadAdminStats(); }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  // Stats cards
  try {
    const { stats } = await api('GET', '/complaints/stats/summary');
    document.getElementById('statTotal').textContent    = stats.total       || 0;
    document.getElementById('statPending').textContent  = stats.pending     || 0;
    document.getElementById('statProgress').textContent = stats.in_progress || 0;
    document.getElementById('statResolved').textContent = stats.resolved    || 0;
  } catch (_) { /* silently ignore if user has no complaints yet */ }

  // Recent complaints (latest 5)
  try {
    const { complaints } = await api('GET', '/complaints?limit=5&page=1');
    const el = document.getElementById('recentComplaints');

    if (!complaints.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No complaints yet</h3>
          <p>Submit your first complaint to get started.</p>
          <button class="btn btn-primary mt-2" onclick="navigate('submit')">+ Submit Complaint</button>
        </div>`;
      return;
    }

    el.innerHTML = `<div class="flex-col gap-2">${complaints.map(complaintCardHTML).join('')}</div>`;
  } catch (_) {}
}

// ─── Complaints List (Citizen view) ──────────────────────────────────────────
async function loadComplaints() {
  const status   = document.getElementById('filterStatus')?.value   || '';
  const category = document.getElementById('filterCategory')?.value || '';
  const priority = document.getElementById('filterPriority')?.value || '';
  const page     = STATE.complaintsPage;

  const params = new URLSearchParams({ page, limit: 8 });
  if (status)   params.set('status',   status);
  if (category) params.set('category', category);
  if (priority) params.set('priority', priority);

  const el = document.getElementById('complaintsList');
  el.innerHTML = skeletonHTML(3);

  try {
    const { complaints, pagination } = await api('GET', `/complaints?${params}`);

    if (!complaints.length) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No complaints found</h3>
          <p>Try changing your filters or submit a new complaint.</p>
        </div>`;
    } else {
      el.innerHTML = `<div class="flex-col gap-2">${complaints.map(complaintCardHTML).join('')}</div>`;
    }

    renderPagination('paginationBar', pagination, p => {
      STATE.complaintsPage = p;
      loadComplaints();
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// ─── Submit Complaint ─────────────────────────────────────────────────────────
async function handleComplaintSubmit(e) {
  e.preventDefault();
  const btn     = document.getElementById('submitComplaintBtn');
  const btnText = document.getElementById('submitComplaintText');
  btn.disabled  = true;
  btnText.innerHTML = '<span class="loader"></span> Submitting...';

  try {
    // Use FormData so we can attach an optional image file
    const formData = new FormData();
    formData.append('title',       document.getElementById('compTitle').value.trim());
    formData.append('category',    document.getElementById('compCategory').value);
    formData.append('priority',    document.getElementById('compPriority').value);
    formData.append('location',    document.getElementById('compLocation').value.trim());
    formData.append('ward',        document.getElementById('compWard').value.trim());
    formData.append('description', document.getElementById('compDescription').value.trim());

    const imgFile = document.getElementById('compImage').files[0];
    if (imgFile) formData.append('image', imgFile);

    await api('POST', '/complaints', formData, /* isFormData */ true);
    toast('Complaint submitted successfully! 🎉', 'success');
    document.getElementById('complaintForm').reset();
    navigate('complaints');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled        = false;
    btnText.textContent = 'Submit Complaint';
  }
}

// ─── Complaint Detail Modal ───────────────────────────────────────────────────
async function openComplaintDetail(id) {
  document.getElementById('detailModal').classList.add('open');
  document.getElementById('modalBody').innerHTML  = skeletonHTML(2);
  document.getElementById('modalTitle').textContent = 'Loading…';

  try {
    const { complaint, history, comments } = await api('GET', `/complaints/${id}`);
    document.getElementById('modalTitle').textContent = complaint.title;

    // Admin-only: show update status button
    const adminBtn = STATE.user.role === 'admin'
      ? `<button class="btn btn-primary btn-sm mt-2" onclick="openStatusModal(${complaint.id}, '${complaint.status}')">✏️ Update Status</button>`
      : '';

    // Image from backend uploads
    const imgTag = complaint.image_path
      ? `<img src="${API_BASE_URL.replace('/api', '')}${complaint.image_path}"
              alt="Complaint photo"
              style="width:100%;border-radius:var(--radius-md);margin-bottom:1.25rem;max-height:280px;object-fit:cover;" />`
      : '';

    document.getElementById('modalBody').innerHTML = `
      <div class="flex gap-1 mb-2" style="flex-wrap:wrap;">
        ${badgeHTML(complaint.status)}
        <span class="badge badge-${complaint.priority}">${capitalize(complaint.priority)} Priority</span>
        <span class="badge" style="background:rgba(255,255,255,0.07);color:var(--text-secondary);">📂 ${complaint.category}</span>
      </div>
      <p style="font-size:0.9rem;margin-bottom:1rem;">${complaint.description}</p>
      <div style="font-size:0.85rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1.25rem;">
        <span>📍 ${complaint.location}${complaint.ward ? ' — ' + complaint.ward : ''}</span>
        <span>👤 ${complaint.citizen_name}</span>
        <span>📅 ${formatDate(complaint.created_at)}</span>
      </div>
      ${imgTag}
      ${adminBtn}

      <hr style="border-color:var(--border);margin:1.25rem 0;" />
      <h4 class="mb-2">📜 Status History</h4>
      ${history.length
        ? `<div class="timeline">${history.map(h => `
            <div class="timeline-item">
              <div class="timeline-date">${formatDate(h.changed_at)} — by ${h.changed_by_name}</div>
              <div class="timeline-text">
                ${badgeHTML(h.old_status)} → ${badgeHTML(h.new_status)}
                ${h.remark ? `<br><span style="color:var(--text-muted);font-size:0.82rem;">${h.remark}</span>` : ''}
              </div>
            </div>`).join('')}</div>`
        : '<p style="font-size:0.88rem;color:var(--text-muted);">No status changes yet.</p>'
      }

      <hr style="border-color:var(--border);margin:1.25rem 0;" />
      <h4 class="mb-2">💬 Comments (${comments.length})</h4>
      ${comments.map(c => `
        <div style="background:var(--bg-input);border-radius:var(--radius-sm);padding:0.75rem;margin-bottom:0.6rem;">
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.3rem;">
            ${c.author_name} · ${c.author_role} · ${formatDate(c.created_at)}
          </div>
          <div style="font-size:0.9rem;">${c.message}</div>
        </div>`).join('')}

      <form onsubmit="submitComment(event, ${complaint.id})" style="display:flex;gap:0.6rem;margin-top:0.75rem;">
        <input class="form-control" id="commentInput_${complaint.id}" type="text" placeholder="Add a comment…" required />
        <button class="btn btn-primary btn-sm" type="submit">Send</button>
      </form>`;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<p style="color:var(--danger);">${err.message}</p>`;
  }
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('open');
}

// ─── Comment Submission ───────────────────────────────────────────────────────
async function submitComment(e, id) {
  e.preventDefault();
  const input   = document.getElementById(`commentInput_${id}`);
  const message = input.value.trim();
  if (!message) return;

  try {
    await api('POST', `/complaints/${id}/comments`, { message });
    toast('Comment added!', 'success');
    openComplaintDetail(id); // refresh modal content
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Admin — Stats ────────────────────────────────────────────────────────────
async function loadAdminStats() {
  try {
    const { stats } = await api('GET', '/complaints/stats/summary');
    document.getElementById('aStatTotal').textContent    = stats.total       || 0;
    document.getElementById('aStatPending').textContent  = stats.pending     || 0;
    document.getElementById('aStatProgress').textContent = stats.in_progress || 0;
    document.getElementById('aStatResolved').textContent = stats.resolved    || 0;
  } catch (_) {}
}

// ─── Admin — Complaints Table ─────────────────────────────────────────────────
async function loadAdminComplaints() {
  const status   = document.getElementById('adminFilterStatus')?.value   || '';
  const category = document.getElementById('adminFilterCategory')?.value || '';
  const page     = STATE.adminPage;

  const params = new URLSearchParams({ page, limit: 10 });
  if (status)   params.set('status',   status);
  if (category) params.set('category', category);

  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">Loading…</td></tr>`;

  try {
    const { complaints, pagination } = await api('GET', `/complaints?${params}`);

    if (!complaints.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);">No complaints found.</td></tr>`;
    } else {
      tbody.innerHTML = complaints.map(c => `
        <tr>
          <td style="color:var(--text-muted);">#${c.id}</td>
          <td>
            <span style="font-weight:500;cursor:pointer;color:var(--primary-light);"
                  onclick="openComplaintDetail(${c.id})">${c.title}</span>
          </td>
          <td>${c.citizen_name}</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.priority}">${capitalize(c.priority)}</span></td>
          <td>${badgeHTML(c.status)}</td>
          <td style="color:var(--text-muted);white-space:nowrap;">${formatDate(c.created_at)}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="openStatusModal(${c.id}, '${c.status}')">
              Update
            </button>
          </td>
        </tr>`).join('');
    }

    renderPagination('adminPaginationBar', pagination, p => {
      STATE.adminPage = p;
      loadAdminComplaints();
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);">${err.message}</td></tr>`;
  }
}

// ─── Admin — Status Update Modal ──────────────────────────────────────────────
function openStatusModal(id, currentStatus) {
  document.getElementById('statusComplaintId').value = id;
  document.getElementById('statusSelect').value      = currentStatus || 'pending';
  document.getElementById('statusRemark').value      = '';
  document.getElementById('statusModal').classList.add('open');
}

function closeStatusModal() {
  document.getElementById('statusModal').classList.remove('open');
}

async function handleStatusUpdate(e) {
  e.preventDefault();
  const id     = document.getElementById('statusComplaintId').value;
  const status = document.getElementById('statusSelect').value;
  const remark = document.getElementById('statusRemark').value.trim();
  const btn    = document.getElementById('statusUpdateBtn');

  btn.disabled = true;
  try {
    await api('PATCH', `/complaints/${id}/status`, { status, remark });
    toast(`Status updated to "${status}" ✅`, 'success');
    closeStatusModal();
    // Refresh whichever page the admin came from
    if (STATE.currentPage === 'admin') loadAdminComplaints();
    else loadComplaints();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ─── UI Helper — Complaint Card ───────────────────────────────────────────────
function complaintCardHTML(c) {
  return `
    <div class="card complaint-card" onclick="openComplaintDetail(${c.id})">
      <div class="complaint-card-header">
        <span class="complaint-card-title">${c.title}</span>
        <div style="display:flex;gap:0.4rem;flex-shrink:0;">${badgeHTML(c.status)}</div>
      </div>
      <p style="font-size:0.88rem;color:var(--text-muted);margin:0;
                overflow:hidden;display:-webkit-box;
                -webkit-line-clamp:2;-webkit-box-orient:vertical;">
        ${c.description}
      </p>
      <div class="complaint-meta">
        <span>📂 ${c.category}</span>
        <span>📍 ${c.location}</span>
        <span>🎯 ${capitalize(c.priority)} priority</span>
        <span>📅 ${formatDate(c.created_at)}</span>
        ${c.citizen_name ? `<span>👤 ${c.citizen_name}</span>` : ''}
      </div>
    </div>`;
}

// ─── UI Helper — Status Badge ─────────────────────────────────────────────────
function badgeHTML(status) {
  const labels = {
    pending:     '⏳ Pending',
    in_progress: '🔧 In Progress',
    resolved:    '✅ Resolved',
    rejected:    '❌ Rejected',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

// ─── UI Helper — Pagination ───────────────────────────────────────────────────
function renderPagination(containerId, pagination, onPage) {
  const el = document.getElementById(containerId);
  if (!el || !pagination || pagination.totalPages <= 1) {
    if (el) el.innerHTML = '';
    return;
  }
  el.innerHTML = Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
    .map(i => `
      <button class="btn btn-sm ${i === pagination.page ? 'btn-primary' : 'btn-outline'}"
              onclick="(${onPage.toString()})(${i})">${i}</button>`)
    .join('');
}

// ─── UI Helper — Skeleton Loader ──────────────────────────────────────────────
function skeletonHTML(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="card" style="margin-bottom:0.75rem;">
      <div class="skeleton" style="height:20px;width:60%;margin-bottom:0.75rem;"></div>
      <div class="skeleton" style="height:14px;width:90%;margin-bottom:0.4rem;"></div>
      <div class="skeleton" style="height:14px;width:75%;"></div>
    </div>`
  ).join('');
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace('_', ' ');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Modal — Close on overlay click ──────────────────────────────────────────
document.getElementById('detailModal').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.getElementById('statusModal').addEventListener('click', function (e) {
  if (e.target === this) closeStatusModal();
});

// ─── Bootstrap — restore session on page load ─────────────────────────────────
(function init() {
  if (STATE.token && STATE.user) {
    // Verify the saved token is still valid with the backend
    api('GET', '/auth/me')
      .then(({ user }) => {
        STATE.user = user;
        localStorage.setItem('civicUser', JSON.stringify(user));
        showApp();
      })
      .catch(() => logout()); // Token expired or revoked
  }
})();

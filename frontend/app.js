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
const isLocalDev = window.location.hostname === '127.0.0.1' || (window.location.hostname === 'localhost' && window.location.port !== '3000');
const API_BASE_URL = isLocalDev ? 'http://localhost:3000/api' : '/api';

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

// ─── Admin Auto-fill ──────────────────────────────────────────────────────────
/** Fills the login form with the admin credentials for quick access. */
function fillAdminCreds() {
  document.getElementById('loginEmail').value    = 'Admin@gmail.com';
  document.getElementById('loginPassword').value = 'Admin123';
  // Briefly highlight the fields to signal the auto-fill
  ['loginEmail', 'loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    el.style.transition = 'box-shadow 0.3s';
    el.style.boxShadow  = '0 0 0 3px rgba(139,92,246,0.5)';
    setTimeout(() => el.style.boxShadow = '', 1200);
  });
  toast('Admin credentials filled! Click Login to proceed. 🔑', 'info', 2500);
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
  // Guard: citizens cannot access admin page
  if (page === 'admin' && STATE.user?.role !== 'admin') {
    toast('Access denied. Admin only.', 'error');
    return;
  }

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
  if (page === 'admin')      { STATE.adminPage = 1; loadAdminData(); }
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
      ? `<button class="btn btn-primary btn-sm mt-2" onclick="openStatusModal('${complaint.id}','${complaint.status}','${escapeAttr(complaint.title)}','${escapeAttr(complaint.citizen_name||'')}','${escapeAttr(complaint.category||'')}')">✏️ Update Status</button>`
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

      <form onsubmit="submitComment(event, '${complaint.id}')" style="display:flex;gap:0.6rem;margin-top:0.75rem;">
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

// ─── Admin — Main Data Loader ─────────────────────────────────────────────────
async function loadAdminData() {
  await loadAdminStats();
  const view = STATE.adminView || 'kanban';
  if (view === 'kanban') await loadAdminKanban();
  else await loadAdminTable();
}

// ─── Admin — Stats with animated progress bars ────────────────────────────────
async function loadAdminStats() {
  try {
    const { stats } = await api('GET', '/complaints/stats/summary');
    const total = stats.total || 1; // avoid divide-by-zero

    document.getElementById('aStatTotal').textContent    = stats.total       || 0;
    document.getElementById('aStatPending').textContent  = stats.pending     || 0;
    document.getElementById('aStatProgress').textContent = stats.in_progress || 0;
    document.getElementById('aStatResolved').textContent = stats.resolved    || 0;
    document.getElementById('aStatRejected').textContent = stats.rejected    || 0;

    // Animate progress bars
    setTimeout(() => {
      setBar('aBarPending',  (stats.pending     || 0) / total * 100);
      setBar('aBarProgress', (stats.in_progress || 0) / total * 100);
      setBar('aBarResolved', (stats.resolved    || 0) / total * 100);
      setBar('aBarRejected', (stats.rejected    || 0) / total * 100);
    }, 100);
  } catch (_) {}
}

function setBar(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(100, pct) + '%';
}

// ─── Admin — Kanban Board ─────────────────────────────────────────────────────
async function loadAdminKanban() {
  const category = document.getElementById('adminFilterCategory')?.value || '';
  const priority = document.getElementById('adminFilterPriority')?.value || '';
  const search   = document.getElementById('adminSearchInput')?.value.trim()  || '';

  const STATUSES = ['pending', 'in_progress', 'resolved', 'rejected'];
  const cols = {
    pending:     document.getElementById('kanbanPending'),
    in_progress: document.getElementById('kanbanInProgress'),
    resolved:    document.getElementById('kanbanResolved'),
    rejected:    document.getElementById('kanbanRejected'),
  };

  // Show loading in each column
  STATUSES.forEach(s => {
    if (cols[s]) cols[s].innerHTML = '<div class="kanban-loading"><span class="loader"></span></div>';
  });

  // Fetch all 4 columns concurrently
  await Promise.all(STATUSES.map(async (status) => {
    try {
      const params = new URLSearchParams({ status, limit: 50, page: 1 });
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);

      const { complaints } = await api('GET', `/complaints?${params}`);

      // Client-side search filter
      const filtered = search
        ? complaints.filter(c =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            (c.citizen_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.location     || '').toLowerCase().includes(search.toLowerCase())
          )
        : complaints;

      // Update column count badge
      const countEl = document.getElementById(`kanbanCount${capitalize(status).replace(' ', '')}`);
      const countId = { pending: 'kanbanCountPending', in_progress: 'kanbanCountProgress', resolved: 'kanbanCountResolved', rejected: 'kanbanCountRejected' };
      const cntEl = document.getElementById(countId[status]);
      if (cntEl) cntEl.textContent = filtered.length;

      if (!filtered.length) {
        cols[status].innerHTML = `<div class="kanban-empty"><div class="kanban-empty-icon">📭</div><p>No ${status.replace('_',' ')} complaints</p></div>`;
      } else {
        cols[status].innerHTML = filtered.map(c => kanbanCardHTML(c)).join('');
      }
    } catch (err) {
      cols[status].innerHTML = `<div class="kanban-empty"><p style="color:var(--danger);">${err.message}</p></div>`;
    }
  }));
}

// ─── Admin — Kanban Card HTML ─────────────────────────────────────────────────
function kanbanCardHTML(c) {
  const priorityColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
  const priorityDot = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${priorityColors[c.priority]||'#888'};margin-right:4px;"></span>`;

  // Build quick action buttons based on current status
  let actions = '';
  if (c.status === 'pending') {
    actions = `
      <button class="kanban-action-btn ka-progress" onclick="quickStatus(event,'${c.id}','in_progress')">🔧 Start</button>
      <button class="kanban-action-btn ka-rejected" onclick="quickStatus(event,'${c.id}','rejected')">❌ Reject</button>`;
  } else if (c.status === 'in_progress') {
    actions = `
      <button class="kanban-action-btn ka-resolved" onclick="quickStatus(event,'${c.id}','resolved')">✅ Resolve</button>
      <button class="kanban-action-btn ka-rejected" onclick="quickStatus(event,'${c.id}','rejected')">❌ Reject</button>`;
  } else if (c.status === 'resolved' || c.status === 'rejected') {
    actions = `<button class="kanban-action-btn ka-detail" onclick="openComplaintDetail('${c.id}')">👁 View Details</button>`;
  }

  return `
    <div class="kanban-card" onclick="openStatusModal('${c.id}','${c.status}','${escapeAttr(c.title)}','${escapeAttr(c.citizen_name||'')}','${escapeAttr(c.category||'')}')"
         id="kcard-${c.id}">
      <div class="kanban-card-title">${c.title}</div>
      <div class="kanban-card-meta">
        <span>${priorityDot}${capitalize(c.priority)} Priority · 📂 ${c.category}</span>
        <span>👤 ${c.citizen_name || 'Unknown'}</span>
        <span>📅 ${formatDate(c.created_at)}</span>
      </div>
      <div class="kanban-card-actions" onclick="event.stopPropagation()">
        ${actions}
        <button class="kanban-action-btn ka-detail" onclick="openComplaintDetail('${c.id}')">💬 Detail</button>
      </div>
    </div>`;
}

// ─── Admin — Quick Status Update (no modal) ───────────────────────────────────
async function quickStatus(event, id, status) {
  event.stopPropagation();
  const labels = { in_progress: 'In Progress', resolved: 'Resolved', rejected: 'Rejected' };
  if (!confirm(`Move this complaint to "${labels[status] || status}"?`)) return;

  try {
    await api('PATCH', `/complaints/${id}/status`, { status });
    toast(`Status updated to "${labels[status]}" ✅`, 'success');
    loadAdminKanban();
    loadAdminStats();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── Admin — View Switch (kanban / table / users) ──────────────────────────────
function switchAdminView(view) {
  STATE.adminView = view;
  document.getElementById('adminKanbanView').classList.toggle('hidden', view !== 'kanban');
  document.getElementById('adminTableView').classList.toggle('hidden',  view !== 'table');
  document.getElementById('adminUsersView').classList.toggle('hidden',  view !== 'users');
  document.getElementById('viewBtnKanban').classList.toggle('active', view === 'kanban');
  document.getElementById('viewBtnTable').classList.toggle('active',  view === 'table');
  document.getElementById('viewBtnUsers').classList.toggle('active',  view === 'users');
  // Also show/hide the filters bar (irrelevant on Users tab)
  const filtersEl = document.querySelector('.admin-filters');
  if (filtersEl) filtersEl.style.display = view === 'users' ? 'none' : '';
  if (view === 'kanban') loadAdminKanban();
  else if (view === 'table') loadAdminTable();
  else loadAdminUsers();
}

// ─── Admin — Debounced Search (complaints) ────────────────────────────────────
let _searchTimer = null;
function debounceAdminSearch() {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => loadAdminData(), 350);
}

// ─── Admin — Users List ───────────────────────────────────────────────────────
let _usersPage = 1;
let _usersSearchTimer = null;

function debounceUsersSearch() {
  clearTimeout(_usersSearchTimer);
  _usersSearchTimer = setTimeout(() => { _usersPage = 1; loadAdminUsers(); }, 350);
}

async function loadAdminUsers() {
  const search = document.getElementById('usersSearchInput')?.value.trim() || '';
  const grid   = document.getElementById('usersGrid');
  grid.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);"><span class="loader"></span> Loading users…</div>';

  try {
    const params = new URLSearchParams({ page: _usersPage, limit: 12 });
    if (search) params.set('search', search);

    const { users, pagination } = await api('GET', `/users?${params}`);

    if (!users.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No users found</h3>
          <p>${search ? 'Try a different search term.' : 'No citizen accounts registered yet.'}</p>
        </div>`;
    } else {
      grid.innerHTML = users.map(userCardHTML).join('');
    }

    renderPagination('usersPaginationBar', pagination, p => {
      _usersPage = p;
      loadAdminUsers();
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// ─── Admin — User Card HTML ───────────────────────────────────────────────────
function userCardHTML(u) {
  const initials = (u.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const c = u.complaints || {};
  const joined = u.created_at
    ? new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    : '—';

  return `
    <div class="user-card">
      <div class="user-card-header">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${u.name}</div>
          <div class="user-email">📧 ${u.email}</div>
          ${u.phone ? `<div class="user-phone">📞 ${u.phone}</div>` : ''}
          <div class="user-joined">📅 Joined ${joined}</div>
        </div>
      </div>
      <div class="user-complaints-title">Complaints Submitted</div>
      <div class="user-stats">
        <div class="user-stat">
          <span class="user-stat-num">${c.total || 0}</span>
          <span class="user-stat-lbl">Total</span>
        </div>
        <div class="user-stat user-stat-pending">
          <span class="user-stat-num">${c.pending || 0}</span>
          <span class="user-stat-lbl">⏳ Pending</span>
        </div>
        <div class="user-stat user-stat-progress">
          <span class="user-stat-num">${c.in_progress || 0}</span>
          <span class="user-stat-lbl">🔧 Progress</span>
        </div>
        <div class="user-stat user-stat-resolved">
          <span class="user-stat-num">${c.resolved || 0}</span>
          <span class="user-stat-lbl">✅ Resolved</span>
        </div>
      </div>
    </div>`;
}


// ─── Admin — Table View ───────────────────────────────────────────────────────
async function loadAdminTable() {
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
                  onclick="openComplaintDetail('${c.id}')">${c.title}</span>
          </td>
          <td>${c.citizen_name}</td>
          <td>${c.category}</td>
          <td><span class="badge badge-${c.priority}">${capitalize(c.priority)}</span></td>
          <td>${badgeHTML(c.status)}</td>
          <td style="color:var(--text-muted);white-space:nowrap;">${formatDate(c.created_at)}</td>
          <td style="display:flex;gap:0.4rem;">
            <button class="btn btn-outline btn-sm" onclick="openStatusModal('${c.id}','${c.status}','${escapeAttr(c.title)}','${escapeAttr(c.citizen_name||'')}','${escapeAttr(c.category||'')}')">
              ✏️ Update
            </button>
          </td>
        </tr>`).join('');
    }

    renderPagination('adminPaginationBar', pagination, p => {
      STATE.adminPage = p;
      loadAdminTable();
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);">${err.message}</td></tr>`;
  }
}

// Keep old name as alias so existing detail-modal calls still work
const loadAdminComplaints = loadAdminTable;

// ─── Admin — Status Update Modal ──────────────────────────────────────────────
function openStatusModal(id, currentStatus, title, citizenName, category) {
  document.getElementById('statusComplaintId').value = id;
  document.getElementById('statusSelect').value      = '';
  document.getElementById('statusRemark').value      = '';
  document.getElementById('statusModalTitle').textContent    = 'Update Status';
  document.getElementById('statusModalSubtitle').textContent = title || '';

  // Populate complaint info box
  document.getElementById('statusComplaintInfo').innerHTML = `
    <div class="sci-title">${title || 'Complaint #' + id}</div>
    <div class="sci-meta">
      <span>👤 ${citizenName || '—'}</span>
      <span>📂 ${category   || '—'}</span>
      <span>${badgeHTML(currentStatus)}</span>
    </div>`;

  // Reset flow buttons, pre-highlight current status
  document.querySelectorAll('.status-flow-btn').forEach(btn => btn.classList.remove('selected'));
  const activeBtn = document.querySelector(`.status-flow-btn[data-status="${currentStatus}"]`);
  // Don't pre-select it — force the admin to actively pick a new one

  // Disable submit until a status is picked
  const submitBtn = document.getElementById('statusUpdateBtn');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor  = 'not-allowed';
  submitBtn.textContent   = 'Select a Status to Continue';

  document.getElementById('statusModal').classList.add('open');
}

function selectFlowStatus(status) {
  document.getElementById('statusSelect').value = status;

  // Toggle selected class
  document.querySelectorAll('.status-flow-btn').forEach(btn => btn.classList.remove('selected'));
  document.querySelector(`.status-flow-btn[data-status="${status}"]`)?.classList.add('selected');

  // Enable submit button
  const submitBtn = document.getElementById('statusUpdateBtn');
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  submitBtn.style.cursor  = 'pointer';
  const labels = { pending: '⏳ Set Pending', in_progress: '🔧 Start Progress', resolved: '✅ Mark Resolved', rejected: '❌ Reject Complaint' };
  submitBtn.textContent = labels[status] || 'Confirm Status Update';
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

  if (!status) { toast('Please select a status.', 'error'); return; }

  btn.disabled = true;
  const original = btn.textContent;
  btn.innerHTML = '<span class="loader"></span> Updating…';
  try {
    await api('PATCH', `/complaints/${id}/status`, { status, remark });
    toast(`Status updated to "${status.replace('_',' ')}" ✅`, 'success');
    closeStatusModal();
    loadAdminData();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ─── UI Helper — Complaint Card ───────────────────────────────────────────────
function complaintCardHTML(c) {
  return `
    <div class="card complaint-card" onclick="openComplaintDetail('${c.id}')">
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

/** Escape a string for safe use inside an HTML attribute (e.g. onclick='...') */
function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
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

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
function toggleTheme() {
  const root = document.documentElement;
  const isLight = root.classList.toggle('light-mode');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  const toggleBtn = document.getElementById('themeToggle');
  if (toggleBtn) toggleBtn.textContent = isLight ? '🌙' : '☀️';
}

(function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) toggleBtn.textContent = '🌙';
  }
})();

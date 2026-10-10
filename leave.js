/*
  LEAVEDESK APPLICATION
  
  ADMIN CREDENTIALS:
  Username: manager
  Password: Leave2024
  
  Change these in the adminLogin() function if needed.
*/

var applications  = [];
var adminUnlocked = false;
var currentUser   = '';
var notifications = [];

/* ── UTILS ── */
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── TOAST ── */
function toast(msg, type) {
  var wrap = document.getElementById('toastWrap');
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = (type === 'error' ? 'WARNING: ' : 'SUCCESS: ') + msg;
  wrap.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
}

function setDate() {
  document.getElementById('topbarDate').textContent =
    new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function detectRole(id) {
  var u = (id || '').toUpperCase();
  if (u.indexOf('SU') === 0) return 'Student';
  if (u.indexOf('TU') === 0) return 'Teacher';
  if (u.charAt(0) === 'F')   return 'Faculty';
  if (u.charAt(0) === 'T')   return 'Staff';
  if (u.charAt(0) === 'S')   return 'Student';
  return 'Member';
}

/* Update notification badge count */
function updateNotifBadge() {
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  var badge  = document.getElementById('notifBadge');
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

/* ── LOGIN ── */
function userLogin() {
  var u = (document.getElementById('loginUser').value || '').trim();
  var p = (document.getElementById('loginPass').value || '').trim();
  if (!u || !p) {
    document.getElementById('loginErr').classList.add('show');
    return;
  }
  document.getElementById('loginErr').classList.remove('show');
  var users = getUsers();
  if (users[u.toLowerCase()] !== p) {
    toast('Invalid username or password. New here? Create an account first.', 'error');
    return;
  }
  currentUser = u;
  document.getElementById('sideName').textContent   = u;
  document.getElementById('sideAvatar').textContent = u.charAt(0).toUpperCase();
  document.getElementById('loginPage').style.display  = 'none';
  document.getElementById('appShell').style.display   = 'flex';
  setDate();
  renderDashboard();
  toast('Welcome, ' + u + '!');
}

function logout() {
  applications  = [];
  adminUnlocked = false;
  currentUser   = '';
  notifications = [];
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginPage').style.display  = 'flex';
  document.getElementById('appShell').style.display   = 'none';
  updateNotifBadge();
}

/* ── SIDEBAR ── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}

function switchView(name) {
  var viewEl = document.getElementById('view-' + name);
  if (!viewEl) return;
  document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  viewEl.classList.add('active');
  var navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');
  var titles = {
    dashboard: ['Dashboard',      'Overview of your leave activity'],
    apply:     ['Apply for Leave','Submit a new leave request'],
    policy:    ['Leave Policy',   'Your leave entitlements and guidelines'],
    admin:     ['Admin Panel',    'Manage all leave applications']
  };
  if (titles[name]) {
    var tb = document.getElementById('topbarTitle');
    tb.childNodes[0].textContent = titles[name][0] + ' ';
    document.getElementById('topbarSub').textContent = titles[name][1];
  }
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  if (name === 'dashboard') renderDashboard();
  if (name === 'admin')     renderAdminTable();
}

/* ── SUBMIT LEAVE ── */
function submitLeave(e) {
  e.preventDefault();
  var start = document.getElementById('fStart').value;
  var end   = document.getElementById('fEnd').value;
  if (end < start) {
    toast('End date cannot be before start date.', 'error');
    return;
  }
  var app = {
    name:      (document.getElementById('fName').value      || '').trim(),
    id:        (document.getElementById('fId').value        || '').trim(),
    email:     (document.getElementById('fEmail').value     || '').trim(),
    type:      (document.getElementById('fLeaveType').value || '').trim(),
    start:     start,
    end:       end,
    reason:    (document.getElementById('fReason').value    || '').trim(),
    status:    'Pending',
    submitted: new Date().toLocaleString(),
    decidedAt: ''
  };
  applications.push(app);
  document.getElementById('leaveForm').reset();
  toast('Application submitted successfully!');
  switchView('dashboard');
}

/* ── DASHBOARD ── */
function renderDashboard() {
  var ap = applications.filter(function(a){ return a.status === 'Approved'; }).length;
  var pe = applications.filter(function(a){ return a.status === 'Pending';  }).length;
  var re = applications.filter(function(a){ return a.status === 'Rejected'; }).length;
  document.getElementById('statApproved').textContent = ap;
  document.getElementById('statPending').textContent  = pe;
  document.getElementById('statRejected').textContent = re;

  var wrap = document.getElementById('dashboardTable');
  if (!applications.length) {
    wrap.innerHTML = '<div class="empty"><div class="empty-icon">[EMPTY]</div><h4>No applications yet</h4><p>Click <b>Apply for Leave</b> to submit your first request.</p></div>';
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr>'
    + '<th>Name</th><th>ID</th><th>Type</th><th>Dates</th><th>Submitted</th><th>Status</th>'
    + '</tr></thead><tbody>';
  for (var i = 0; i < applications.length; i++) {
    var a  = applications[i];
    var bc = a.status === 'Approved' ? 'badge-approved' : a.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    var ic = a.status === 'Approved' ? 'APR' : a.status === 'Rejected' ? 'REJ' : 'PEN';
    html += '<tr>'
      + '<td class="td-name">' + esc(a.name) + '</td>'
      + '<td><span class="td-id">' + esc(a.id) + '</span></td>'
      + '<td>' + esc(a.type) + '</td>'
      + '<td>' + a.start + ' → ' + a.end + '</td>'
      + '<td style="color:var(--ink3);font-size:12px">' + a.submitted + '</td>'
      + '<td><span class="badge ' + bc + '">' + ic + ' ' + a.status + '</span></td>'
      + '</tr>';
  }
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

/* ── ADMIN LOGIN ── */
function openAdminLogin() {
  if (adminUnlocked) { switchView('admin'); return; }
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
  document.getElementById('adminErr').classList.remove('show');
  document.getElementById('adminLoginModal').classList.add('open');
}

function closeAdminLogin() { 
  document.getElementById('adminLoginModal').classList.remove('open'); 
}

function adminLogin() {
  var u = (document.getElementById('adminUser').value || '').trim();
  var p = (document.getElementById('adminPass').value || '').trim();
  
  // ADMIN CREDENTIALS
  if (u === 'manager' && p === 'Leave2024') {
    adminUnlocked = true;
    closeAdminLogin();
    switchView('admin');
    toast('Welcome, Admin!');
  } else {
    document.getElementById('adminErr').classList.add('show');
  }
}

/* ── ADMIN TABLE ── */
function renderAdminTable() {
  var ap = applications.filter(function(a){ return a.status === 'Approved'; }).length;
  var pe = applications.filter(function(a){ return a.status === 'Pending';  }).length;
  var re = applications.filter(function(a){ return a.status === 'Rejected'; }).length;
  document.getElementById('aStatApproved').textContent = ap;
  document.getElementById('aStatPending').textContent  = pe;
  document.getElementById('aStatRejected').textContent = re;

  var wrap = document.getElementById('adminTableWrap');
  if (!applications.length) {
    wrap.innerHTML = '<div class="empty"><div class="empty-icon">[NONE]</div><h4>No applications</h4><p>No leave requests submitted yet.</p></div>';
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr>'
    + '<th>Name</th><th>ID</th><th>Role</th><th>Email</th><th>Type</th>'
    + '<th>Dates</th><th>Reason</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody>';
  for (var i = 0; i < applications.length; i++) {
    var a   = applications[i];
    var bc  = a.status === 'Approved' ? 'badge-approved' : a.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    var ic  = a.status === 'Approved' ? 'APR' : a.status === 'Rejected' ? 'REJ' : 'PEN';
    var rol = detectRole(a.id);
    html += '<tr>'
      + '<td class="td-name">' + esc(a.name) + '</td>'
      + '<td><span class="td-id">' + esc(a.id) + '</span></td>'
      + '<td>' + rol + '</td>'
      + '<td style="font-size:12px">' + esc(a.email) + '</td>'
      + '<td>' + esc(a.type) + '</td>'
      + '<td style="white-space:nowrap">' + a.start + '<br>→ ' + a.end + '</td>'
      + '<td style="font-size:12px;max-width:140px">' + esc(a.reason) + '</td>'
      + '<td><span class="badge ' + bc + '">' + ic + ' ' + a.status + '</span></td>'
      + '<td><div class="act-row">'
      + (a.status !== 'Approved' ? '<button class="btn btn-primary btn-sm" onclick="setStatus(' + i + ',\'Approved\')">Approve</button>' : '')
      + (a.status !== 'Rejected' ? '<button class="btn btn-danger btn-sm"  onclick="setStatus(' + i + ',\'Rejected\')">Reject</button>'  : '')
      + '<button class="btn btn-ghost btn-sm" onclick="removeApp(' + i + ')">Remove</button>'
      + '</div></td></tr>';
  }
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

function setStatus(i, status) {
  applications[i].status    = status;
  applications[i].decidedAt = new Date().toLocaleString();

  /* Create notification */
  var a = applications[i];
  notifications.unshift({
    id:       Date.now(),
    status:   status,
    name:     a.name,
    type:     a.type,
    start:    a.start,
    end:      a.end,
    decidedAt: a.decidedAt,
    read:     false
  });
  updateNotifBadge();
  renderAdminTable();
  toast('Application ' + status + ' successfully!');
}

function removeApp(i) {
  applications.splice(i, 1);
  renderAdminTable();
  toast('Application removed.');
}

/* ── NOTIFICATIONS MODAL ── */
function openNotifModal() {
  var el = document.getElementById('notifList');
  /* Mark all as read */
  notifications.forEach(function(n){ n.read = true; });
  updateNotifBadge();

  if (!notifications.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px 0">'
      + '<div style="font-size:40px;margin-bottom:12px">[NOTIF]</div>'
      + '<div style="font-weight:600;color:var(--ink2);margin-bottom:6px">No Notifications Yet</div>'
      + '<div style="font-size:13px;color:var(--ink3)">You will be notified here when admin approves or rejects your leave.</div>'
      + '</div>';
  } else {
    var html = '';
    for (var i = 0; i < notifications.length; i++) {
      var n   = notifications[i];
      var ico = n.status === 'Approved' ? 'APR' : 'REJ';
      var cls = n.status === 'Approved' ? 'notif-item unread' : 'notif-item rejected';
      var msg = n.status === 'Approved'
        ? 'Your <b>' + esc(n.type) + '</b> leave has been <b style="color:#1b5e20">Approved</b>!'
        : 'Your <b>' + esc(n.type) + '</b> leave has been <b style="color:#b71c1c">Rejected</b>.';
      html += '<div class="' + cls + '">'
        + '<div class="notif-icon">' + ico + '</div>'
        + '<div class="notif-body">'
        + '<div class="notif-title">' + (n.status === 'Approved' ? 'Leave Approved' : 'Leave Rejected') + '</div>'
        + '<div class="notif-desc">' + msg + '<br>Period: ' + n.start + ' → ' + n.end + '</div>'
        + '<div class="notif-time">TIME: ' + n.decidedAt + '</div>'
        + '</div>'
        + '<button class="notif-clear" onclick="removeNotif(' + i + ')" title="Remove">X</button>'
        + '</div>';
    }
    el.innerHTML = html;
  }
  document.getElementById('notifModal').classList.add('open');
}

function closeNotifModal() { 
  document.getElementById('notifModal').classList.remove('open'); 
}

function removeNotif(i) {
  notifications.splice(i, 1);
  updateNotifBadge();
  openNotifModal();
}

function clearAllNotifs() {
  notifications = [];
  updateNotifBadge();
  openNotifModal();
}

/* ── DARK MODE TOGGLE ── */
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  var icon = document.getElementById('themeIcon');
  if (document.body.classList.contains('dark')) {
    icon.textContent = '☾';
    localStorage.setItem('ld_theme', 'dark');
  } else {
    icon.textContent = '☀';
    localStorage.setItem('ld_theme', 'light');
  }
}

function restoreTheme() {
  var saved = localStorage.getItem('ld_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('themeIcon').textContent = '☾';
  }
}

/* ── KEYBOARD SHORTCUTS ── */
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Enter') return;
  if (document.getElementById('adminLoginModal').classList.contains('open')) { adminLogin();  return; }
  if (document.getElementById('loginPage').style.display !== 'none')         { userLogin();   return; }
});

/* CLOSE MODALS ON BACKDROP CLICK */
document.getElementById('adminLoginModal').addEventListener('click', function(e){ if (e.target===this) closeAdminLogin(); });
document.getElementById('notifModal').addEventListener('click', function(e){ if (e.target===this) closeNotifModal(); });

restoreTheme();
setDate();


/* ── SIGN UP ── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem('ld_users')) || {}; }
  catch (e) { return {}; }
}

function showSignup() {
  document.querySelector('#loginPage .login-card').style.display = 'none';
  document.getElementById('signupCard').style.display = 'block';
  document.getElementById('signupErr').classList.remove('show');
}

function showLogin() {
  document.getElementById('signupCard').style.display = 'none';
  document.querySelector('#loginPage .login-card').style.display = 'block';
}

function userSignup() {
  var u  = (document.getElementById('signUser').value  || '').trim();
  var p  = (document.getElementById('signPass').value  || '').trim();
  var p2 = (document.getElementById('signPass2').value || '').trim();
  var err = document.getElementById('signupErr');
  var msg = '';
  var users = getUsers();

  if (!u || !p || !p2)             msg = 'Please fill in all fields.';
  else if (p.length < 4)           msg = 'Password must be at least 4 characters.';
  else if (p !== p2)               msg = 'Passwords do not match.';
  else if (users[u.toLowerCase()]) msg = 'This username is already taken.';

  if (msg) { err.textContent = msg; err.classList.add('show'); return; }

  err.classList.remove('show');
  users[u.toLowerCase()] = p;
  localStorage.setItem('ld_users', JSON.stringify(users));
  document.getElementById('signUser').value = '';
  document.getElementById('signPass').value = '';
  document.getElementById('signPass2').value = '';
  showLogin();
  document.getElementById('loginUser').value = u;
  document.getElementById('loginPass').value = p;
  userLogin();
}

/* Enter key on sign-up form (runs before the existing Enter handler) */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && document.getElementById('signupCard').style.display === 'block') {
    e.stopPropagation();
    userSignup();
  }
}, true);


/* ── SAVE APPLICATIONS & NOTIFICATIONS (localStorage) ── */
function saveData() {
  try {
    localStorage.setItem('ld_applications',  JSON.stringify(applications));
    localStorage.setItem('ld_notifications', JSON.stringify(notifications));
  } catch (e) {}
}

function loadData() {
  try {
    applications  = JSON.parse(localStorage.getItem('ld_applications'))  || [];
    notifications = JSON.parse(localStorage.getItem('ld_notifications')) || [];
  } catch (e) {
    applications  = [];
    notifications = [];
  }
}

/* Save automatically after every change (existing functions are left untouched) */
['submitLeave', 'setStatus', 'removeApp', 'removeNotif', 'clearAllNotifs'].forEach(function(name) {
  var orig = window[name];
  window[name] = function() {
    var r = orig.apply(this, arguments);
    saveData();
    return r;
  };
});

/* Load saved data when a user signs in */
(function() {
  var origLogin = window.userLogin;
  window.userLogin = function() {
    loadData();
    var r = origLogin.apply(this, arguments);
    updateNotifBadge();
    return r;
  };
})();

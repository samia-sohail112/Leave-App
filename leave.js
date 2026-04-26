
var applications  = [];
var adminUnlocked = false;
var currentUser   = '';
var notifications = []
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
 
function toast(msg, type) {
  var wrap = document.getElementById('toastWrap');
  var t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = (type === 'error' ? '✖  ' : '✔  ') + msg;
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
 
/* ── NOTIFICATION BADGE ── */
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
function openNotifModal() {
  renderNotifList();
  document.getElementById('notifModal').classList.add('open');
}
 
function closeNotifModal() {
  document.getElementById('notifModal').classList.remove('open');
}
 
function renderNotifList() {
  notifications.forEach(function(n){ n.read = true; });
  updateNotifBadge();
 
  var list = document.getElementById('notifList');
  if (!notifications.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon"></div><h4>No notifications</h4><p>Admin decisions will appear here.</p></div>';
    return;
  }
 
  var html = '';
  for (var i = 0; i < notifications.length; i++) {
    var n   = notifications[i];
    var isRej = n.status === 'Rejected';
    var icon  = isRej ? '' : '';
    var cls   = isRej ? 'notif-item rejected' : 'notif-item unread';
    html += '<div class="' + cls + '" id="notif-' + n.id + '">'
      + '<div class="notif-icon">' + icon + '</div>'
      + '<div class="notif-body">'
      + '<div class="notif-title">Leave ' + esc(n.status) + ': ' + esc(n.type) + '</div>'
      + '<div class="notif-desc">Your leave request for <b>' + esc(n.start) + '</b> → <b>' + esc(n.end) + '</b> has been <b>' + esc(n.status).toLowerCase() + '</b>.</div>'
      + '<div class="notif-time">Decided at: ' + esc(n.decidedAt) + '</div>'
      + '</div>'
      + '<button class="notif-clear" onclick="removeNotif(' + n.id + ')" title="Dismiss">✕</button>'
      + '</div>';
  }
  list.innerHTML = html;
}
function removeNotif(id) {
  notifications = notifications.filter(function(n){ return n.id !== id; });
  renderNotifList();
  updateNotifBadge();
}
function clearAllNotifs() {
  notifications = [];
  renderNotifList();
  updateNotifBadge();
}
function userLogin() {
  var u = (document.getElementById('loginUser').value || '').trim();
  var p = (document.getElementById('loginPass').value || '').trim();
  if (!u || !p) {
    document.getElementById('loginErr').classList.add('show');
    return;
  }
  document.getElementById('loginErr').classList.remove('show');
  currentUser = u;
  document.getElementById('sideName').textContent   = u;
  document.getElementById('sideAvatar').textContent = u.charAt(0).toUpperCase();
  document.getElementById('loginPage').style.display  = 'none';
  document.getElementById('appShell').style.display   = 'flex';
  setDate();
  renderDashboard();
  toast('Welcome, ' + u + '! ');
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
    wrap.innerHTML = '<div class="empty"><div class="empty-icon"></div><h4>No applications yet</h4><p>Click <b>Apply for Leave</b> to submit your first request.</p></div>';
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr>'
    + '<th>Name</th><th>ID</th><th>Type</th><th>Dates</th><th>Submitted</th><th>Status</th>'
    + '</tr></thead><tbody>';
  for (var i = 0; i < applications.length; i++) {
    var a  = applications[i];
    var bc = a.status === 'Approved' ? 'badge-approved' : a.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    html += '<tr>'
      + '<td class="td-name">' + esc(a.name) + '</td>'
      + '<td><span class="td-id">' + esc(a.id) + '</span></td>'
      + '<td>' + esc(a.type) + '</td>'
      + '<td>' + a.start + ' &rarr; ' + a.end + '</td>'
      + '<td style="color:var(--ink3);font-size:12px">' + a.submitted + '</td>'
      + '<td><span class="badge ' + bc + '">' + a.status + '</span></td>'
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
function closeAdminLogin() { document.getElementById('adminLoginModal').classList.remove('open'); }
function adminLogin() {
  var u = (document.getElementById('adminUser').value || '').trim();
  var p = (document.getElementById('adminPass').value || '').trim();
  if (u === 'admin' && p === 'admin123') {
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
    wrap.innerHTML = '<div class="empty"><div class="empty-icon"></div><h4>No applications</h4><p>No leave requests submitted yet.</p></div>';
    return;
  }
  var html = '<div class="table-wrap"><table><thead><tr>'
    + '<th>Name</th><th>ID</th><th>Role</th><th>Email</th><th>Type</th>'
    + '<th>Dates</th><th>Reason</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody>';
  for (var i = 0; i < applications.length; i++) {
    var a   = applications[i];
    var bc  = a.status === 'Approved' ? 'badge-approved' : a.status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    var rol = detectRole(a.id);
 
    
    var actionBtns = '';
    if (a.status === 'Pending') {
      actionBtns += '<button class="btn btn-primary btn-sm" onclick="setStatus(' + i + ',\'Approved\')">Approve</button>';
      actionBtns += '<button class="btn btn-danger btn-sm"  onclick="setStatus(' + i + ',\'Rejected\')">Reject</button>';
    } else {
      actionBtns += '<span style="font-size:12px;color:var(--ink3);font-style:italic">Decided</span>';
    }
   
    actionBtns += '<button class="btn btn-ghost btn-sm" onclick="removeApp(' + i + ')">Remove</button>';
 
    html += '<tr>'
      + '<td class="td-name">' + esc(a.name) + '</td>'
      + '<td><span class="td-id">' + esc(a.id) + '</span></td>'
      + '<td>' + rol + '</td>'
      + '<td style="font-size:12px">' + esc(a.email) + '</td>'
      + '<td>' + esc(a.type) + '</td>'
      + '<td style="white-space:nowrap">' + a.start + '<br>&rarr; ' + a.end + '</td>'
      + '<td style="font-size:12px;max-width:140px">' + esc(a.reason) + '</td>'
      + '<td><span class="badge ' + bc + '">' + a.status + '</span></td>'
      + '<td><div class="act-row">' + actionBtns + '</div></td></tr>';
  }
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}
 
/* ── SET STATUS ── */
function setStatus(i, status) {
  applications[i].status    = status;
  applications[i].decidedAt = new Date().toLocaleString();
 
  var a = applications[i];
  notifications.unshift({
    id:        Date.now(),
    status:    status,
    name:      a.name,
    type:      a.type,
    start:     a.start,
    end:       a.end,
    decidedAt: a.decidedAt,
    read:      false
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
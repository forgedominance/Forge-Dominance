(function() {
  var DEFAULT_TIMEOUT = 5 * 60 * 1000;
  var HEARTBEAT_INTERVAL = 60 * 1000;
  var inactivityTimeout = DEFAULT_TIMEOUT;
  var inactivityTimer = null;
  var heartbeatTimer = null;

  function loadSessionConfig() {
    var token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/settings/session-config', {
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function(r) { return r.json(); }).then(function(res) {
      var seconds = res && res.data && res.data.sessionTimeoutSeconds;
      if (seconds && seconds > 0) {
        inactivityTimeout = seconds * 1000;
        resetInactivityTimer();
      }
    }).catch(function() {});
  }

  function sendHeartbeat() {
    var token = localStorage.getItem('auth_token');
    var sessionId = localStorage.getItem('session_id');
    if (!token || !sessionId) return;
    fetch('/api/tracking/admin/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ sessionId: sessionId })
    }).catch(function() {});
  }

  function startHeartbeat() {
    clearInterval(heartbeatTimer);
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    clearInterval(heartbeatTimer);
  }

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(function() {
      stopHeartbeat();
      alert('Session expired due to inactivity. Please log in again.');
      if (typeof AuthService !== 'undefined' && AuthService.logout) AuthService.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/admin/login.html';
    }, inactivityTimeout);
  }

  ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function(event) {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });

  resetInactivityTimer();
  startHeartbeat();
  loadSessionConfig();
})();



(function() {
  var INACTIVITY_TIMEOUT = 30 * 60 * 1000;
  var inactivityTimer = null;

  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(function() {
      alert('Session expired due to inactivity. Please log in again.');
      if (typeof AuthService !== 'undefined' && AuthService.logout) AuthService.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/admin/login.html';
    }, INACTIVITY_TIMEOUT);
  }

  ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(function(event) {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });

  resetInactivityTimer();
})();

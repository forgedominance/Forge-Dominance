/* login-page.js — Admin login/auth form handler */
    var query = window.$ || function(selector) { return document.querySelector(selector); };
    var queryAll = window.$$ || function(selector) { return document.querySelectorAll(selector); };
    var clearForm = window.clearForm || function(form) { form.reset(); };
    var validateEmail = window.validateEmail || function(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); };
    var validatePassword = window.validatePassword || function(pwd) { return !!pwd && pwd.length >= 8; };

      // Check if already logged in
      if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
        window.location.href = '/admin/dashboard.html';
      }

    // Fallback check if window load doesn't fire in time
    setTimeout(() => {
        if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
        window.location.href = '/admin/dashboard.html';
      }
    }, 100);

    const loginParams = new URLSearchParams(window.location.search);
    const loginForm = query('#loginForm');
    const resetForm = query('#resetForm');
    const otpForm = query('#otpForm');
    const newPasswordForm = query('#newPasswordForm');
    const alertBox = query('#alertBox');
    const otpCodeTimer = query('#otpCodeTimer');
    const resetCodeTimer = query('#resetCodeTimer');
    const resendOtpBtn = query('#resendOtpBtn');
    const resendResetCodeBtn = query('#resendResetCodeBtn');
    let resetEmail = '';
    let resetCode = '';
    let tempToken = '';
    let otpMode = 'reset';
    let resetToken = '';
    let codeTimerHandle = null;
    let resendTimerHandle = null;
    let codeExpiresAt = 0;
    let resendAvailableAt = 0;

    const presetEmail = loginParams.get('email');
    const presetPassword = loginParams.get('password');
    if (presetEmail) loginForm.email.value = presetEmail;
    if (presetPassword) loginForm.password.value = presetPassword;
    if (presetEmail || presetPassword) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // ===== PASSWORD TOGGLE =====
    query('.toggle-password').addEventListener('click', function(e) {
      e.preventDefault();
      const btn = this;
      const input = btn.closest('.pw-wrapper').querySelector('input');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.innerHTML = isHidden
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });

    // ===== SHOW ALERT =====
    function showAlert(message, type = 'error') {
      alertBox.className = `alert-box show ${type}`;
      alertBox.textContent = message;
    }

    function clearAlert() {
      alertBox.className = 'alert-box';
      alertBox.textContent = '';
    }

    function clearTimers() {
      if (codeTimerHandle) clearInterval(codeTimerHandle);
      if (resendTimerHandle) clearInterval(resendTimerHandle);
      codeTimerHandle = null;
      resendTimerHandle = null;
      codeExpiresAt = 0;
      resendAvailableAt = 0;
      otpCodeTimer.textContent = 'Code expires in 05:00';
      resetCodeTimer.textContent = 'Code expires in 05:00';
      resendOtpBtn.disabled = true;
      resendResetCodeBtn.disabled = true;
      resendOtpBtn.textContent = 'Request New Code';
      resendResetCodeBtn.textContent = 'Request New Code';
    }

    function formatCountdown(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const minutes = String(Math.floor(total / 60)).padStart(2, '0');
      const seconds = String(total % 60).padStart(2, '0');
      return `${minutes}:${seconds}`;
    }

    function startCodeTimers({ expiresIn = 300, resendIn = 60, mode = 'reset' } = {}) {
      clearTimers();
      const now = Date.now();
      codeExpiresAt = now + (expiresIn * 1000);
      resendAvailableAt = now + (resendIn * 1000);
      const codeTimerEl = mode === 'login' ? otpCodeTimer : resetCodeTimer;
      const resendBtn = mode === 'login' ? resendOtpBtn : resendResetCodeBtn;
      const resendTextBase = 'Request New Code';

      const update = () => {
        const codeRemaining = codeExpiresAt - Date.now();
        codeTimerEl.textContent = `Code expires in ${formatCountdown(codeRemaining)}`;
        if (codeRemaining <= 0) {
          codeTimerEl.textContent = 'Code expired';
          resendBtn.disabled = false;
          resendBtn.textContent = resendTextBase;
          clearInterval(codeTimerHandle);
        }

        const resendRemaining = resendAvailableAt - Date.now();
        if (resendRemaining > 0) {
          resendBtn.disabled = true;
          resendBtn.textContent = `Request New Code (${formatCountdown(resendRemaining)})`;
        } else {
          resendBtn.disabled = false;
          resendBtn.textContent = resendTextBase;
          clearInterval(resendTimerHandle);
        }
      };

      update();
      codeTimerHandle = setInterval(update, 1000);
      resendTimerHandle = setInterval(update, 1000);
    }

    // ===== SWITCH FORMS =====
    function showForm(form) {
      [loginForm, resetForm, otpForm, newPasswordForm].forEach(f => f.classList.remove('form-active'));
      form.classList.add('form-active');
      clearAlert();
    }

    query('#forgotPasswordLink').addEventListener('click', (e) => {
      e.preventDefault();
      clearTimers();
      showForm(resetForm);
    });

    query('#backToLoginBtn').addEventListener('click', () => {
      showForm(loginForm);
      clearForm(resetForm);
      resetEmail = '';
      resetCode = '';
      resetToken = '';
      clearTimers();
    });

    query('#backToResetBtn').addEventListener('click', () => {
      showForm(resetForm);
      clearForm(otpForm);
      clearTimers();
    });

    // ===== OTP INPUT HANDLING =====
    const otpInputs = queryAll('.otp-input');
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
        updateOtpCode();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && index > 0 && !e.target.value) {
          otpInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').substring(0, 6);
        digits.split('').forEach((digit, i) => {
          if (i < otpInputs.length) {
            otpInputs[i].value = digit;
          }
        });
        updateOtpCode();
        if (digits.length === 6) {
          otpInputs[5].focus();
        }
      });
    });

    function updateOtpCode() {
      const code = Array.from(otpInputs).map(input => input.value).join('');
      query('#otpCodeInput').value = code;
    }

    // ===== LOGIN FORM =====
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = loginForm.email.value.trim();
      const password = loginForm.password.value;

      if (!email || !password) {
        showAlert('Email and password are required', 'error');
        return;
      }

      const btn = loginForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner">⟳</span> Signing in...';

      try {
        const data = await AuthService.login(email, password);

        if (data.error) {
          showAlert(data.error, 'error');
          return;
        }

        if (data.twoFactorRequired) {
          otpMode = 'login';
          resetEmail = email;
          tempToken = data.tempToken || '';
          showForm(otpForm);

          var qrContainer = document.getElementById('otpQrContainer');
          var otpHelp = document.getElementById('otpFormHelp');
          var timerRow = document.getElementById('otpTimerRow');
          qrContainer.style.display = 'none';
          timerRow.style.display = '';
          resendOtpBtn.style.display = '';

          if (data.method === 'authenticator') {
            otpHelp.textContent = 'Enter the 6-digit code from your authenticator app.';
            timerRow.style.display = 'none';
          } else if (data.method === 'authenticator-setup') {
            otpHelp.textContent = 'Scan the QR code with your authenticator app, then enter the 6-digit code.';
            timerRow.style.display = 'none';
            if (data.qrCode) {
              document.getElementById('otpQrImage').src = data.qrCode;
              qrContainer.style.display = 'block';
            }
          } else {
            otpHelp.textContent = 'Enter the 6-digit code sent to your email.';
            startCodeTimers({ expiresIn: data.expiresIn || 300, resendIn: data.resendAvailableIn || 60, mode: 'login' });
          }

          if (data.method === 'email') {
            showAlert('Verification code sent to ' + email, 'info');
          } else {
            showAlert(data.message || 'Enter your authenticator code', 'info');
          }
          otpInputs[0].focus();
        } else if (data.accessToken && data.user) {
          showAlert('Login successful, redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/admin/dashboard.html';
          }, 500);
        } else {
          showAlert(data.error || 'Login failed', 'error');
        }
      } catch (error) {
        showAlert(error.message || 'Login failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Sign In';
      }
    });

    // ===== PASSWORD RESET REQUEST =====
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = resetForm.resetEmail.value.trim();

      if (!validateEmail(email)) {
        showAlert('Please enter a valid email address', 'error');
        return;
      }

      const btn = resetForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner">⟳</span> Sending code...';

      try {
        otpMode = 'reset';
        const response = await AuthService.requestPasswordReset(email);
        resetEmail = email;
        resetToken = response.resetToken || '';
        showForm(otpForm);
        startCodeTimers({ expiresIn: response.expiresIn || 300, resendIn: response.resendAvailableIn || 60, mode: 'reset' });
        showAlert(`Verification code sent to ${email}`, 'success');
        otpInputs[0].focus();
      } catch (error) {
        showAlert(error.message || 'Failed to send reset code', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Send Reset Code';
      }
    });

    // ===== OTP VERIFICATION =====
    otpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const code = query('#otpCodeInput').value;

      if (code.length !== 6) {
        showAlert('Please enter all 6 digits', 'error');
        return;
      }

      const btn = otpForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner">⟳</span> Verifying...';

      try {
        if (otpMode === 'login') {
          const data = await AuthService.verifySMSOtp(tempToken, code);

          if (data.accessToken || data.token) {
            showAlert('Login successful, redirecting...', 'success');
            setTimeout(() => {
              window.location.href = '/admin/dashboard.html';
            }, 500);
          } else {
            showAlert(data.error || 'Invalid code', 'error');
          }
          return;
        }

        const verification = await AuthService.verifyResetCode(resetEmail, code);
        resetCode = code;
        tempToken = verification.resetToken || '';
        resetToken = verification.resetToken || resetToken;
        showForm(newPasswordForm);
        showAlert('Code verified! Please enter your new password', 'success');
      } catch (error) {
        showAlert(error.message || 'Verification failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Verify Code';
      }
    });

    // ===== NEW PASSWORD FORM =====
    newPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const newPassword = newPasswordForm.newPassword.value;
      const confirmPassword = newPasswordForm.confirmPassword.value;

      if (!validatePassword(newPassword)) {
        showAlert('Password must be at least 8 characters', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
      }

      const btn = newPasswordForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="loading-spinner">⟳</span> Resetting...';

      try {
        await AuthService.resetPassword(resetEmail, resetCode, newPassword);
        showAlert('Password reset successful! Redirecting to login...', 'success');
        setTimeout(() => {
          showForm(loginForm);
          clearForm(newPasswordForm);
          otpInputs.forEach(input => input.value = '');
          tempToken = '';
          resetCode = '';
          resetEmail = '';
          resetToken = '';
          clearTimers();
        }, 1500);
      } catch (error) {
        showAlert(error.message || 'Password reset failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Reset Password';
      }
    });

    resendOtpBtn.addEventListener('click', async () => {
      if (!tempToken) return;
      resendOtpBtn.disabled = true;
      try {
        const response = await AuthService.resendTwoFactorCode(tempToken);
        startCodeTimers({ expiresIn: response.expiresIn || 300, resendIn: response.resendAvailableIn || 60, mode: 'login' });
        showAlert('A new verification code has been sent', 'success');
      } catch (error) {
        showAlert(error.message || 'Could not resend code', 'error');
      }
    });

    resendResetCodeBtn.addEventListener('click', async () => {
      if (!resetToken) return;
      resendResetCodeBtn.disabled = true;
      try {
        const response = await AuthService.resendResetCode(resetToken);
        startCodeTimers({ expiresIn: response.expiresIn || 300, resendIn: response.resendAvailableIn || 60, mode: 'reset' });
        showAlert('A new reset code has been sent', 'success');
      } catch (error) {
        showAlert(error.message || 'Could not resend reset code', 'error');
      }
    });



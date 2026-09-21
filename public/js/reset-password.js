document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = urlParams.get('email');

  if (targetEmail) {
    document.getElementById('reset-target-email').textContent = `Reset code sent to ${targetEmail}`;
  }

  const form = document.getElementById('reset-form');
  const btn = document.getElementById('reset-btn');
  const errorBox = document.getElementById('reset-error');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('reset-otp').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!targetEmail) {
      errorBox.textContent = 'Email address missing. Please request a password reset again.';
      errorBox.style.display = 'block';
      setTimeout(() => window.location.href = '/forgot-password.html', 1500);
      return;
    }

    if (!otpCode || !newPassword) {
      errorBox.textContent = 'Please enter both the 6-digit reset code and your new password.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Resetting Password...`;

    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, otp_code: otpCode, new_password: newPassword })
      });

      showToast(res.message, 'success');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Reset Password & Sign In`;
    }
  };
});

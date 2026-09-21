document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  const btn = document.getElementById('forgot-btn');
  const errorBox = document.getElementById('forgot-error');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value.trim();

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!email) {
      errorBox.textContent = 'Please enter your registered email address.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP Code...`;

    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      showToast(res.message, 'success');
      setTimeout(() => {
        window.location.href = `/reset-password.html?email=${encodeURIComponent(email)}`;
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Password Reset OTP`;
    }
  };
});

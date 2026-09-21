document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const btn = document.getElementById('reg-btn');
  const errorBox = document.getElementById('register-error');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!fullName || !email || !password) {
      errorBox.textContent = 'Please fill in all required fields to register.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`;

    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password })
      });

      showToast(res.message, 'success');
      setTimeout(() => {
        window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Verification OTP`;
    }
  };
});

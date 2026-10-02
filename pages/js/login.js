const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let toastTimer;

Auth.redirectIfAuthenticated('index.html');

function showToast(message, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = '', 3200);
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('loginTab').classList.toggle('active', isLogin);
  document.getElementById('registerTab').classList.toggle('active', !isLogin);
  document.getElementById('loginTab').setAttribute('aria-selected', String(isLogin));
  document.getElementById('registerTab').setAttribute('aria-selected', String(!isLogin));
  document.getElementById('loginPanel').classList.toggle('active', isLogin);
  document.getElementById('registerPanel').classList.toggle('active', !isLogin);
  clearAllErrors();
  setTimeout(() => document.getElementById(isLogin ? 'loginEmail' : 'firstName').focus(), 60);
}

function togglePassword(id, button) {
  const input = document.getElementById(id);
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}

function setLoading(buttonId, loading, label) {
  const button = document.getElementById(buttonId);
  button.disabled = loading;
  button.innerHTML = loading ? '<span class="spinner"></span> Please wait' : label;
}

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  input.classList.toggle('invalid', Boolean(message));
  error.textContent = message || '';
  error.classList.toggle('show', Boolean(message));
}

function clearAllErrors() {
  [
    ['loginEmail','loginEmailError'],
    ['loginPassword','loginPasswordError'],
    ['firstName','firstNameError'],
    ['lastName','lastNameError'],
    ['registerEmail','registerEmailError'],
    ['registerPassword','registerPasswordError'],
    ['confirmPassword','confirmPasswordError'],
  ].forEach(([input,error]) => setFieldError(input, error, ''));
}

function validateLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;

  if (!email) {
    setFieldError('loginEmail', 'loginEmailError', 'Email is required');
    valid = false;
  } else if (!emailPattern.test(email)) {
    setFieldError('loginEmail', 'loginEmailError', 'Enter a valid email address');
    valid = false;
  }

  if (!password) {
    setFieldError('loginPassword', 'loginPasswordError', 'Password is required');
    valid = false;
  }

  return valid;
}

function validateRegister() {
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  let valid = true;

  if (!firstName) { setFieldError('firstName', 'firstNameError', 'First name is required'); valid = false; }
  if (!lastName) { setFieldError('lastName', 'lastNameError', 'Last name is required'); valid = false; }
  if (!email) {
    setFieldError('registerEmail', 'registerEmailError', 'Email is required');
    valid = false;
  } else if (!emailPattern.test(email)) {
    setFieldError('registerEmail', 'registerEmailError', 'Enter a valid email address');
    valid = false;
  }
  if (password.length < 8) {
    setFieldError('registerPassword', 'registerPasswordError', 'Password must be at least 8 characters');
    valid = false;
  }
  if (confirm !== password) {
    setFieldError('confirmPassword', 'confirmPasswordError', 'Confirm password must match');
    valid = false;
  }

  return valid;
}

function updateStrength() {
  const value = document.getElementById('registerPassword').value;
  const bar = document.getElementById('strengthBar');
  const text = document.getElementById('strengthText');
  let score = 0;

  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#b83232', '#b83232', '#d97706', '#4a8c5c', '#15803d'];
  bar.style.width = `${Math.max(score, value ? 1 : 0) * 25}%`;
  bar.style.background = colors[score] || '#b83232';
  text.textContent = labels[score] || 'Weak';
}

document.getElementById('loginPanel').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAllErrors();
  if (!validateLogin()) return;

  setLoading('loginButton', true, 'Login');
  try {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const data = await Auth.login(email, password);
    showToast('Login successful');
    const target = data.user?.role === 'admin' ? 'admin-panel.html' : 'index.html';
    setTimeout(() => window.location.replace(target), 650);
  } catch (error) {
    showToast(error.message || 'Login failed', true);
  } finally {
    setLoading('loginButton', false, 'Login');
  }
});

document.getElementById('registerPanel').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearAllErrors();
  if (!validateRegister()) return;

  setLoading('registerButton', true, 'Create Account');
  try {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const regData = await Auth.register(firstName, lastName, email, password);
    showToast('Account created successfully');
    const regTarget = regData.user?.role === 'admin' ? 'admin-panel.html' : 'index.html';
    setTimeout(() => window.location.replace(regTarget), 650);
  } catch (error) {
    showToast(error.message || 'Registration failed', true);
  } finally {
    setLoading('registerButton', false, 'Create Account');
  }
});

function forgotPassword(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  setFieldError('loginEmail', 'loginEmailError', '');
  if (!email || !emailPattern.test(email)) {
    setFieldError('loginEmail', 'loginEmailError', 'Enter your email first');
    return;
  }
  showToast('Forgot Password placeholder - reset email flow is ready for backend email delivery');
}

document.getElementById('registerPassword').addEventListener('input', updateStrength);
document.querySelectorAll('input').forEach((input) => {
  input.addEventListener('input', () => {
    const errorId = input.id + 'Error';
    if (document.getElementById(errorId)) setFieldError(input.id, errorId, '');
  });
});
document.getElementById('loginEmail').focus();

function ensureToken() {
  const existing = API.getToken();
  if (existing) return existing;
  const token = `demo-token-${Date.now()}`;
  API.setToken(token);
  return token;
}

document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('signupName')?.value?.trim() || '';
  const email = document.getElementById('signupEmail')?.value?.trim() || '';

  if (!name || !email) {
    await window.showAppAlert('Please enter your name and email.');
    return;
  }

  localStorage.setItem('ff_userName', name);
  localStorage.setItem('ff_userEmail', email);
  if (!localStorage.getItem('ff_accountCreated')) {
    localStorage.setItem('ff_accountCreated', new Date().toISOString());
  }
  ensureToken();

  await window.showAppAlert('Account created! Redirecting to your dashboard...', 'success');
  window.location.href = 'dashboard.html';
});


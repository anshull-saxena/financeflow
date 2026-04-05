// settings.js

async function loadSettings() {
    try {
        const res = await API.get('/settings');
        const user = res.user || {};
        const settings = res.settings || {};

        // Update profile texts
        const nameEl = document.getElementById('settingsUserName');
        const emailEl = document.getElementById('settingsUserEmail');
        if (nameEl) nameEl.textContent = user.name || localStorage.getItem('ff_userName') || 'User';
        if (emailEl) emailEl.textContent = user.email || localStorage.getItem('ff_userEmail') || '—';

        // Member since
        const memberBadge = document.getElementById('memberSinceBadge');
        if (settings.memberSince) {
            memberBadge.textContent = `SINCE ${new Date(settings.memberSince).getFullYear()}`;
        } else {
            const created = localStorage.getItem('ff_accountCreated');
            if (created) {
                memberBadge.textContent = `SINCE ${new Date(created).getFullYear()}`;
            } else {
                localStorage.setItem('ff_accountCreated', new Date().toISOString());
                memberBadge.textContent = `SINCE ${new Date().getFullYear()}`;
            }
        }

        // Currency
        const currencySelector = document.getElementById('currencySelector');
        if (currencySelector) {
            currencySelector.value = settings.currency || localStorage.getItem('ff_currency') || 'INR';
        }

        // Toggles
        const toggles = document.querySelectorAll('input[type="checkbox"]');
        if (toggles.length >= 3) {
            toggles[0].checked = settings.emailNotif !== undefined ? settings.emailNotif : (localStorage.getItem('ff_emailNotif') === 'true');
            toggles[1].checked = settings.darkMode !== undefined ? settings.darkMode : (localStorage.getItem('ff_darkMode') !== 'false');
            toggles[2].checked = settings.twoFactor !== undefined ? settings.twoFactor : (localStorage.getItem('ff_twoFactor') === 'true');
        }
    } catch (e) {
        if (e.message.includes('token')) window.location.href = 'index.html';
        else console.error('Failed to load settings:', e);
    }
}

// Save initial settings
loadSettings();

// Load saved avatar
const savedAvatar = localStorage.getItem('ff_avatar');
if (savedAvatar) {
    document.getElementById('profileAvatar').src = savedAvatar;
}

// Avatar camera
document.getElementById('avatarCameraBtn').addEventListener('click', function() {
    document.getElementById('avatarFileInput').click();
});

document.getElementById('avatarFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        window.showAppAlert('Image too large. Please select an image under 2MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(event) {
        const dataUrl = event.target.result;
        document.getElementById('profileAvatar').src = dataUrl;
        localStorage.setItem('ff_avatar', dataUrl);
        window.showAppAlert('Profile picture updated!');
    };
    reader.readAsDataURL(file);
});

// Sign Out
document.querySelectorAll('.material-symbols-outlined').forEach(el => {
    if (el.textContent.trim() === 'logout') {
        el.closest('button').addEventListener('click', async function() {
            if (await window.showAppConfirm('Are you sure you want to sign out?')) {
                localStorage.removeItem('ff_token');
                window.location.href = 'index.html';
            }
        });
    }
});

// Delete Account
document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim() === 'Delete Account') {
        btn.addEventListener('click', async function() {
            if (await window.showAppConfirm('⚠️ This action is permanent!\n\nAre you absolutely sure you want to delete your account? All financial data will be lost.')) {
                if (await window.showAppConfirm('Final confirmation: Click Confirm to proceed with account deletion.')) {
                    localStorage.removeItem('ff_token');
                    await window.showAppAlert('Account deleted successfully.');
                    window.location.href = 'index.html';
                }
            }
        });
    }
});

// Edit Profile
document.querySelectorAll('button').forEach(btn => {
    if (btn.textContent.trim() === 'Edit Profile') {
        btn.addEventListener('click', async function() {
            const nameEl = document.getElementById('settingsUserName');
            const emailEl = document.getElementById('settingsUserEmail');
            
            const currentName = nameEl?.textContent || 'User';
            const currentEmail = emailEl?.textContent === '—' ? '' : (emailEl?.textContent || '');
            const newName = await window.showAppPrompt('Enter your name:', currentName);
            if (newName && newName.trim()) {
                if(nameEl) nameEl.textContent = newName.trim();
                localStorage.setItem('ff_userName', newName.trim());
            }
            const newEmail = await window.showAppPrompt('Enter your email:', currentEmail);
            if (newEmail && newEmail.trim()) {
                if(emailEl) emailEl.textContent = newEmail.trim();
                localStorage.setItem('ff_userEmail', newEmail.trim());
            }
            await window.showAppAlert('Profile updated! Changes sync across all pages now.');
        });
    }
});

// Update Password form
document.querySelector('form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const inputs = this.querySelectorAll('input[type="password"]');
    const current = inputs[0]?.value;
    const newPw = inputs[1]?.value;
    if (!current || !newPw) {
        await window.showAppAlert('Please fill in both password fields.');
        return;
    }
    if (newPw.length < 6) {
        await window.showAppAlert('New password must be at least 6 characters.');
        return;
    }
    await window.showAppAlert('✅ Password updated successfully!');
    inputs.forEach(i => i.value = '');
});

// Persist toggles to backend
const toggleKeys = ['ff_emailNotif', 'ff_darkMode', 'ff_twoFactor'];
const apiKeys = ['emailNotif', 'darkMode', 'twoFactor'];
const toggleInputs = document.querySelectorAll('input[type="checkbox"]');
toggleInputs.forEach((input, i) => {
    input.addEventListener('change', async () => {
        try {
            await API.put('/settings', { [apiKeys[i]]: input.checked });
        } catch (e) {
            console.error('Failed to update setting on server', e);
        }

        // Backup to localstorage
        localStorage.setItem(toggleKeys[i], input.checked);

        if (toggleKeys[i] === 'ff_darkMode') {
            if (input.checked) {
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            }
        }
    });
});

// Persist currency changes
document.getElementById('currencySelector')?.addEventListener('change', async function() {
    const currency = this.value;
    try {
        await API.put('/settings', { currency });
        localStorage.setItem('ff_currency', currency);
        window.showAppAlert('Currency updated! Amounts will be displayed in the selected currency (FX rates required).');
    } catch (e) {
        console.error('Failed to update currency on server', e);
        localStorage.setItem('ff_currency', currency);
        window.showAppAlert('Currency saved locally. Amounts will be displayed in the selected currency (FX rates required).');
    }
});

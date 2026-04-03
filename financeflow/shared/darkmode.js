// Dark Mode Manager - Load immediately before page renders
(function() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
})();

const DarkMode = {
  // Toggle dark mode instantly
  toggle() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    
    // Update toggle checkbox if exists
    const toggle = document.getElementById('dark-mode');
    if (toggle) toggle.checked = isDark;
    
    return isDark;
  },
  
  // Set dark mode explicitly
  set(enabled) {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', enabled);
    
    // Update toggle checkbox if exists
    const toggle = document.getElementById('dark-mode');
    if (toggle) toggle.checked = enabled;
  },
  
  // Get current state
  isEnabled() {
    return document.documentElement.classList.contains('dark');
  }
};


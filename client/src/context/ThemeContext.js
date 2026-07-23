import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  currentTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  syncTheme: () => {},
});

function getActiveAccountInfo() {
  try {
    const raw = localStorage.getItem('currentUser') || localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      const id = user?._id || user?.id || user?.email;
      if (id) {
        return { id: String(id), role: user?.role || 'user' };
      }
    }
  } catch (e) {}
  return { id: 'guest', role: 'guest' };
}

function getAccountThemeKey() {
  const { id } = getActiveAccountInfo();
  return `user_theme_${id}`;
}

function getSavedThemeForAccount() {
  const key = getAccountThemeKey();
  const saved = localStorage.getItem(key);
  if (saved) return saved === 'light' ? 'light' : 'dark';

  // Legacy fallback migration check
  const legacyKey = key.includes('guest') ? 'user-theme' : null;
  if (legacyKey) {
    const legacySaved = localStorage.getItem(legacyKey);
    if (legacySaved) return legacySaved === 'light' ? 'light' : 'dark';
  }

  return 'dark';
}

function applyThemeToDOM(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(getSavedThemeForAccount);
  const [activeAccountId, setActiveAccountId] = useState(() => getActiveAccountInfo().id);

  const syncTheme = () => {
    const account = getActiveAccountInfo();
    setActiveAccountId(account.id);
    const theme = getSavedThemeForAccount();
    setCurrentTheme(theme);
    applyThemeToDOM(theme);
  };

  useEffect(() => {
    syncTheme();

    const handleStorageChange = () => syncTheme();
    const handleAuthChange = () => syncTheme();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);

    const interval = setInterval(() => {
      const currentAccount = getActiveAccountInfo();
      if (currentAccount.id !== activeAccountId) {
        syncTheme();
      }
    }, 400);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
      clearInterval(interval);
    };
  }, [activeAccountId]);

  const setTheme = (newTheme) => {
    const normalized = newTheme === 'light' ? 'light' : 'dark';
    const key = getAccountThemeKey();
    localStorage.setItem(key, normalized);
    localStorage.setItem('user-theme', normalized);
    setCurrentTheme(normalized);
    applyThemeToDOM(normalized);
  };

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, toggleTheme, syncTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
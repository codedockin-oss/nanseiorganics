(function () {
  function fallbackClearSession() {
    [
      'nansai_token',
      'nansai_user',
      'nansai_activity',
      'token',
      'user',
      'authToken',
      'jwt',
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${location.hostname}`;
    });
  }

  window.NanseiAuth = {
    clearSession() {
      if (window.Auth && typeof window.Auth.clearSession === 'function') {
        window.Auth.clearSession();
      } else {
        fallbackClearSession();
      }
    },

    logout(redirectTo = 'login.html') {
      if (window.Auth && typeof window.Auth.logout === 'function') {
        window.Auth.logout(redirectTo);
        return;
      }
      fallbackClearSession();
      window.location.href = redirectTo;
    },

    requireAuth(loginPath = 'login.html') {
      if (window.Auth && typeof window.Auth.requireAuth === 'function') {
        return window.Auth.requireAuth(loginPath);
      }
      if (!localStorage.getItem('nansai_token')) {
        fallbackClearSession();
        window.location.replace(loginPath);
        return false;
      }
      return true;
    },
  };
})();

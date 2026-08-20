import { useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'Administrador' | 'Suporte' | 'Colaborador';
  department?: string;
  csrfToken?: string;
  mustChangePassword?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // OAuth Popup Handler
  const loginWithMicrosoft = useCallback(async () => {
    setAuthError(null);
    try {
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        throw new Error('Não foi possível obter a URL de autenticação.');
      }

      const { url } = await response.json();

      // Open the OAuth provider URL directly in the popup (not an app route)
      const popupWidth = 600;
      const popupHeight = 700;
      const left = window.screen.width / 2 - popupWidth / 2;
      const top = window.screen.height / 2 - popupHeight / 2;

      const authWindow = window.open(
        url,
        'microsoft_oauth_popup',
        `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );

      if (!authWindow) {
        setAuthError('Bloqueador de pop-ups ativo. Por favor, habilite pop-ups para fazer login.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro ao iniciar o login.');
    }
  }, []);

  // Logout Handler
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  }, []);

  // Listen to popup authentication events
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Accept messages ONLY from exact same origin
      if (origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchSession();
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [fetchSession]);

  return {
    user,
    loading,
    authError,
    loginWithMicrosoft,
    logout,
    refreshSession: fetchSession
  };
}

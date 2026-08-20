import { useState, useEffect } from 'react';

export function navigate(path: string) {
  if (!path.startsWith('#')) {
    path = '#' + path;
  }
  window.location.hash = path;
}

export function useRouter() {
  const [route, setRoute] = useState<string>(() => window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return { route, navigate };
}

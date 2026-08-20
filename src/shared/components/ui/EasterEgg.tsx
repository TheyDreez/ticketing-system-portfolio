import React, { useEffect, useState } from 'react';

export const EasterEgg: React.FC = () => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    let typed = '';
    const secretCode = 'twerk'; // A palavra secreta!
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando num input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      
      typed += e.key.toLowerCase();
      if (typed.length > secretCode.length) {
        typed = typed.slice(-secretCode.length);
      }
      
      if (typed === secretCode) {
        setShow(true);
        setTimeout(() => setShow(false), 4000); // Fica rebolando por 4 segundos
        typed = '';
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[9999] pointer-events-none animate-bounce">
      <img 
        src="/twerk.gif" 
        alt="Easter Egg" 
        className="w-20 h-20 drop-shadow-2xl"
      />
    </div>
  );
};

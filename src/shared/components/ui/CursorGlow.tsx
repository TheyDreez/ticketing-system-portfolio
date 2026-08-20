import React, { useEffect, useRef } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const glowPos = useRef({ x: -1000, y: -1000 });
  const isVisible = useRef(false);

  useEffect(() => {
    // Only enable on devices with fine pointer (mouse)
    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible.current && glowRef.current) {
        isVisible.current = true;
        glowPos.current = { x: e.clientX, y: e.clientY };
        glowRef.current.style.transform = `translate3d(${e.clientX - 300}px, ${e.clientY - 300}px, 0)`;
        glowRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (isVisible.current && glowRef.current) {
        isVisible.current = false;
        glowRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    const updateGlow = () => {
      if (glowRef.current && isVisible.current) {
        // Lerp for smooth follow
        glowPos.current.x += (mousePos.current.x - glowPos.current.x) * 0.15;
        glowPos.current.y += (mousePos.current.y - glowPos.current.y) * 0.15;

        // Apply via translate3d for hardware acceleration
        // Size is 600x600, so offset by -300px to center on cursor
        glowRef.current.style.transform = `translate3d(${glowPos.current.x - 300}px, ${glowPos.current.y - 300}px, 0)`;
      }
      requestRef.current = requestAnimationFrame(updateGlow);
    };

    requestRef.current = requestAnimationFrame(updateGlow);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none z-[9999] opacity-0 transition-opacity duration-500"
      style={{
        // Using accent-light for a subtle, theme-adaptive glow
        background: 'radial-gradient(circle, var(--accent-light) 0%, transparent 60%)',
        willChange: 'transform, opacity',
      }}
    />
  );
}

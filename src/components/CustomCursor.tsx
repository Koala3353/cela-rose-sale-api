import { useState, useEffect, useRef } from 'react';

const CustomCursor = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const position = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const moveCursor = (e: MouseEvent) => {
      position.current = { x: e.clientX, y: e.clientY };
      
      // Instant update for the dot (no lag)
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }
      
      // Smooth follow for the ring
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${e.clientX - 16}px, ${e.clientY - 16}px)`;
      }
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleHoverStart = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('hoverable')
      ) {
        setIsHovering(true);
      }
    };

    const handleHoverEnd = () => setIsHovering(false);

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseenter', handleMouseEnter);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleHoverStart);
    window.addEventListener('mouseout', handleHoverEnd);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleHoverStart);
      window.removeEventListener('mouseout', handleHoverEnd);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  if (isMobile) return null;

  return (
    <>
      {/* Main dot - follows cursor instantly */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <div
          className="rounded-full bg-rose-500"
          style={{
            width: isHovering ? '12px' : '8px',
            height: isHovering ? '12px' : '8px',
            transform: isClicking ? 'scale(0.6)' : 'scale(1)',
            transition: 'width 0.15s ease, height 0.15s ease, transform 0.1s ease',
          }}
        />
      </div>

      {/* Ring - follows with slight delay */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] will-change-transform"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'transform 0.1s ease-out, opacity 0.15s ease',
        }}
      >
        <div
          className="rounded-full border-2 border-rose-400"
          style={{
            width: isHovering ? '48px' : '32px',
            height: isHovering ? '48px' : '32px',
            opacity: isHovering ? 0.6 : 0.4,
            transform: `scale(${isClicking ? 0.8 : 1}) translate(${isHovering ? '-8px' : '0'}, ${isHovering ? '-8px' : '0'})`,
            transition: 'width 0.2s ease, height 0.2s ease, opacity 0.2s ease, transform 0.15s ease',
          }}
        />
      </div>
    </>
  );
};

export default CustomCursor;
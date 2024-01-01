import { useState, useEffect } from 'react';

export function useWindowWidth() {
  const isClient = typeof window !== 'undefined'; // Check if the code is running on the client-side
  const [width, setWidth] = useState(isClient ? window.innerWidth : 0);

  useEffect(() => {
    if (!isClient) {
      return; // Don't run the code on the server-side
    }

    const handleResize = () => setWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

  return width;
}

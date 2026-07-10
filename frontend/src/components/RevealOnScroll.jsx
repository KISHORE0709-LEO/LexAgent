import React, { useEffect, useRef, useState } from 'react';

const RevealOnScroll = ({ children, className = "fade-in", threshold = 0.15, delay = 0, style = {} }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [threshold]);

  const combinedStyles = {
    ...style,
    transitionDelay: isVisible ? `${delay}ms` : '0ms'
  };

  return (
    <div ref={ref} className={`${className} ${isVisible ? 'visible' : ''}`} style={combinedStyles}>
      {children}
    </div>
  );
};

export default RevealOnScroll;

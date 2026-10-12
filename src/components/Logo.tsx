import React from 'react';

interface LogoProps {
  variant?: 'full' | 'white' | 'symbol';
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => {
  return (
    <div 
      className={`logo-slot h-12 w-48 sm:w-60 flex items-center shrink-0 cursor-pointer ${className}`} 
      aria-label="Brand logo" 
      onClick={onClick}
    >
    </div>
  );
};

import React from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'w-4 h-4 border-[1.5px]',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block rounded-full border-primary border-t-transparent animate-spin',
        sizes[size],
        className
      )}
    />
  );
};

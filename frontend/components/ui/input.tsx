'use client';

import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={`
        w-full
        p-2
        border
        border-gray-300
        rounded-md
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:border-transparent
        ${className || ''}
      `}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
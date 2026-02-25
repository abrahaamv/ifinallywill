import React from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h1
      className={`question-title${className ? ` ${className}` : ''}`}
      style={{ color: '#0A1E86' }}
    >
      {children}
    </h1>
  );
}

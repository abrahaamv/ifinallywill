import React from 'react';

interface StepSubtitleProps {
  children: React.ReactNode;
}

export function StepSubtitle({ children }: StepSubtitleProps) {
  return <p className="question-subtitle">{children}</p>;
}

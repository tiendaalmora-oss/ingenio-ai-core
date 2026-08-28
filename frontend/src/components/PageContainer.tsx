import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
}

export default function PageContainer({ children, maxWidth = 'max-w-7xl' }: PageContainerProps) {
  return (
    <div className={`mx-auto w-full ${maxWidth}`}>
      {children}
    </div>
  );
}

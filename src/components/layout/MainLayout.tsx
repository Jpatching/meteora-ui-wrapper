'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function MainLayout({ children, searchTerm, onSearchChange }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
}

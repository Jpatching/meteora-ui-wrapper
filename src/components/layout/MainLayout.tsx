'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchResults?: {
    tokens: any[];
    pools: any[];
  };
  isSearching?: boolean;
  onTokenClick?: (token: any) => void;
  onPoolClick?: (pool: any) => void;
}

export function MainLayout({
  children,
  searchTerm,
  onSearchChange,
  searchResults,
  isSearching,
  onTokenClick,
  onPoolClick
}: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          searchResults={searchResults}
          isSearching={isSearching}
          onTokenClick={onTokenClick}
          onPoolClick={onPoolClick}
        />
        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
}

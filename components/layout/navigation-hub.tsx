"use client";

import React, { useEffect, useState } from 'react';
import { Search, Menu, X, Home, Compass, User, Settings } from 'lucide-react';
import Link from 'next/link';

export function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // A simple command palette / navigation hub structure
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="theme-panel fixed top-4 right-4 z-50 min-h-12 min-w-12 rounded-full shadow-lg theme-text-subtle transition-colors hover:brightness-105"
        aria-label="Open navigation hub"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center pt-[10vh] px-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="theme-panel relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-label="Navigation hub">
            <div className="theme-subpanel flex items-center p-4">
              <Search className="w-5 h-5 theme-text-faint mr-3" />
              <label htmlFor="navigation-hub-search" className="sr-only">
                Search commands or navigate
              </label>
              <input
                id="navigation-hub-search"
                type="text"
                placeholder="Search commands or navigate..."
                className="flex-1 bg-transparent border-none text-lg focus:outline-none theme-text-muted placeholder:text-[color:var(--theme-text-faint)]"
                autoFocus
              />
              <button 
                onClick={() => setIsOpen(false)}
                className="min-h-10 min-w-10 p-1 theme-text-faint hover:text-[color:var(--foreground)] transition-colors"
                aria-label="Close navigation hub"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-2 py-4 flex flex-col gap-1 overflow-y-auto max-h-[60vh]">
              <div className="theme-text-faint px-3 pb-2 text-xs font-semibold uppercase tracking-wider">
                Quick Links
              </div>
              <NavLink href="/" icon={<Home />} label="Home" onClick={() => setIsOpen(false)} />
              <NavLink href="/explore" icon={<Compass />} label="Explore" onClick={() => setIsOpen(false)} />
              <NavLink href="/dashboard" icon={<User />} label="Dashboard" onClick={() => setIsOpen(false)} />
              <NavLink href="/settings" icon={<Settings />} label="Settings" onClick={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link 
      href={href}
      onClick={onClick}
      className="theme-text-subtle flex items-center px-3 py-3 hover:bg-[color:var(--theme-panel-soft)] rounded-lg group transition-colors"
    >
      <span className="theme-text-faint w-5 h-5 mr-3 group-hover:text-[color:var(--foreground)] transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-full h-full' })}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

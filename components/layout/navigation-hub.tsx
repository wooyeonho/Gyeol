"use client";

import React, { useState } from 'react';
import { Search, Menu, X, Home, Compass, User, Settings } from 'lucide-react';
import Link from 'next/link';

export function NavigationHub() {
  const [isOpen, setIsOpen] = useState(false);

  // A simple command palette / navigation hub structure
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 p-2 bg-neutral-900 border border-neutral-800 rounded-full shadow-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
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
          <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center p-4 border-b border-neutral-800 bg-neutral-900">
              <Search className="w-5 h-5 text-neutral-500 mr-3" />
              <input
                type="text"
                placeholder="Search commands or navigate..."
                className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-neutral-500 text-lg"
                autoFocus
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2 py-4 flex flex-col gap-1 overflow-y-auto max-h-[60vh]">
              <div className="px-3 pb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
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
      className="flex items-center px-3 py-3 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg group transition-colors"
    >
      <span className="w-5 h-5 mr-3 text-neutral-500 group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-full h-full' })}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}

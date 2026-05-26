/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const menuItems = [
    { type: 'dashboard' as ViewType, label: 'Dashboard', emoji: '🏠' },
    { type: 'nova_sessao' as ViewType, label: 'Nova Sessão', emoji: '✨' },
    { type: 'resumos' as ViewType, label: 'Resumos', emoji: '📚' },
    { type: 'historico' as ViewType, label: 'Histórico', emoji: '📊' },
    { type: 'perfil' as ViewType, label: 'Perfil', emoji: '👤' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0 border-r border-[#2a2a3f] bg-[#0a0a0f] p-6 z-20 transition-colors duration-200">
      {/* Brand Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-1.5">
          {/* Custom Book SVG Logo (Alteration 4) */}
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <h1 className="font-display font-bold text-[20px] text-[#f1f0ff] leading-none mb-0">StudyBud</h1>
        </div>
        <p className="text-[11px] text-[#a09abb] font-medium uppercase tracking-wider">O teu assistente de estudo LEI</p>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = currentView === item.type || 
            (item.type === 'nova_sessao' && currentView === 'teste_realizacao') ||
            (item.type === 'historico' && currentView === 'resultados');
          return (
            <button
              key={item.type}
              onClick={() => onNavigate(item.type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left cursor-pointer border ${
                isActive
                  ? 'bg-[#6c63ff15] text-[#6c63ff] border-[#6c63ff30]'
                  : 'text-[#a09abb] hover:text-slate-200 hover:bg-[#12121a] border-transparent'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Version */}
      <div className="mt-auto pt-6 border-t border-[#2a2a3f] text-center">
        <p className="text-[10px] text-[#a09abb] opacity-50">v1.0 — LEI Edition</p>
      </div>
    </aside>
  );
}

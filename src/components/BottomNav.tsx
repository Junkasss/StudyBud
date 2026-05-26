/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const menuItems = [
    { type: 'dashboard' as ViewType, label: 'Início', emoji: '🏠' },
    { type: 'nova_sessao' as ViewType, label: 'Sessão', emoji: '📚' }, // We will render the inline SVG instead of the emoji below
    { type: 'resumos' as ViewType, label: 'Resumos', emoji: '📚' },
    { type: 'historico' as ViewType, label: 'Histórico', emoji: '📊' },
    { type: 'perfil' as ViewType, label: 'Perfil', emoji: '👤' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-[#2a2a3f] bg-[#0a0a0f] px-4 flex items-center justify-around z-30 transition-colors shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
      {menuItems.map((item) => {
        const isActive = currentView === item.type || 
          (item.type === 'nova_sessao' && currentView === 'teste_realizacao') ||
          (item.type === 'historico' && currentView === 'resultados');
        return (
          <button
            key={item.type}
            onClick={() => onNavigate(item.type)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center cursor-pointer"
          >
            {item.type === 'nova_sessao' ? (
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block transition-transform ${isActive ? 'scale-110 -translate-y-0.5' : 'opacity-70'}`}>
                <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke={isActive ? "#6c63ff" : "#a09abb"} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke={isActive ? "#6c63ff" : "#a09abb"} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="6" x2="16" y2="26" stroke={isActive ? "#6c63ff" : "#a09abb"} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <span className={`text-xl transition-transform ${isActive ? 'scale-115 -translate-y-0.5' : 'opacity-70'}`}>
                {item.emoji}
              </span>
            )}
            <span className={`text-[10px] sm:text-xs font-semibold mt-1 transition-colors ${
              isActive ? 'text-[#6c63ff] font-bold' : 'text-[#a09abb] font-medium'
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

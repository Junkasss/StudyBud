import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple regex-based helper to replace inline elements:
  // **bold**, *italic*, `code`
  const renderInlineText = (text: string): React.ReactNode[] => {
    if (!text) return [];
    
    // We want to handle inline code, bold, and italic in sequence
    const tokens: React.ReactNode[] = [];
    let currentText = text;
    let keyIndex = 0;

    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = currentText.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-[6px] py-[2px] bg-[#1a1a27] text-[#22c55e] font-mono text-xs rounded-[4px] border border-[#2a2a3f]">
            {part.slice(1, -1)}
          </code>
        );
      } else if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-[#f1f0ff]">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic text-slate-300">{part.slice(1, -1)}</em>;
      } else {
        return part;
      }
    });
  };

  // Block parser
  const parseBlocks = (): React.ReactNode[] => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let state: 'normal' | 'code' | 'table' | 'ul' | 'ol' = 'normal';
    
    let codeBlockLines: string[] = [];
    let codeLang = '';
    let tableLines: string[] = [];
    let listItems: string[] = [];

    const flushCodeBlock = (key: number) => {
      elements.push(
        <div key={`code-${key}`} className="my-5 overflow-hidden rounded-lg border border-[#2a2a3f]">
          <div className="flex items-center justify-between border-b border-[#2a2a3f] bg-[#1a1a27] px-4 py-1.5 text-xs text-[#a09abb] select-none">
            <span>{codeLang || 'Código'}</span>
            <span className="text-[10px] uppercase font-semibold text-[#6c63ff]">StudyBud Terminal</span>
          </div>
          <pre className="overflow-x-auto p-4 bg-[#0d1117] text-[#e6edf3] font-mono text-sm rounded-b-lg border-t border-[#2a2a3f]/50"><code className="block whitespace-pre">{codeBlockLines.join('\n')}</code></pre>
        </div>
      );
      codeBlockLines = [];
      codeLang = '';
    };

    const flushTable = (key: number) => {
      if (tableLines.length === 0) return;
      
      const rows = tableLines.map(line => 
        line.split('|')
            .map(cell => cell.trim())
            .filter((cell, idx, arr) => {
              if (idx === 0 && cell === '' && arr.length > 2) return false;
              if (idx === arr.length - 1 && cell === '' && arr.length > 2) return false;
              return true;
            })
      );

      const validRows = rows.filter(r => !r.every(c => c.match(/^:?-+:?$/)));
      if (validRows.length === 0) return;

      const headers = validRows[0];
      const dataRows = validRows.slice(1);

      elements.push(
        <div key={`table-${key}`} className="my-5 overflow-x-auto rounded-lg border border-[#2a2a3f]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#1a1a27] text-[#6c63ff] border-b border-[#2a2a3f]">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-bold uppercase tracking-wider text-xs border-r border-[#2a2a3f] last:border-r-0">
                    {renderInlineText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a3f] bg-[#12121a]/50">
              {dataRows.map((row, i) => (
                <tr key={i} className="hover:bg-[#1a1a27]/40 transition-colors">
                  {row.map((cell, idx) => (
                    <td key={idx} className="px-3 py-2 text-[#a09abb] border-r border-[#2a2a3f] last:border-r-0">
                      {renderInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableLines = [];
    };

    const flushList = (key: number, type: 'ul' | 'ol') => {
      if (listItems.length === 0) return;
      
      if (type === 'ul') {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc marker:text-[#6c63ff] pl-6 my-4 space-y-2 text-[#a09abb] leading-[1.8]">
            {listItems.map((item, i) => (
              <li key={i} className="pl-1">{renderInlineText(item)}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal marker:text-[#6c63ff] pl-6 my-4 space-y-2 text-[#a09abb] leading-[1.8]">
            {listItems.map((item, i) => (
              <li key={i} className="pl-1">{renderInlineText(item)}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Handle Code Block
      if (trimmed.startsWith('```')) {
        if (state === 'code') {
          flushCodeBlock(i);
          state = 'normal';
        } else {
          if (state === 'ul') flushList(i, 'ul');
          if (state === 'ol') flushList(i, 'ol');
          if (state === 'table') flushTable(i);

          state = 'code';
          codeLang = trimmed.substring(3).trim();
        }
        continue;
      }

      if (state === 'code') {
        codeBlockLines.push(line);
        continue;
      }

      // Handle Table Row
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        if (state !== 'table') {
          if (state === 'ul') flushList(i, 'ul');
          if (state === 'ol') flushList(i, 'ol');
          state = 'table';
        }
        tableLines.push(line);
        continue;
      } else if (state === 'table') {
        flushTable(i);
        state = 'normal';
      }

      // Handle Headers
      if (trimmed.startsWith('# ')) {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        elements.push(
          <h1 key={i} className="text-2xl sm:text-3xl font-black font-display text-[#6c63ff] mt-10 mb-6 border-b-2 border-[#6c63ff]/30 pb-3 flex items-center gap-2">
            {renderInlineText(trimmed.substring(2))}
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith('## ')) {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        elements.push(
          <h2 key={i} className="text-xl sm:text-2xl font-extrabold font-display text-[#8b85ff] mt-10 mb-4 flex items-center gap-2">
            {renderInlineText(trimmed.substring(3))}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith('### ')) {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        elements.push(
          <h3 key={i} className="text-base sm:text-lg font-bold font-display text-slate-300 mt-6 mb-2">
            {renderInlineText(trimmed.substring(4))}
          </h3>
        );
        continue;
      }

      // Handle Bullet List Item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (state !== 'ul') {
          if (state === 'ol') flushList(i, 'ol');
          state = 'ul';
        }
        listItems.push(trimmed.substring(2));
        continue;
      }

      // Handle Numbered List Item
      const numberMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numberMatch) {
         if (state !== 'ol') {
          if (state === 'ul') flushList(i, 'ul');
          state = 'ol';
        }
        listItems.push(numberMatch[2]);
        continue;
      }

      // Normal line or empty line
      if (trimmed === '') {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        continue;
      }

      // If we are in lists but get non-empty normal text, flush lists
      if (state === 'ul') {
        flushList(i, 'ul');
        state = 'normal';
      } else if (state === 'ol') {
        flushList(i, 'ol');
        state = 'normal';
      }

      // Regular Paragraph
      elements.push(
        <p key={i} className="mb-4 text-[#a09abb] leading-[1.8] text-sm md:text-base select-text">
          {renderInlineText(trimmed)}
        </p>
      );
    }

    // Flush remaining structures if file ends
    if (state === 'code') flushCodeBlock(lines.length);
    if (state === 'table') flushTable(lines.length);
    if (state === 'ul') flushList(lines.length, 'ul');
    if (state === 'ol') flushList(lines.length, 'ol');

    return elements;
  };

  return (
    <div className="studybud-markdown text-[#a09abb] pr-1 select-text scroll-smooth space-y-6">
      {parseBlocks()}
    </div>
  );
}

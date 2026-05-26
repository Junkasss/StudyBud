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
    // A simple way is to tokenize with regex and map to elements
    const tokens: React.ReactNode[] = [];
    let currentText = text;
    let keyIndex = 0;

    // We tokenize using recursive split or standard regex matching
    // Let's matching code blocks first, then bold, then italic
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = currentText.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="px-1.5 py-0.5 bg-slate-800 text-teal-400 font-mono text-sm rounded border border-slate-700">
            {part.slice(1, -1)}
          </code>
        );
      } else if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
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
        <div key={`code-${key}`} className="my-5 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 font-mono text-sm leading-relaxed text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-1.5 text-xs text-slate-400 select-none">
            <span>{codeLang || 'Código'}</span>
            <span className="text-[10px] uppercase font-semibold text-indigo-400">LEI Terminal</span>
          </div>
          <pre className="overflow-x-auto p-4"><code className="block">{codeBlockLines.join('\n')}</code></pre>
        </div>
      );
      codeBlockLines = [];
      codeLang = '';
    };

    const flushTable = (key: number) => {
      // Find headers and rows
      if (tableLines.length === 0) return;
      
      const rows = tableLines.map(line => 
        line.split('|')
            .map(cell => cell.trim())
            .filter((cell, idx, arr) => {
              // Ignore initial empty cell if line started with '|'
              if (idx === 0 && cell === '' && arr.length > 2) return false;
              if (idx === arr.length - 1 && cell === '' && arr.length > 2) return false;
              return true;
            })
      );

      // Check for alignment indicator row (e.g. |---|---|)
      const validRows = rows.filter(r => !r.every(c => c.match(/^:?-+:?$/)));
      if (validRows.length === 0) return;

      const headers = validRows[0];
      const dataRows = validRows.slice(1);

      elements.push(
        <div key={`table-${key}`} className="my-5 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-200 border-b border-slate-800">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 font-semibold text-slate-100 uppercase tracking-wider text-xs">
                    {renderInlineText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
              {dataRows.map((row, i) => (
                <tr key={i} className="hover:bg-indigo-950/20 transition-colors">
                  {row.map((cell, idx) => (
                    <td key={idx} className="px-4 py-3 text-slate-300">
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
          <ul key={`ul-${key}`} className="list-disc pl-6 my-4 space-y-2 text-slate-300">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineText(item)}</li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-6 my-4 space-y-2 text-slate-300">
            {listItems.map((item, i) => (
              <li key={i}>{renderInlineText(item)}</li>
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
          // Finish any list/table
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
          <h1 key={i} className="text-2xl sm:text-3xl font-bold font-display text-white mt-8 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
            {renderInlineText(trimmed.substring(2))}
          </h1>
        );
        continue;
      }

      if (trimmed.startsWith('## ')) {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        elements.push(
          <h2 key={i} className="text-xl sm:text-2xl font-bold font-display text-indigo-300 mt-6 mb-3 flex items-center gap-2">
            {renderInlineText(trimmed.substring(3))}
          </h2>
        );
        continue;
      }

      if (trimmed.startsWith('### ')) {
        if (state === 'ul') flushList(i, 'ul');
        if (state === 'ol') flushList(i, 'ol');
        elements.push(
          <h3 key={i} className="text-lg sm:text-xl font-bold font-display text-slate-200 mt-5 mb-2">
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
        // Let empty separator row exist but do not render empty paragraph
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
        <p key={i} className="my-3 text-slate-300 leading-relaxed text-sm md:text-base">
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
    <div className="studybud-markdown text-slate-300 pr-1 select-text">
      {parseBlocks()}
    </div>
  );
}

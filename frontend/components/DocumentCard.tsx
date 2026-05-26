import React from 'react';
import { DocumentInput } from '../types.ts';
import { FileText, Trash2 } from 'lucide-react';

interface DocumentCardProps {
  document: DocumentInput;
  onUpdate: (id: string, field: keyof DocumentInput, value: string) => void;
  onRemove: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onUpdate, onRemove }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full mr-4">
          <FileText size={16} className="text-emerald-500" />
          <input
            type="text"
            value={document.title}
            onChange={(e) => onUpdate(document.id, 'title', e.target.value)}
            placeholder="Document Title (e.g., Architecture V1)"
            className="bg-transparent border-b border-gray-700 focus:border-emerald-500 focus:outline-none text-sm font-semibold text-white w-full pb-1"
          />
        </div>
        <button onClick={() => onRemove(document.id)} className="text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
      <textarea
        value={document.content}
        onChange={(e) => onUpdate(document.id, 'content', e.target.value)}
        placeholder="Paste document content or markdown here..."
        className="bg-gray-950 border border-gray-800 rounded-md p-3 text-xs text-gray-300 h-40 resize-none focus:outline-none focus:border-emerald-500/50 font-mono"
      />
    </div>
  );
};
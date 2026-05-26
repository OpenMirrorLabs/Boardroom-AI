import React, { useState } from 'react';
import { NodePersona } from '../types.ts';
import { Edit2, Check, Trash2, User } from 'lucide-react';

interface NodeCardProps {
  node: NodePersona;
  onUpdate: (updatedNode: NodePersona) => void;
  onRemove: (id: string) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNode, setEditedNode] = useState<NodePersona>(node);

  const handleSave = () => {
    onUpdate(editedNode);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-gray-900 border border-indigo-500/50 rounded-lg p-4 flex flex-col gap-3 shadow-lg shadow-indigo-500/10">
        <input
          type="text"
          value={editedNode.name}
          onChange={(e) => setEditedNode({ ...editedNode, name: e.target.value })}
          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          placeholder="Name"
        />
        <input
          type="text"
          value={editedNode.title}
          onChange={(e) => setEditedNode({ ...editedNode, title: e.target.value })}
          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-indigo-500"
          placeholder="Title"
        />
        <textarea
          value={editedNode.system_instruction}
          onChange={(e) => setEditedNode({ ...editedNode, system_instruction: e.target.value })}
          className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 h-24 resize-none focus:outline-none focus:border-indigo-500"
          placeholder="System Instruction"
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={() => setIsEditing(false)} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
          <button onClick={handleSave} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex flex-col gap-2 hover:border-gray-700 transition-colors group relative">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-indigo-400">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onRemove(node.id)} className="text-gray-400 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="bg-indigo-500/20 p-1.5 rounded-md text-indigo-400">
          <User size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-100 leading-tight">{node.name}</h3>
          <p className="text-xs text-indigo-400 font-medium">{node.title}</p>
        </div>
      </div>
      
      <div className="mt-2 bg-gray-950 rounded p-2 border border-gray-800/50">
        <p className="text-xs text-gray-400 line-clamp-3 italic">"{node.system_instruction}"</p>
      </div>
    </div>
  );
};
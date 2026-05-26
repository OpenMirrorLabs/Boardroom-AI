import React, { useState, useCallback } from 'react';
import { NodePersona, DocumentInput, NodeEvaluation } from './types.ts';
import { generateNodePersona, evaluateDocuments } from './services/geminiService.ts';
import { NodeCard } from './components/NodeCard.tsx';
import { DocumentCard } from './components/DocumentCard.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Users, FileText, Play, Plus, Loader2, LayoutDashboard, Target } from 'lucide-react';

function App() {
  const [softwareType, setSoftwareType] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  
  const [nodes, setNodes] = useState<NodePersona[]>([]);
  const [documents, setDocuments] = useState<DocumentInput[]>([]);
  
  const [isGeneratingNode, setIsGeneratingNode] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState<NodeEvaluation[] | null>(null);

  // --- Node Management ---
  const handleAddNode = async () => {
    setIsGeneratingNode(true);
    try {
      const newPersona = await generateNodePersona(softwareType, projectGoal);
      const newNode: NodePersona = {
        id: crypto.randomUUID(),
        ...newPersona
      };
      setNodes(prev => [...prev, newNode]);
    } catch (error) {
      console.error("Failed to generate node:", error);
      alert("Failed to generate node. Check console for details.");
    } finally {
      setIsGeneratingNode(false);
    }
  };

  const handleUpdateNode = useCallback((updatedNode: NodePersona) => {
    setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  }, []);

  const handleRemoveNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  // --- Document Management ---
  const handleAddDocument = () => {
    const newDoc: DocumentInput = {
      id: crypto.randomUUID(),
      title: `Document ${documents.length + 1}`,
      content: ''
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const handleUpdateDocument = useCallback((id: string, field: keyof DocumentInput, value: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }, []);

  const handleRemoveDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  // --- Execution Engine ---
  const handleExecute = async () => {
    if (nodes.length === 0) {
      alert("Please add at least one Node Persona.");
      return;
    }
    if (documents.length < 2) {
      alert("Please add at least two documents to evaluate.");
      return;
    }
    
    // Basic validation
    if (documents.some(d => !d.title.trim() || !d.content.trim())) {
      alert("All documents must have a title and content.");
      return;
    }

    setIsEvaluating(true);
    setEvaluations(null);

    // Parallel execution using Promise.allSettled for graceful degradation
    const promises = nodes.map(async (node) => {
      try {
        const result = await evaluateDocuments(node, documents);
        return { nodeId: node.id, node, result, error: undefined } as NodeEvaluation;
      } catch (error: any) {
        console.error(`Evaluation failed for node ${node.name}:`, error);
        return { nodeId: node.id, node, result: null, error: error.message || "Unknown error occurred" } as NodeEvaluation;
      }
    });

    const results = await Promise.all(promises);
    setEvaluations(results);
    setIsEvaluating(false);
    
    // Scroll to dashboard
    setTimeout(() => {
      document.getElementById('dashboard-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-gray-800 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Boardroom AI</h1>
          </div>
          <p className="text-gray-400 max-w-2xl">
            A multi-agent evaluation engine. Upload competing technical documents and let a dynamic roster of AI personas debate, score, and extract the best ideas in parallel.
          </p>
        </header>

        {/* Project Context Section */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="text-blue-400" size={20} />
            Project Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Software Type</label>
              <input
                type="text"
                value={softwareType}
                onChange={(e) => setSoftwareType(e.target.value)}
                placeholder="e.g., E-commerce Platform, AI Chatbot, FinTech App"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Primary Goal</label>
              <input
                type="text"
                value={projectGoal}
                onChange={(e) => setProjectGoal(e.target.value)}
                placeholder="e.g., Maximize conversion rate, Ensure zero downtime"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Nodes */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <Users className="text-indigo-400" size={20} />
                <h2 className="text-lg font-bold text-white">The Board ({nodes.length})</h2>
              </div>
              <button 
                onClick={handleAddNode}
                disabled={isGeneratingNode}
                className="flex items-center gap-1 text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {isGeneratingNode ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Node
              </button>
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {nodes.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-gray-800 rounded-lg text-gray-500 text-sm">
                  No nodes in the boardroom. Fill out the Project Context and click "Add Node" to generate a tailored persona.
                </div>
              ) : (
                nodes.map(node => (
                  <NodeCard 
                    key={node.id} 
                    node={node} 
                    onUpdate={handleUpdateNode} 
                    onRemove={handleRemoveNode} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Documents & Execution */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold text-white">Documents ({documents.length})</h2>
              </div>
              <button 
                onClick={handleAddDocument}
                className="flex items-center gap-1 text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-full transition-colors"
              >
                <Plus size={14} /> Add Document
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.length === 0 ? (
                <div className="col-span-full text-center p-12 border border-dashed border-gray-800 rounded-lg text-gray-500 text-sm">
                  No documents uploaded. Add at least two competing documents to begin evaluation.
                </div>
              ) : (
                documents.map(doc => (
                  <DocumentCard 
                    key={doc.id} 
                    document={doc} 
                    onUpdate={handleUpdateDocument} 
                    onRemove={handleRemoveDocument} 
                  />
                ))
              )}
            </div>

            {/* Execution Action */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleExecute}
                disabled={isEvaluating || nodes.length === 0 || documents.length < 2}
                className="flex items-center gap-2 bg-white text-gray-950 hover:bg-gray-200 font-bold px-8 py-3 rounded-lg shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Evaluating in Parallel...
                  </>
                ) : (
                  <>
                    <Play size={20} className="fill-current" />
                    Execute Evaluation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Section */}
        <div id="dashboard-section">
          {evaluations && <Dashboard evaluations={evaluations} documents={documents} />}
        </div>

      </div>
    </div>
  );
}

export default App;
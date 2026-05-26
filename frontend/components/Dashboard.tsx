import React, { useMemo, useState } from 'react';
import { NodeEvaluation, LeaderboardEntry, StolenIdea, DocumentInput } from '../types.ts';
import { Trophy, AlertCircle, Lightbulb, GitMerge, Star, Wand2, Copy, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { generateMasterDocument } from '../services/geminiService.ts';

interface DashboardProps {
  evaluations: NodeEvaluation[];
  documents: DocumentInput[];
}

export const Dashboard: React.FC<DashboardProps> = ({ evaluations, documents }) => {
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  const [masterDocument, setMasterDocument] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Calculate Leaderboard
  const leaderboard = useMemo(() => {
    const stats: Record<string, { votes: number; totalScore: number }> = {};
    
    evaluations.forEach(ev => {
      if (ev.result && ev.result.winner) {
        const winner = ev.result.winner;
        if (!stats[winner]) {
          stats[winner] = { votes: 0, totalScore: 0 };
        }
        stats[winner].votes += 1;
        stats[winner].totalScore += ev.result.score;
      }
    });

    const entries: LeaderboardEntry[] = Object.entries(stats).map(([title, data]) => ({
      documentTitle: title,
      votes: data.votes,
      totalScore: data.totalScore,
      averageScore: Math.round(data.totalScore / data.votes)
    }));

    // Sort by votes descending, then average score descending
    return entries.sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return b.averageScore - a.averageScore;
    });
  }, [evaluations]);

  // Aggregate and Deduplicate Salvage Yard
  const salvageYard = useMemo(() => {
    const allIdeas: (StolenIdea & { nodeName: string })[] = [];
    evaluations.forEach(ev => {
      if (ev.result && ev.result.stolen_ideas) {
        ev.result.stolen_ideas.forEach(idea => {
          allIdeas.push({ ...idea, nodeName: ev.node.name });
        });
      }
    });

    // Deduplication based on a normalized string of the idea, keeping the highest importance score
    const uniqueIdeasMap = new Map<string, typeof allIdeas[0]>();
    allIdeas.forEach(idea => {
      const key = idea.idea.toLowerCase().trim().substring(0, 50);
      const existing = uniqueIdeasMap.get(key);
      const currentScore = idea.importance_score || 0;
      const existingScore = existing?.importance_score || 0;
      
      if (!existing || existingScore < currentScore) {
        uniqueIdeasMap.set(key, idea);
      }
    });

    // Sort by importance score descending
    return Array.from(uniqueIdeasMap.values()).sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0));
  }, [evaluations]);

  const handleGenerateMaster = async () => {
    console.log("Generate Master button clicked.");
    
    if (leaderboard.length === 0) {
      console.warn("Leaderboard is empty, cannot generate master document.");
      return;
    }
    
    const winningTitle = leaderboard[0].documentTitle;
    console.log(`Attempting to find original document for winner: "${winningTitle}"`);
    
    // Robust matching: Try exact, then case-insensitive trim, then fuzzy includes
    let winningDoc = documents.find(d => d.title === winningTitle);
    
    if (!winningDoc) {
      winningDoc = documents.find(d => d.title.trim().toLowerCase() === winningTitle.trim().toLowerCase());
    }
    
    if (!winningDoc) {
      winningDoc = documents.find(d => 
        winningTitle.toLowerCase().includes(d.title.toLowerCase()) || 
        d.title.toLowerCase().includes(winningTitle.toLowerCase())
      );
    }
    
    if (!winningDoc) {
      console.error("Could not match the winning title to any uploaded document.", { winningTitle, availableDocuments: documents.map(d => d.title) });
      alert(`Warning: Could not perfectly match the AI's winning title "${winningTitle}" with your uploaded documents. Falling back to the first document.`);
      winningDoc = documents[0]; // Fallback so the process doesn't completely break
    }

    // Filter ideas with importance >= 3 (handle undefined gracefully if old schema was used)
    const ideasToImplement = salvageYard.filter(idea => (idea.importance_score || 0) >= 3);
    console.log(`Found ${ideasToImplement.length} ideas to implement with score >= 3.`);
    
    if (ideasToImplement.length === 0) {
      console.log("No high-importance ideas found. Proceeding to generate master document anyway.");
    }

    setIsGeneratingMaster(true);
    try {
      console.log("Calling Gemini API to generate master document...");
      const result = await generateMasterDocument(winningDoc.title, winningDoc.content, ideasToImplement);
      console.log("Master document generated successfully.");
      setMasterDocument(result);
      
      setTimeout(() => {
        document.getElementById('master-document-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Failed to generate master document:", error);
      alert("Failed to generate master document. Check the browser console for details.");
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  const handleCopy = () => {
    if (masterDocument) {
      navigator.clipboard.writeText(masterDocument);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (masterDocument && leaderboard.length > 0) {
      const blob = new Blob([masterDocument], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${leaderboard[0].documentTitle.replace(/\s+/g, '_')}_MASTER.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (evaluations.length === 0) return null;

  return (
    <div className="flex flex-col gap-12 mt-8 animate-in fade-in duration-500">
      
      {/* Tier 1: Leaderboard */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
          <Trophy className="text-yellow-500" size={20} />
          <h2 className="text-xl font-bold text-white">Tier 1: The Leaderboard</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.documentTitle} 
              className={`relative rounded-xl p-6 border ${
                index === 0 
                  ? 'bg-gradient-to-b from-yellow-500/10 to-gray-900 border-yellow-500/50 shadow-[0_0_30px_-5px_rgba(234,179,8,0.2)]' 
                  : index === 1
                    ? 'bg-gradient-to-b from-gray-300/10 to-gray-900 border-gray-400/50'
                    : index === 2
                      ? 'bg-gradient-to-b from-amber-700/10 to-gray-900 border-amber-700/50'
                      : 'bg-gray-900 border-gray-800'
              }`}
            >
              {index === 0 && <div className="absolute -top-3 -right-3 bg-yellow-500 text-gray-950 text-xs font-bold px-2 py-1 rounded-full shadow-lg">WINNER</div>}
              <h3 className="text-lg font-bold text-white mb-4 truncate" title={entry.documentTitle}>
                {index + 1}. {entry.documentTitle}
              </h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Votes</p>
                  <p className="text-3xl font-black text-white">{entry.votes}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg Score</p>
                  <p className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {entry.averageScore}<span className="text-sm text-gray-500">/100</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800 border-dashed">
              No valid evaluations returned to calculate leaderboard.
            </div>
          )}
        </div>
      </section>

      {/* Tier 2: Node Matrix */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
          <GitMerge className="text-indigo-400" size={20} />
          <h2 className="text-xl font-bold text-white">Tier 2: Node Matrix</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evaluations.map((ev) => (
            <div key={ev.nodeId} className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white">{ev.node.name}</h4>
                  <p className="text-xs text-indigo-400">{ev.node.title}</p>
                </div>
                {ev.result && (
                  <div className="bg-gray-950 border border-gray-700 px-2 py-1 rounded text-center min-w-[40px]">
                    <span className="text-xs text-gray-400 block leading-none mb-1">Score</span>
                    <span className="text-sm font-bold text-white leading-none">{ev.result.score}</span>
                  </div>
                )}
              </div>
              
              {ev.error ? (
                <div className="mt-auto bg-red-950/30 border border-red-900/50 rounded p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400">{ev.error}</p>
                </div>
              ) : ev.result ? (
                <div className="flex flex-col gap-3 mt-auto">
                  <div className="bg-gray-950 rounded p-3 border border-gray-800">
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Voted For</p>
                    <p className="text-sm font-semibold text-emerald-400 truncate" title={ev.result.winner}>
                      {ev.result.winner}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Reasoning</p>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {ev.result.reasoning}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-auto text-xs text-gray-500 italic">No result available.</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tier 3: Salvage Yard */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
          <Lightbulb className="text-emerald-400" size={20} />
          <h2 className="text-xl font-bold text-white">Tier 3: The Salvage Yard</h2>
          <span className="ml-auto text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded-full border border-gray-800">
            Actionable Checklist
          </span>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {salvageYard.length > 0 ? (
            <ul className="divide-y divide-gray-800">
              {salvageYard.map((idea, idx) => (
                <li key={idx} className="p-4 hover:bg-gray-800/50 transition-colors flex gap-4 items-start">
                  <div className="mt-1 bg-emerald-500/20 text-emerald-400 p-1.5 rounded shrink-0">
                    <Lightbulb size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h4 className="text-sm font-bold text-white">{idea.idea}</h4>
                      <span className="text-xs text-gray-500">from</span>
                      <span className="text-xs font-medium text-gray-400 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800">
                        {idea.source}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{idea.why}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-indigo-400/70 italic">Suggested by {idea.nodeName}</p>
                      <div className="flex items-center gap-1 bg-gray-950 px-2 py-1 rounded border border-gray-800">
                        <span className="text-xs text-gray-400 mr-1">Importance:</span>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            size={12} 
                            className={star <= (idea.importance_score || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-700"} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No salvageable ideas identified by the nodes.
            </div>
          )}
        </div>
      </section>

      {/* Tier 4: Master Document Generation */}
      {leaderboard.length > 0 && (
        <section id="master-document-section" className="bg-gradient-to-br from-indigo-900/20 to-gray-900 border border-indigo-500/30 rounded-2xl p-8 shadow-[0_0_40px_-10px_rgba(99,102,241,0.15)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-2">
                <Wand2 className="text-indigo-400" size={24} />
                Ultimate Master Document
              </h2>
              <p className="text-sm text-gray-400 max-w-2xl">
                Merge the winning document (<span className="text-white font-semibold">{leaderboard[0].documentTitle}</span>) with all high-value suggestions (Importance ≥ 3) from the Salvage Yard to create the final, optimized blueprint.
              </p>
            </div>
            <button
              onClick={handleGenerateMaster}
              disabled={isGeneratingMaster}
              className="shrink-0 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGeneratingMaster ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Generate Master
                </>
              )}
            </button>
          </div>

          {masterDocument && (
            <div className="mt-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-end gap-3 mb-3">
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Markdown'}
                </button>
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  Download .md
                </button>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 overflow-x-auto">
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {masterDocument}
                </pre>
              </div>
            </div>
          )}
        </section>
      )}

    </div>
  );
};
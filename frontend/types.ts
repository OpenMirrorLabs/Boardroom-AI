export interface NodePersona {
  id: string;
  name: string;
  title: string;
  system_instruction: string;
}

export interface DocumentInput {
  id: string;
  title: string;
  content: string;
}

export interface StolenIdea {
  source: string;
  idea: string;
  why: string;
  importance_score: number;
}

export interface EvaluationResult {
  winner: string;
  score: number;
  reasoning: string;
  stolen_ideas: StolenIdea[];
}

export interface NodeEvaluation {
  nodeId: string;
  node: NodePersona;
  result: EvaluationResult | null;
  error?: string;
}

export interface LeaderboardEntry {
  documentTitle: string;
  votes: number;
  averageScore: number;
  totalScore: number;
}
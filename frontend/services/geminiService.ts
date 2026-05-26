import { GoogleGenAI, Type } from '@google/genai';
import { NodePersona, DocumentInput, EvaluationResult } from '../types.ts';

// Initialize the SDK. API_KEY must be provided in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const generateNodePersona = async (softwareType: string, projectGoal: string): Promise<Omit<NodePersona, 'id'>> => {
  let prompt = 'Generate a highly opinionated, distinct, and randomly selected technical persona for an evaluation boardroom. ';
  
  if (softwareType || projectGoal) {
    prompt += `The boardroom is evaluating documents for a project described as:\n- Software Type: "${softwareType || 'Not specified'}"\n- Goal: "${projectGoal || 'Not specified'}"\n\n`;
    prompt += `Generate a persona that is highly relevant to this specific project (e.g., if it's an AI app, maybe a Lead ML Engineer or Data Scientist; if FinTech, a Security Auditor or Compliance Officer). Ensure the persona is unique and brings a specific critical perspective. `;
  } else {
    prompt += `They should have a specific bias (e.g., security-first, UX-obsessed, performance-maximalist, cost-cutter). `;
  }
  
  prompt += `Their system instruction must detail how they evaluate technical documents based on their role. Maximum 3 sentences.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'The full name of the persona.',
          },
          title: {
            type: Type.STRING,
            description: 'Their professional title and specialty.',
          },
          system_instruction: {
            type: Type.STRING,
            description: 'A strict, highly opinionated system instruction detailing how they evaluate technical documents. Maximum 3 sentences.',
          },
        },
        required: ['name', 'title', 'system_instruction'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Failed to generate node persona: Empty response');
  }

  return JSON.parse(response.text);
};

export const evaluateDocuments = async (
  node: NodePersona,
  documents: DocumentInput[]
): Promise<EvaluationResult> => {
  const prompt = `
You are evaluating the following competing technical documents/blueprints.
Review them carefully based on your specific persona and instructions.

Documents:
${documents.map(doc => `--- DOCUMENT: ${doc.title} ---\n${doc.content}\n`).join('\n')}

Task:
1. Select exactly ONE winner from the provided document titles.
2. Assign a score from 1 to 100 for the winning document based on how well it aligns with your persona's values.
3. Provide a concise reasoning for your choice.
4. Identify specific concepts, features, or mechanics to "steal" from the LOSING documents that would improve the winner.
5. Assign an importance score (1-5) to each stolen idea indicating how critical it is to implement into the final master document.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: node.system_instruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          winner: {
            type: Type.STRING,
            description: 'The exact title of the winning document.',
          },
          score: {
            type: Type.NUMBER,
            description: 'Score from 1 to 100.',
          },
          reasoning: {
            type: Type.STRING,
            description: 'Concise evaluation reasoning.',
          },
          stolen_ideas: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: {
                  type: Type.STRING,
                  description: 'The exact title of the losing document the idea is taken from.',
                },
                idea: {
                  type: Type.STRING,
                  description: 'The specific feature or mechanic.',
                },
                why: {
                  type: Type.STRING,
                  description: 'Why it improves the winner.',
                },
                importance_score: {
                  type: Type.INTEGER,
                  description: 'Score from 1 to 5 indicating how important it is to implement this idea into the final document.',
                }
              },
              required: ['source', 'idea', 'why', 'importance_score'],
            },
          },
        },
        required: ['winner', 'score', 'reasoning', 'stolen_ideas'],
      },
    },
  });

  if (!response.text) {
    throw new Error(`Node ${node.name} failed to return an evaluation.`);
  }

  return JSON.parse(response.text);
};

export const generateMasterDocument = async (
  winningDocTitle: string,
  winningDocContent: string,
  ideasToImplement: { idea: string; why: string; source: string }[]
): Promise<string> => {
  const prompt = `
You are an elite Lead Software Architect and Technical Writer. Your task is to create the ultimate MASTER document.
Take the following winning document ("${winningDocTitle}") and seamlessly integrate the listed improvements into it.

ORIGINAL WINNING DOCUMENT:
${winningDocContent}

IMPROVEMENTS TO INTEGRATE:
${ideasToImplement.map((i, idx) => `${idx + 1}. ${i.idea} (Why: ${i.why})`).join('\n')}

Instructions:
1. Rewrite the document to naturally incorporate these improvements.
2. Maintain the original core structure, tone, and strengths of the winning document.
3. Do not just append a list of improvements at the end; weave them into the architecture/design where they belong.
4. Return ONLY the raw markdown text of the final master document. Do not include markdown code block backticks (\`\`\`markdown) at the very beginning or end, just the raw text.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  let text = response.text || '';
  // Clean up potential markdown block wrappers
  text = text.replace(/^```markdown\n/i, '').replace(/```$/i, '');
  return text.trim();
};
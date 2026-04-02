import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { candidateContext } from '@/data/interviewContext';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { textChunk } = await request.json();

    if (!textChunk) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // Usamos la versión estable garantizada para evitar fallos de conexión en Vercel
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert live job interview assistant for the candidate.
      
      CANDIDATE KNOWLEDGE BASE:
      """
      ${candidateContext}
      """

      RECENT INTERVIEW TRANSCRIPT:
      "${textChunk}"
      
      TASK:
      1. Read the transcript. Focus ONLY on the VERY LAST sentence or phrase.
      2. Did the interviewer just ask a question OR give a command to explain something (e.g., "Cuéntame sobre...", "Explícame...", "Tell me about...", "Explain how...")?
      3. If the last sentence is NOT a question or prompt (e.g., just conversational filler like "ok", "perfect", or finishing a thought), reply EXACTLY and ONLY with "NO_QUESTION".
      4. If it IS a question or command, provide a bilingual response.

      OUTPUT FORMAT:
      🇬🇧 Question: [Question or Topic in English]
      🇪🇸 Pregunta: [Pregunta o Tema en Español]

      🇬🇧 Answer:
      - [Strategic point 1 in English]
      - [Strategic point 2 in English]
      - [Strategic point 3 in English]

      🇪🇸 Respuesta:
      - [Punto estratégico 1 en Español]
      - [Punto estratégico 2 en Español]
      - [Punto estratégico 3 en Español]
      
      CRITICAL: Use the CANDIDATE KNOWLEDGE BASE for answers. If not found, use your expert knowledge for a tech role.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    if (responseText.includes('NO_QUESTION')) {
       return NextResponse.json({ isQuestion: false });
    }

    return NextResponse.json({ isQuestion: true, suggestion: responseText });
    
  } catch (error) {
    console.error('Error en Gemini API:', error);
    return NextResponse.json({ error: 'AI_ERROR' }, { status: 500 });
  }
}
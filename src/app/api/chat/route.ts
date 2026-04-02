// Bloqueamos absolutamente la caché para que la IA piense en vivo cada vez
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      1. Read the INTERVIEW TRANSCRIPT carefully.
      2. Look for ANY question or instruction directed at the candidate (e.g., "Cuéntame...", "Explícame...", "Tell me about...", "What is...", "How do you...").
      3. CRITICAL: IGNORE trailing filler words, pauses, or conversational agreements at the end of the text (like "ok", "yes", "exacto", "ehhh", "bueno"). Focus on the actual intent inside the text block.
      4. If the text is ONLY filler words and contains NO requests or questions at all, output EXACTLY the word: NO_QUESTION.
      5. If there IS a valid request or question, provide a strategic response in BOTH English and Spanish.

      OUTPUT FORMAT:
      🇬🇧 Question: [Identified Question or Topic in English]
      🇪🇸 Pregunta: [Pregunta o Tema identificado en Español]

      🇬🇧 Answer:
      - [Strategic point 1 in English]
      - [Strategic point 2 in English]
      - [Strategic point 3 in English]

      🇪🇸 Respuesta:
      - [Punto estratégico 1 en Español]
      - [Punto estratégico 2 en Español]
      - [Punto estratégico 3 en Español]
      
      FINAL RULE: Always use the CANDIDATE KNOWLEDGE BASE first. If the specific topic is not there, provide a professional, standard strategic response for a senior tech role.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    if (responseText === 'NO_QUESTION' || responseText.includes('NO_QUESTION')) {
       return NextResponse.json({ isQuestion: false });
    }

    return NextResponse.json({ isQuestion: true, suggestion: responseText });
    
  } catch (error: any) {
    console.error('Error en Gemini API:', error.message);
    return NextResponse.json({ error: 'AI_ERROR', details: error.message }, { status: 500 });
  }
}
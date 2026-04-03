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

      INTERVIEW TRANSCRIPT:
      "${textChunk}"
      
      TASK:
      Provide a strategic response, talking points, or continuation for the transcript above.
      DO NOT evaluate whether it is a question or not. ALWAYS generate a response based on the context, even if it is just a statement or conversational filler.
      
      OUTPUT FORMAT MUST BE EXACTLY THIS:
      🇬🇧 Question/Topic: [Summary of what was said in English]
      🇪🇸 Pregunta/Tema: [Resumen de lo que se dijo en Español]

      🇬🇧 Answer:
      - [Strategic point 1 in English]
      - [Strategic point 2 in English]

      🇪🇸 Respuesta:
      - [Punto estratégico 1 en Español]
      - [Punto estratégico 2 en Español]
      
      FINAL RULE: Always use the CANDIDATE KNOWLEDGE BASE first. If not found, use your expert knowledge.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Forzamos a que siempre devuelva true y la respuesta
    return NextResponse.json({ isQuestion: true, suggestion: responseText });
    
  } catch (error: any) {
    console.error('Error en Gemini API:', error.message);
    // Devolvemos el error detallado al frontend
    return NextResponse.json({ error: 'AI_ERROR', details: error.message }, { status: 500 });
  }
}
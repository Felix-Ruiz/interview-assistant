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

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      // Mantenemos temperatura baja para velocidad,
      // pero eliminamos el maxOutputTokens que ahogaba la respuesta.
      generationConfig: {
        temperature: 0.2,
      }
    });

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
      
      CRITICAL FOR SPEED: Keep bullet points ULTRA-CONCISE (maximum 10-12 words per point). Do not write long paragraphs. Get straight to the point.
      
      OUTPUT FORMAT MUST BE EXACTLY THIS:
      🇬🇧 Question/Topic: [Ultra-short summary in English]
      🇪🇸 Pregunta/Tema: [Resumen ultra-corto en Español]

      🇬🇧 Answer:
      - [Short point 1]
      - [Short point 2]

      🇪🇸 Respuesta:
      - [Punto corto 1]
      - [Punto corto 2]
      
      FINAL RULE: Always use the CANDIDATE KNOWLEDGE BASE first. If not found, use your expert knowledge.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    return NextResponse.json({ isQuestion: true, suggestion: responseText });
    
  } catch (error: any) {
    console.error('Error en Gemini API:', error.message);
    return NextResponse.json({ error: 'AI_ERROR', details: error.message }, { status: 500 });
  }
}
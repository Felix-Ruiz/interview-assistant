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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are an expert live job interview assistant for the candidate.
      
      CANDIDATE KNOWLEDGE BASE:
      """
      ${candidateContext}
      """

      RECENT INTERVIEW TRANSCRIPT (Last few seconds):
      "${textChunk}"
      
      TASK:
      1. Analyze the transcript above. 
      2. If the interviewer has just asked a question or prompted the candidate to speak, identify it.
      3. If there is no clear question or it is just conversational filler, reply ONLY with "NO_QUESTION".
      4. If there IS a question, provide a bilingual response.

      OUTPUT FORMAT:
      🇬🇧 Question: [Question in English]
      🇪🇸 Pregunta: [Pregunta en Español]

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
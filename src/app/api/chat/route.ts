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
      2. Identify if the interviewer is asking a question OR making a direct request/imperative for the candidate to explain something (e.g., "Cuéntame para qué funciona...", "Háblame sobre...", "Tell me about...", "Explain how..."). Treat these commands exactly as questions.
      3. If there is no clear topic requested, or it is just conversational filler (e.g., "okay", "perfect", "hello", "yes"), reply ONLY with "NO_QUESTION".
      4. If it IS a question or an imperative request, provide a bilingual response.

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
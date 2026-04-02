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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an expert live job interview assistant for the candidate.
      
      Here is the candidate's professional background, resume, and preferred answers to common questions:
      """
      ${candidateContext}
      """

      Analyze this recent segment of what the interviewer just said:
      "${textChunk}"
      
      Did the interviewer ask a clear question or prompt the candidate to speak?
      
      If NO: Reply EXACTLY with the word "NO_QUESTION".
      
      If YES: Provide the response in BOTH English and Spanish, regardless of the language the interviewer used. Reply EXACTLY in this format:
      
      🇬🇧 Question: [The exact question you identified in English]
      🇪🇸 Pregunta: [The exact question you identified in Spanish]

      🇬🇧 Answer:
      - [Point 1 in English based on candidate context]
      - [Point 2 in English based on candidate context]
      - [Point 3 in English based on candidate context]

      🇪🇸 Respuesta:
      - [Point 1 in Spanish based on candidate context]
      - [Point 2 in Spanish based on candidate context]
      - [Point 3 in Spanish based on candidate context]
      
      CRITICAL INSTRUCTION: Base your bullet points strictly on the candidate's background provided above. If the specific answer is not in the provided context, provide a highly professional, standard strategic response that fits a senior tech profile.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    if (responseText === 'NO_QUESTION' || responseText.includes('NO_QUESTION')) {
       return NextResponse.json({ isQuestion: false });
    }

    return NextResponse.json({ isQuestion: true, suggestion: responseText });
    
  } catch (error) {
    console.error('Error en la ruta de la API de Gemini:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la respuesta con la IA' }, 
      { status: 500 }
    );
  }
}
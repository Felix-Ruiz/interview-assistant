import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
// Importamos tu documento de conocimientos
import { candidateContext } from '@/data/interviewContext';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { textChunk } = await request.json();

    if (!textChunk) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Modificamos el Prompt para inyectar tu contexto personal y obligar a la IA a usarlo
    const prompt = `
      You are an expert live job interview assistant for the candidate.
      
      Here is the candidate's professional background, resume, and preferred answers to common questions:
      """
      ${candidateContext}
      """

      Analyze this recent segment of what the interviewer just said:
      
      "${textChunk}"
      
      Did the interviewer ask a clear question or prompt the candidate to speak (e.g., "tell me about...", "what is your experience with...", "how would you...")?
      
      If NO (it's just conversational filler, a statement, or incomplete): Reply EXACTLY with the word "NO_QUESTION".
      
      If YES: Reply in this exact format:
      Q: [The exact question or prompt you identified]
      A: [2 or 3 short, strategic bullet points to answer it in English]
      
      CRITICAL INSTRUCTION FOR THE ANSWER (A): 
      You MUST base your bullet points strictly on the candidate's background provided above. Use their specific projects, skills, and pre-written answers. If the specific answer is not in the provided context, provide a highly professional, standard strategic response that fits a senior tech profile.
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
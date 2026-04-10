import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.0-flash";

interface GenerateResponseParams {
  emailSubject: string;
  emailBody: string;
  senderName: string;
  senderEmail: string;
  projectContext: string;
  projectName: string;
  replyFromEmail: string;
}

interface GenerateResponseResult {
  response: string;
  tokensUsed: number;
  model: string;
}

/**
 * Generates an AI email response using Gemini, informed by the project context.
 * Same interface as claude.ts for drop-in replacement.
 */
export async function generateEmailResponseGemini(
  params: GenerateResponseParams
): Promise<GenerateResponseResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const systemPrompt = `Eres el asistente de respuesta de emails de ${params.projectName}. Tu rol es generar respuestas profesionales, amables y útiles a los emails que recibe el equipo.

CONTEXTO DEL PROYECTO:
${params.projectContext}

REGLAS DE RESPUESTA:
1. Responde siempre en el mismo idioma que el email original
2. Sé profesional pero cercano — no uses lenguaje corporativo vacío
3. Si el email pregunta algo que está en el contexto del proyecto, responde con información precisa
4. Si la pregunta está fuera del alcance del contexto, indica amablemente que no tienes esa información y sugiere contactar por otro canal
5. No inventes datos, precios o características que no estén en el contexto
6. Firma como "Equipo ${params.projectName}" seguido del email de contacto
7. No incluyas líneas de asunto ni "Re:" — solo el cuerpo de la respuesta
8. Usa un tono que refleje la personalidad de la marca definida en el contexto`;

  const userMessage = `Genera una respuesta para el siguiente email:

DE: ${params.senderName} <${params.senderEmail}>
ASUNTO: ${params.emailSubject}

CONTENIDO:
${params.emailBody}

---
Responde desde: ${params.replyFromEmail}`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
    },
  });

  // Defensive access: .text getter may throw on blocked/empty responses
  let responseText = "";
  try {
    responseText = response.text ?? "";
  } catch {
    // Fallback: extract from candidates directly
    const candidate = response.candidates?.[0];
    responseText = candidate?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? "";
  }

  if (!responseText) {
    const reason = response.candidates?.[0]?.finishReason ?? "UNKNOWN";
    throw new Error(`Gemini returned empty response (finishReason: ${reason})`);
  }

  const usage = response.usageMetadata as Record<string, number> | undefined;
  const tokensUsed =
    (usage?.promptTokenCount ?? 0) +
    (usage?.candidatesTokenCount ?? usage?.totalTokenCount ?? 0);

  return {
    response: responseText,
    tokensUsed,
    model: MODEL,
  };
}

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";

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
 * Generates an AI email response using Claude, informed by the project context.
 */
export async function generateEmailResponse(
  params: GenerateResponseParams
): Promise<GenerateResponseResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

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

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  // Extract text from response
  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("\n");

  const tokensUsed =
    (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

  return {
    response: responseText,
    tokensUsed,
    model: MODEL,
  };
}

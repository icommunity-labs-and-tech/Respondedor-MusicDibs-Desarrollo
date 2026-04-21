import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";

export interface EmailAttachmentForAI {
  filename: string;
  contentType: string;
  base64Data: string;
}

interface GenerateResponseParams {
  emailSubject: string;
  emailBody: string;
  senderName: string;
  senderEmail: string;
  projectContext: string;
  projectName: string;
  replyFromEmail: string;
  attachments?: EmailAttachmentForAI[];
}

interface GenerateResponseResult {
  response: string;
  tokensUsed: number;
  model: string;
}

interface ImproveResponseParams {
  emailSubject: string;
  emailBody: string;
  senderName: string;
  senderEmail: string;
  projectContext: string;
  projectName: string;
  currentDraft: string;
}

/**
 * Improves an edited email draft using Claude, preserving intent but enhancing quality.
 */
export async function improveEmailResponse(
  params: ImproveResponseParams
): Promise<GenerateResponseResult> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const systemPrompt = `Eres un experto en comunicación profesional para ${params.projectName}. Tu tarea es mejorar un borrador de respuesta de email que ha sido editado manualmente.

CONTEXTO DEL PROYECTO:
${params.projectContext}

REGLAS:
1. Mantén exactamente el mismo idioma que el borrador original
2. Conserva la intención y contenido del borrador — NO cambies los datos ni el mensaje central
3. Mejora: claridad, tono profesional, fluidez y coherencia
4. Elimina redundancias, frases torpes o construcciones poco naturales
5. No inventes información nueva que no esté en el borrador o el contexto
6. Mantén la firma original si la hay
7. Devuelve solo el cuerpo mejorado, sin comentarios ni explicaciones`;

  const userMessage = `EMAIL ORIGINAL RECIBIDO:
DE: ${params.senderName} <${params.senderEmail}>
ASUNTO: ${params.emailSubject}

${params.emailBody}

---
BORRADOR EDITADO A MEJORAR:
${params.currentDraft}

---
Devuelve el borrador mejorado:`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  const tokensUsed =
    (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

  return { response: responseText, tokensUsed, model: MODEL };
}

/**
 * Detects the real image media type from base64 data by inspecting magic bytes.
 * Returns null for unsupported formats.
 */
function detectImageMediaType(
  base64Data: string
): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null {
  try {
    const bytes = Buffer.from(base64Data.slice(0, 16), "base64");
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
      return "image/jpeg";
    // PNG: 89 50 4E 47
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    )
      return "image/png";
    // GIF: 47 49 46
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
      return "image/gif";
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    )
      return "image/webp";
  } catch {
    // ignore, fall through to null
  }
  return null;
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

  // Build multimodal content: text first, then attachments
  const userContent: Anthropic.MessageParam["content"] = [
    { type: "text", text: userMessage },
  ];

  if (params.attachments && params.attachments.length > 0) {
    for (const att of params.attachments) {
      if (att.contentType === "application/pdf") {
        userContent.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: att.base64Data,
          },
        } as Anthropic.DocumentBlockParam);
      } else if (att.contentType.startsWith("image/")) {
        const mediaType = detectImageMediaType(att.base64Data);
        if (!mediaType) continue; // skip unsupported image formats
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: att.base64Data },
        });
      }
    }

    // Append description of attached files at the end of text
    const attList = params.attachments
      .map((a) => `- ${a.filename} (${a.contentType})`)
      .join("\n");
    userContent[0] = {
      type: "text",
      text: userMessage + `\n\nARCHIVOS ADJUNTOS EN ESTE EMAIL:\n${attList}\n(Analiza el contenido visual de las imágenes/PDFs adjuntos para entender mejor la incidencia y responder adecuadamente.)`,
    };
  }

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
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

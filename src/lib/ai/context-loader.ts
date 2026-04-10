import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Loads the project context by merging two sources:
 * 1. The static .md file deployed with the app (base knowledge)
 * 2. Dynamic Q&A entries stored in Supabase (accumulated from sent replies)
 *
 * The Vercel filesystem is read-only at runtime, so new cases go to Supabase
 * and are merged here on every AI generation call.
 */
export async function loadProjectContext(
  contextFilePath: string,
  projectId?: string
): Promise<string> {
  // 1. Load static context file
  let staticContent = "No hay contexto específico disponible para este proyecto. Responde de forma genérica y profesional.";
  try {
    const fullPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "contexts",
      path.basename(contextFilePath)
    );
    staticContent = await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    console.warn(`[CONTEXT] Could not load context file: ${contextFilePath}`, error);
  }

  // 2. Load dynamic Q&A from Supabase (if projectId provided)
  if (!projectId) return staticContent;

  try {
    const supabase = getServiceClient();
    const { data: entries } = await supabase
      .from("knowledge_qa")
      .select("question, answer, category, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50); // Cap to avoid bloating context

    if (!entries || entries.length === 0) return staticContent;

    const dynamicSection = [
      "",
      "## Casos Recientes Resueltos",
      "Respuestas reales enviadas recientemente. Úsalas como referencia directa de tono y contenido:",
      "",
      ...entries.map(
        (e) => `**Consulta:** ${e.question.slice(0, 300)}\n**Respuesta enviada:** ${e.answer.slice(0, 350)}`
      ),
    ].join("\n");

    return staticContent + dynamicSection;
  } catch (error) {
    console.warn("[CONTEXT] Could not load dynamic knowledge_qa:", error);
    return staticContent;
  }
}

/**
 * Appends a new Q&A pair to the dynamic knowledge base in Supabase.
 * Called after every successful email send.
 */
export async function appendKnowledgeEntry({
  projectId,
  question,
  answer,
  category,
}: {
  projectId: string;
  question: string;
  answer: string;
  category?: string;
}): Promise<void> {
  try {
    const supabase = getServiceClient();

    // Clean up boilerplate before storing
    const cleanQ = question
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 600);

    const cleanA = answer
      .replace(/El equipo de Musicdibs[\s\S]*/i, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 700);

    if (cleanQ.length < 20 || cleanA.length < 10) return;

    await supabase.from("knowledge_qa").insert({
      project_id: projectId,
      question: cleanQ,
      answer: cleanA,
      category: category ?? null,
    });
  } catch (error) {
    // Non-fatal: never block email sending due to KB write failure
    console.warn("[CONTEXT] Could not append knowledge entry:", error);
  }
}

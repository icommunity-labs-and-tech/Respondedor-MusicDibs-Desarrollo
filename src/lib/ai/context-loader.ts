import fs from "fs/promises";
import path from "path";

/**
 * Loads the project context from its .md file.
 * The file path is stored in the project's `context_file` column.
 * Falls back to a generic message if the file doesn't exist.
 */
export async function loadProjectContext(
  contextFilePath: string
): Promise<string> {
  try {
    // Resolve path scoped to the contexts subfolder
    const fullPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "contexts",
      path.basename(contextFilePath)
    );
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error) {
    console.warn(
      `[CONTEXT] Could not load context file: ${contextFilePath}`,
      error
    );
    return "No hay contexto específico disponible para este proyecto. Responde de forma genérica y profesional.";
  }
}

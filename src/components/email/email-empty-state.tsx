"use client";

export default function EmailEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-low/50">
      <span className="material-symbols-outlined text-7xl text-outline-variant/30 mb-6">
        mark_email_unread
      </span>
      <h3 className="text-xl font-bold text-on-surface mb-2">
        Selecciona un email
      </h3>
      <p className="text-sm text-on-surface-variant max-w-sm">
        Elige un email de la lista para ver su contenido y revisar o editar la
        respuesta generada por IA.
      </p>
    </div>
  );
}

import { useState } from "react";
import { ClipboardList, Mail } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PantallaAccesoProps {
  onContinuar: (correo: string) => void;
}

export default function PantallaAcceso({ onContinuar }: PantallaAccesoProps) {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const continuar = () => {
    const email = correo.trim();
    if (!email) {
      setError("Ingrese su correo electrónico para continuar.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("El correo electrónico ingresado no es válido.");
      return;
    }
    setError(null);
    onContinuar(email);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <ClipboardList className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Sistema de Gestión de Asistencia
          </h1>
          <p className="text-sm text-zinc-500">
            Identifíquese para ingresar. Luego podrá usar los módulos de
            consulta, reportes y registro del sistema.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400" />
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") continuar();
                }}
                placeholder="usuario@dominio.com"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={continuar}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <ClipboardList className="h-4 w-4" />
            Ingresar al sistema
          </button>

          <p className="text-center text-xs text-zinc-400">
            Entorno de demostración · Datos simulados o anonimizados con fines
            técnicos e ilustrativos.
          </p>
        </div>
      </div>
    </div>
  );
}
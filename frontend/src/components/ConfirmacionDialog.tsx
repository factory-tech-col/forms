import { Loader2 } from "lucide-react";

interface ConfirmacionDialogProps {
  titulo: string;
  mensaje: string;
  confirmarTexto?: string;
  peligro?: boolean;
  abierto: boolean;
  operando?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export default function ConfirmacionDialog({
  titulo,
  mensaje,
  confirmarTexto = "Eliminar",
  peligro = true,
  abierto,
  operando = false,
  onCancelar,
  onConfirmar,
}: ConfirmacionDialogProps) {
  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
      onMouseDown={operando ? undefined : onCancelar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-zinc-900">{titulo}</h3>
        <p className="mt-2 whitespace-pre-line text-sm text-zinc-600">{mensaje}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={operando}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={operando}
            className={
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 " +
              (peligro
                ? "bg-red-500 hover:bg-red-600"
                : "bg-indigo-600 hover:bg-indigo-700")
            }
          >
            {operando && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
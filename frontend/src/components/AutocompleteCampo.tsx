import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { cn } from "../lib/utils";

export interface OpcionCampo {
  value: string;
  label: string;
}

interface AutocompleteCampoProps {
  id: string;
  etiqueta: string;
  placeholder?: string;
  opciones: OpcionCampo[];
  labelSeleccionado: string;
  onSeleccionar: (value: string) => void;
  onLimpiar?: () => void;
  deshabilitado?: boolean;
  cargando?: boolean;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-8 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

function norm(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function AutocompleteCampo({
  id,
  etiqueta,
  placeholder,
  opciones,
  labelSeleccionado,
  onSeleccionar,
  onLimpiar,
  deshabilitado = false,
  cargando = false,
}: AutocompleteCampoProps) {
  const [query, setQuery] = useState(labelSeleccionado);
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", cb);
    return () => document.removeEventListener("mousedown", cb);
  }, []);

  const filtradas = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return opciones;
    return opciones.filter((o) => norm(o.label).includes(q));
  }, [opciones, query]);

  function seleccionar(o: OpcionCampo) {
    setQuery(o.label);
    setAbierto(false);
    onSeleccionar(o.value);
  }

  return (
    <div ref={contenedor} className="relative">
      <label className={labelCls} htmlFor={id}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          className={inputCls + (deshabilitado ? " cursor-not-allowed" : "")}
          value={query}
          placeholder={placeholder}
          disabled={deshabilitado}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onLimpiar) onLimpiar();
          }}
          onFocus={() => {
            setAbierto(true);
          }}
          onBlur={() =>
            setTimeout(() => {
              setAbierto(false);
            }, 150)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && abierto && filtradas.length > 0) {
              e.preventDefault();
              seleccionar(filtradas[0]);
            }
            if (e.key === "Escape") setAbierto(false);
          }}
        />
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
          {cargando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>

      {!deshabilitado && abierto && (
        filtradas.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            {filtradas.map((o) => {
              const activo = o.label === labelSeleccionado;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      seleccionar(o);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-indigo-50",
                      activo && "font-medium text-indigo-700"
                    )}
                  >
                    <span>{o.label}</span>
                    {activo && <Check className="h-4 w-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          query.trim() !== "" && (
            <p className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-400 shadow-lg">
              Sin resultados para «{query}»…
            </p>
          )
        )
      )}
    </div>
  );
}
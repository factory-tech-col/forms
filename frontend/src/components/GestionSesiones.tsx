import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import {
  eliminarSesionConAuditoria,
  getSesionDetalle,
  getSesionesRegistradas,
} from "../services/api";
import type { AccionRegistro, DatosSesionDetalle, RegistroSesion } from "../types/database";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

interface GestionSesionesProps {
  correoUsuario: string;
  accion: Exclude<AccionRegistro, "crear">;
  onEditar: (detalle: DatosSesionDetalle) => void;
}

function normBusqueda(v: unknown): string {
  return typeof v === "string" ? v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

export default function GestionSesiones({
  correoUsuario,
  accion,
  onEditar,
}: GestionSesionesProps) {
  const [lista, setLista] = useState<RegistroSesion[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(true);
  const [operando, setOperando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const cargar = () => {
    setCargando(true);
    setError(null);
    getSesionesRegistradas()
      .then((datos) => setLista(datos))
      .catch((e) => setError((e as Error).message))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtradas = useMemo(() => {
    const q = normBusqueda(texto);
    if (!q) return lista;
    return lista.filter((s) => {
      const oferta = normBusqueda(s.proyectos_ofertas?.oferta);
      const inst = normBusqueda(s.instituciones?.nombre_normalizado);
      const muni = normBusqueda(s.instituciones?.catalogos_ubicacion?.municipio);
      const asistente = normBusqueda(s.asistentes?.nombres_apellidos);
      const responsable = normBusqueda(s.responsable_sesion);
      return [oferta, inst, muni, asistente, responsable].some((v) => v.includes(q));
    });
  }, [texto, lista]);

  async function abrirEdicion(sesion: RegistroSesion) {
    setOperando(sesion.id_sesion);
    setError(null);
    setExito(null);
    try {
      const detalle = await getSesionDetalle(sesion.id_sesion);
      onEditar(detalle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOperando(null);
    }
  }

  async function borrar(sesion: RegistroSesion) {
    if (
      !window.confirm(
        `¿Eliminar la sesión #${sesion.id_sesion}?\n\nEsta acción quedará registrada en auditoría con el usuario ${correoUsuario} y no se puede deshacer.`
      )
    ) {
      return;
    }
    setOperando(sesion.id_sesion);
    setError(null);
    setExito(null);
    try {
      await eliminarSesionConAuditoria(sesion.id_sesion, correoUsuario);
      setLista((prev) => prev.filter((s) => s.id_sesion !== sesion.id_sesion));
      setExito(`Sesión #${sesion.id_sesion} eliminada y registrada en auditoría.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOperando(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900">
          {accion === "editar" ? "Editar Registro de Sesión" : "Eliminar Registro de Sesión"}
        </h2>
        <p className="text-sm text-zinc-500">
          {accion === "editar"
            ? "Seleccione una sesión para cargarla en el formulario y modificar sus datos."
            : "Seleccione una sesión para eliminarla. El borrado se registra en auditoría con su correo."}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400" />
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por oferta, institución, municipio, asistente o responsable…"
            className={inputCls + " pl-10"}
          />
        </div>
        <button
          type="button"
          onClick={cargar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Recargar
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {exito && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {exito}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          Cargando sesiones…
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          {lista.length === 0
            ? "Aún no hay sesiones registradas. Las 50.000 asistencias aparecerán aquí tras la carga."
            : "No hay resultados para el término de búsqueda."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <ul className="divide-y divide-zinc-100">
            {filtradas.map((s) => (
              <li
                key={s.id_sesion}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                      #{s.id_sesion}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {s.fecha ?? "Sin fecha"}
                    </span>
                    <span className="text-sm font-semibold text-zinc-800">
                      {s.proyectos_ofertas?.oferta ?? "Sin oferta"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-600">
                    {s.instituciones?.nombre_normalizado ?? "Sin institución"}
                    {s.instituciones?.catalogos_ubicacion?.municipio
                      ? ` — ${s.instituciones.catalogos_ubicacion.municipio}`
                      : ""}
                  </p>
                  <p className="truncate text-xs text-zinc-400">
                    Asistente: {s.asistentes?.nombres_apellidos ?? "—"}
                    {s.responsable_sesion ? ` · Responsable: ${s.responsable_sesion}` : ""}
                    {s.correo_usuario ? ` · Usuario: ${s.correo_usuario}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {accion === "editar" && (
                    <button
                      type="button"
                      disabled={operando !== null}
                      onClick={() => abrirEdicion(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
                    >
                      {operando === s.id_sesion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Edit3 className="h-4 w-4" />
                      )}
                      Editar
                    </button>
                  )}
                  {accion === "eliminar" && (
                    <button
                      type="button"
                      disabled={operando !== null}
                      onClick={() => borrar(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-40"
                    >
                      {operando === s.id_sesion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-400">
            Mostrando {filtradas.length} de {lista.length} sesiones.
          </p>
        </div>
      )}
    </div>
  );
}
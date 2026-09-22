import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { cn } from "../lib/utils";
import {
  contarSesionesDeInstitucion,
  eliminarInstitucion,
  eliminarSesionConAuditoria,
  getInstitucionesConsulta,
  getOpcionesCategoria,
  getSesionDetalle,
  getSesionesConsulta,
  getUbicaciones,
  updateInstitucion,
  type InstitucionRegistro,
  type Pagina,
} from "../services/api";
import type {
  DatosSesionDetalle,
  RegistroSesion,
  Ubicacion,
} from "../types/database";
import ConfirmacionDialog from "./ConfirmacionDialog";

const TAM_PAGINA = 10;

type Pestana = "sesiones" | "instituciones";

interface ConsultaRegistrosProps {
  correoUsuario: string;
  onEditar: (detalle: DatosSesionDetalle) => void;
}

interface Eliminando {
  tipo: "sesion" | "institucion";
  id: number;
  descripcion: string;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

export default function ConsultaRegistros({
  correoUsuario,
  onEditar,
}: ConsultaRegistrosProps) {
  const [pestana, setPestana] = useState<Pestana>("sesiones");
  const [buscaEscrita, setBuscaEscrita] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);

  const [sesiones, setSesiones] = useState<Pagina<RegistroSesion>>({
    filas: [],
    total: 0,
  });
  const [instituciones, setInstituciones] = useState<Pagina<InstitucionRegistro>>({
    filas: [],
    total: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [operando, setOperando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState<Eliminando | null>(null);
  const [editandoInstitucion, setEditandoInstitucion] =
    useState<InstitucionRegistro | null>(null);

  const esSesiones = pestana === "sesiones";

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      if (esSesiones) {
        const r = await getSesionesConsulta(pagina, TAM_PAGINA, busca);
        setSesiones(r);
      } else {
        const r = await getInstitucionesConsulta(pagina, TAM_PAGINA, busca);
        setInstituciones(r);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  });

  useEffect(() => {
    void cargarRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, pagina, busca]);

  useEffect(() => {
    const t = setTimeout(() => {
      setBusca(buscaEscrita);
      setPagina(1);
    }, 350);
    return () => clearTimeout(t);
  }, [buscaEscrita]);

  // Refresco en tiempo real si hay cambios desde otras ventanas/sesiones.
  useEffect(() => {
    const canal = supabase
      .channel("consulta-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sesiones_asistencia" },
        () => void cargarRef.current()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instituciones" },
        () => void cargarRef.current()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, []);

  const total = esSesiones ? sesiones.total : instituciones.total;
  const filas = (esSesiones ? sesiones.filas : instituciones.filas) as unknown[];
  const totalPaginas = Math.max(1, Math.ceil(total / TAM_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * TAM_PAGINA + 1;
  const hasta = Math.min(pagina * TAM_PAGINA, total);

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

  async function confirmarEliminacion() {
    if (!eliminando) return;
    setOperando(eliminando.id);
    setError(null);
    setExito(null);
    try {
      if (eliminando.tipo === "sesion") {
        await eliminarSesionConAuditoria(eliminando.id, correoUsuario);
        setExito(
          `Sesión #${eliminando.id} eliminada y registrada en auditoría con ${correoUsuario}.`
        );
      } else {
        const refs = await contarSesionesDeInstitucion(eliminando.id);
        if (refs > 0) {
          setError(
            `No se puede eliminar la institución: tiene ${refs} sesión(es) vinculada(s). Elimine primero esas sesiones.`
          );
          setEliminando(null);
          setOperando(null);
          return;
        }
        await eliminarInstitucion(eliminando.id);
        setExito(`Institución #${eliminando.id} eliminada.`);
      }
      setEliminando(null);
      await cargarRef.current();
    } catch (e) {
      setError((e as Error).message);
      setEliminando(null);
    } finally {
      setOperando(null);
    }
  }

  function cambiarPestana(p: Pestana) {
    setPestana(p);
    setPagina(1);
    setBuscaEscrita("");
    setBusca("");
    setError(null);
    setExito(null);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900">
          Consulta y Gestión de Registros
        </h2>
        <p className="text-sm text-zinc-500">
          Tablas paginadas con búsqueda. Edite una sesión para cargarla en el
          formulario o elimine registros con confirmación.
        </p>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "sesiones", label: "Sesiones", count: sesiones.total },
            { id: "instituciones", label: "Instituciones", count: instituciones.total },
          ] as { id: Pestana; label: string; count: number }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => cambiarPestana(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
              pestana === t.id
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            )}
          >
            {t.id === "sesiones" ? (
              <CalendarDays className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {t.label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                pestana === t.id ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-500"
              )}
            >
              {t.count.toLocaleString("es-CO")}
            </span>
          </button>
        ))}
      </div>

      {/* Barra de herramientas */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400" />
          <input
            value={buscaEscrita}
            onChange={(e) => setBuscaEscrita(e.target.value)}
            placeholder={
              esSesiones
                ? "Buscar por oferta, institución, municipio, asistente o responsable…"
                : "Buscar por nombre, clase, tipo, actividad o municipio…"
            }
            className={inputCls + " pl-10"}
          />
        </div>
        <button
          type="button"
          onClick={() => void cargarRef.current()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {exito && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          {exito}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          Cargando registros…
        </div>
      ) : filas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-400">
          {busca
            ? "No hay resultados para el término de búsqueda."
            : esSesiones
              ? "Aún no hay sesiones registradas."
              : "Aún no hay instituciones registradas."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  {esSesiones ? (
                    <>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Oferta / Proyecto</th>
                      <th className="px-4 py-3 font-semibold">Institución</th>
                      <th className="px-4 py-3 font-semibold">Asistente</th>
                      <th className="px-4 py-3 font-semibold">Responsable</th>
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-semibold">Nombre</th>
                      <th className="px-4 py-3 font-semibold">Clase</th>
                      <th className="px-4 py-3 font-semibold">Tipo</th>
                      <th className="px-4 py-3 font-semibold">Actividad económica</th>
                      <th className="px-4 py-3 font-semibold">Municipio</th>
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {esSesiones
                  ? (filas as RegistroSesion[]).map((s) => (
                      <tr key={s.id_sesion} className="transition hover:bg-indigo-50/30">
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                          {s.fecha ?? "—"}
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate font-semibold text-zinc-800" title={s.proyectos_ofertas?.oferta ?? ""}>
                            {s.proyectos_ofertas?.oferta ?? "Sin oferta"}
                          </p>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={s.instituciones?.nombre_normalizado ?? ""}>
                            {s.instituciones?.nombre_normalizado ?? "—"}
                          </p>
                          {s.instituciones?.catalogos_ubicacion?.municipio && (
                            <p className="truncate text-xs text-zinc-400">
                              {s.instituciones.catalogos_ubicacion.municipio}
                            </p>
                          )}
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={s.asistentes?.nombres_apellidos ?? ""}>
                            {s.asistentes?.nombres_apellidos ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={s.responsable_sesion ?? ""}>
                            {s.responsable_sesion ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <BotonesAccion
                              operando={operando === s.id_sesion}
                              todosOcupados={operando !== null}
                              onEditar={() => void abrirEdicion(s)}
                              onEliminar={() =>
                                setEliminando({
                                  tipo: "sesion",
                                  id: s.id_sesion,
                                  descripcion: `#${s.id_sesion} — ${s.proyectos_ofertas?.oferta ?? "Sin oferta"}`,
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  : (filas as InstitucionRegistro[]).map((i) => (
                      <tr key={i.id_institucion} className="transition hover:bg-indigo-50/30">
                        <td className="max-w-[260px] px-4 py-3">
                          <p className="truncate font-semibold text-zinc-800" title={i.nombre_normalizado ?? ""}>
                            {i.nombre_normalizado ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={i.clase_entidad ?? ""}>
                            {i.clase_entidad ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[160px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={i.tipo_entidad ?? ""}>
                            {i.tipo_entidad ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={i.actividad_economica ?? ""}>
                            {i.actividad_economica ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-[180px] px-4 py-3">
                          <p className="truncate text-zinc-700" title={i.catalogos_ubicacion?.municipio ?? ""}>
                            {i.catalogos_ubicacion?.municipio ?? "—"}
                          </p>
                          {i.catalogos_ubicacion?.departamento && (
                            <p className="truncate text-xs text-zinc-400">
                              {i.catalogos_ubicacion.departamento}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <BotonesAccion
                              operando={operando === i.id_institucion}
                              todosOcupados={operando !== null}
                              onEditar={() => setEditandoInstitucion(i)}
                              onEliminar={() =>
                                setEliminando({
                                  tipo: "institucion",
                                  id: i.id_institucion,
                                  descripcion: `#${i.id_institucion} — ${i.nombre_normalizado ?? "Sin nombre"}`,
                                })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
            <span>
              Mostrando {desde}–{hasta} de {total.toLocaleString("es-CO")} registros
              {busca && ` · filtrado por «${busca}»`}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="px-2 text-zinc-500">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación de eliminación */}
      <ConfirmacionDialog
        abierto={eliminando !== null}
        titulo={`Eliminar ${eliminando?.tipo === "sesion" ? "sesión" : "institución"}`}
        mensaje={
          eliminando?.tipo === "sesion"
            ? `¿Eliminar la sesión ${eliminando.descripcion}?\n\nEl borrado no se puede deshacer y quedará registrado en auditoría con el usuario ${correoUsuario}.`
            : `¿Eliminar la institución ${eliminando?.descripcion}?\n\nEl borrado no se puede deshacer. Si tiene sesiones vinculadas no se podrá eliminar.`
        }
        operando={operando === eliminando?.id}
        onCancelar={() => setEliminando(null)}
        onConfirmar={() => void confirmarEliminacion()}
      />

      {/* Edición de institución */}
      {editandoInstitucion && (
        <EditarInstitucionModal
          institucion={editandoInstitucion}
          onCerrar={() => setEditandoInstitucion(null)}
          onGuardado={() => {
            setEditandoInstitucion(null);
            setExito(
              `Institución "${editandoInstitucion.nombre_normalizado ?? ""}" actualizada correctamente.`
            );
            void cargarRef.current();
          }}
        />
      )}
    </div>
  );
}

function BotonesAccion({
  operando,
  todosOcupados,
  onEditar,
  onEliminar,
}: {
  operando: boolean;
  todosOcupados: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <>
      <button
        type="button"
        disabled={todosOcupados}
        onClick={onEditar}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Edit3 className="h-3.5 w-3.5" />
        Editar
      </button>
      <button
        type="button"
        disabled={todosOcupados}
        onClick={onEliminar}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {operando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        Eliminar
      </button>
    </>
  );
}

function EditarInstitucionModal({
  institucion,
  onCerrar,
  onGuardado,
}: {
  institucion: InstitucionRegistro;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [nombre, setNombre] = useState(institucion.nombre_normalizado ?? "");
  const [clase, setClase] = useState(institucion.clase_entidad ?? "");
  const [tipo, setTipo] = useState(institucion.tipo_entidad ?? "");
  const [actividad, setActividad] = useState(institucion.actividad_economica ?? "");
  const [idMunicipio, setIdMunicipio] = useState<number | null>(
    institucion.id_municipio
  );
  const [opciones, setOpciones] = useState<{
    clase: string[];
    tipo: string[];
    actividad: string[];
  }>({ clase: [], tipo: [], actividad: [] });
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [claseOp, tipoOp, actOp, ubs] = await Promise.all([
          getOpcionesCategoria("instituciones", "clase_entidad"),
          getOpcionesCategoria("instituciones", "tipo_entidad"),
          getOpcionesCategoria("instituciones", "actividad_economica"),
          getUbicaciones(),
        ]);
        if (!activo) return;
        setOpciones({ clase: claseOp, tipo: tipoOp, actividad: actOp });
        setUbicaciones(ubs);
      } catch (e) {
        if (activo) setError((e as Error).message);
      } finally {
        if (activo) setCargandoOpciones(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const departamentos = useMemo(
    () =>
      Array.from(
        new Set(
          ubicaciones.map((u) => u.departamento).filter((d): d is string => Boolean(d))
        )
      ).sort((a, b) => a.localeCompare(b, "es")),
    [ubicaciones]
  );

  const [departamentoManual, setDepartamentoManual] = useState("");
  const departamentoDerivado = useMemo(() => {
    const u = ubicaciones.find((x) => x.id_municipio === idMunicipio);
    return u?.departamento ?? "";
  }, [ubicaciones, idMunicipio]);
  const departamento = departamentoManual || departamentoDerivado;

  const municipiosDepto = useMemo(
    () =>
      ubicaciones.filter((u) => u.departamento === departamento).sort((a, b) =>
        (a.municipio ?? "").localeCompare(b.municipio ?? "", "es")
      ),
    [ubicaciones, departamento]
  );

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await updateInstitucion(institucion.id_institucion, {
        nombre_normalizado: nombre.trim().toUpperCase() || null,
        clase_entidad: clase || null,
        tipo_entidad: tipo || null,
        actividad_economica: actividad || null,
        id_municipio: idMunicipio,
      });
      onGuardado();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
      onMouseDown={guardando ? undefined : onCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-900">Editar institución</h3>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {cargandoOpciones ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Cargando opciones…
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="Nombre de la institución"
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Clase de entidad
                </label>
                <select
                  value={clase}
                  onChange={(e) => setClase(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sin información</option>
                  {opciones.clase.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Tipo de entidad
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sin información</option>
                  {opciones.tipo.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Actividad económica
              </label>
              <select
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
                className={inputCls}
              >
                <option value="">Sin información</option>
                {opciones.actividad.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Departamento
                </label>
                <select
                  value={departamento}
                  onChange={(e) => {
                    setDepartamentoManual(e.target.value);
                    setIdMunicipio(null);
                  }}
                  className={inputCls}
                >
                  <option value="">Sin ubicación</option>
                  {departamentos.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Municipio
                </label>
                <select
                  value={idMunicipio ?? ""}
                  onChange={(e) => {
                    setIdMunicipio(e.target.value ? Number(e.target.value) : null);
                    setDepartamentoManual("");
                  }}
                  className={inputCls}
                >
                  <option value="">Sin municipio</option>
                  {municipiosDepto.map((u) => (
                    <option key={u.id_municipio} value={u.id_municipio}>
                      {u.municipio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCerrar}
                disabled={guardando}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void guardar()}
                disabled={guardando}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
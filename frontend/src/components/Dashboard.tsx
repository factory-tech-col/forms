import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  FilterX,
  Loader2,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  getDashboardFiltrado,
  getDepartamentos,
  getOpcionesCategoria,
  getProyectosOfertas,
  getUbicaciones,
  type ChartDatum,
  type DashboardResultado,
  type FiltrosDashboard,
  type TablaCatalogo,
} from "../services/api";
import type { ProyectoOferta, Ubicacion } from "../types/database";
import { cn } from "../lib/utils";

const PALETA = [
  "#4f46e5",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#84cc16",
];

const COLUMNAS_CARGA: { columna: string; tabla: TablaCatalogo }[] = [
  { columna: "genero", tabla: "asistentes" },
  { columna: "rango_edad", tabla: "asistentes" },
  { columna: "nivel_educativo", tabla: "asistentes" },
  { columna: "pertenencia_etnica", tabla: "asistentes" },
  { columna: "vulnerabilidad", tabla: "asistentes" },
  { columna: "discapacidad", tabla: "asistentes" },
  { columna: "tipo_entidad", tabla: "instituciones" },
  { columna: "clase_entidad", tabla: "instituciones" },
];

interface FiltrosDashboardState {
  departamentos: string[];
  municipios: number[];
  idOferta: number | null;
  genero: string;
  rangoEdad: string;
  nivelEducativo: string;
  pertenenciaEtnica: string;
  vulnerabilidad: string;
  discapacidad: string;
  tipoEntidad: string;
  claseEntidad: string;
}

const FILTROS_VACIO: FiltrosDashboardState = {
  departamentos: [],
  municipios: [],
  idOferta: null,
  genero: "",
  rangoEdad: "",
  nivelEducativo: "",
  pertenenciaEtnica: "",
  vulnerabilidad: "",
  discapacidad: "",
  tipoEntidad: "",
  claseEntidad: "",
};

function aPayload(d: FiltrosDashboardState): FiltrosDashboard {
  return {
    municipios: d.municipios.length > 0 ? d.municipios : undefined,
    ofertas: d.idOferta != null ? [d.idOferta] : undefined,
    genero: d.genero || undefined,
    rango_edad: d.rangoEdad || undefined,
    nivel_educativo: d.nivelEducativo || undefined,
    pertenencia_etnica: d.pertenenciaEtnica || undefined,
    vulnerabilidad: d.vulnerabilidad || undefined,
    discapacidad: d.discapacidad || undefined,
    tipo_entidad: d.tipoEntidad || undefined,
    clase_entidad: d.claseEntidad || undefined,
  };
}

function conteoActivos(d: FiltrosDashboardState): number {
  let n = d.departamentos.length + d.municipios.length;
  if (d.idOferta != null) n += 1;
  for (const v of [
    d.genero,
    d.rangoEdad,
    d.nivelEducativo,
    d.pertenenciaEtnica,
    d.vulnerabilidad,
    d.discapacidad,
    d.tipoEntidad,
    d.claseEntidad,
  ]) {
    if (v) n += 1;
  }
  return n;
}

function norm(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Dashboard() {
  const [resultado, setResultado] = useState<DashboardResultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<FiltrosDashboardState>(FILTROS_VACIO);
  const [aplicados, setAplicados] = useState<FiltrosDashboardState>(FILTROS_VACIO);

  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [ofertas, setOfertas] = useState<ProyectoOferta[]>([]);
  const [opciones, setOpciones] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const entradas = await Promise.all([
          getDepartamentos(),
          getUbicaciones(),
          getProyectosOfertas(),
          Promise.all(
            COLUMNAS_CARGA.map(async ({ columna, tabla }) => [
              columna,
              await getOpcionesCategoria(tabla, columna),
            ] as const)
          ),
        ]);
        if (!activo) return;
        setDepartamentos(entradas[0]);
        setUbicaciones(entradas[1]);
        setOfertas(entradas[2]);
        setOpciones(Object.fromEntries(entradas[3]));

        const inicial = await getDashboardFiltrado(aPayload(FILTROS_VACIO));
        if (activo) {
          setResultado(inicial);
          setAplicados(FILTROS_VACIO);
          setDraft(FILTROS_VACIO);
        }
      } catch (e) {
        if (activo) setError((e as Error).message);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  async function aplicar(d: FiltrosDashboardState) {
    setCargando(true);
    setError(null);
    try {
      const res = await getDashboardFiltrado(aPayload(d));
      setResultado(res);
      setAplicados(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  const deptosSet = useMemo(
    () => new Set(draft.departamentos),
    [draft.departamentos]
  );
  const municipiosDisponibles = useMemo(
    () =>
      draft.departamentos.length === 0
        ? ubicaciones
        : ubicaciones.filter(
            (u) => u.departamento != null && deptosSet.has(u.departamento)
          ),
    [ubicaciones, deptosSet, draft.departamentos.length]
  );
  const ubicacionPorId = useMemo(
    () => new Map(ubicaciones.map((u) => [u.id_municipio, u])),
    [ubicaciones]
  );
  const ofertaPorId = useMemo(
    () => new Map(ofertas.map((o) => [o.id_oferta, o.oferta])),
    [ofertas]
  );

  function cambiarDepartamentos(nuevos: string[]) {
    setDraft((prev) => {
      const set = nuevos.length > 0 ? new Set(nuevos) : null;
      let municipios = prev.municipios;
      if (set === null) {
        municipios = [];
      } else {
        municipios = prev.municipios.filter((id) => {
          const u = ubicacionPorId.get(id);
          return !u || set.has(u.departamento ?? "");
        });
      }
      return { ...prev, departamentos: nuevos, municipios };
    });
  }

  const activos = conteoActivos(draft);

  const resumenFiltros = useMemo(() => {
    const partes: string[] = [];
    if (aplicados.departamentos.length > 0) {
      partes.push(aplicados.departamentos.join(", "));
    }
    if (aplicados.municipios.length > 0) {
      const nom = aplicados.municipios
        .map((id) => ubicacionPorId.get(id)?.municipio)
        .filter(Boolean)
        .join(", ");
      if (nom) partes.push(nom);
    }
    if (aplicados.idOferta != null) {
      const nombre = ofertaPorId.get(aplicados.idOferta);
      if (nombre) partes.push(nombre);
    }
    if (aplicados.genero) partes.push(`Género: ${aplicados.genero}`);
    if (aplicados.rangoEdad) partes.push(`Edad: ${aplicados.rangoEdad}`);
    if (aplicados.nivelEducativo) partes.push(`Nivel: ${aplicados.nivelEducativo}`);
    if (aplicados.pertenenciaEtnica)
      partes.push(`Étnica: ${aplicados.pertenenciaEtnica}`);
    if (aplicados.vulnerabilidad)
      partes.push(`Vulnerabilidad: ${aplicados.vulnerabilidad}`);
    if (aplicados.discapacidad) partes.push(`Discapacidad: ${aplicados.discapacidad}`);
    if (aplicados.tipoEntidad) partes.push(`Tipo: ${aplicados.tipoEntidad}`);
    if (aplicados.claseEntidad) partes.push(`Clase: ${aplicados.claseEntidad}`);
    return partes;
  }, [aplicados, ubicacionPorId, ofertaPorId]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900">Dashboard de Reportes</h2>
        <p className="text-sm text-zinc-500">
          Métricas de sesiones, asistentes e instituciones con filtros avanzados.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Panel de filtros lateral */}
        <aside className="shrink-0 lg:w-80">
          <div className="flex h-max flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800">
                <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                Filtros
                {activos > 0 && (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {activos}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDraft(FILTROS_VACIO);
                  void aplicar(FILTROS_VACIO);
                }}
                disabled={activos === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FilterX className="h-3.5 w-3.5" />
                Limpiar
              </button>
            </div>

            <SeccionFiltros titulo="Ubicación">
              <MultiSelectBusqueda
                etiqueta="Departamento"
                opciones={departamentos.map((d) => ({ value: d, label: d }))}
                seleccionados={draft.departamentos}
                onCambio={cambiarDepartamentos}
              />
              <MultiSelectBusqueda
                etiqueta="Municipio"
                opciones={municipiosDisponibles.map((u) => ({
                  value: String(u.id_municipio),
                  label: u.municipio ?? "",
                }))}
                seleccionados={draft.municipios.map(String)}
                onCambio={(vals) =>
                  setDraft((prev) => ({
                    ...prev,
                    municipios: vals.map(Number),
                  }))
                }
              />
            </SeccionFiltros>

            <SeccionFiltros titulo="Oferta / Proyecto">
              <SelectFiltro
                etiqueta="Oferta"
                valor={draft.idOferta != null ? String(draft.idOferta) : ""}
                opciones={ofertas.map((o) => ({
                  value: String(o.id_oferta),
                  label: o.oferta ?? "",
                }))}
                onChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    idOferta: v ? Number(v) : null,
                  }))
                }
              />
            </SeccionFiltros>

            <SeccionFiltros titulo="Asistente">
              <SelectFiltro
                etiqueta="Género"
                valor={draft.genero}
                opciones={opciones.genero ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, genero: v }))}
              />
              <SelectFiltro
                etiqueta="Rango de edad"
                valor={draft.rangoEdad}
                opciones={opciones.rango_edad ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, rangoEdad: v }))}
              />
              <SelectFiltro
                etiqueta="Nivel educativo"
                valor={draft.nivelEducativo}
                opciones={opciones.nivel_educativo ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, nivelEducativo: v }))}
              />
              <SelectFiltro
                etiqueta="Pertenencia étnica"
                valor={draft.pertenenciaEtnica}
                opciones={opciones.pertenencia_etnica ?? []}
                onChange={(v) =>
                  setDraft((prev) => ({ ...prev, pertenenciaEtnica: v }))
                }
              />
              <SelectFiltro
                etiqueta="Vulnerabilidad"
                valor={draft.vulnerabilidad}
                opciones={opciones.vulnerabilidad ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, vulnerabilidad: v }))}
              />
              <SelectFiltro
                etiqueta="Discapacidad"
                valor={draft.discapacidad}
                opciones={opciones.discapacidad ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, discapacidad: v }))}
              />
            </SeccionFiltros>

            <SeccionFiltros titulo="Entidad">
              <SelectFiltro
                etiqueta="Tipo de entidad"
                valor={draft.tipoEntidad}
                opciones={opciones.tipo_entidad ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, tipoEntidad: v }))}
              />
              <SelectFiltro
                etiqueta="Clase de entidad"
                valor={draft.claseEntidad}
                opciones={opciones.clase_entidad ?? []}
                onChange={(v) => setDraft((prev) => ({ ...prev, claseEntidad: v }))}
              />
            </SeccionFiltros>

            <button
              type="button"
              onClick={() => void aplicar(draft)}
              className="mt-1 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Aplicar filtros
            </button>

            {conteoActivos(aplicados) > 0 && resumenFiltros.length > 0 && (
              <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
                Mostrando resultados para: {resumenFiltros.join(" · ")}
              </p>
            )}
          </div>
        </aside>

        {/* Contenido */}
        <section className="min-w-0 flex-1">
          {cargando && resultado && (
            <div className="pointer-events-none fixed right-6 top-24 z-40 flex items-center gap-2 rounded-lg bg-zinc-900/80 px-3 py-2 text-xs font-medium text-white shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" /> Actualizando resultados…
            </div>
          )}

          {cargando && !resultado ? (
            <div className="flex min-h-[60vh] items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              Cargando métricas…
            </div>
          ) : error || !resultado ? (
            <div className="mx-auto max-w-4xl px-4 py-16 text-center">
              <p className="text-sm text-red-600">
                {error ?? "No se pudieron cargar las métricas."}
              </p>
            </div>
          ) : resultado.total_asistencias === 0 ? (
            <div className="mx-auto max-w-4xl px-4 py-16 text-center">
              <p className="text-sm text-zinc-500">
                Sin resultados con los filtros actuales. Ajuste los filtros para
                ver métricas.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  {
                    titulo: "Asistencias registradas",
                    valor: resultado.total_asistencias,
                    icono: Users,
                    color: "bg-indigo-50 text-indigo-600",
                  },
                  {
                    titulo: "Instituciones atendidas",
                    valor: resultado.total_instituciones,
                    icono: Building2,
                    color: "bg-emerald-50 text-emerald-600",
                  },
                  {
                    titulo: "Asistentes únicos",
                    valor: resultado.total_asistentes,
                    icono: ClipboardList,
                    color: "bg-amber-50 text-amber-600",
                  },
                ].map(({ titulo, valor, icono: Icono, color }) => (
                  <div
                    key={titulo}
                    className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                  >
                    <div className={`rounded-xl p-3 ${color}`}>
                      <Icono className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-zinc-900">
                        {valor.toLocaleString("es-CO")}
                      </p>
                      <p className="text-sm text-zinc-500">{titulo}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <ChartCard
                  titulo="Asistencias por Oferta / Proyecto"
                  descripcion="Top 10 ofertas con más asistencias. Pase el cursor sobre una barra para ver el nombre completo."
                >
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={resultado.asistencias_por_oferta}
                      margin={{ top: 8, right: 8, bottom: 60, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={85}
                        tickFormatter={(v: string) => cortarEtiqueta(v, 22)}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e4e4e7",
                          fontFamily: "inherit",
                          maxWidth: 320,
                          overflowWrap: "break-word",
                        }}
                        formatter={(value) => [
                          `${Number(value ?? 0).toLocaleString("es-CO")} asistencias`,
                          "Total",
                        ]}
                      />
                      <Bar
                        dataKey="value"
                        fill="#4f46e5"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <PieCard titulo="Distribución por Sexo">
                  <PieGrafica datos={resultado.distribucion_sexo} />
                </PieCard>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <PieCard titulo="Distribución por Género">
                  <PieGrafica datos={resultado.distribucion_genero} />
                </PieCard>
                <PieCard titulo="Distribución por Rango de Edad">
                  <PieGrafica datos={resultado.distribucion_rango_edad} />
                </PieCard>
                <PieCard titulo="Distribución por Nivel Educativo">
                  <PieGrafica datos={resultado.distribucion_nivel_educativo} />
                </PieCard>
                <PieCard titulo="Distribución por Pertenencia Étnica">
                  <PieGrafica datos={resultado.distribucion_etnia} />
                </PieCard>
                <PieCard titulo="Distribución por Vulnerabilidad">
                  <PieGrafica datos={resultado.distribucion_vulnerabilidad} />
                </PieCard>
                <PieCard titulo="Distribución por Discapacidad">
                  <PieGrafica datos={resultado.distribucion_discapacidad} />
                </PieCard>
                <PieCard titulo="Distribución por Tipo de Entidad">
                  <PieGrafica datos={resultado.distribucion_tipo_entidad} />
                </PieCard>
                <PieCard titulo="Distribución por Clase de Entidad">
                  <PieGrafica datos={resultado.distribucion_clase_entidad} />
                </PieCard>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function cortarEtiqueta(v: string, max: number): string {
  return v.length > max ? v.slice(0, max - 1) + "…" : v;
}

function PieGrafica({ datos }: { datos: ChartDatum[] }) {
  if (datos.length === 0) {
    return (
      <p className="flex h-[240px] items-center justify-center text-sm text-zinc-400">
        Sin datos para mostrar
      </p>
    );
  }
  const total = datos.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className="flex flex-col">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={datos} dataKey="value" nameKey="name" outerRadius={78}>
            {datos.map((_, i) => (
              <Cell key={i} fill={PALETA[i % PALETA.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e4e4e7",
              fontFamily: "inherit",
            }}
            formatter={(value) => {
              const n = Number(value ?? 0);
              const pct = total > 0 ? ((n / total) * 100).toFixed(1) : "0";
              return `${n.toLocaleString("es-CO")} · ${pct}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div
        className="mt-2 overflow-y-auto pr-1"
        style={{ maxHeight: 84 }}
      >
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-snug text-zinc-600">
          {datos.map((d, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PALETA[i % PALETA.length] }}
              />
              <span className="max-w-[200px] truncate" title={d.name}>
                {d.name}
              </span>
              <span className="font-semibold text-zinc-800">
                {d.value.toLocaleString("es-CO")}
                <span className="ml-1 font-normal text-zinc-400">
                  {total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0"}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface Opcion {
  value: string;
  label: string;
}

function SelectFiltro({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  opciones: Opcion[] | string[];
  onChange: (valor: string) => void;
}) {
  const items: Opcion[] =
    Array.isArray(opciones) &&
    opciones.length > 0 &&
    typeof opciones[0] === "string"
      ? (opciones as string[]).map((v) => ({ value: v, label: v }))
      : (opciones as Opcion[]);
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {etiqueta}
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">Todas / Todos</option>
        {items.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MultiSelectBusqueda({
  etiqueta,
  opciones,
  seleccionados,
  onCambio,
  maxVisibles = 200,
}: {
  etiqueta: string;
  opciones: Opcion[];
  seleccionados: string[];
  onCambio: (valores: string[]) => void;
  maxVisibles?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
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

  const marcadas = useMemo(() => new Set(seleccionados), [seleccionados]);

  const filtradas = useMemo(() => {
    const q = norm(busqueda.trim());
    const base = q ? opciones.filter((o) => norm(o.label).includes(q)) : opciones;
    return base.slice(0, maxVisibles);
  }, [opciones, busqueda, maxVisibles]);

  const mapa = useMemo(
    () => new Map(opciones.map((o) => [o.value, o.label])),
    [opciones]
  );

  const resumen = useMemo(() => {
    if (seleccionados.length === 0) return "Todos";
    const nombres = seleccionados.map((v) => mapa.get(v) ?? v);
    if (nombres.length <= 2) return nombres.join(", ");
    return `${nombres.length} seleccionados`;
  }, [seleccionados, mapa]);

  function toggle(v: string) {
    const tiene = marcadas.has(v);
    onCambio(
      tiene ? seleccionados.filter((x) => x !== v) : [...seleccionados, v]
    );
  }

  return (
    <div ref={contenedor} className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {etiqueta}
      </label>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-700 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
      >
        <span
          className={cn("truncate", seleccionados.length === 0 && "text-zinc-400")}
        >
          {resumen}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition",
            abierto && "rotate-180"
          )}
        />
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="w-full text-sm text-zinc-700 outline-none placeholder:text-zinc-400"
            />
          </div>
          {filtradas.length > 0 ? (
            <>
              <ul className="max-h-48 overflow-auto">
                {filtradas.map((o) => (
                  <li key={o.value}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-indigo-50">
                      <input
                        type="checkbox"
                        checked={marcadas.has(o.value)}
                        onChange={() => toggle(o.value)}
                        className="size-4 accent-indigo-600"
                      />
                      <span className="truncate">{o.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="border-t border-zinc-100 p-2">
                <button
                  type="button"
                  onClick={() => onCambio([])}
                  disabled={seleccionados.length === 0}
                  className="text-xs font-medium text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Quitar selección
                </button>
              </div>
            </>
          ) : (
            <p className="px-3 py-3 text-xs text-zinc-400">Sin opciones…</p>
          )}
        </div>
      )}
    </div>
  );
}

function SeccionFiltros({
  titulo,
  abiertoInicial = true,
  children,
}: {
  titulo: string;
  abiertoInicial?: boolean;
  children: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <div className="border-b border-zinc-100 pb-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between py-1 text-sm font-bold text-zinc-700 transition hover:text-indigo-600"
      >
        {titulo}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zinc-400 transition",
            abierto && "rotate-180"
          )}
        />
      </button>
      {abierto && <div className="mt-2 grid gap-3">{children}</div>}
    </div>
  );
}

function ChartCard({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-zinc-800">{titulo}</h3>
      {descripcion && <p className="mb-2 text-xs text-zinc-400">{descripcion}</p>}
      {children}
    </div>
  );
}

function PieCard({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-zinc-800">{titulo}</h3>
      {children}
    </div>
  );
}
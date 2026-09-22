import { supabase } from "../lib/supabaseClient";
import type {
  Asistente,
  AsistenteInput,
  DatosSesionDetalle,
  Institucion,
  InstitucionInput,
  ProyectoOferta,
  RegistroSesion,
  SesionAsistencia,
  SesionAsistenciaInput,
  Ubicacion,
} from "../types/database";

function assertError(error: unknown, action: string): never {
  throw new Error(`Error al ${action}: ${(error as Error).message}`);
}

export async function getDepartamentos(): Promise<string[]> {
  const { data, error } = await supabase
    .from("catalogos_ubicacion")
    .select("departamento")
    .not("departamento", "is", null)
    .order("departamento");

  if (error) throw assertError(error, "consultar departamentos");

  const unicos = new Set<string>();
  for (const fila of data ?? []) {
    if (fila.departamento) unicos.add(fila.departamento);
  }
  return Array.from(unicos).sort((a, b) => a.localeCompare(b, "es"));
}

export type TablaCatalogo =
  | "asistentes"
  | "instituciones"
  | "sesiones_asistencia";

export async function getOpcionesCategoria(
  tabla: TablaCatalogo,
  columna: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc("obtener_opciones_categoria", {
    p_tabla: tabla,
    p_columna: columna,
  });

  if (error) throw assertError(error, "consultar opciones de " + columna);

  return ((data ?? []) as { opcion: string }[])
    .map((fila) => fila.opcion)
    .sort((a, b) => a.localeCompare(b, "es"));
}

export async function getMunicipiosByDepartamento(
  departamento: string
): Promise<Ubicacion[]> {
  const { data, error } = await supabase
    .from("catalogos_ubicacion")
    .select("*")
    .eq("departamento", departamento)
    .order("municipio");

  if (error) throw assertError(error, "consultar municipios");
  return (data ?? []) as Ubicacion[];
}

export async function getProyectosOfertas(): Promise<ProyectoOferta[]> {
  const { data, error } = await supabase
    .from("proyectos_ofertas")
    .select("*")
    .order("oferta");

  if (error) throw assertError(error, "consultar ofertas");
  return (data ?? []) as ProyectoOferta[];
}

export async function getInstitucionesByMunicipio(
  idMunicipio: number
): Promise<Institucion[]> {
  const { data, error } = await supabase
    .from("instituciones")
    .select("*")
    .eq("id_municipio", idMunicipio)
    .order("nombre_normalizado");

  if (error) throw assertError(error, "consultar instituciones");
  return (data ?? []) as Institucion[];
}

export async function buscarInstituciones(
  idMunicipio: number,
  busqueda: string,
  limit = 15
): Promise<Institucion[]> {
  let query = supabase
    .from("instituciones")
    .select("*")
    .eq("id_municipio", idMunicipio)
    .order("nombre_normalizado");

  const term = busqueda.trim();
  if (term) {
    query = query.ilike("nombre_normalizado", `%${term}%`);
  }

  const { data, error } = await query.limit(limit);
  if (error) throw assertError(error, "buscar instituciones");
  return (data ?? []) as Institucion[];
}

export async function insertInstitucion(
  datos: InstitucionInput
): Promise<Institucion> {
  const { data, error } = await supabase
    .from("instituciones")
    .insert(datos)
    .select()
    .single();

  if (error) throw assertError(error, "registrar institución");
  return data as Institucion;
}

export async function getAsistenteByDocumento(
  docId: string
): Promise<Asistente | null> {
  const { data, error } = await supabase
    .from("asistentes")
    .select("*")
    .eq("documento_id", docId)
    .maybeSingle();

  if (error) throw assertError(error, "buscar asistente");
  return (data as Asistente) ?? null;
}

export async function upsertAsistente(
  datos: AsistenteInput
): Promise<Asistente> {
  const { data, error } = await supabase
    .from("asistentes")
    .upsert(datos, { onConflict: "documento_id" })
    .select()
    .single();

  if (error) throw assertError(error, "guardar asistente");
  return data as Asistente;
}

export async function createSesionAsistencia(
  datosSesion: SesionAsistenciaInput
): Promise<SesionAsistencia> {
  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .insert(datosSesion)
    .select()
    .single();

  if (error) throw assertError(error, "registrar sesión de asistencia");
  return data as SesionAsistencia;
}

export async function updateSesionAsistencia(
  idSesion: number,
  datosSesion: SesionAsistenciaInput
): Promise<SesionAsistencia> {
  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .update(datosSesion)
    .eq("id_sesion", idSesion)
    .select()
    .single();

  if (error) throw assertError(error, "actualizar sesión de asistencia");
  return data as SesionAsistencia;
}

export async function eliminarSesionConAuditoria(
  idSesion: number,
  correoUsuario: string
): Promise<void> {
  await updateSesionAsistencia(idSesion, {
    correo_usuario: correoUsuario,
    accion_realizada: "ELIMINAR",
  });
  const { error } = await supabase
    .from("sesiones_asistencia")
    .delete()
    .eq("id_sesion", idSesion);

  if (error) throw assertError(error, "eliminar sesión de asistencia");
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

type RegistroFila = Omit<RegistroSesion, "proyectos_ofertas" | "instituciones" | "asistentes"> & {
  proyectos_ofertas?: ProyectoOferta | ProyectoOferta[];
  instituciones?: (Institucion & { catalogos_ubicacion?: Ubicacion | Ubicacion[] })[] | (Institucion & { catalogos_ubicacion?: Ubicacion | Ubicacion[] });
  asistentes?: Asistente | Asistente[];
};

export async function getSesionesRegistradas(limit = 200): Promise<RegistroSesion[]> {
  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .select(
      "*, proyectos_ofertas(id_oferta, oferta), " +
        "instituciones(id_institucion, nombre_normalizado, catalogos_ubicacion(id_municipio, departamento, municipio)), " +
        "asistentes(documento_id, nombres_apellidos)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw assertError(error, "consultar sesiones registradas");

  return ((data ?? []) as unknown as RegistroFila[]).map((fila) => ({
    id_sesion: fila.id_sesion,
    fecha: fila.fecha,
    id_oferta: fila.id_oferta,
    id_institucion: fila.id_institucion,
    documento_asistente: fila.documento_asistente,
    responsable_sesion: fila.responsable_sesion,
    virtual: fila.virtual,
    tipo_asistencia: fila.tipo_asistencia,
    solicitud: fila.solicitud,
    observacion: fila.observacion,
    correo_usuario: fila.correo_usuario,
    accion_realizada: fila.accion_realizada,
    created_at: fila.created_at,
    proyectos_ofertas: one(fila.proyectos_ofertas) ?? null,
    instituciones: (() => {
      const inst = one(fila.instituciones);
      if (!inst) return null;
      const { catalogos_ubicacion: _ub, ...resto } = inst;
      return {
        ...resto,
        catalogos_ubicacion: one(_ub) ?? null,
      };
    })(),
    asistentes: one(fila.asistentes) ?? null,
  }));
}

export async function getSesionDetalle(
  idSesion: number
): Promise<DatosSesionDetalle> {
  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .select(
      "*, proyectos_ofertas(*), instituciones(*, catalogos_ubicacion(*)), asistentes(*)"
    )
    .eq("id_sesion", idSesion)
    .maybeSingle();

  if (error) throw assertError(error, "consultar detalle de sesión");
  if (!data) throw new Error(`No se encontró la sesión #${idSesion}`);

  const fila = data as SesionAsistencia & {
    proyectos_ofertas?: ProyectoOferta | ProyectoOferta[];
    instituciones?: (Institucion & {
      catalogos_ubicacion?: Ubicacion | Ubicacion[];
    }) |
      (Institucion & { catalogos_ubicacion?: Ubicacion | Ubicacion[] })[];
    asistentes?: Asistente | Asistente[];
  };

  const institucion = one(fila.instituciones);
  const ubicacion = one(institucion && institucion.catalogos_ubicacion);
  const restoInstitucion = institucion
    ? (({ ...institucion, catalogos_ubicacion: undefined }) as Institucion)
    : null;

  return {
    sesion: {
      id_sesion: fila.id_sesion,
      fecha: fila.fecha,
      id_oferta: fila.id_oferta,
      id_institucion: fila.id_institucion,
      documento_asistente: fila.documento_asistente,
      responsable_sesion: fila.responsable_sesion,
      virtual: fila.virtual,
      tipo_asistencia: fila.tipo_asistencia,
      solicitud: fila.solicitud,
      observacion: fila.observacion,
      correo_usuario: fila.correo_usuario,
      accion_realizada: fila.accion_realizada,
      created_at: fila.created_at,
    },
    oferta: one(fila.proyectos_ofertas) ?? null,
    institucion: restoInstitucion,
    ubicacion,
    asistente: one(fila.asistentes) ?? null,
  };
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface DashboardMetrics {
  totalAsistencias: number;
  totalInstitucionesAtendidas: number;
  totalAsistentesUnicos: number;
  asistenciasPorOferta: ChartDatum[];
  distribucionSexo: ChartDatum[];
  distribucionEtnia: ChartDatum[];
}

function tally(mapa: Map<string, number>, maxItems?: number): ChartDatum[] {
  const resultado = Array.from(mapa, ([name, value]) => ({ name, value })).sort(
    (a, b) => b.value - a.value
  );
  return maxItems ? resultado.slice(0, maxItems) : resultado;
}

function notEmpty(v: unknown): string {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : "Sin dato";
}

function related<T>(rel: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(rel)) return rel[0];
  return rel ?? undefined;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { data, error } = await supabase
    .from("sesiones_asistencia")
    .select(
      "id_institucion, documento_asistente, id_oferta, proyectos_ofertas(oferta), asistentes(sexo, pertenencia_etnica)"
    );

  if (error) throw assertError(error, "obtener métricas del dashboard");

  const filas = data ?? [];
  const ofertalTally = new Map<string, number>();
  const sexoTally = new Map<string, number>();
  const etniaTally = new Map<string, number>();
  const instituciones = new Set<number>();
  const asistentesUnicos = new Set<string>();

  for (const fila of filas) {
    if (fila.id_institucion != null) instituciones.add(fila.id_institucion);
    if (fila.documento_asistente) asistentesUnicos.add(fila.documento_asistente);

    const oferta = related(fila.proyectos_ofertas)?.oferta;
    const sexo = related(fila.asistentes)?.sexo;
    const etnia = related(fila.asistentes)?.pertenencia_etnica;

    const o = notEmpty(oferta);
    const s = notEmpty(sexo);
    const e = notEmpty(etnia);

    ofertalTally.set(o, (ofertalTally.get(o) ?? 0) + 1);
    sexoTally.set(s, (sexoTally.get(s) ?? 0) + 1);
    etniaTally.set(e, (etniaTally.get(e) ?? 0) + 1);
  }

  return {
    totalAsistencias: filas.length,
    totalInstitucionesAtendidas: instituciones.size,
    totalAsistentesUnicos: asistentesUnicos.size,
    asistenciasPorOferta: tally(ofertalTally, 10),
    distribucionSexo: tally(sexoTally),
    distribucionEtnia: tally(etniaTally, 8),
  };
}

export interface FiltrosDashboard {
  municipios?: number[];
  ofertas?: number[];
  genero?: string;
  rango_edad?: string;
  nivel_educativo?: string;
  pertenencia_etnica?: string;
  vulnerabilidad?: string;
  discapacidad?: string;
  tipo_entidad?: string;
  clase_entidad?: string;
}

export interface DashboardResultado {
  total_asistencias: number;
  total_instituciones: number;
  total_asistentes: number;
  asistencias_por_oferta: ChartDatum[];
  distribucion_sexo: ChartDatum[];
  distribucion_genero: ChartDatum[];
  distribucion_rango_edad: ChartDatum[];
  distribucion_nivel_educativo: ChartDatum[];
  distribucion_etnia: ChartDatum[];
  distribucion_vulnerabilidad: ChartDatum[];
  distribucion_discapacidad: ChartDatum[];
  distribucion_tipo_entidad: ChartDatum[];
  distribucion_clase_entidad: ChartDatum[];
}

export async function getDashboardFiltrado(
  filtros: FiltrosDashboard
): Promise<DashboardResultado> {
  const { data, error } = await supabase.rpc("obtener_dashboard", {
    p_filtros: filtros,
  });

  if (error) throw assertError(error, "consultar dashboard filtrado");
  return data as DashboardResultado;
}

export async function getUbicaciones(): Promise<Ubicacion[]> {
  const { data, error } = await supabase
    .from("catalogos_ubicacion")
    .select("*")
    .order("departamento")
    .order("municipio")
    .range(0, 3000);

  if (error) throw assertError(error, "consultar ubicaciones");
  return (data ?? []) as Ubicacion[];
}

// ---------------------------------------------------------------------------
// Módulo "Consulta y Gestión de Registros"
// ---------------------------------------------------------------------------

export interface Pagina<T> {
  filas: T[];
  total: number;
}

export interface InstitucionRegistro {
  id_institucion: number;
  nombre_normalizado: string | null;
  clase_entidad: string | null;
  tipo_entidad: string | null;
  actividad_economica: string | null;
  id_municipio: number | null;
  catalogos_ubicacion: {
    id_municipio: number;
    departamento: string | null;
    municipio: string | null;
  } | null;
}

export async function getSesionesConsulta(
  pagina: number,
  tamPagina: number,
  busca?: string
): Promise<Pagina<RegistroSesion>> {
  const { data, error } = await supabase.rpc("obtener_sesiones_consulta", {
    p_busca: busca?.trim() || null,
    p_limite: tamPagina,
    p_offset: (pagina - 1) * tamPagina,
  });

  if (error) throw assertError(error, "consultar sesiones");
  const r = (data ?? {}) as { filas: unknown[]; total: number };
  return {
    filas: (r.filas ?? []) as unknown as RegistroSesion[],
    total: r.total ?? 0,
  };
}

export async function getInstitucionesConsulta(
  pagina: number,
  tamPagina: number,
  busca?: string
): Promise<Pagina<InstitucionRegistro>> {
  const { data, error } = await supabase.rpc("obtener_instituciones_consulta", {
    p_busca: busca?.trim() || null,
    p_limite: tamPagina,
    p_offset: (pagina - 1) * tamPagina,
  });

  if (error) throw assertError(error, "consultar instituciones");
  const r = (data ?? {}) as { filas: unknown[]; total: number };
  return {
    filas: (r.filas ?? []) as InstitucionRegistro[],
    total: r.total ?? 0,
  };
}

export async function updateInstitucion(
  idInstitucion: number,
  datos: Partial<InstitucionInput>
): Promise<Institucion> {
  const { data, error } = await supabase
    .from("instituciones")
    .update(datos)
    .eq("id_institucion", idInstitucion)
    .select()
    .single();

  if (error) throw assertError(error, "actualizar institución");
  return data as Institucion;
}

export async function eliminarInstitucion(idInstitucion: number): Promise<void> {
  const { error } = await supabase
    .from("instituciones")
    .delete()
    .eq("id_institucion", idInstitucion);

  if (error) throw assertError(error, "eliminar institución");
}

export async function contarSesionesDeInstitucion(
  idInstitucion: number
): Promise<number> {
  const { count, error } = await supabase
    .from("sesiones_asistencia")
    .select("id_sesion", { count: "exact", head: true })
    .eq("id_institucion", idInstitucion);

  if (error) throw assertError(error, "verificar referencias de la institución");
  return count ?? 0;
}
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MapPin,
  Save,
  Search,
  User,
} from "lucide-react";
import { cn } from "../lib/utils";
import AutocompleteCampo from "./AutocompleteCampo";
import {
  createSesionAsistencia,
  getAsistenteByDocumento,
  getDepartamentos,
  getOpcionesCategoria,
  buscarInstituciones,
  getMunicipiosByDepartamento,
  getProyectosOfertas,
  insertInstitucion,
  updateSesionAsistencia,
  upsertAsistente,
} from "../services/api";
import type {
  Asistente,
  AsistenteInput,
  DatosSesionDetalle,
  Institucion,
  ProyectoOferta,
  SesionAsistenciaInput,
  Ubicacion,
} from "../types/database";
import type { TablaCatalogo } from "../services/api";

const STEPS = ["Ubicación y Oferta", "Institución", "Asistente", "Sesión"];

const COLUMNAS_OPCIONES: { tabla: TablaCatalogo; columna: string }[] = [
  { tabla: "asistentes", columna: "sexo" },
  { tabla: "asistentes", columna: "genero" },
  { tabla: "asistentes", columna: "nivel_educativo" },
  { tabla: "asistentes", columna: "pertenencia_etnica" },
  { tabla: "asistentes", columna: "vulnerabilidad" },
  { tabla: "asistentes", columna: "discapacidad" },
  { tabla: "asistentes", columna: "actor_vial" },
  { tabla: "asistentes", columna: "cargo" },
  { tabla: "asistentes", columna: "rango_edad" },
  { tabla: "instituciones", columna: "clase_entidad" },
  { tabla: "instituciones", columna: "tipo_entidad" },
  { tabla: "instituciones", columna: "actividad_economica" },
  { tabla: "sesiones_asistencia", columna: "tipo_asistencia" },
];

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";
const selectCls = inputCls + " appearance-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

interface FormState {
  departamento: string;
  idMunicipio: number | null;
  idOferta: number | null;
  modoInstitucion: "existente" | "nueva";
  idInstitucion: number | null;
  nombreInstitucion: string;
  claseEntidad: string;
  tipoEntidad: string;
  actividadEconomica: string;
  documento: string;
  asistente: Asistente | null;
  buscandoAsistente: boolean;
  asistenteEncontrado: boolean;
  nombreAsistente: string;
  telefono: string;
  edad: string;
  rangoEdad: string;
  sexo: string;
  genero: string;
  nivelEducativo: string;
  pertenenciaEtnica: string;
  vulnerabilidad: string;
  discapacidad: string;
  actorVial: string;
  cargo: string;
  fecha: string;
  virtual: boolean;
  tipoAsistencia: string;
  responsable: string;
  solicitud: string;
  observacion: string;
}

function formInicial(sesion: DatosSesionDetalle | null): FormState {
  const inst = sesion?.institucion ?? null;
  const asis = sesion?.asistente ?? null;
  return {
    departamento: sesion?.ubicacion?.departamento ?? "",
    idMunicipio: sesion?.ubicacion?.id_municipio ?? inst?.id_municipio ?? null,
    idOferta: sesion?.sesion.id_oferta ?? null,
    modoInstitucion: "existente",
    idInstitucion: inst?.id_institucion ?? null,
    nombreInstitucion: inst?.nombre_normalizado ?? "",
    claseEntidad: inst?.clase_entidad ?? "",
    tipoEntidad: inst?.tipo_entidad ?? "",
    actividadEconomica: inst?.actividad_economica ?? "",
    documento: sesion?.sesion.documento_asistente ?? "",
    asistente: asis,
    buscandoAsistente: false,
    asistenteEncontrado: asis !== null,
    nombreAsistente: asis?.nombres_apellidos ?? "",
    telefono: asis?.telefono ?? "",
    edad: asis?.edad ?? "",
    rangoEdad: asis?.rango_edad ?? "",
    sexo: asis?.sexo ?? "",
    genero: asis?.genero ?? "",
    nivelEducativo: asis?.nivel_educativo ?? "",
    pertenenciaEtnica: asis?.pertenencia_etnica ?? "",
    vulnerabilidad: asis?.vulnerabilidad ?? "",
    discapacidad: asis?.discapacidad ?? "",
    actorVial: asis?.actor_vial ?? "",
    cargo: asis?.cargo ?? "",
    fecha: sesion?.sesion.fecha ?? new Date().toISOString().slice(0, 10),
    virtual: sesion?.sesion.virtual ?? false,
    tipoAsistencia: sesion?.sesion.tipo_asistencia ?? "",
    responsable: sesion?.sesion.responsable_sesion ?? "",
    solicitud: sesion?.sesion.solicitud ?? "",
    observacion: sesion?.sesion.observacion ?? "",
  };
}

interface FormularioSesionProps {
  correoUsuario: string;
  accionRealizada: "CREAR" | "EDITAR";
  sesionInicial?: DatosSesionDetalle | null;
  onFinalizado?: () => void;
}

export default function FormularioSesion({
  correoUsuario,
  accionRealizada,
  sesionInicial = null,
  onFinalizado,
}: FormularioSesionProps) {
  const esEdicion = sesionInicial !== null;
  const idSesionEdicion = sesionInicial?.sesion.id_sesion ?? null;
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<Ubicacion[]>([]);
  const [ofertas, setOfertas] = useState<ProyectoOferta[]>([]);
  const [opciones, setOpciones] = useState<Record<string, string[]>>({});
  const [cargando, setCargando] = useState(false);

  const [form, setForm] = useState<FormState>(() => formInicial(sesionInicial));

  const set = (campo: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...campo }));

  useEffect(() => {
    (async () => {
      try {
        const [deptos, ofs] = await Promise.all([
          getDepartamentos(),
          getProyectosOfertas(),
        ]);
        setDepartamentos(deptos);
        setOfertas(ofs);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const entradas = await Promise.all(
          COLUMNAS_OPCIONES.map(async ({ tabla, columna }) => [
            columna,
            await getOpcionesCategoria(tabla, columna),
          ] as const)
        );
        if (!activo) return;
        setOpciones(Object.fromEntries(entradas));
      } catch (e) {
        if (activo) console.error("No se pudieron cargar las opciones:", e);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!form.departamento) {
      setMunicipios([]);
      return;
    }
    setCargando(true);
    getMunicipiosByDepartamento(form.departamento)
      .then(setMunicipios)
      .catch((e) => setError((e as Error).message))
      .finally(() => setCargando(false));
  }, [form.departamento]);

  const municipioSeleccionado = useMemo(
    () => municipios.find((m) => m.id_municipio === form.idMunicipio) ?? null,
    [municipios, form.idMunicipio]
  );

  const puedeAvanzar = useMemo(() => {
    switch (paso) {
      case 0:
        return form.idMunicipio !== null && form.idOferta !== null;
      case 1:
        return form.modoInstitucion === "existente"
          ? form.idInstitucion !== null
          : form.nombreInstitucion.trim() !== "";
      case 2:
        return form.documento.trim() !== "" && form.nombreAsistente.trim() !== "";
      default:
        return form.fecha !== "" && form.responsable.trim() !== "";
    }
  }, [paso, form]);

  async function buscarAsistente() {
    const doc = form.documento.trim();
    if (!doc || form.buscandoAsistente) return;
    set({ buscandoAsistente: true });
    setError(null);
    try {
      const encontrado = await getAsistenteByDocumento(doc);
      if (encontrado) {
        set({
          asistente: encontrado,
          asistenteEncontrado: true,
          nombreAsistente: encontrado.nombres_apellidos ?? "",
          telefono: encontrado.telefono ?? "",
          edad: encontrado.edad ?? "",
          rangoEdad: encontrado.rango_edad ?? "",
          sexo: encontrado.sexo ?? "",
          genero: encontrado.genero ?? "",
          nivelEducativo: encontrado.nivel_educativo ?? "",
          pertenenciaEtnica: encontrado.pertenencia_etnica ?? "",
          vulnerabilidad: encontrado.vulnerabilidad ?? "",
          discapacidad: encontrado.discapacidad ?? "",
          actorVial: encontrado.actor_vial ?? "",
          cargo: encontrado.cargo ?? "",
        });
      } else {
        set({ asistenteEncontrado: false, asistente: null });
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      set({ buscandoAsistente: false });
    }
  }

  async function guardarSesion() {
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      let idInstitucion = form.idInstitucion;
      if (form.modoInstitucion === "nueva") {
        const nueva = await insertInstitucion({
          nombre_normalizado: form.nombreInstitucion.trim().toUpperCase(),
          clase_entidad: form.claseEntidad.trim() || null,
          tipo_entidad: form.tipoEntidad.trim() || null,
          actividad_economica: form.actividadEconomica.trim() || null,
          id_municipio: form.idMunicipio,
        });
        idInstitucion = nueva.id_institucion;
      }

      const dataAsistente: AsistenteInput = {
        documento_id: form.documento.trim(),
        nombres_apellidos: form.nombreAsistente.trim() || null,
        telefono: form.telefono.trim() || null,
        edad: form.edad.trim() || null,
        rango_edad: form.rangoEdad.trim() || null,
        sexo: form.sexo.trim() || null,
        genero: form.genero.trim() || null,
        nivel_educativo: form.nivelEducativo.trim() || null,
        pertenencia_etnica: form.pertenenciaEtnica.trim() || null,
        vulnerabilidad: form.vulnerabilidad.trim() || null,
        discapacidad: form.discapacidad.trim() || null,
        actor_vial: form.actorVial.trim() || null,
        cargo: form.cargo.trim() || null,
      };
      await upsertAsistente(dataAsistente);

      const datosSesion: SesionAsistenciaInput = {
        fecha: form.fecha || null,
        id_oferta: form.idOferta,
        id_institucion: idInstitucion,
        documento_asistente: form.documento.trim(),
        responsable_sesion: form.responsable.trim() || null,
        virtual: form.virtual,
        tipo_asistencia: form.tipoAsistencia.trim() || null,
        solicitud: form.solicitud.trim() || null,
        observacion: form.observacion.trim() || null,
        correo_usuario: correoUsuario,
        accion_realizada: accionRealizada,
      };

      if (esEdicion && idSesionEdicion !== null) {
        const sesion = await updateSesionAsistencia(idSesionEdicion, datosSesion);
        setExito(`Sesión #${sesion.id_sesion} actualizada correctamente.`);
        onFinalizado?.();
        return;
      }

      const sesion = await createSesionAsistencia(datosSesion);

      setExito(
        `Sesión #${sesion.id_sesion} registrada correctamente para ${form.nombreAsistente}.`
      );

      set({
        idInstitucion: null,
        modoInstitucion: "existente",
        nombreInstitucion: "",
        claseEntidad: "",
        tipoEntidad: "",
        actividadEconomica: "",
        documento: "",
        asistente: null,
        asistenteEncontrado: false,
        nombreAsistente: "",
        telefono: "",
        edad: "",
        rangoEdad: "",
        sexo: "",
        genero: "",
        nivelEducativo: "",
        pertenenciaEtnica: "",
        vulnerabilidad: "",
        discapacidad: "",
        actorVial: "",
        cargo: "",
        virtual: false,
        tipoAsistencia: "",
        responsable: "",
        solicitud: "",
        observacion: "",
      });
      setPaso(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            {esEdicion
              ? "Editar Sesión de Asistencia"
              : "Registro de Sesión de Asistencia"}
          </h2>
          <p className="text-sm text-zinc-500">
            {esEdicion
              ? `Modifique los datos de la sesión #${idSesionEdicion}.`
              : "Complete los 4 pasos para registrar una nueva sesión."}
          </p>
        </div>
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          Paso {paso + 1} de {STEPS.length}
        </span>
      </div>

      <ol className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, i) => (
          <li key={label}>
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-center text-xs font-semibold",
                i < paso
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : i === paso
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400"
              )}
            >
              {i + 1}. {label}
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {exito && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          {exito}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {paso === 0 && (
          <StepUbicacion
            departamentos={departamentos}
            municipios={municipios}
            ofertas={ofertas}
            cargando={cargando}
            form={form}
            municipioSeleccionado={municipioSeleccionado}
            onChange={set}
          />
        )}
        {paso === 1 && (
          <StepInstitucion
            key={form.idMunicipio ?? "sin-ubicacion"}
            form={form}
            onChange={set}
            opciones={opciones}
          />
        )}
        {paso === 2 && (
          <StepAsistente
            form={form}
            onChange={set}
            onBuscar={buscarAsistente}
            opciones={opciones}
          />
        )}
        {paso === 3 && (
          <StepSesion
            form={form}
            onChange={set}
            opciones={opciones}
            municipio={municipioSeleccionado?.municipio ?? null}
          />
        )}

        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-5">
          <button
            type="button"
            disabled={paso === 0}
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {paso < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!puedeAvanzar}
              onClick={() => setPaso((p) => Math.min(STEPS.length - 1, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={enviando || !puedeAvanzar}
              onClick={guardarSesion}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {esEdicion ? "Guardar cambios" : "Guardar sesión"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepUbicacion({
  departamentos,
  municipios,
  ofertas,
  cargando,
  form,
  municipioSeleccionado,
  onChange,
}: {
  departamentos: string[];
  municipios: Ubicacion[];
  ofertas: ProyectoOferta[];
  cargando: boolean;
  form: FormState;
  municipioSeleccionado: Ubicacion | null;
  onChange: (campo: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field icon={<MapPin className="h-5 w-5 text-indigo-500" />} title="Ubicación">
        <div className="grid gap-4">
          <div>
            <AutocompleteCampo
              id="departamento"
              etiqueta="Departamento"
              placeholder="Escriba para filtrar departamentos…"
              opciones={departamentos.map((d) => ({ value: d, label: d }))}
              labelSeleccionado={form.departamento}
              onSeleccionar={(valor) =>
                onChange({ departamento: valor, idMunicipio: null })
              }
              onLimpiar={() => onChange({ departamento: "", idMunicipio: null })}
            />
          </div>
          <div>
            <AutocompleteCampo
              id="municipio"
              etiqueta="Municipio"
              placeholder="Escriba para filtrar municipios…"
              opciones={municipios.map((m) => ({
                value: String(m.id_municipio),
                label: m.municipio ?? "",
              }))}
              labelSeleccionado={municipioSeleccionado?.municipio ?? ""}
              onSeleccionar={(valor) =>
                onChange({ idMunicipio: Number(valor) })
              }
              onLimpiar={() => onChange({ idMunicipio: null })}
              deshabilitado={!form.departamento}
              cargando={cargando}
            />
            {municipioSeleccionado?.region && (
              <p className="mt-1 text-xs text-zinc-400">
                Región: {municipioSeleccionado.region}
              </p>
            )}
          </div>
        </div>
      </Field>

      <Field icon={<Briefcase className="h-5 w-5 text-indigo-500" />} title="Oferta / Proyecto">
        <div>
          <label className={labelCls} htmlFor="oferta">
            Oferta o proyecto
          </label>
          <select
            id="oferta"
            className={selectCls}
            value={form.idOferta ?? ""}
            onChange={(e) =>
              onChange({ idOferta: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Seleccione una oferta…</option>
            {ofertas.map((o) => (
              <option key={o.id_oferta} value={o.id_oferta}>
                {o.oferta}
              </option>
            ))}
          </select>
        </div>
      </Field>
    </div>
  );
}

function StepInstitucion({
  form,
  onChange,
  opciones,
}: {
  form: FormState;
  onChange: (campo: Partial<FormState>) => void;
  opciones: Record<string, string[]>;
}) {
  const [query, setQuery] = useState(() => form.nombreInstitucion || "");
  const [sugerencias, setSugerencias] = useState<Institucion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  useEffect(() => {
    const idMunicipio = form.idMunicipio;
    if (!idMunicipio) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    setErrorBusqueda(null);
    const timer = setTimeout(() => {
      buscarInstituciones(idMunicipio, query)
        .then((res) => {
          setSugerencias(res);
        })
        .catch((e) => setErrorBusqueda((e as Error).message))
        .finally(() => setBuscando(false));
    }, query.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [query, form.idMunicipio]);

  const seleccionar = (i: Institucion) => {
    setQuery(i.nombre_normalizado ?? "");
    setAbierto(false);
    onChange({ idInstitucion: i.id_institucion });
  };

  const registrarNueva = () => {
    onChange({
      modoInstitucion: "nueva",
      nombreInstitucion: query.trim().toUpperCase() || form.nombreInstitucion,
    });
  };

  const esExistente = form.modoInstitucion === "existente";

  return (
    <Field icon={<Building2 className="h-5 w-5 text-indigo-500" />} title="Institución beneficiaria">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ modoInstitucion: "existente" })}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition",
            esExistente
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Seleccionar existente
        </button>
        <button
          type="button"
          onClick={registrarNueva}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition",
            !esExistente
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          )}
        >
          Registrar nueva
        </button>
      </div>

      {esExistente ? (
        <div className="grid gap-3">
          <div className="relative">
            <label className={labelCls} htmlFor="busquedaInstitucion">
              Buscar institución
            </label>
            <div className="relative">
              <input
                id="busquedaInstitucion"
                className={inputCls}
                value={query}
                placeholder={`Escriba el nombre en ${form.departamento || "el municipio"}…`}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (form.idInstitucion !== null) {
                    onChange({ idInstitucion: null });
                  }
                }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setTimeout(() => setAbierto(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && abierto && sugerencias.length > 0) {
                    e.preventDefault();
                    seleccionar(sugerencias[0]);
                  }
                }}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                {buscando ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  <Search className="h-4 w-4 text-zinc-400" />
                )}
              </span>
            </div>

            {abierto && sugerencias.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                {sugerencias.map((i) => (
                  <li key={i.id_institucion}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        seleccionar(i);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-indigo-50"
                    >
                      {i.nombre_normalizado}
                      {i.clase_entidad && (
                        <span className="ml-1 text-xs text-zinc-400">
                          · {i.clase_entidad}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {abierto && query.trim() && !buscando && sugerencias.length === 0 && (
              <p className="mt-1 text-xs text-zinc-400">
                No se encontraron instituciones con ese nombre en el municipio
                seleccionado.
              </p>
            )}
            {errorBusqueda && (
              <p className="mt-1 text-xs text-red-600">{errorBusqueda}</p>
            )}
          </div>

          {esExistente && form.idInstitucion !== null && query.trim() !== "" && (
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Institución: {query.trim()}
            </p>
          )}

          <button
            type="button"
            onClick={registrarNueva}
            className="self-start rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
          >
            ¿No la encuentra? Registrar nueva institución
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div>
            <label className={labelCls} htmlFor="nombreInstitucion">
              Nombre de la institución
            </label>
            <input
              id="nombreInstitucion"
              className={inputCls}
              value={form.nombreInstitucion}
              onChange={(e) =>
                onChange({ nombreInstitucion: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectCategoria
              id="claseEntidad"
              etiqueta="Clase de entidad"
              value={form.claseEntidad}
              opciones={opciones.clase_entidad}
              onChange={(valor) => onChange({ claseEntidad: valor })}
            />
            <SelectCategoria
              id="tipoEntidad"
              etiqueta="Tipo de entidad"
              value={form.tipoEntidad}
              opciones={opciones.tipo_entidad}
              onChange={(valor) => onChange({ tipoEntidad: valor })}
            />
            <SelectCategoria
              id="actividadEconomica"
              etiqueta="Actividad económica"
              value={form.actividadEconomica}
              opciones={opciones.actividad_economica}
              onChange={(valor) => onChange({ actividadEconomica: valor })}
            />
          </div>
        </div>
      )}
    </Field>
  );
}

type CampoAsistente =
  | "sexo"
  | "genero"
  | "rangoEdad"
  | "nivelEducativo"
  | "pertenenciaEtnica"
  | "vulnerabilidad"
  | "discapacidad"
  | "actorVial"
  | "cargo";

const CAMPOS_ASISTENTE: {
  campo: CampoAsistente;
  etiqueta: string;
  columna: string;
}[] = [
  { campo: "sexo", etiqueta: "Sexo", columna: "sexo" },
  { campo: "genero", etiqueta: "Género", columna: "genero" },
  { campo: "rangoEdad", etiqueta: "Rango de edad", columna: "rango_edad" },
  {
    campo: "nivelEducativo",
    etiqueta: "Nivel educativo",
    columna: "nivel_educativo",
  },
  {
    campo: "pertenenciaEtnica",
    etiqueta: "Pertenece a etnia",
    columna: "pertenencia_etnica",
  },
  { campo: "vulnerabilidad", etiqueta: "Vulnerabilidad", columna: "vulnerabilidad" },
  { campo: "discapacidad", etiqueta: "Discapacidad", columna: "discapacidad" },
  { campo: "actorVial", etiqueta: "Actor vial", columna: "actor_vial" },
  { campo: "cargo", etiqueta: "Cargo", columna: "cargo" },
];

function SelectCategoria({
  id,
  etiqueta,
  value,
  opciones,
  onChange,
  placeholder = "Seleccione…",
}: {
  id: string;
  etiqueta: string;
  value: string;
  opciones: string[] | undefined;
  onChange: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {(opciones ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function StepAsistente({
  form,
  onChange,
  onBuscar,
  opciones,
}: {
  form: FormState;
  onChange: (campo: Partial<FormState>) => void;
  onBuscar: () => void;
  opciones: Record<string, string[]>;
}) {
  return (
    <Field icon={<User className="h-5 w-5 text-indigo-500" />} title="Asistente">
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="documento">
            Número de documento (autocompletado)
          </label>
          <div className="flex gap-2">
            <input
              id="documento"
              className={inputCls}
              value={form.documento}
              placeholder="Ej. 1234567890"
              onChange={(e) => onChange({ documento: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onBuscar();
                }
              }}
            />
            <button
              type="button"
              disabled={!form.documento.trim() || form.buscandoAsistente}
              onClick={onBuscar}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {form.buscandoAsistente ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </button>
          </div>
          {form.asistenteEncontrado && (
            <p className="mt-1 text-xs font-medium text-emerald-600">
              Asistente encontrado. Puede editar sus datos para actualizarlos.
            </p>
          )}
        </div>

        <div>
          <label className={labelCls} htmlFor="nombreAsistente">
            Nombres y apellidos
          </label>
          <input
            id="nombreAsistente"
            className={inputCls}
            value={form.nombreAsistente}
            onChange={(e) => onChange({ nombreAsistente: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="telefono">
            Teléfono / celular
          </label>
          <input
            id="telefono"
            className={inputCls}
            value={form.telefono}
            onChange={(e) => onChange({ telefono: e.target.value })}
          />
        </div>

        {CAMPOS_ASISTENTE.map(({ campo, etiqueta, columna }) => (
          <SelectCategoria
            key={campo}
            id={campo}
            etiqueta={etiqueta}
            value={form[campo]}
            opciones={opciones[columna]}
            onChange={(valor) => onChange({ [campo]: valor } as Partial<FormState>)}
          />
        ))}
      </div>
    </Field>
  );
}

function StepSesion({
  form,
  onChange,
  opciones,
  municipio,
}: {
  form: FormState;
  onChange: (campo: Partial<FormState>) => void;
  opciones: Record<string, string[]>;
  municipio: string | null;
}) {
  return (
    <Field
      icon={<ClipboardList className="h-5 w-5 text-indigo-500" />}
      title="Datos de la sesión"
      subtitle={municipio ? `Municipio: ${municipio}` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="fecha">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            className={inputCls}
            value={form.fecha}
            onChange={(e) => onChange({ fecha: e.target.value })}
          />
        </div>
        <div>
          <SelectCategoria
            id="tipoAsistencia"
            etiqueta="Tipo de asistencia"
            value={form.tipoAsistencia}
            opciones={opciones.tipo_asistencia}
            onChange={(valor) => onChange({ tipoAsistencia: valor })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="responsable">
            Responsable de la sesión
          </label>
          <input
            id="responsable"
            className={inputCls}
            value={form.responsable}
            onChange={(e) => onChange({ responsable: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="virtual"
            type="checkbox"
            checked={form.virtual}
            onChange={(e) => onChange({ virtual: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="virtual" className="text-sm font-medium text-zinc-700">
            Sesión virtual
          </label>
        </div>
        <div>
          <label className={labelCls} htmlFor="solicitud">
            Solicitud
          </label>
          <input
            id="solicitud"
            className={inputCls}
            value={form.solicitud}
            onChange={(e) => onChange({ solicitud: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="observacion">
            Observaciones
          </label>
          <textarea
            id="observacion"
            rows={3}
            className={inputCls}
            value={form.observacion}
            onChange={(e) => onChange({ observacion: e.target.value })}
          />
        </div>
      </div>
    </Field>
  );
}

function Field({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <div>
          <h3 className="text-sm font-bold text-zinc-800">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
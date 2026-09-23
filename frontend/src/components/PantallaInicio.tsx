import {
  BarChart3,
  ClipboardList,
  Edit3,
  Info,
  PlusCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { AccionRegistro } from "../types/database";

interface PantallaInicioProps {
  correo: string;
  onNavegar: (vista: "consulta" | "dashboard") => void;
  onAccion: (accion: AccionRegistro) => void;
}

export default function PantallaInicio({
  correo,
  onNavegar,
  onAccion,
}: PantallaInicioProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      {/* Bienvenida y propósito del sistema */}
      <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg">
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden shrink-0 rounded-xl bg-white/15 p-3 sm:block">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">
                Bienvenido al Sistema de Gestión de Asistencia
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-indigo-100">
                Esta plataforma permite registrar, consultar y analizar sesiones
                de formación y sensibilización en seguridad y movilidad vial,
                así como la información de las instituciones beneficiarias y de
                cada asistente participante.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-indigo-50 sm:grid-cols-3">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Registro y edición de sesiones
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Gestión de instituciones
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Reportes y análisis estadístico
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso: entorno de demostración */}
      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900">
        <div className="mt-0.5 flex items-center gap-2 font-semibold">
          <Info className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4 sm:hidden" />
            Aviso · Entorno de demostración
          </h3>
          <p className="mt-1 leading-relaxed">
            La información que se presenta a continuación corresponde a un
            entorno de demostración con fines ilustrativos y de análisis
            técnico. Los datos han sido simulados o anonimizados únicamente
            para evaluar la arquitectura, el flujo de trabajo y el desempeño
            del sistema. Nada de lo aquí mostrado proviene de, ni representa a, ninguna
            entidad pública ni organización real.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-sky-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Uso exclusivamente técnico e ilustrativo.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-900">
          Módulos de la aplicación
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Seleccione un módulo para continuar · Usuario: {correo}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNavegar("consulta")}
          className="group rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
        >
          <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <ClipboardList className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            Consulta y Gestión de Registros
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Tablas paginadas y filtrables de sesiones e instituciones, con
            opciones para editar y eliminar cada registro de forma segura.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-indigo-600 group-hover:underline">
            Abrir módulo →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavegar("dashboard")}
          className="group rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="mb-4 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            Dashboard de Reportes
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Métricas consolidadas de asistencias, instituciones y asistentes con
            filtros avanzados y gráficos interactivos.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-emerald-600 group-hover:underline">
            Abrir módulo →
          </span>
        </button>
      </div>

      <h4 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wide text-zinc-500">
        Acciones rápidas
      </h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onAccion("crear")}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/40"
        >
          <PlusCircle className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-semibold text-zinc-800">
            Registrar nueva sesión
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAccion("editar")}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40"
        >
          <Edit3 className="h-5 w-5 text-amber-500" />
          <span className="text-sm font-semibold text-zinc-800">
            Editar una sesión
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAccion("eliminar")}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-red-300 hover:bg-red-50/40"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
          <span className="text-sm font-semibold text-zinc-800">
            Eliminar una sesión
          </span>
        </button>
      </div>
    </div>
  );
}
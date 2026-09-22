import { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Database,
  Edit3,
  Home,
  LogOut,
  PlusCircle,
  Trash2,
} from "lucide-react";
import FormularioSesion from "./components/FormularioSesion";
import GestionSesiones from "./components/GestionSesiones";
import Dashboard from "./components/Dashboard";
import PantallaAcceso from "./components/PantallaAcceso";
import PantallaInicio from "./components/PantallaInicio";
import ConsultaRegistros from "./components/ConsultaRegistros";
import { cn } from "./lib/utils";
import type { AccionRegistro, DatosSesionDetalle } from "./types/database";

type Vista = "home" | "gestion" | "consulta" | "dashboard";

export default function App() {
  const [correo, setCorreo] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("home");
  const [accion, setAccion] = useState<AccionRegistro>("crear");
  const [sesionEdicion, setSesionEdicion] = useState<DatosSesionDetalle | null>(null);

  if (!correo) {
    return (
      <PantallaAcceso
        onContinuar={(correoIngresado) => {
          setCorreo(correoIngresado);
          setAccion("crear");
          setVista("home");
          setSesionEdicion(null);
        }}
      />
    );
  }

  const enFormulario =
    accion === "crear" || sesionEdicion !== null;

  const cambiarAccion = (nueva: AccionRegistro) => {
    setAccion(nueva);
    setSesionEdicion(null);
    setVista("gestion");
  };

  const accionActiva = (a: AccionRegistro) =>
    vista === "gestion" && accion === a;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Sistema de Gestión de Asistencia
              </h1>
              <p className="text-xs text-zinc-500">Usuario: {correo}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setVista("home");
                setSesionEdicion(null);
              }}
              title="Volver al inicio / selector de módulos"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                vista === "home"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <Home className="h-4 w-4" />
              Inicio
            </button>
            <button
              type="button"
              onClick={() => setVista("consulta")}
              title="Consulta y Gestión de Registros"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                vista === "consulta"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <Database className="h-4 w-4" />
              Consulta
            </button>
            <button
              type="button"
              onClick={() => setVista("dashboard")}
              title="Dashboard de Reportes"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                vista === "dashboard"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => cambiarAccion("crear")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                accionActiva("crear")
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <PlusCircle className="h-4 w-4" />
              Crear
            </button>
            <button
              type="button"
              onClick={() => cambiarAccion("editar")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                accionActiva("editar")
                  ? "bg-amber-500 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <Edit3 className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => cambiarAccion("eliminar")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                accionActiva("eliminar")
                  ? "bg-red-500 text-white"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              )}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
            <button
              type="button"
              onClick={() => {
                setCorreo(null);
                setSesionEdicion(null);
              }}
              title="Cambiar de usuario"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4" />
              Cambiar usuario
            </button>
          </div>
        </div>
      </header>

      <main>
        {vista === "home" ? (
          <PantallaInicio
            correo={correo}
            onNavegar={setVista}
            onAccion={cambiarAccion}
          />
        ) : vista === "dashboard" ? (
          <Dashboard />
        ) : vista === "consulta" ? (
          <ConsultaRegistros
            correoUsuario={correo}
            onEditar={(detalle) => {
              setSesionEdicion(detalle);
              setAccion("editar");
              setVista("gestion");
            }}
          />
        ) : enFormulario ? (
          <FormularioSesion
            key={sesionEdicion ? `editar-${sesionEdicion.sesion.id_sesion}` : "crear"}
            correoUsuario={correo}
            accionRealizada={sesionEdicion ? "EDITAR" : "CREAR"}
            sesionInicial={sesionEdicion}
            onFinalizado={() => {
              setSesionEdicion(null);
            }}
          />
        ) : (
          <GestionSesiones
            correoUsuario={correo}
            accion={accion}
            onEditar={(detalle) => setSesionEdicion(detalle)}
          />
        )}
      </main>
    </div>
  );
}
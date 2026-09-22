export interface Ubicacion {
  id_municipio: number;
  departamento: string | null;
  municipio: string | null;
  region: string | null;
}

export interface ProyectoOferta {
  id_oferta: number;
  proyecto_fuente: string | null;
  vigencia_meta: string | null;
  oferta: string | null;
  caracter: string | null;
  contrato: string | null;
  vr_inversion: number | null;
  descripcion: string | null;
}

export interface Institucion {
  id_institucion: number;
  nombre_normalizado: string | null;
  clase_entidad: string | null;
  tipo_entidad: string | null;
  actividad_economica: string | null;
  id_municipio: number | null;
}

export type InstitucionInput = Omit<Institucion, "id_institucion">;

export interface Asistente {
  documento_id: string;
  nombres_apellidos: string | null;
  telefono: string | null;
  edad: string | null;
  rango_edad: string | null;
  sexo: string | null;
  genero: string | null;
  nivel_educativo: string | null;
  pertenencia_etnica: string | null;
  vulnerabilidad: string | null;
  discapacidad: string | null;
  actor_vial: string | null;
  cargo: string | null;
}

export type AsistenteInput = Partial<Omit<Asistente, "documento_id">> & {
  documento_id: string;
};

export interface SesionAsistencia {
  id_sesion: number;
  fecha: string | null;
  id_oferta: number | null;
  id_institucion: number | null;
  documento_asistente: string | null;
  responsable_sesion: string | null;
  virtual: boolean | null;
  tipo_asistencia: string | null;
  solicitud: string | null;
  observacion: string | null;
  correo_usuario: string | null;
  accion_realizada: string | null;
  created_at: string | null;
}

export interface SesionAsistenciaInput {
  fecha?: string | null;
  id_oferta?: number | null;
  id_institucion?: number | null;
  documento_asistente?: string | null;
  responsable_sesion?: string | null;
  virtual?: boolean | null;
  tipo_asistencia?: string | null;
  solicitud?: string | null;
  observacion?: string | null;
  correo_usuario?: string | null;
  accion_realizada?: string | null;
}

export type AccionRegistro = "crear" | "editar" | "eliminar";

export interface RegistroSesion {
  id_sesion: number;
  fecha: string | null;
  id_oferta: number | null;
  id_institucion: number | null;
  documento_asistente: string | null;
  responsable_sesion: string | null;
  virtual: boolean | null;
  tipo_asistencia: string | null;
  solicitud: string | null;
  observacion: string | null;
  correo_usuario: string | null;
  accion_realizada: string | null;
  created_at: string | null;
  proyectos_ofertas: { id_oferta: number; oferta: string | null } | null;
  instituciones: {
    id_institucion: number;
    nombre_normalizado: string | null;
    catalogos_ubicacion: {
      id_municipio: number;
      departamento: string | null;
      municipio: string | null;
    } | null;
  } | null;
  asistentes: { documento_id: string; nombres_apellidos: string | null } | null;
}

export interface DatosSesionDetalle {
  sesion: SesionAsistencia;
  oferta: ProyectoOferta | null;
  institucion: Institucion | null;
  ubicacion: Ubicacion | null;
  asistente: Asistente | null;
}

export interface SessionStep2Form {
  modo: "existente" | "nueva";
  idInstitucion?: number;
  nombre_normalizado: string;
  clase_entidad: string;
  tipo_entidad: string;
  actividad_economica: string;
}
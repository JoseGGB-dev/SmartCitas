INSERT INTO roles (code, name, description) VALUES
  ('PATIENT', 'Paciente', 'Acceso al portal de paciente'),
  ('OPERATOR', 'Operador', 'Gestiona cupos y listas de espera'),
  ('DOCTOR', 'Medico', 'Consulta agenda y marca atenciones'),
  ('AUDITOR', 'Auditor', 'Consulta trazabilidad sin modificar datos operativos'),
  ('ADMIN', 'Administrador', 'Administra catalogos, roles y auditoria')
ON CONFLICT (code) DO NOTHING;

INSERT INTO specialties (name, code, description, active) VALUES
  ('Cardiologia', 'CARDIOLOGIA', 'Atencion cardiovascular', true),
  ('Medicina General', 'MEDICINA_GENERAL', 'Consulta general', true),
  ('Dermatologia', 'DERMATOLOGIA', 'Atencion dermatologica', true),
  ('Traumatologia', 'TRAUMATOLOGIA', 'Atencion traumatologica', true),
  ('Neurologia', 'NEUROLOGIA', 'Atencion neurologica', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO facilities (name, code, address, active) VALUES
  ('Hospital Central', 'HDC', 'Av. Salud 100, Lima', true),
  ('Policlinico Norte', 'PND', 'Jr. Integracion 245, Lima', true),
  ('Centro Medico Sur', 'CMSD', 'Av. Progreso 530, Lima', true)
ON CONFLICT (code) DO NOTHING;

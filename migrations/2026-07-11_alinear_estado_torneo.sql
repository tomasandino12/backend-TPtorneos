-- Alinea el campo torneo.estado con los valores de negocio vigentes:
-- 'borrador' | 'inscripcion' | 'en_curso' | 'finalizado'.
--
-- El valor legacy 'activo' no distinguía si el torneo ya tenía fixture
-- generado o todavía estaba recibiendo inscripciones, así que se decide
-- según el propio dato: si ya tiene partidos cargados, el fixture existe
-- (-> en_curso); si no tiene ninguno, todavía está en etapa de inscripción
-- (-> inscripcion).
UPDATE torneo t
SET estado = CASE
  WHEN (SELECT COUNT(*) FROM partido p WHERE p.torneo_id = t.id) > 0 THEN 'en_curso'
  ELSE 'inscripcion'
END
WHERE t.estado = 'activo';

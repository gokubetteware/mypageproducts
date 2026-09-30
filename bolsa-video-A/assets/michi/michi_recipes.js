
/* MICHI — recetas de la biblioteca (fuente de autoría). Genera michi_emotions.json con MichiRecipes.build(MichiRig).
   Vocabulario → parámetros del rig. Todo valor marcado «pdf» viene de las tablas p.29–30; lo demás es propuesta de implementación. */
(function (root) {
  const VOC = {
    gaze: { frontal: [0, 0], lateral: [1, 0], 'lateral-fija': [1, 0], arriba: [0, -1], abajo: [0, 1], 'abajo-lateral': [0.75, 0.8], 'arriba-lateral': [0.75, -0.8], evita: [-0.75, 0.8], perdida: [-0.3, 0.35] },
    pupil: { normal: [1, 1], grande: [1.45, 1.12], 'muy grande': [1.9, 1.25], chica: [0.62, 0.86], minima: [0.42, 0.72], punto: [0.3, 0.42] },
    ears: { arriba: [0, 0, 0, 0], alerta: [-5, -5, 5, 5], relajadas: [8, 8, 0, 0], inclinadas: [16, 16, 0, 0], atras: [32, 32, 0, 0], caidas: [49, 49, 0, 0], asimetricas: [0, 26, 0, 2] },
    body: { normal: [1, 1, 0, 0, 0], estirado: [0.97, 1.06, 0, 0, 0], encogido: [1.04, 0.92, 0, 0, 0], desplomado: [1.07, 0.88, 0, 0, 4], adelante: [1, 1, 5, 0, 0], atras: [1, 1, -4, 0, 0], retrocede: [1.02, 0.95, -5, -7, 0] },
    tilt: { caido: 14, 'muy caido': 22, tenso: -16 },
  };
  const GROUPS = {
    eyes: ['gazeX', 'gazeY', 'pupilW', 'pupilH', 'lidTopL', 'lidTopR', 'lidTiltL', 'lidTiltR', 'lidBotL', 'lidBotR', 'closed'],
    ears: ['earL', 'earR', 'earLiftL', 'earLiftR'], head: ['head', 'headDy'], body: ['bodySx', 'bodySy', 'lean', 'bodyDx'],
  };

  // Estados. r = receta (nivel ancla). A = nivel donde cae la receta del PDF (●○○/●●○ → 2, ●●● → 3). l2/l3/l4 = modificadores explícitos.
  // e = energía de movimiento (1 cine · 2 dinámico · 3 impacto), independiente de la intensidad.
  const S = [
    { id: '00', key: 'neutro', name: 'Neutro', cat: 'calibracion', src: 'p.18, p.21', tr: 'referencia de calibración (fuera del conteo)', single: true, r: {}, e: 1,
      says: 'Observa. Punto de retorno de todas las transiciones.', nc: '—', econ: 'Frente a una moneda, sin juicio.' },
    { id: '01', key: 'tranquilidad', name: 'Tranquilidad', cat: 'calma', src: 'p.29 · p.10 (26p)', pi: 1, A: 2, e: 1, r: { top: 0.22, tail: 'envolvente' },
      l3: { ears: 'relajadas', body: [1.02, 0.97, 0, 0, 1] }, l4: { top: 0.34, bot: 0.1, ears: 'relajadas', body: [1.03, 0.95, 0, 0, 2] }, anim: { breath: 'lenta' },
      says: 'Calma sin motivo externo.', nc: 'No es alegría débil: no sube el párpado inferior. Frente a satisfacción: sin causa.', econ: 'Revisa su frasco y todo sigue ahí.' },
    { id: '02', key: 'satisfaccion', name: 'Satisfacción', cat: 'calma', src: 'p.29', pi: 1, A: 2, e: 1, r: { top: 0.28, bot: 0.22, tail: 'envolvente' },
      l3: { head: 3, ears: 'relajadas' }, l4: { bot: 0.32, head: 4, ears: 'relajadas', body: 'estirado', tail: 'arriba' },
      says: 'Algo salió como esperaba.', nc: 'Tranquilidad no tiene párpado inferior; alivio requiere una carga previa.', econ: 'El frasco sube una moneda.' },
    { id: '03', key: 'felicidad', name: 'Felicidad', cat: 'calma', src: 'p.29', pi: 2, A: 2, e: 1, r: { bot: 0.38, head: 4, tail: 'arriba' },
      l3: { body: 'estirado', ears: 'alerta' }, l4: { bot: 0.46, head: 6, ears: 'alerta', body: [0.96, 1.08, 0, 0, 0] },
      says: 'Bienestar sostenido: «ojos que sonríen» con mirada frontal.', nc: 'Alegría suma mirada arriba y pupila grande; entusiasmo suma energía y cola agitada.', econ: 'Termina el mes con algo guardado.' },
    { id: '04', key: 'alegria', name: 'Alegría', cat: 'calma', src: 'p.29', pi: 2, A: 2, e: 2, r: { gaze: 'arriba', pupil: 'grande', bot: 0.3, ears: 'alerta', head: 6, body: 'estirado', tail: 'arriba' },
      l3: { body: [0.96, 1.08, 0, 0, 0] }, l4: { pupil: 'muy grande', bot: 0.36, paws: 'arriba', body: [0.96, 1.08, 0, 0, 0] },
      says: 'Reacción alegre a algo que acaba de pasar.', nc: 'Felicidad es estado; alegría es reacción (mirada arriba, pupila grande).', econ: 'Recibe la bolsa llena en el mercado.' },
    { id: '05', key: 'orgullo', name: 'Orgullo', cat: 'calma', src: 'p.29 · p.27 (familia confianza n.4)', pi: 2, A: 2, e: 1, r: { bot: 0.26, head: -5, body: 'estirado', tail: 'arriba' },
      l3: { top: 0.1 }, l4: { head: -8, top: 0.18, bot: 0.3, body: [0.96, 1.08, 0, 0, -1] },
      says: 'Reconoce un logro propio.', nc: 'Confianza no sonríe con el párpado inferior ni echa la cabeza atrás.', econ: 'Pone su primera moneda en su lugar.' },
    { id: '06', key: 'esperanza', name: 'Esperanza', cat: 'calma', src: 'p.29 · p.27 (familia alivio n.2)', pi: 1, A: 2, e: 1, r: { gaze: 'arriba', pupil: 'grande', ears: 'alerta', head: 6, body: 'estirado', tail: 'arriba' },
      l3: { lean: 3 }, l4: { pupil: 'muy grande', body: [0.96, 1.08, 4, 0, 0], tail: 'rigida' },
      says: 'Espera algo bueno que todavía no llega.', nc: 'Alegría ya tiene el párpado inferior arriba; esperanza no. No se convierte en alivio subiendo intensidad.', econ: 'Mira un calendario con una sola fecha iluminada.' },
    { id: '07', key: 'emocion', name: 'Emoción', cat: 'energia', src: 'p.29', pi: 2, A: 2, e: 2, r: { pupil: 'grande', ears: 'alerta', body: 'estirado', paws: 'sostener', tail: 'pregunta' },
      l3: { bot: 0.12 }, l4: { pupil: 'muy grande', bot: 0.18, tail: 'agitada' }, anim: { breath: 'rapida' },
      says: 'Sentido aquí: ilusión o anticipación excitada ante algo que está por pasar (no «emoción» como categoría general).', nc: 'Entusiasmo es la descarga; emoción es la espera con energía.', econ: 'Sostiene su primer CATDÓLAR antes de decidir qué hacer.' },
    { id: '08', key: 'entusiasmo', name: 'Entusiasmo', cat: 'energia', src: 'p.29', pi: 3, A: 3, e: 2, r: { pupil: 'muy grande', ears: 'alerta', body: 'estirado', paws: 'arriba', tail: 'agitada' },
      l4: { bot: 0.28, head: 4, body: [0.95, 1.08, 0, 0, 0] }, anim: { tailWag: true },
      says: 'Energía alta hacia algo.', nc: 'Comparte nivel 4 con «por fin» y sorpresa positiva: aquí ojos abiertos y cola agitada.', econ: 'Ve una oferta brillante (riesgo de impulso).' },
    { id: '09', key: 'curiosidad', name: 'Curiosidad', cat: 'energia', src: 'p.29', pi: 1, A: 2, e: 1, r: { gaze: 'lateral', ears: 'asimetricas', head: 12, body: 'adelante', tail: 'pregunta' },
      l3: { lean: 6, pupil: 'grande' }, l4: { pupil: 'grande', head: 15, lean: 7, bodyDx: 4 },
      says: 'Quiere entender algo nuevo; se acerca.', nc: 'Confusión inclina la cabeza al otro lado y cierra un párpado; duda no se acerca.', econ: 'Se asoma a un CATCOIN que no conocía.' },
    { id: '10', key: 'tentacion', name: 'Tentación', cat: 'energia', src: 'p.29 · p.31', pi: 2, A: 2, e: 1, r: { gaze: 'lateral', pupil: 'muy grande', top: 0.24, bot: 0.18, ears: 'alerta', head: 10, body: 'adelante', tail: 'pregunta' },
      l3: { lean: 6, bodyDx: 4 }, l4: { lean: 7, bodyDx: 7, tail: 'agitada' },
      says: 'Deseo de tomar algo que brilla.', nc: 'Curiosidad no entrecierra; tentación sí (párpados sup. e inf.) con pupila muy grande.', econ: 'Una vitrina con algo que no necesita.' },
    { id: '11', key: 'sorpresa', name: 'Sorpresa', cat: 'sorpresa', src: 'p.29 · p.18 (pose base)', pi: 2, A: 2, e: 2, r: { pose: 'sorpresa', pupil: 'chica', ears: 'alerta', tail: 'rigida' },
      l3: { body: 'estirado' }, l4: { pupil: 'minima', body: [0.96, 1.08, 0, 0, -2], ears: [-5, -5, 6, 6] }, anim: { freeze: true },
      says: 'Registra un cambio inesperado; valencia neutra.', nc: 'Descubrimiento tiene pupila grande (le gusta lo que ve); sorpresa negativa retrocede.', econ: 'La bolsa del mercado ahora es más chica.' },
    { id: '12', key: 'me-di-cuenta', name: '«Me di cuenta»', cat: 'sorpresa', src: 'p.29 · p.27 (descubrimiento n.2)', pi: 2, A: 2, e: 2, r: { pose: 'senala', pupil: 'chica', ears: 'alerta', body: 'estirado', tail: 'rigida' },
      l3: { head: 4 }, l4: { head: 6, pupil: 'minima', body: [0.96, 1.08, 0, 0, 0] },
      says: 'Comprende algo y lo marca.', nc: 'Sorpresa no señala; «me di cuenta» ya entendió qué pasó.', econ: 'Señala el billete que se encogió sobre la regla.' },
    { id: '13', key: 'no-puedo-creerlo', name: '«No puedo creerlo»', cat: 'sorpresa', src: 'p.29 · p.25 (sorpresa n.4)', pi: 3, A: 3, e: 3, r: { pose: 'sorpresa', pupil: 'minima', ears: 'atras', head: -6, body: 'encogido', tail: 'caida' },
      l4: { body: 'retrocede', pupil: 'punto', head: -8 }, anim: { freeze: true },
      says: 'Choque ante algo que contradice lo que creía.', nc: 'Miedo no inclina la cabeza y eriza la cola; aquí la cola cae.', econ: 'La pila se desarma moneda por moneda.' },
    { id: '14', key: 'confusion', name: 'Confusión', cat: 'duda', src: 'p.29', pi: 1, A: 2, e: 1, r: { gaze: 'arriba-lateral', top: [0.4, 0], ears: 'asimetricas', head: -14, tail: 'pregunta' },
      l3: { body: [1.02, 0.97, -2, 0, 0] }, l4: { head: -17, top: [0.46, 0], ears: [0, 34, 0, 2] }, anim: { gazeAlt: 0.6 },
      says: 'No entiende la información.', nc: 'Duda entiende pero no decide; sospecha desconfía. Confusión: un párpado al 40 %.', econ: 'Tres objetos que no encajan flotan sobre él.' },
    { id: '15', key: 'duda', name: 'Duda', cat: 'duda', src: 'p.29 · p.27 (confianza n.1)', pi: 1, A: 2, e: 1, r: { gaze: 'lateral', top: 0.22, ears: 'inclinadas', head: 8, tail: 'pregunta' },
      l3: { body: [1.02, 0.97, 0, 0, 1] }, l4: { head: 12, top: 0.3, gaze: [0.8, 0.4], body: [1.03, 0.95, 0, 0, 1] },
      says: 'No está seguro de algo.', nc: 'No se vuelve confianza subiendo el control: son estados distintos.', econ: 'Mira una moneda y una bolsa sin saber cuál conviene.' },
    { id: '16', key: 'dudar-antes', name: 'Dudar antes de decidir', cat: 'duda', src: 'p.29 · p.32', pi: 1, A: 2, e: 1, r: { pose: 'senala', gaze: 'lateral', top: 0.2, ears: 'asimetricas', head: 8, tail: 'pregunta' },
      l3: { lean: 2 }, l4: { head: 10, top: 0.26 }, anim: { gazeAlt: 1 },
      says: 'Está por decidir y todavía pesa opciones (la pata a medio señalar).', nc: 'Duda no tiene gesto de decisión; aquí la pata ya empezó.', econ: '«Quiero, pero no sé cómo»: frente a tres objetos.' },
    { id: '17', key: 'sospecha', name: 'Sospecha', cat: 'duda', src: 'p.29 · p.31', pi: 2, A: 2, e: 1, r: { gaze: 'lateral', pupil: 'chica', top: 0.38, bot: 0.3, ears: 'inclinadas', head: -4, body: 'atras', tail: 'rigida' },
      l3: { lean: -5 }, l4: { top: 0.44, bot: 0.36, pupil: 'minima', lean: -6, bodyDx: -4 },
      says: 'Desconfía de algo concreto.', nc: 'Párpados en tenaza (sup. + inf.). Desconfianza solo se aleja.', econ: 'Una oferta que promete demasiado.' },
    { id: '18', key: 'inseguridad', name: 'Inseguridad', cat: 'miedo', src: 'p.29 · p.25 (miedo n.1)', pi: 1, A: 2, e: 1, r: { gaze: 'abajo', top: 0.22, tilt: 'caido', ears: 'inclinadas', head: -6, body: 'encogido', tail: 'envolvente' },
      l3: { ears: [22, 22, 0, 0] }, l4: { ears: 'atras', body: [1.06, 0.88, 0, 0, 1], gaze: 'abajo-lateral' },
      says: 'Duda de sí mismo.', nc: 'Preocupación mira hacia un problema (abajo-lateral) y deja caer la cola.', econ: '«¿Y si no me alcanza para empezar?»' },
    { id: '19', key: 'preocupacion', name: 'Preocupación', cat: 'miedo', src: 'p.29 · p.25 (ansiedad n.2)', pi: 2, A: 2, e: 1, r: { gaze: 'abajo-lateral', top: 0.3, tilt: 'caido', ears: 'inclinadas', head: -8, body: 'encogido', tail: 'caida' },
      l3: { ears: [24, 24, 0, 0] }, l4: { top: 0.36, ears: 'atras', head: -10, body: [1.06, 0.88, 0, 0, 1] },
      says: 'Piensa en un problema que puede venir.', nc: 'Ansiedad fija la mirada lateral y agita la cola; angustia dura el doble y la cola se detiene.', econ: 'Mira la caja de la renta que se acerca.' },
    { id: '20', key: 'nervios', name: 'Nervios', cat: 'miedo', src: 'p.30 · p.25 (miedo n.2)', pi: 1, A: 2, e: 2, r: { gaze: 'lateral', ears: 'alerta', body: 'encogido', tail: 'agitada' },
      l3: { pupil: 'chica' }, l4: { pupil: 'chica', ears: [20, 20, 0, 0], body: [1.05, 0.9, 0, 0, 0] }, anim: { gazeAlt: 1.6, tremble: 4 },
      says: 'Inquietud ante algo inminente.', nc: 'Se separa de ansiedad y estrés por tiempo: nervios ALTERNA la mirada.', econ: 'Espera la respuesta del cajero.' },
    { id: '21', key: 'impaciencia', name: 'Impaciencia', cat: 'energia', src: 'p.30 · p.31', pi: 2, A: 2, e: 2, r: { gaze: 'arriba', top: 0.3, ears: 'inclinadas', tail: 'agitada' },
      l3: { body: [1.02, 0.97, 0, 0, 0] }, l4: { top: 0.36, tilt: -6, head: -3 }, anim: { tailWag: true },
      says: 'El tiempo no pasa lo bastante rápido.', nc: 'Esperando es la misma mirada sin agitación.', econ: 'El reloj y el frasco que no se llena.' },
    { id: '22', key: 'ansiedad', name: 'Ansiedad', cat: 'miedo', src: 'p.30 · p.22 (ejemplo de construcción)', pi: 2, A: 2, e: 2, r: { gaze: 'lateral-fija', pupil: 'chica', ears: 'atras', body: 'encogido', tail: 'agitada' },
      l3: { pupil: 'minima' }, l4: { pose: 'sorpresa', pupil: 'minima', body: [1.06, 0.88, 0, 0, 1] }, anim: { breath: 'rapida', tailWag: true },
      says: 'Tensión sostenida sin resolver: mirada FIJA.', nc: 'Nervios alterna; estrés sostiene los ojos muy abiertos; pánico ya huye.', econ: 'Revisa la cuenta en el celular una y otra vez.' },
    { id: '23', key: 'estres', name: 'Estrés', cat: 'miedo', src: 'p.30 · p.31', pi: 2, A: 2, e: 2, r: { pose: 'sorpresa', pupil: 'chica', ears: 'asimetricas', body: 'encogido', tail: 'agitada' },
      l3: { ears: [20, 34, 0, 0] }, l4: { pupil: 'minima', ears: [26, 40, 0, 0], body: [1.06, 0.88, 0, 0, 1] }, anim: { tremble: 3 },
      says: 'Demasiadas cosas a la vez.', nc: 'Ojos muy abiertos + orejas desiguales. Ansiedad tiene orejas atrás simétricas.', econ: 'Tres tickets caen al mismo tiempo.' },
    { id: '24', key: 'angustia', name: 'Angustia', cat: 'miedo', src: 'p.30 · p.25 (ansiedad n.3)', pi: 3, A: 3, e: 1, r: { gaze: 'abajo', pupil: 'chica', top: 0.3, tilt: 'muy caido', ears: 'atras', head: -10, body: 'encogido', tail: 'envolvente' },
      l4: { top: 0.36, head: -13, body: [1.07, 0.86, 0, 0, 2] }, anim: { freeze: true },
      says: 'Preocupación que ya pesa en el cuerpo.', nc: 'Dura el doble que la preocupación y la cola deja de moverse (p.30).', econ: 'La caja de deuda sobre la mesa, sin moverse.' },
    { id: '25', key: 'miedo', name: 'Miedo', cat: 'miedo', src: 'p.30 · p.25', pi: 3, A: 3, e: 2, r: { pose: 'sorpresa', pupil: 'minima', ears: 'atras', body: 'encogido', tail: 'erizada' },
      l4: { pupil: 'punto', body: [1.07, 0.86, -3, -3, 1] }, anim: { tremble: 5 },
      says: 'Percibe una amenaza.', nc: 'Pánico retrocede y mira arriba; «no puedo creerlo» inclina la cabeza y deja caer la cola.', econ: 'No se acerca al CATCOIN iluminado.' },
    { id: '26', key: 'panico', name: 'Pánico', cat: 'miedo', src: 'p.30 · p.25 (ansiedad n.4)', pi: 3, A: 3, e: 3, r: { pose: 'sorpresa', gaze: 'arriba', pupil: 'punto', ears: 'atras', body: 'retrocede', tail: 'erizada' },
      l4: { body: [1.03, 0.92, -6, -9, 0], ears: [40, 40, 0, 0] }, anim: { tremble: 7 },
      says: 'Miedo que empuja a huir.', nc: 'Único estado que retrocede con pupila «punto». Reservado.', econ: 'La pila ajena se cae encima (hook de nivel 3).' },
    { id: '27', key: 'que-acabo-de-hacer', name: '«¿Qué acabo de hacer?»', cat: 'error', src: 'p.30 · p.26 (vergüenza n.4)', pi: 3, A: 3, e: 3, r: { pose: 'sorpresa', gaze: 'abajo', pupil: 'chica', ears: 'atras', body: 'encogido', tail: 'caida' },
      l4: { pupil: 'minima', body: [1.06, 0.88, 0, 0, 1], head: -3 }, anim: { freeze: true },
      says: 'Choque inmediato después de un error propio.', nc: 'Arrepentimiento llega después y es más lento; culpa evita mirar.', econ: 'El ticket no termina de caer.' },
    { id: '28', key: 'culpa', name: 'Culpa', cat: 'error', src: 'p.30 · p.26 (vergüenza n.2)', pi: 1, A: 2, e: 1, r: { gaze: 'evita', top: 0.34, tilt: 'caido', ears: 'caidas', head: -10, body: 'encogido', tail: 'escondida' },
      l3: { body: [1.05, 0.9, 0, 0, 1] }, l4: { top: 0.42, head: -14, body: [1.07, 0.87, 0, 0, 2] },
      says: 'Siente que hizo algo mal y EVITA el objeto.', nc: 'Arrepentimiento mira el lugar vacío; tristeza no tiene dirección de evitación; la cola escondida es de culpa.', econ: 'Un ticket larguísimo entra desde fuera de cuadro.' },
    { id: '29', key: 'verguenza', name: 'Vergüenza', cat: 'error', src: 'p.30 · p.26', pi: 2, A: 2, e: 1, r: { gaze: 'abajo', top: 0.3, ears: 'caidas', head: -8, body: 'encogido', paws: 'cubrir', tail: 'envolvente' },
      l2: { paws: 'none' }, l3: { paws: 'cubrir' }, l4: { paws: 'cubrir', body: [1.07, 0.87, 0, 0, 2], ears: [52, 52, 0, 0] },
      says: 'Se siente expuesto frente a otros.', nc: 'La receta del PDF incluye patas en la cara; aquí se reservan para nivel 3–4 (la familia p.26 pone «se tapa» en el 3).', econ: 'Una palabra técnica gigante lo empequeñece.' },
    { id: '30', key: 'tristeza', name: 'Tristeza', cat: 'tristeza', src: 'p.30 · p.25', pi: 2, A: 2, e: 1, r: { gaze: 'abajo', top: 0.42, tilt: 'caido', ears: 'caidas', head: -6, body: 'encogido', tail: 'caida' },
      l3: { body: [1.06, 0.89, 0, 0, 2] }, l4: { top: 0.55, tilt: 'muy caido', head: -10, body: 'desplomado' }, tears: { 3: 'pocas', 4: 'llanto' },
      says: 'Pérdida o falta.', nc: 'Triste ≠ llorando: las lágrimas son capa aparte. Decepción no inclina el párpado.', econ: 'El frasco vacío boca abajo.' },
    { id: '31', key: 'decepcion', name: 'Decepción', cat: 'tristeza', src: 'p.30 · p.26', pi: 1, A: 2, e: 1, r: { gaze: 'abajo', top: 0.42, ears: 'inclinadas', body: 'desplomado', tail: 'caida' },
      l3: { ears: [16, 30, 0, 0] }, l4: { top: 0.55, ears: 'caidas', body: [1.08, 0.86, 0, 0, 5] }, tears: { 4: 'acumuladas' },
      says: 'Algo no fue lo que esperaba.', nc: 'Se lee en dos tiempos: mira el objeto y luego a cámara (p.34). En fijo se parece a tristeza sin párpado caído.', econ: 'El frasco lleno se encoge.' },
    { id: '32', key: 'impotencia', name: 'Impotencia', cat: 'tristeza', src: 'p.30 · p.31', pi: 2, A: 2, e: 1, r: { gaze: 'arriba', top: 0.38, tilt: 'caido', ears: 'caidas', head: 10, body: 'desplomado', tail: 'caida' },
      l3: { body: [1.08, 0.87, 0, 0, 5] }, l4: { top: 0.46, head: 13, body: [1.08, 0.86, 0, 0, 6] },
      says: 'Mira arriba; todo cae. No depende de él.', nc: 'Única tristeza con mirada ARRIBA y cabeza +10°.', econ: '«Me quedé sin dinero»: el frasco boca abajo.' },
    { id: '33', key: 'frustracion', name: 'Frustración', cat: 'tension', src: 'p.30 · p.26 (enojo n.2)', pi: 2, A: 2, e: 2, r: { gaze: 'abajo', pupil: 'chica', top: 0.3, tilt: 'tenso', ears: 'atras', body: 'encogido', tail: 'rigida' },
      l3: { lean: 3 }, l4: { top: 0.36, tilt: -22, lean: 4, tail: 'agitada' },
      says: 'Algo no avanza pese a intentarlo.', nc: 'Enojo mira de frente y avanza; frustración mira abajo, encogido.', econ: 'La misma pila, el mismo encuadre, tres veces.' },
    { id: '34', key: 'enojo', name: 'Enojo', cat: 'tension', src: 'p.30 · p.26', pi: 3, A: 3, e: 2, r: { pupil: 'chica', top: 0.34, tilt: 'tenso', ears: 'atras', body: 'adelante', tail: 'erizada' },
      l4: { top: 0.42, tilt: -24, bot: 0.14, lean: 7, bodyDx: 4 },
      says: 'Algo es injusto y lo enfrenta.', nc: 'Párpado tenso hacia adentro = único gesto de «ceja» (p.14).', econ: 'Una comisión escondida aparece en el ticket.' },
    { id: '35', key: 'cansancio', name: 'Cansancio', cat: 'fisico', src: 'p.30 · p.26 (46→52→64 %)', pi: 1, e: 1, tr: 'estado físico', physical: true,
      levels: [{ top: 0.4, ears: [12, 12, 0, 0] }, { gaze: 'abajo', top: 0.52, ears: 'caidas', body: 'desplomado', tail: 'caida' }, { gaze: 'abajo', top: 0.64, ears: 'caidas', head: -4, body: [1.08, 0.86, 0, 0, 5], tail: 'caida' }, { gaze: 'abajo', top: 0.76, ears: [52, 52, 0, 0], head: -7, body: [1.08, 0.86, 0, 0, 7], tail: 'caida' }],
      lvNames: ['Descansado bajo', 'Cansado', 'Agotado', 'Agotado extremo (aún despierto)'],
      says: 'Energía física baja. No es una emoción.', nc: 'La familia del PDF termina en «dormido»; aquí ese extremo pertenece a Sueño.', econ: 'Fin de una jornada de trabajo extra.' },
    { id: '36', key: 'aburrimiento', name: 'Aburrimiento', cat: 'fisico', src: 'p.30', pi: 1, A: 2, e: 1, r: { gaze: 'lateral', top: 0.46, ears: 'inclinadas', head: -12, tail: 'caida' },
      l3: { body: [1.05, 0.9, 0, 0, 2] }, l4: { top: 0.54, head: -16, gaze: 'perdida', body: 'desplomado' },
      says: 'Nada le interesa.', nc: 'Cansancio mira abajo; aburrimiento mira de lado con la cabeza vencida.', econ: 'Una explicación larguísima sobre tasas.' },
    { id: '37', key: 'sueno', name: 'Sueño', cat: 'fisico', src: 'p.30 · p.18 (DORMIDO)', pi: 1, e: 1, tr: 'estado físico (progresión de profundidad)', physical: true,
      levels: [{ top: 0.6, head: -3, ears: 'relajadas' }, { top: 0.82, head: -6, ears: 'relajadas', body: [1.02, 0.96, 0, 0, 2] }, { pose: 'dormido', ears: 'relajadas', head: -8, body: 'encogido', tail: 'envolvente' }, { pose: 'dormido', ears: [14, 14, 0, 0], head: -10, body: [1.06, 0.88, 0, 0, 3], tail: 'envolvente' }],
      lvNames: ['Somnolencia', 'Cabeceo', 'Dormido (pose base)', 'Sueño profundo'], anim: { breath: 'lenta' },
      says: 'El dinero que no se mueve; el paso del tiempo.', nc: 'Alivio también cierra los ojos pero está sentado erguido y sin cabeza vencida.', econ: 'Duerme junto al colchón donde guarda el dinero quieto.' },
    { id: '38', key: 'alivio', name: 'Alivio · «por fin»', cat: 'calma', src: 'p.30 · p.27', pi: 2, A: 2, e: 1, r: { pose: 'dormido', ears: 'relajadas', body: 'desplomado', tail: 'relajada' },
      l3: { body: [1.08, 0.87, 0, 0, 4] }, l4: { headDy: -3, ears: [12, 12, 0, 0], body: [0.98, 1.04, 0, 0, -3], tail: 'arriba' }, anim: { breath: 'lenta' }, tears: { 4: 'una' },
      lvNames: ['Exhala', 'Aliviado', 'Suelta el cuerpo', '«Por fin»'],
      says: 'Se libera de una carga.', nc: 'Necesita una tensión previa (ver secuencia 4). Sueño vence la cabeza; alivio no.', econ: 'La caja de la deuda sale del cuadro.' },
    { id: '39', key: 'confianza', name: 'Confianza', cat: 'calma', src: 'p.27 (familia confianza n.3) · solicitado', pi: null, A: 2, e: 1, tr: 'independiente (entrada adicional solicitada)', r: { top: 0.12, body: [0.985, 1.03, 0, 0, 0], tail: 'arriba' },
      l3: { body: 'estirado' }, l4: { top: 0.14, body: [0.96, 1.07, 0, 0, 0], ears: [-3, -3, 2, 2] },
      says: 'Entiende los límites y decide sin prisa. No es ausencia de riesgo.', nc: 'Orgullo sonríe con el párpado inferior y echa la cabeza atrás; alegría mira arriba.', econ: 'Sentado frente a una sola moneda iluminada, tras comparar.' },
    { id: '40', key: 'arrepentimiento', name: 'Arrepentimiento', cat: 'error', src: 'p.33 · p.22 (serie «MICHI se equivocó») · solicitado', pi: null, A: 2, e: 1, tr: 'independiente (entrada adicional solicitada)',
      r: { gaze: 'abajo-lateral', top: 0.36, tilt: 12, bot: 0.06, ears: [38, 38, 0, 0], head: -8, body: [1.05, 0.91, 0, 0, 2], tail: 'caida' },
      l3: { body: [1.07, 0.88, 0, 0, 3] }, l4: { top: 0.46, ears: 'caidas', head: -10, body: 'desplomado' }, tears: { 4: 'una' },
      says: 'Mira el lugar vacío donde estaba el billete: desearía no haberlo hecho.', nc: 'Culpa EVITA el objeto; tristeza no mira un lugar concreto; «¿qué acabo de hacer?» es el choque previo.', econ: 'Mira el hueco donde estaba el CATDÓLAR.' },
    { id: '41', key: 'determinacion', name: 'Determinación', cat: 'duda', src: 'p.27 (familia confianza n.2)', A: 2, e: 1, tr: 'independiente (en la familia del PDF era nivel 2)', r: { top: 0.18, pupil: [0.85, 1], body: 'estirado', tail: 'rigida' },
      l3: { lean: 3 }, l4: { top: 0.24, lean: 5, bodyDx: 3, tilt: -6 },
      says: 'Decidió y va.', nc: 'Confianza está en reposo; determinación se inclina hacia la acción.', econ: 'Se dirige al frasco con una moneda.' },
    { id: '42', key: 'descubrimiento', name: 'Descubrimiento · asombro', cat: 'sorpresa', src: 'p.27 (familia descubrimiento)', A: 2, e: 2, tr: 'independiente (familia: interesado → me di cuenta → asombrado → sorpresa positiva)', r: { pose: 'sorpresa', pupil: 'grande', ears: 'alerta', head: 4, body: 'estirado', tail: 'rigida' },
      l3: { pupil: 'muy grande' }, l4: { pupil: 'muy grande', bot: 0.12, tail: 'arriba', body: [0.96, 1.08, 0, 0, 0] },
      says: 'Sorpresa con valencia positiva: la pupila crece.', nc: 'Sorpresa tiene pupila chica.', econ: 'Match cut: la misma pila, diez años después.' },
    { id: '43', key: 'resignacion', name: 'Resignación', cat: 'tristeza', src: 'p.26 (decepción n.3) · p.34', A: 2, e: 1, tr: 'independiente', r: { gaze: [0, 0.4], top: 0.4, ears: [12, 12, 0, 0], body: 'desplomado', tail: 'caida' },
      l3: { body: [1.08, 0.87, 0, 0, 4] }, l4: { top: 0.5, body: [1.08, 0.86, 0, 0, 6], ears: [20, 20, 0, 0] }, anim: { breath: 'lenta' },
      says: 'Acepta algo que no le gusta; exhala y se desploma un 10 %.', nc: 'Decepción mira el objeto; resignación mira al frente, bajo.', econ: '«Debí empezar antes»: el reloj avanza.' },
    { id: '44', key: 'valentia', name: 'Valentía', cat: 'miedo', src: 'p.31 (suelto)', A: 2, e: 1, tr: 'estado suelto (combina miedo + avance)', r: { pupil: 'chica', top: 0.1, ears: [20, 20, 0, 0], body: [1, 1, 4, 2, 0], tail: 'rigida' },
      l3: { lean: 5, bodyDx: 4 }, l4: { lean: 6, bodyDx: 7, tilt: -6 },
      says: 'Tiene miedo y avanza igual.', nc: 'Determinación no tiene orejas atrás ni pupila chica.', econ: 'Se acerca al CATCOIN que le daba miedo.' },
    { id: '45', key: 'desconfianza', name: 'Desconfianza', cat: 'duda', src: 'p.31 (suelto)', A: 2, e: 1, tr: 'variante de Sospecha (sin tenaza)', r: { gaze: 'lateral', top: 0.26, ears: 'inclinadas', body: 'atras', tail: 'envolvente' },
      l3: { lean: -5 }, l4: { lean: -6, bodyDx: -5, top: 0.3 },
      says: 'Mantiene distancia de algo.', nc: 'Sospecha entrecierra en tenaza.', econ: 'Un vendedor inclinado hacia él.' },
    { id: '46', key: 'deprimido', name: 'Deprimido', cat: 'tristeza', src: 'p.21 · p.31 (suelto)', A: 2, e: 1, tr: 'estado suelto de actuación (no diagnóstico)', r: { gaze: 'perdida', top: 0.55, ears: 'caidas', body: 'desplomado', tail: 'caida' },
      l3: { body: [1.08, 0.86, 0, 0, 5] }, l4: { top: 0.62, head: -6, body: [1.08, 0.86, 0, 0, 7] },
      says: 'Tristeza sin dirección.', nc: 'Tristeza mira abajo a algo; deprimido mira a ningún lado.', econ: 'Uso limitado: evitar en contenido de venta.' },
    { id: '47', key: 'esperando', name: 'Esperando', cat: 'energia', src: 'p.21 · p.31 (suelto)', A: 2, e: 1, tr: 'variante de Impaciencia (sin agitación)', r: { gaze: 'arriba', tail: 'pregunta' },
      l3: { top: 0.12 }, l4: { top: 0.2, body: [1.02, 0.97, 0, 0, 1] },
      says: 'Quieto; solo la cola se mueve.', nc: 'Esperanza tiene pupila grande y orejas alerta.', econ: 'Frente al frasco, esperando que llegue la quincena.' },
    { id: '48', key: 'carino', name: 'Cariño', cat: 'calma', src: 'p.31 (suelto)', A: 2, e: 1, tr: 'estado suelto', r: { pupil: 'grande', bot: 0.3, ears: 'relajadas', head: 6, tail: 'envolvente' },
      l3: { body: [1.02, 0.98, 2, 0, 0] }, l4: { bot: 0.38, pupil: 'muy grande', head: 8, paws: 'sostener' },
      says: 'Pupila grande, ojos que sonríen.', nc: 'Felicidad no agranda la pupila; alegría mira arriba.', econ: 'Guarda la moneda de un regalo.' },
    { id: '49', key: 'en-serio', name: '«¿En serio?»', cat: 'sorpresa', src: 'p.15 · p.34', A: 2, e: 1, tr: 'actuación (mirada a cámara, máx. 1 vez por video)', r: { top: 0.4, bot: 0.14 },
      l3: { head: -3 }, l4: { top: 0.46, bot: 0.18 }, anim: { freeze: true },
      says: 'Mirada plana a cámara; sostener 1,5 s.', nc: 'Aburrimiento aparta la mirada; aquí rompe la escena.', econ: 'Una comisión de 99 CATCOINS por «manejo de cuenta».' },
    { id: '50', key: 'sorpresa-negativa', name: 'Sorpresa negativa', cat: 'sorpresa', src: 'p.31 (suelto)', A: 2, e: 2, tr: 'variante de Sorpresa', r: { pose: 'sorpresa', pupil: 'chica', ears: [16, 16, 0, 0], body: 'retrocede', tail: 'rigida' },
      l3: { ears: 'atras' }, l4: { ears: 'atras', pupil: 'minima', body: [1.03, 0.92, -6, -8, 0] },
      says: 'Abre los ojos y retrocede.', nc: 'Miedo no retrocede en nivel 2; pánico sí, con pupila punto.', econ: 'Llega un cargo que no esperaba.' },
  ];

  const CATS = {
    calibracion: 'Calibración', calma: 'Calma, bienestar y confianza', energia: 'Energía, interés y espera', sorpresa: 'Sorpresa y descubrimiento',
    duda: 'Duda, sospecha y decisión', miedo: 'Preocupación y miedo', error: 'Error, culpa y arrepentimiento', tristeza: 'Tristeza y pérdida', tension: 'Tensión: frustración y enojo', fisico: 'Baja energía y estados físicos',
  };
  const TIMING = { 1: [600, 2200, 700], 2: [350, 1500, 500], 3: [180, 1200, 600] };
  const LV = ['Sutil', 'Clara', 'Fuerte', 'Extrema'];

  function apply(p, v, R) {
    const set = (k, val) => { p[k] = val; };
    if (v.pose) { const P = R.POSES[v.pose]; p.pose = v.pose; p.eyeScale = P.eyeScale; p.closed = P.closed; p._poseH = P.pupilH; if (v.paws === undefined) p.paws = P.paws; p.pupilH = (p._pupilH || 1) * P.pupilH; }
    if (v.gaze !== undefined) { const g = Array.isArray(v.gaze) ? v.gaze : VOC.gaze[v.gaze]; set('gazeX', g[0]); set('gazeY', g[1]); }
    if (v.pupil !== undefined) { const u = Array.isArray(v.pupil) ? v.pupil : VOC.pupil[v.pupil]; p.pupilW = u[0]; p._pupilH = u[1]; p.pupilH = u[1] * (p._poseH || 1); }
    if (v.top !== undefined) { const t = Array.isArray(v.top) ? v.top : [v.top, v.top]; p.lidTopL = t[0]; p.lidTopR = t[1]; }
    if (v.tilt !== undefined) { const t = typeof v.tilt === 'string' ? VOC.tilt[v.tilt] : v.tilt; p.lidTiltL = t; p.lidTiltR = t; }
    if (v.bot !== undefined) { const t = Array.isArray(v.bot) ? v.bot : [v.bot, v.bot]; p.lidBotL = t[0]; p.lidBotR = t[1]; }
    if (v.ears !== undefined) { const e = Array.isArray(v.ears) ? v.ears : VOC.ears[v.ears]; p.earL = e[0]; p.earR = e[1]; p.earLiftL = e[2]; p.earLiftR = e[3]; }
    if (v.head !== undefined) p.head = v.head;
    if (v.body !== undefined) { const b = Array.isArray(v.body) ? v.body : VOC.body[v.body]; p.bodySx = b[0]; p.bodySy = b[1]; p.lean = b[2]; p.bodyDx = b[3]; p.headDy = b[4] || 0; }
    ['lean', 'bodyDx', 'headDy'].forEach(k => { if (v[k] !== undefined) p[k] = v[k]; });
    if (v.tail !== undefined) p.tail = v.tail;
    if (v.paws !== undefined) p.paws = v.paws;
    return p;
  }
  function clean(p, R) { const o = R.normalize(p); const r = {}; for (const k of R.NUM) r[k] = Math.round(o[k] * 1000) / 1000; for (const k of R.DISCRETE) r[k] = o[k]; return r; }
  function resolve(v, R) { const p = Object.assign({}, R.NEUTRAL); return apply(p, v || {}, R); }
  function mix(N, P, w, R) { const o = Object.assign({}, P); for (const g in GROUPS) for (const k of GROUPS[g]) o[k] = N[k] + (P[k] - N[k]) * w[g]; return o; }
  function amp(N, P, k, R) { const o = Object.assign({}, P); for (const key of R.NUM) { if (key === 'eyeScale' || key === 'closed') continue; o[key] = N[key] + (P[key] - N[key]) * k; } return o; }

  function levelsFor(s, R) {
    const N = R.NEUTRAL;
    if (s.single) return [resolve({}, R)];
    if (s.levels) return s.levels.map(v => resolve(v, R));
    const P = resolve(s.r, R);
    const L1 = mix(N, P, { eyes: 0.55, ears: 0.35, head: 0.35, body: 0 }, R);
    Object.assign(L1, { pose: 'sentado', eyeScale: 1, paws: 'none', tail: 'relajada', pupilH: N.pupilH + (P.pupilH / (P._poseH || 1) - N.pupilH) * 0.55 });
    let L2, L3, L4;
    if (s.A === 3) {
      L2 = mix(N, P, { eyes: 0.8, ears: 0.8, head: 0.8, body: 0.4 }, R); Object.assign(L2, { paws: 'none', tail: 'relajada' });
      L3 = Object.assign({}, P);
      L4 = amp(N, P, 1.3, R);
    } else {
      L2 = Object.assign({}, P);
      L3 = amp(N, P, 1.3, R);
      L4 = amp(N, P, 1.6, R);
    }
    if (s.l2) apply(L2, s.l2, R); if (s.l3) apply(L3, s.l3, R); if (s.l4) apply(L4, s.l4, R);
    return [L1, L2, L3, L4];
  }

  function build(R) {
    const states = S.map(s => {
      const lv = levelsFor(s, R).map(p => clean(p, R));
      const t = TIMING[s.e || 1];
      return {
        id: s.id, key: s.key, name: s.name, category: s.cat, categoryName: CATS[s.cat], source: s.src,
        treatment: s.tr || 'independiente', pdfIntensity3: s.pi == null ? null : s.pi, anchorLevel: s.single ? null : (s.levels ? 'progresión explícita' : s.A),
        communicates: s.says, notConfuseWith: s.nc, economicExample: s.econ, energy: s.e || 1,
        timingMs: { in: t[0], hold: s.key === 'angustia' ? t[1] * 2 : t[1], out: t[2], note: 'propuesta; la energía de movimiento es independiente de la intensidad' },
        micro: s.anim || {}, suggestedTears: s.tears || {}, recipe: s.r || null, overrides: { l2: s.l2 || null, l3: s.l3 || null, l4: s.l4 || null },
        levelNames: s.single ? ['Neutro'] : (s.lvNames || LV), levels: lv,
      };
    });
    return {
      schema: 'michi.emotions/1', generated: 'build(MichiRig) · michi_recipes.js',
      units: 'u = 1 pt del PDF p.11; origen = centro de la base; Y hacia abajo',
      conventions: {
        angles: 'grados; head/lean positivo = horario en pantalla; ear positivo = hacia afuera; lidTilt positivo = extremo exterior más bajo (tristeza), negativo = interior más bajo (enojo)',
        lids: 'lidTop/lidBot = fracción del diámetro del ojo cubierta', gaze: 'gazeX/gazeY en [-1,1] = fracción del recorrido máximo de la pupila dentro del iris; +X = derecha del espectador (lado del objeto por convención)',
        pupil: 'pupilW/pupilH multiplican la rendija canónica (2.985 × 7.46 u); siempre rendija vertical', body: 'bodySx/bodySy escala desde la base; lean rota desde la base; bodyDx desplaza',
        intensity: 'Conversión 3→4 niveles (decisión de implementación): la receta del PDF se ancla en nivel 2 si era ●○○/●●○ y en nivel 3 si era ●●●. N1 = 55 % del cambio en ojos, 35 % orejas/cabeza, sin cuerpo ni cola. Nivel ×1.3 / ×1.6 del cambio con límites, más modificadores explícitos.',
      },
      vocabulary: VOC, limits: R.LIMITS, neutral: clean(R.NEUTRAL, R), categories: CATS, states,
    };
  }

  const api = { VOC, S, CATS, build, resolve: (v, R) => clean(resolve(v, R), R) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MichiRecipes = api;
})(typeof window !== 'undefined' ? window : globalThis);


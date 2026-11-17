// =====================================================
//  ENDLESS RUNNER · Taller "Del juego al móvil"
//  Versión INICIAL · completa los bloques marcados con  // COMPLETA
// =====================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restartBtn');

// --- Configuración (unidades por SEGUNDO, no por fotograma) ---
// Así el juego corre igual en una pantalla de 60 Hz que en una de 120 Hz.
const GROUND_Y = canvas.height - 60;   // altura del suelo
const GRAVITY = 2200;                  // px/s²  (qué tan rápido cae)
const JUMP_FORCE = -760;               // px/s   (impulso del salto)
const START_SPEED = 300;               // px/s   (velocidad inicial de los obstáculos)
const ACCELERATION = 10;               // px/s cada segundo (dificultad progresiva)
const POINTS_PER_SECOND = 10;

// --- Oxígeno ---
const OXYGEN_MAX = 100;
const OXYGEN_DRAIN = 8;      // unidades por segundo (sin tanques duras ~12 s)
const TANK_REFILL = 35;      // cuánto recarga cada tanque
const TANK_SIZE = 28;

// --- Estado del juego ---
// 'ready' = esperando el primer toque · 'playing' = jugando · 'over' = perdiste
let state, player, obstacles, score, speed, spawnTimer, lastTime;
let oxygen, tanks, tankTimer, motivo, destello;
let best = Number(leerRecord()) || 0;

function initGame() {
  player = { x: 80, y: GROUND_Y - 40, width: 40, height: 40, vy: 0, jumping: false };
  obstacles = [];
  oxygen = OXYGEN_MAX;
  tanks = [];
  tankTimer = 2;
  motivo = '';
  destello = 0;
  score = 0;
  speed = START_SPEED;
  spawnTimer = 1;          // segundos hasta el primer obstáculo
  state = 'ready';
  restartBtn.hidden = true;
  actualizarHUD();
}

// --- Entrada del usuario (teclado, mouse y pantalla táctil) ---
function onInput() {
  if (state === 'ready') { state = 'playing'; }
  if (state === 'over') { initGame(); return; }
  jump();
}

function jump() {
  if (!player.jumping) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); onInput(); }
});
canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); onInput(); });
restartBtn.addEventListener('click', initGame);

// --- Generación de obstáculos ---
function spawnObstacle() {
  // COMPLETA (Paso 3):
  //  1. Crea un ancho y un alto aleatorios entre 30 y 60 px.
  //     Pista: 30 + Math.random() * 30
  //  2. Agrega a "obstacles" un objeto { x, y, width, height } donde:
  //     x = canvas.width       (aparece en el borde derecho)
  //     y = GROUND_Y - height  (apoyado sobre el suelo)
const width = 30 + Math.random() * 30;   // entre 30 y 60 px
  const height = 30 + Math.random() * 30;  // entre 30 y 60 px
  // Forma irregular del asteroide (solo visual, la colisión sigue siendo un rectángulo)
  const puntos = [];
  const lados = 9;
  for (let i = 0; i < lados; i++) puntos.push(0.78 + Math.random() * 0.22);
  obstacles.push({
    x: canvas.width,            // aparece en el borde derecho
    y: GROUND_Y - height,       // apoyado sobre el suelo
    width,
    height,
    puntos,
    giro: Math.random() * Math.PI * 2,
    // Tipo de obstáculo al azar: asteroide, ovni o estrella
    tipo: ['asteroide', 'ovni', 'estrella'][Math.floor(Math.random() * 3)]
  });
}

// --- Tanques de oxígeno: aparecen abajo (en el suelo) o arriba (hay que saltar) ---
function spawnTank() {
  const arriba = Math.random() < 0.5;
  tanks.push({
    x: canvas.width,
    y: arriba ? GROUND_Y - 150 : GROUND_Y - TANK_SIZE - 4,
    width: TANK_SIZE * 0.7,
    height: TANK_SIZE,
    fase: Math.random() * Math.PI * 2
  });
}

// --- Colisión entre dos rectángulos ---
function colisiona(a, b) {
  // COMPLETA (Paso 5):
  //  Devuelve true si los rectángulos a y b se superponen.
  //  Deben cumplirse las CUATRO condiciones a la vez (usa &&):
  //   - el borde izquierdo de a está antes del borde derecho de b
  //   - el borde derecho de a está después del borde izquierdo de b
  //   - el borde superior de a está arriba del borde inferior de b
  //   - el borde inferior de a está abajo del borde superior de b
  //  Recuerda: borde derecho = x + width · borde inferior = y + height

  //return false; // ← reemplaza esta línea
   return (
    a.x < b.x + b.width &&    // izquierda de a, antes de la derecha de b
    a.x + a.width > b.x &&    // derecha de a, después de la izquierda de b
    a.y < b.y + b.height &&   // arriba de a, sobre la base de b
    a.y + a.height > b.y      // base de a, debajo de la parte de arriba de b
  );
}

// --- Actualización: dt = segundos desde el fotograma anterior ---
function update(dt) {
  if (state !== 'playing') return;

  // Física del jugador
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.jumping = false;
  }

  // Mover obstáculos hacia la izquierda (y hacerlos girar)
  obstacles.forEach(o => { o.x -= speed * dt; o.giro -= dt * speed / 80; });

  // COMPLETA (Paso 4): elimina los obstáculos que ya salieron por la izquierda.
  //  Pista: usa obstacles.filter(...) y conserva solo los que cumplan o.x + o.width > 0
  obstacles = obstacles.filter(o => o.x + o.width > 0);

  // PASO 5 · Revisar si el jugador chocó con algún obstáculo
  if (obstacles.some(o => colisiona(player, o))) {
    terminarPartida('choque');
    return;
  }

  // Tanques de oxígeno: moverlos, recogerlos y borrar los que salieron
  tanks.forEach(t => { t.x -= speed * dt; });
  tanks = tanks.filter(t => {
    if (colisiona(player, t)) {
      oxygen = Math.min(OXYGEN_MAX, oxygen + TANK_REFILL);
      destello = 0.3;
      return false;
    }
    return t.x + t.width > 0;
  });
  destello = Math.max(0, destello - dt);

  // El oxígeno se va gastando
  oxygen -= OXYGEN_DRAIN * dt;
  if (oxygen <= 0) {
    oxygen = 0;
    terminarPartida('oxigeno');
    return;
  }

  // Generar un tanque cada 1.5 a 3.5 s (sin encimarlo a un obstáculo recién salido)
  tankTimer -= dt;
  if (tankTimer <= 0) {
    if (obstacles.some(o => o.x > canvas.width - 120)) {
      tankTimer = 0.3;
    } else {
      spawnTank();
      tankTimer = 1.5 + Math.random() * 2;
    }
  }

  // Puntuación y dificultad progresiva
  score += POINTS_PER_SECOND * dt;
  speed += ACCELERATION * dt;
  actualizarHUD();

  // Generar un obstáculo cada 1.1 a 1.8 segundos
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 1.1 + Math.random() * 0.7;
  }
}

function terminarPartida(razon) {
  motivo = razon;
  state = 'over';
  restartBtn.hidden = false;
  if (Math.floor(score) > best) {
    best = Math.floor(score);
    guardarRecord(best);
  }
  actualizarHUD();
}

function actualizarHUD() {
  scoreEl.textContent = 'Puntos: ' + Math.floor(score);
  bestEl.textContent = 'Récord: ' + best;
}

// --- Escenario espacial: estrellas, planeta y cráteres ---
const estrellas = Array.from({ length: 90 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * GROUND_Y,
  r: Math.random() * 1.6 + 0.3,
  capa: Math.random() * 0.25 + 0.03,   // estrellas lejanas se mueven más lento
  brillo: Math.random() * Math.PI * 2
}));
const crateres = Array.from({ length: 6 }, (_, i) => ({
  x: i * 150 + Math.random() * 80,
  r: 10 + Math.random() * 16
}));
let planetaX = canvas.width * 0.75;
let tiempo = 0;

function moverEscenario(dt) {
  tiempo += dt;
  const v = state === 'playing' ? speed : 40;   // en pausa, el fondo se mueve lento
  estrellas.forEach(s => {
    s.x -= v * s.capa * dt;
    if (s.x < 0) { s.x += canvas.width; s.y = Math.random() * GROUND_Y; }
  });
  planetaX -= v * 0.02 * dt;
  if (planetaX < -120) planetaX = canvas.width + 120;
  if (state === 'playing') {
    crateres.forEach(c => {
      c.x -= speed * dt;
      if (c.x + c.r < 0) { c.x += 900; c.r = 10 + Math.random() * 16; }
    });
  }
}

function dibujarFondo() {
  // Cielo
  const cielo = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  cielo.addColorStop(0, '#05010f');
  cielo.addColorStop(1, '#1a0b3d');
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, canvas.width, GROUND_Y);

  // Estrellas que titilan
  estrellas.forEach(s => {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(tiempo * 3 + s.brillo);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Planeta con anillo
  const py = 90;
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(planetaX, py, 75, 16, -0.3, Math.PI, Math.PI * 2);
  ctx.stroke();
  const g = ctx.createRadialGradient(planetaX - 15, py - 15, 5, planetaX, py, 45);
  g.addColorStop(0, '#c084fc');
  g.addColorStop(1, '#581c87');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(planetaX, py, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(planetaX, py, 75, 16, -0.3, 0, Math.PI);
  ctx.stroke();

  // Suelo lunar
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, GROUND_Y, canvas.width, 4);
  ctx.fillStyle = '#374151';
  crateres.forEach(c => {
    ctx.beginPath();
    ctx.ellipse(c.x, GROUND_Y + 25, c.r, c.r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function dibujarAstronauta(p) {
  const { x, y, width: w, height: h } = p;
  // Llama del propulsor mientras salta
  if (p.jumping) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h * 0.55);
    ctx.lineTo(x + 10, y + h * 0.55);
    ctx.lineTo(x + 6, y + h + 6 + Math.random() * 8);
    ctx.fill();
  }
  // Mochila
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x, y + h * 0.3, w * 0.28, h * 0.45);
  // Cuerpo
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect(x + w * 0.18, y + h * 0.35, w * 0.7, h * 0.5, 6);
  ctx.fill();
  // Piernas
  const paso = state === 'playing' && !p.jumping ? Math.sin(tiempo * 18) * 3 : 0;
  ctx.fillRect(x + w * 0.25, y + h * 0.8, w * 0.2, h * 0.2 + paso);
  ctx.fillRect(x + w * 0.58, y + h * 0.8, w * 0.2, h * 0.2 - paso);
  // Casco
  ctx.beginPath();
  ctx.arc(x + w * 0.55, y + h * 0.3, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Visor
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.66, y + h * 0.3, w * 0.17, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(x + w * 0.66, y + h * 0.24, 4, 3);
}

function dibujarAsteroide(o) {
  const cx = o.x + o.width / 2;
  const cy = o.y + o.height / 2;
  const rx = o.width / 2, ry = o.height / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#a16207';
  ctx.strokeStyle = '#713f12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  o.puntos.forEach((k, i) => {
    const a = o.giro + (i / o.puntos.length) * Math.PI * 2;
    const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cráteres del asteroide
  ctx.fillStyle = '#854d0e';
  ctx.beginPath();
  ctx.arc(Math.cos(o.giro) * rx * 0.35, Math.sin(o.giro) * ry * 0.35, rx * 0.2, 0, Math.PI * 2);
  ctx.arc(Math.cos(o.giro + 2.5) * rx * 0.4, Math.sin(o.giro + 2.5) * ry * 0.4, rx * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function dibujarOvni(o) {
  const cx = o.x + o.width / 2;
  const w = o.width, h = o.height;
  const flota = Math.sin(tiempo * 6 + o.giro) * 2;   // pequeño balanceo
  const base = o.y + h * 0.65 + flota;
  // Rayo de luz hacia el suelo
  ctx.fillStyle = 'rgba(163, 230, 53, 0.25)';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.2, base);
  ctx.lineTo(cx + w * 0.2, base);
  ctx.lineTo(cx + w * 0.45, o.y + h);
  ctx.lineTo(cx - w * 0.45, o.y + h);
  ctx.fill();
  // Cúpula
  ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
  ctx.beginPath();
  ctx.ellipse(cx, base - h * 0.12, w * 0.25, h * 0.28, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // Extraterrestre dentro
  ctx.fillStyle = '#84cc16';
  ctx.beginPath();
  ctx.arc(cx, base - h * 0.2, w * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // Platillo
  ctx.fillStyle = '#9ca3af';
  ctx.beginPath();
  ctx.ellipse(cx, base, w / 2, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Luces que parpadean
  for (let i = -2; i <= 2; i++) {
    const encendida = Math.floor(tiempo * 8 + i) % 2 === 0;
    ctx.fillStyle = encendida ? '#facc15' : '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx + i * w * 0.18, base + 1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dibujarEstrella(o) {
  const cx = o.x + o.width / 2;
  const cy = o.y + o.height / 2;
  const r = Math.min(o.width, o.height) / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(o.giro);
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;   // puntas y huecos alternados
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
            : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function dibujarObstaculo(o) {
  if (o.tipo === 'ovni') dibujarOvni(o);
  else if (o.tipo === 'estrella') dibujarEstrella(o);
  else dibujarAsteroide(o);
}

function dibujarTanque(t) {
  const y = t.y + Math.sin(tiempo * 4 + t.fase) * 3;   // flota un poco
  const { x, width: w, height: h } = t;
  ctx.save();
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 12;
  // Cuerpo del tanque
  ctx.fillStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.roundRect(x, y + 5, w, h - 5, 5);
  ctx.fill();
  ctx.restore();
  // Válvula
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x + w * 0.3, y, w * 0.4, 6);
  // Brillo y etiqueta
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 3, y + 8, 3, h - 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('O₂', x + w / 2 + 1, y + h * 0.7);
}

function dibujarBarraOxigeno() {
  const x = 16, y = 14, w = 220, h = 18;
  const nivel = oxygen / OXYGEN_MAX;
  const bajo = nivel < 0.25;

  // Fondo de la barra
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.fill();

  // Relleno: verde → amarillo → rojo (parpadea cuando queda poco)
  if (!bajo || Math.floor(tiempo * 6) % 2 === 0) {
    ctx.fillStyle = nivel > 0.5 ? '#22d3ee' : nivel > 0.25 ? '#facc15' : '#ef4444';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, Math.max(0, (w - 4) * nivel), h - 4, 7);
    ctx.fill();
  }

  // Borde (brilla al recoger un tanque)
  ctx.strokeStyle = destello > 0 ? '#ffffff' : 'rgba(148, 163, 184, 0.7)';
  ctx.lineWidth = destello > 0 ? 3 : 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 9);
  ctx.stroke();

  // Texto
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('O₂  ' + Math.ceil(oxygen) + '%', x + 8, y + 13);
}

// --- Dibujo ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  dibujarFondo();
  tanks.forEach(dibujarTanque);
  dibujarAstronauta(player);
  obstacles.forEach(dibujarObstaculo);
  dibujarBarraOxigeno();

  // Mensajes
  if (state === 'ready') mensaje('🚀 Toca o presiona Espacio para despegar', 'Recoge tanques de O₂ para no quedarte sin aire');
  if (state === 'over') {
    const titulo = motivo === 'oxigeno' ? '¡Te quedaste sin oxígeno!' : '¡Chocaste!';
    mensaje(titulo, 'Puntos: ' + Math.floor(score) + ' · Toca para reintentar');
  }
}

function mensaje(titulo, subtitulo) {
  ctx.fillStyle = 'rgba(5, 1, 15, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(titulo, canvas.width / 2, canvas.height / 2);
  if (subtitulo) {
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(subtitulo, canvas.width / 2, canvas.height / 2 + 40);
  }
}

// --- Bucle principal (siempre activo; calcula dt) ---
function loop(now) {
  // Limitamos dt a 0.05 s para que el juego no "salte" al volver de otra pestaña
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  moverEscenario(dt);
  draw();
  requestAnimationFrame(loop);
}

// --- Récord guardado en el dispositivo (protegido por si el almacenamiento falla) ---
function leerRecord() {
  try { return localStorage.getItem('runner-record'); } catch { return 0; }
}
function guardarRecord(valor) {
  try { localStorage.setItem('runner-record', valor); } catch { /* sin almacenamiento */ }
}

// --- Arranque ---
initGame();
requestAnimationFrame((now) => { lastTime = now; requestAnimationFrame(loop); });

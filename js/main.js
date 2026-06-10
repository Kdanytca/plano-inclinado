// ==========================================
// VARIABLES GLOBALES
// ==========================================
let angulo = 30, masa = 2, g = 9.8, mu = 0.2, longitud = 5;
let a = 0, vel = 0, t = 0, corriendo = false;
let escala = 100;
let planoLongPx = longitud * escala;
const blockSize = 36;
let s = 0;
let trayectoria = [];
let trayectoriaGraph = [];
let trayectoriaVel = [];
// Arrays para almacenar datos de tablas SIEMPRE
let datosTablaPos = [];
let datosTablaVel = [];
let dt = 0.04;

let mostrarFuerzas = false;
let mostrarFormulas = true;

let baseOriginX = 80;
let baseOriginYOffset = 80;
let planeOriginX = baseOriginX;
let planeOriginY = 0;

let velocidadFinal = 0;
let tiempoFinal = 0;
let currentView = 'sim';

// ==========================================
// CONFIGURACIÓN DE CONTROLES
// ==========================================
const controlsConfig = [
    { id: 'angulo', min: 5, max: 85, step: 0.5 },
    { id: 'masa', min: 0.1, max: 10, step: 0.1 },
    { id: 'gravedad', min: 1, max: 20, step: 0.1 },
    { id: 'friccion', min: 0, max: 1, step: 0.01 },
    { id: 'longitud', min: 1, max: 5, step: 0.1 }
];

function setupControlListeners() {
    controlsConfig.forEach(config => {
        const slider = document.getElementById(config.id);
        const textInput = document.getElementById(config.id + '-text');
        const valueDisplay = document.getElementById(config.id + '-value');
        const errorDisplay = document.getElementById(config.id + '-error');

        slider.addEventListener('input', function () {
            textInput.value = this.value;
            valueDisplay.textContent = this.value;
            errorDisplay.style.display = 'none';
            reiniciar();
        });

        textInput.addEventListener('input', function () {
            const value = parseFloat(this.value);

            if (isNaN(value)) {
                errorDisplay.textContent = '❌ Valor no válido';
                errorDisplay.style.display = 'block';
                return;
            }

            if (value < config.min || value > config.max) {
                errorDisplay.textContent = `❌ Fuera de rango (${config.min} - ${config.max})`;
                errorDisplay.style.display = 'block';
                return;
            }

            errorDisplay.style.display = 'none';
            slider.value = value;
            valueDisplay.textContent = value;
            reiniciar();
        });

        textInput.addEventListener('blur', function () {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value >= config.min && value <= config.max) {
                errorDisplay.style.display = 'none';
            }
        });
    });
}

// ==========================================
// P5.JS SETUP
// ==========================================
function setup() {
    let canvasW, canvasH;

    if (windowWidth < 768) {
        // Tamaño fijo optimizado para móvil
        canvasW = Math.min(windowWidth - 20, 400);
        canvasH = 300; // Altura fija para móvil
    } else {
        canvasW = floor(windowWidth * 0.55);
        canvasH = 640;
    }

    let canvas = createCanvas(canvasW, canvasH);
    canvas.parent('canvas-container');
    frameRate(Math.round(1 / dt));

    setupControlListeners();
    calcularAceleracion();
    actualizarResultados();
    actualizarFormulasIntuitivas();
    noLoop();

    // Botones desktop
    document.getElementById('iniciar').addEventListener('click', iniciar);
    document.getElementById('pausar').addEventListener('click', pausar);
    document.getElementById('reiniciar').addEventListener('click', reiniciar);
    document.getElementById('toggle-fuerzas').addEventListener('click', toggleFuerzas);
    document.getElementById('toggle-formulas-desktop').addEventListener('click', toggleFormulas);

    // Botones móvil
    document.getElementById('iniciar-mobile').addEventListener('click', iniciar);
    document.getElementById('pausar-mobile').addEventListener('click', pausar);
    document.getElementById('reiniciar-mobile').addEventListener('click', reiniciar);
    document.getElementById('toggle-fuerzas-mobile').addEventListener('click', toggleFuerzas);
    document.getElementById('toggle-formulas-mobile').addEventListener('click', toggleFormulas);

    // Pestañas
    document.getElementById('show-sim').addEventListener('click', () => setView('sim'));
    document.getElementById('show-graph-pos').addEventListener('click', () => setView('graph-pos'));
    document.getElementById('show-graph-vel').addEventListener('click', () => setView('graph-vel'));

    // Mostrar/ocultar elementos según dispositivo
    toggleDeviceElements();
}

function windowResized() {
    let canvasW, canvasH;

    if (windowWidth < 768) {
        // Tamaño fijo optimizado para móvil
        canvasW = Math.min(windowWidth - 20, 400);
        canvasH = 300; // Altura fija para móvil
    } else {
        canvasW = floor(windowWidth * 0.55);
        canvasH = 640;
    }

    resizeCanvas(canvasW, canvasH);
    calcularAceleracion();
    redraw();

    // Actualizar visibilidad de elementos según dispositivo
    toggleDeviceElements();
}

function toggleDeviceElements() {
    const isMobile = windowWidth < 768;
    document.querySelectorAll('.desktop-only').forEach(el => {
        el.style.display = isMobile ? 'none' : 'block';
    });
    document.querySelectorAll('.mobile-only').forEach(el => {
        el.style.display = isMobile ? 'block' : 'none';
    });
}

function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-switcher button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('show-sim').classList.toggle('active', view === 'sim');
    document.getElementById('show-graph-pos').classList.toggle('active', view === 'graph-pos');
    document.getElementById('show-graph-vel').classList.toggle('active', view === 'graph-vel');

    // Mostrar/ocultar tablas
    document.getElementById('data-table-pos').style.display = (view === 'graph-pos') ? 'block' : 'none';
    document.getElementById('data-table-vel').style.display = (view === 'graph-vel') ? 'block' : 'none';

    // Ocultar controles y fórmulas en móvil cuando se vean gráficos
    const isMobile = windowWidth < 768;
    if (isMobile) {
        const shouldHide = (view === 'graph-pos' || view === 'graph-vel');

        // Ocultar el contenedor de controles y resultados
        document.querySelector('.controls-data-wrapper').classList.toggle('hide-on-graph-mobile', shouldHide);

        // Ocultar las fórmulas del panel izquierdo
        const formulasContainer = document.querySelector('.formulas-panel-container.desktop-only');
        if (formulasContainer) {
            formulasContainer.classList.toggle('hide-on-graph-mobile', shouldHide);
        }
    }

    // Actualizar tablas si están visibles
    if (view === 'graph-pos' || view === 'graph-vel') {
        actualizarTablaDatos(true); // Forzar actualización
    }

    redraw();
}

// ==========================================
// FÍSICA Y CÁLCULOS
// ==========================================
function calcularAceleracion() {
    angulo = parseFloat(document.getElementById("angulo").value);
    masa = parseFloat(document.getElementById("masa").value);
    g = parseFloat(document.getElementById("gravedad").value);
    mu = parseFloat(document.getElementById("friccion").value);
    longitud = parseFloat(document.getElementById("longitud").value);

    if (isNaN(longitud) || longitud < 1) longitud = 1;
    if (longitud > 5) longitud = 5;
    document.getElementById("longitud").value = longitud;

    a = g * Math.sin(radians(angulo)) - mu * g * Math.cos(radians(angulo));
    if (a < 0) a = 0;

    // Ajuste de escala adaptativa para que quepa en el canvas
    const availableWidth = width - planeOriginX - 80; // margen derecho de 80px
    const availableHeight = height - baseOriginYOffset - 80; // margen superior de 80px

    // Calcular escalas máximas para cada dirección basadas en las componentes del plano
    const cosAngle = Math.cos(radians(angulo));
    const sinAngle = Math.sin(radians(angulo));
    const escalaX = availableWidth / (longitud * cosAngle);
    const escalaY = availableHeight / (longitud * sinAngle);

    // Usar la escala menor para asegurar que quepa en ambas direcciones
    escala = Math.min(escalaX, escalaY);

    // Limitar escala a valores razonables (mínimo 40px/m, máximo 120px/m)
    escala = Math.max(40, Math.min(escala, 120));

    planoLongPx = longitud * escala;
    planeOriginY = height - baseOriginYOffset;

    if (t === 0 && !corriendo) {
        s = planoLongPx;
        vel = 0;
        trayectoria = [];
        trayectoriaGraph = [{ t: 0, s: 0 }];
        trayectoriaVel = [{ t: 0, v: 0 }];
        // Reiniciar arrays de tablas
        datosTablaPos = [{ t: 0, x: 0, y: 0, estado: 'Detenido' }];
        datosTablaVel = [{ t: 0, v: 0, a: 0, estado: 'Detenido' }];
        velocidadFinal = 0;
        tiempoFinal = 0;
    }
}

function actualizarResultados() {
    const Fp = masa * g * Math.sin(radians(angulo));
    const Fn = masa * g * Math.cos(radians(angulo));
    const Ff = mu * Fn;

    const posActual_m = (planoLongPx - s) / escala;
    const L = longitud;

    let v_calc = 0, t_calc = 0;
    if (a > 1e-6) {
        v_calc = Math.sqrt(2 * a * L);
        t_calc = v_calc / a;
    }

    const el = document.getElementById("lista-resultados");
    el.innerHTML = `
                <li>Ángulo: <b>${angulo.toFixed(1)}°</b></li>
                <li>Aceleración: <b>${a.toFixed(2)} m/s²</b></li>
                <li>Velocidad actual: <b>${vel.toFixed(2)} m/s</b></li>
                <li>Tiempo actual: <b>${t.toFixed(2)} s</b></li>
                <li>Posición recorrida: <b>${posActual_m.toFixed(2)} m</b></li>
                <li>Longitud del plano: <b>${L.toFixed(2)} m</b></li>
                <li style="margin-top: 10px; font-weight: 600; color: #1565c0;">Fuerzas:</li>
                <li>&nbsp;&nbsp;Fp: <b>${Fp.toFixed(2)} N</b></li>
                <li>&nbsp;&nbsp;Fn: <b>${Fn.toFixed(2)} N</b></li>
                <li>&nbsp;&nbsp;Ff: <b>${Ff.toFixed(2)} N</b></li>
            `;
}

function actualizarTablaDatos(forzarActualizacion = false) {
    // Siempre acumular datos durante la simulación
    if (corriendo && a > 1e-6 && s > 0) {
        const posActual_m = (planoLongPx - s) / escala;
        const posX = posActual_m * Math.cos(radians(angulo));
        const posY = posActual_m * Math.sin(radians(angulo));
        const estado = 'En movimiento';

        // Guardar datos cada cierto intervalo o si estamos cerca del final
        const intervaloGuardado = dt * 5;
        const esMomentoGuardar = (t % intervaloGuardado < dt) || (s - (a * dt * dt * escala) <= 0);

        if (esMomentoGuardar) {
            // Guardar datos de posición
            datosTablaPos.push({
                t: t.toFixed(2),
                x: posX.toFixed(2),
                y: posY.toFixed(2),
                estado: estado
            });

            // Guardar datos de velocidad
            datosTablaVel.push({
                t: t.toFixed(2),
                v: vel.toFixed(2),
                a: a.toFixed(2),
                estado: estado
            });

            // Limitar a 50 filas para no consumir mucha memoria
            if (datosTablaPos.length > 50) datosTablaPos.shift();
            if (datosTablaVel.length > 50) datosTablaVel.shift();
        }
    }

    // Actualizar tablas si están visibles o si se fuerza la actualización
    const esPosVisible = document.getElementById('data-table-pos').style.display === 'block';
    const esVelVisible = document.getElementById('data-table-vel').style.display === 'block';

    if (esPosVisible || forzarActualizacion) {
        const tbodyPos = document.getElementById('data-table-body-pos');
        tbodyPos.innerHTML = datosTablaPos.map(d =>
            `<tr><td>${d.t}</td><td>${d.x}</td><td>${d.y}</td><td>${d.estado}</td></tr>`
        ).join('');
    }

    if (esVelVisible || forzarActualizacion) {
        const tbodyVel = document.getElementById('data-table-body-vel');
        tbodyVel.innerHTML = datosTablaVel.map(d =>
            `<tr><td>${d.t}</td><td>${d.v}</td><td>${d.a}</td><td>${d.estado}</td></tr>`
        ).join('');
    }
}

function iniciar() {
    if (a < 1e-6) {
        alert("El bloque no se moverá.");
        return;
    }

    if (!corriendo && s <= 0) {
        reiniciar();
    }

    calcularAceleracion();
    corriendo = true;
    loop();
}

function pausar() {
    corriendo = false;
    noLoop();
    actualizarResultados();
    actualizarFormulasIntuitivas();
    actualizarTablaDatos(true); // Actualizar tablas al pausar
}

function reiniciar() {
    const s_inicial = planoLongPx;
    corriendo = false;

    if (s >= s_inicial || s <= 0) {
        s = s_inicial;
    }

    t = 0;
    vel = 0;
    trayectoria = [];
    trayectoriaGraph = [{ t: 0, s: 0 }];
    trayectoriaVel = [{ t: 0, v: 0 }];
    // Reiniciar arrays de tablas
    datosTablaPos = [{ t: 0, x: 0, y: 0, estado: 'Detenido' }];
    datosTablaVel = [{ t: 0, v: 0, a: 0, estado: 'Detenido' }];
    velocidadFinal = 0;
    tiempoFinal = 0;

    calcularAceleracion();
    noLoop();
    redraw();
    actualizarResultados();
    actualizarFormulasIntuitivas();
    actualizarTablaDatos(true); // Actualizar tablas al reiniciar
}

function toggleFuerzas() {
    mostrarFuerzas = !mostrarFuerzas;

    const btns = ['toggle-fuerzas', 'toggle-fuerzas-mobile'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.textContent = mostrarFuerzas ? 'Mostrar Fuerzas (ON)' : 'Mostrar Fuerzas (OFF)';
            btn.style.background = mostrarFuerzas ? '#4caf50' : '#ff9800';
        }
    });
    redraw();
}

function toggleFormulas() {
    mostrarFormulas = !mostrarFormulas;
    const panels = ['formulas-panel', 'formulas-panel-mobile'];

    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.toggle('hidden', !mostrarFormulas);
        }
    });

    const btns = ['toggle-formulas-desktop', 'toggle-formulas-mobile'];
    btns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.textContent = mostrarFormulas ? 'Ocultar Fórmulas' : 'Mostrar Fórmulas';
            btn.style.background = mostrarFormulas ? '#9c27b0' : '#8e24aa';
        }
    });
}

// ==========================================
// DIBUJO Y GRÁFICOS
// ==========================================
function draw() {
    background(255);
    calcularAceleracion();

    if (currentView === 'sim') {
        drawSim();
    } else if (currentView === 'graph-pos') {
        drawGraphPos();
    } else if (currentView === 'graph-vel') {
        drawGraphVel();
    }

    if (corriendo && a > 1e-6) {
        const v_prev = vel;
        vel += a * dt;
        const ds_m = (v_prev * dt + 0.5 * a * dt * dt);
        const ds_px = ds_m * escala;

        t += dt;
        s -= ds_px;

        const pos_recorrida_m = (planoLongPx - s) / escala;

        trayectoria.push({ x: s - blockSize / 2, y: -blockSize / 2 });
        if (trayectoria.length > 300) trayectoria.shift();

        if (t > 0 && t % (dt * 5) < dt) {
            if (s > 0) {
                trayectoriaGraph.push({ t: t, s: pos_recorrida_m });
                trayectoriaVel.push({ t: t, v: vel });
            }
        }

        if (s <= 0) {
            const d_total = longitud;
            tiempoFinal = Math.sqrt(2 * d_total / a);
            velocidadFinal = a * tiempoFinal;

            const finalPoint = { t: tiempoFinal, s: longitud };
            const finalVelPoint = { t: tiempoFinal, v: velocidadFinal };

            if (trayectoriaGraph.length > 0) {
                trayectoriaGraph[trayectoriaGraph.length - 1] = finalPoint;
            } else {
                trayectoriaGraph.push(finalPoint);
            }

            if (trayectoriaVel.length > 0) {
                trayectoriaVel[trayectoriaVel.length - 1] = finalVelPoint;
            } else {
                trayectoriaVel.push(finalVelPoint);
            }

            // Guardar punto final en tablas
            const posXFinal = longitud * Math.cos(radians(angulo));
            const posYFinal = longitud * Math.sin(radians(angulo));

            datosTablaPos.push({
                t: tiempoFinal.toFixed(2),
                x: posXFinal.toFixed(2),
                y: posYFinal.toFixed(2),
                estado: 'Finalizado'
            });

            datosTablaVel.push({
                t: tiempoFinal.toFixed(2),
                v: velocidadFinal.toFixed(2),
                a: a.toFixed(2),
                estado: 'Finalizado'
            });

            s = 0;
            corriendo = false;
            noLoop();
            t = tiempoFinal;
            vel = velocidadFinal;

            actualizarTablaDatos(true); // Actualizar tablas con el dato final
        }

        s = constrain(s, 0, planoLongPx);
    }

    actualizarResultados();
    actualizarFormulasIntuitivas();
    actualizarTablaDatos();
}

function drawSim() {
    background(240, 247, 255);

    push();
    noStroke();
    fill(255, 255, 255, 230);
    rect(12, 12, width - 24, height - 24, 12);

    const baseLength = planoLongPx;
    const baseStart = planeOriginX;
    const baseY = planeOriginY;
    const stepPx = escala;

    push();
    translate(baseStart, baseY);
    stroke(60);
    strokeWeight(1);
    line(0, 0, baseLength, 0);

    textSize(14);
    fill(60);
    textAlign(CENTER, TOP);

    for (let m = 0; m <= longitud; m++) {
        const x = m * stepPx;
        const label = `${m.toFixed(0)}m`;
        if (x <= baseLength) {
            strokeWeight(2);
            line(x, 0, x, 10);
            noStroke();
            text(label, x, 15);
        }
    }

    stroke(100);
    strokeWeight(1);
    for (let i = 0; i <= baseLength; i += stepPx / 10) {
        const isMajor = Math.abs(i % stepPx) < 1e-6;
        if (!isMajor) line(i, 0, i, 5);
    }
    pop();

    translate(planeOriginX, planeOriginY);
    rotate(-radians(angulo));

    const planoLongVisualPx = planoLongPx;
    noStroke();
    for (let i = 0; i < planoLongVisualPx; i += 6) {
        const shade = map(i, 0, planoLongVisualPx, 200, 240);
        fill(shade, 230, 230, 255);
        rect(i, 0, 6, 10);
    }

    stroke(0);
    strokeWeight(2);
    line(0, 0, planoLongVisualPx, 0);

    stroke(0);
    strokeWeight(1);
    textSize(14);

    for (let m = 0; m <= longitud; m++) {
        const x = m * stepPx;
        if (x <= planoLongVisualPx + 1) {
            line(x, 0, x, -14);
            noStroke();
            fill(0);
            textAlign(CENTER, BASELINE);
            text(`${(longitud - m).toFixed(0)} m`, x, -20);
            stroke(0);
        }
    }

    for (let i = 0; i <= planoLongVisualPx; i += stepPx / 10) {
        const isMajor = Math.abs(i % stepPx) < 1e-6;
        if (!isMajor) line(i, 0, i, -8);
    }

    push();
    noFill();
    stroke(10, 80, 200, 160);
    strokeWeight(2);
    if (trayectoria.length > 0) {
        beginShape();
        for (let p of trayectoria) vertex(p.x, p.y);
        endShape();
    }
    pop();

    const blockX = s - blockSize;
    const blockY = -blockSize;

    push();
    translate(blockX + blockSize * 0.12, blockY + blockSize * 0.5);
    rotate(0.06);
    noStroke();
    fill(0, 0, 0, 40);
    rect(0, blockSize * 0.55, blockSize * 0.9, blockSize * 0.28, 6);
    pop();

    stroke(18, 18, 18, 160);
    strokeWeight(1.2);
    fill(corriendo ? color(255, 90, 90) : color(255, 140, 140));
    rect(blockX, blockY, blockSize, blockSize, 6);

    noStroke();
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(`${masa} kg`, blockX + blockSize / 2, blockY + blockSize / 2);

    if (mostrarFuerzas) {
        drawFuerzasConstantes(blockX, blockY, blockSize);
    }
    pop();

    // HUD INVISIBLE (color transparente)
    fill(0, 0, 0, 0); // Transparente
    textSize(16);
    textAlign(LEFT, TOP);
    text(`Ángulo: ${angulo}°`, 18, 28);
    text(`Aceleración: ${a.toFixed(2)} m/s²`, 18, 52);
    text(`Velocidad: ${vel.toFixed(2)} m/s`, 18, 76);
    text(`Tiempo: ${t.toFixed(2)} s`, 18, 100);

    pop();
}

function drawFuerzasConstantes(blockX, blockY, blockSize) {
    // FUERZAS ESTÁTICAS - Tamaño fijo y grande para mejor visibilidad
    const centerX_rotated = blockX + blockSize / 2;
    const centerY_rotated = blockY + blockSize / 2;

    // Tamaños fijos y más grandes para que se distingan bien
    const lenG = blockSize * 2.5;  // Fuerza gravitatoria (más grande)
    const lenP = blockSize * 1.8;  // Fuerza paralela
    const lenN = blockSize * 1.5;  // Fuerza normal
    const lenF = blockSize * 1.2;  // Fuerza de fricción
    const lenNet = blockSize * 1.0; // Fuerza neta

    push();
    // Fuerza Normal (perpendicular al plano)
    drawArrow(centerX_rotated, centerY_rotated, 0, -lenN, color(52, 152, 219), 'Fₙ', 12);

    // Fuerza de Fricción (opuesta al movimiento)
    drawArrow(centerX_rotated, centerY_rotated, lenF, 0, color(230, 126, 34), 'Ff', 12);

    // Fuerza Paralela (hacia abajo del plano)
    drawArrow(centerX_rotated, centerY_rotated, -lenP, 0, color(155, 89, 182), 'Fₚ', 12);

    // Fuerza Neta (solo si hay movimiento)
    if (a > 1e-6) {
        drawArrow(centerX_rotated, centerY_rotated - lenN * 0.5, -lenNet, 0, color(46, 204, 113), 'Fnet', 12);
    }

    // Fuerza Gravitatoria (vertical hacia abajo) - transformar coordenadas
    const cosA = cos(radians(angulo));
    const sinA = sin(radians(angulo));
    const Fg_RefX_rotated = blockX + blockSize / 2;
    const Fg_RefY_rotated = blockY + blockSize / 2;
    const Fg_GlobalX = planeOriginX + Fg_RefX_rotated * cosA + Fg_RefY_rotated * sinA;
    const Fg_GlobalY = planeOriginY + Fg_RefY_rotated * cosA - Fg_RefX_rotated * sinA;

    push();
    rotate(radians(angulo));
    translate(-planeOriginX, -planeOriginY);
    translate(Fg_GlobalX, Fg_GlobalY);
    const Y_OFFSET_CANVAS = -blockSize * 0.5;
    drawArrow(0, Y_OFFSET_CANVAS, 0, lenG, color(231, 76, 60), 'Fᵍ', 12);
    pop();
    pop();
}

function drawArrow(baseX, baseY, targetX, targetY, c, label, labelOffset = 10) {
    const endX = baseX + targetX;
    const endY = baseY + targetY;

    push();
    stroke(c);
    fill(c);
    strokeWeight(4); // Grosor aumentado para mejor visibilidad
    line(baseX, baseY, endX, endY);

    push();
    translate(endX, endY);
    rotate(atan2(targetY, targetX));
    triangle(0, -5, 0, 5, 10, 0); // Punta de flecha más grande
    pop();

    noStroke();
    fill(c);
    textSize(16); // Texto aumentado
    textAlign(CENTER, CENTER);

    let angle = atan2(targetY, targetX);
    let labelX = baseX + targetX / 2 + cos(angle + HALF_PI) * labelOffset;
    let labelY = baseY + targetY / 2 + sin(angle + HALF_PI) * labelOffset;

    text(label, labelX, labelY);
    pop();
}

function drawGraphPos() {
    background(255);
    const margin = 50;
    const graphWidth = width - 2 * margin;
    const graphHeight = height - 2 * margin;

    const maxS = longitud;
    let maxT = tiempoFinal > 0 ? tiempoFinal * 1.1 : (trayectoriaGraph.length > 0 ? Math.max(...trayectoriaGraph.map(p => p.t)) * 1.5 : 5);
    maxT = Math.max(maxT, 2);
    maxT = Math.min(maxT, 50);

    push();
    translate(margin, height - margin);

    textSize(18);
    fill(51);
    textAlign(CENTER, TOP);
    text('Gráfico de Posición Recorrida vs. Tiempo', graphWidth / 2, -graphHeight - 30);

    textAlign(CENTER, TOP);
    text('s (m)', -25, -graphHeight / 2);

    textAlign(CENTER, BOTTOM);
    text('t (s)', graphWidth / 2, 30);

    stroke(0);
    strokeWeight(2);
    line(0, 0, graphWidth, 0);
    line(0, 0, 0, -graphHeight);

    strokeWeight(1);
    textSize(12);
    for (let i = 0; i <= maxS; i++) {
        const y = map(i, 0, maxS, 0, -graphHeight);
        line(-5, y, 5, y);
        textAlign(RIGHT, CENTER);
        text(i.toFixed(0), -10, y);
    }

    const tStep = maxT > 10 ? 2 : (maxT > 5 ? 1 : 0.5);
    for (let i = 0; i <= maxT; i += tStep) {
        const x = map(i, 0, maxT, 0, graphWidth);
        if (x <= graphWidth) {
            line(x, -5, x, 5);
            textAlign(CENTER, TOP);
            text(i.toFixed(1), x, 10);
        }
    }

    noFill();
    stroke(46, 204, 113);
    strokeWeight(3);

    if (trayectoriaGraph.length > 0) {
        beginShape();
        for (let point of trayectoriaGraph) {
            const x = map(point.t, 0, maxT, 0, graphWidth);
            const y = map(point.s, 0, maxS, 0, -graphHeight);
            vertex(x, y);
        }
        endShape();

        const lastPoint = trayectoriaGraph[trayectoriaGraph.length - 1];
        const x_current = map(lastPoint.t, 0, maxT, 0, graphWidth);
        const y_current = map(lastPoint.s, 0, maxS, 0, -graphHeight);

        fill(231, 76, 60);
        noStroke();
        ellipse(x_current, y_current, 8, 8);

        fill(0);
        textAlign(LEFT, BOTTOM);
        text(`(${lastPoint.t.toFixed(2)}s, ${lastPoint.s.toFixed(2)}m)`, x_current + 10, y_current);
    }

    pop();
}

function drawGraphVel() {
    background(255);
    const margin = 50;
    const graphWidth = width - 2 * margin;
    const graphHeight = height - 2 * margin;

    let maxV = velocidadFinal > 0 ? velocidadFinal * 1.2 : (trayectoriaVel.length > 0 ? Math.max(...trayectoriaVel.map(p => p.v)) * 1.5 : 5);
    maxV = Math.max(maxV, 2);
    maxV = Math.min(maxV, 50);

    let maxT = tiempoFinal > 0 ? tiempoFinal * 1.1 : (trayectoriaVel.length > 0 ? Math.max(...trayectoriaVel.map(p => p.t)) * 1.5 : 5);
    maxT = Math.max(maxT, 2);
    maxT = Math.min(maxT, 50);

    push();
    translate(margin, height - margin);

    textSize(18);
    fill(51);
    textAlign(CENTER, TOP);
    text('Gráfico de Velocidad vs. Tiempo', graphWidth / 2, -graphHeight - 30);

    textAlign(CENTER, TOP);
    text('v (m/s)', -25, -graphHeight / 2);

    textAlign(CENTER, BOTTOM);
    text('t (s)', graphWidth / 2, 30);

    stroke(0);
    strokeWeight(2);
    line(0, 0, graphWidth, 0);
    line(0, 0, 0, -graphHeight);

    strokeWeight(1);
    textSize(12);
    const vStep = maxV > 10 ? 2 : (maxV > 5 ? 1 : 0.5);
    for (let i = 0; i <= maxV; i += vStep) {
        const y = map(i, 0, maxV, 0, -graphHeight);
        line(-5, y, 5, y);
        textAlign(RIGHT, CENTER);
        text(i.toFixed(1), -10, y);
    }

    const tStep = maxT > 10 ? 2 : (maxT > 5 ? 1 : 0.5);
    for (let i = 0; i <= maxT; i += tStep) {
        const x = map(i, 0, maxT, 0, graphWidth);
        if (x <= graphWidth) {
            line(x, -5, x, 5);
            textAlign(CENTER, TOP);
            text(i.toFixed(1), x, 10);
        }
    }

    noFill();
    stroke(52, 152, 219);
    strokeWeight(3);

    if (trayectoriaVel.length > 0) {
        beginShape();
        for (let point of trayectoriaVel) {
            const x = map(point.t, 0, maxT, 0, graphWidth);
            const y = map(point.v, 0, maxV, 0, -graphHeight);
            vertex(x, y);
        }
        endShape();

        const lastPoint = trayectoriaVel[trayectoriaVel.length - 1];
        const x_current = map(lastPoint.t, 0, maxT, 0, graphWidth);
        const y_current = map(lastPoint.v, 0, maxV, 0, -graphHeight);

        fill(231, 76, 60);
        noStroke();
        ellipse(x_current, y_current, 8, 8);

        fill(0);
        textAlign(LEFT, BOTTOM);
        text(`(${lastPoint.t.toFixed(2)}s, ${lastPoint.v.toFixed(2)}m/s)`, x_current + 10, y_current);
    }

    pop();
}

function radians(deg) {
    return deg * Math.PI / 180;
}

// ==========================================
// ACTUALIZACIÓN DE FÓRMULAS
// ==========================================
function actualizarFormulasIntuitivas() {
    const ang = parseFloat(document.getElementById("angulo").value);
    const m = parseFloat(document.getElementById("masa").value);
    const g_val = parseFloat(document.getElementById("gravedad").value);
    const mu_val = parseFloat(document.getElementById("friccion").value);
    const L = parseFloat(document.getElementById("longitud").value);

    const thetaRad = radians(ang);
    const sin_theta = Math.sin(thetaRad);
    const cos_theta = Math.cos(thetaRad);

    const Fp = m * g_val * sin_theta;
    const Fn = m * g_val * cos_theta;
    const Ff = mu_val * Fn;

    let acc = g_val * sin_theta - mu_val * g_val * cos_theta;
    if (acc < 0) acc = 0;

    let v_final = 0, t_final = 0;
    if (acc > 1e-6) {
        v_final = Math.sqrt(2 * acc * L);
        t_final = v_final / acc;
    }

    const contenedor = document.getElementById("contenedor-formulas");
    const contenedorMobile = document.getElementById("contenedor-formulas-mobile");
    let formula_aceleracion, calc_a;

    if (mu_val === 0) {
        formula_aceleracion = `a = g ⋅ sin(θ)`;
        calc_a = `${g_val.toFixed(2)} ⋅ sin(${ang.toFixed(1)}°)`;
    } else {
        formula_aceleracion = `a = g ⋅ (sin(θ) − μ ⋅ cos(θ))`;
        calc_a = `${g_val.toFixed(2)} ⋅ (sin(${ang.toFixed(1)}°) − ${mu_val.toFixed(2)} ⋅ cos(${ang.toFixed(1)}°))`;
    }

    const formulasHTML = `
                <p><b>Aceleración:</b> ${formula_aceleracion}
                    <span class="formula-exp">${calc_a}</span>
                    <span class="formula-res">${acc.toFixed(2)} m/s²</span>
                </p>
                <p><b>Velocidad final (Total):</b> v = √(2 ⋅ a ⋅ L)
                    <span class="formula-exp">√(${2 * acc.toFixed(2)} ⋅ ${L.toFixed(2)})</span>
                    <span class="formula-res">${v_final.toFixed(2)} m/s</span>
                </p>
                <p><b>Tiempo total:</b> t = v / a
                    <span class="formula-exp">${v_final.toFixed(2)} / ${acc.toFixed(2)}</span>
                    <span class="formula-res">${t_final.toFixed(2)} s</span>
                </p>
                <p><b>Fuerzas (magnitudes):</b></p>
                <p class="force-line">Fuerza Paralela (Fp): Fp = m ⋅ g ⋅ sin(θ) <span class="formula-res">${Fp.toFixed(2)} N</span></p>
                <p class="force-line">Fuerza Normal (Fn): Fn = m ⋅ g ⋅ cos(θ) <span class="formula-res">${Fn.toFixed(2)} N</span></p>
                <p class="force-line">Fuerza Fricción (Ff): Ff = μ ⋅ Fn <span class="formula-res">${Ff.toFixed(2)} N</span></p>
            `;

    if (contenedor) contenedor.innerHTML = formulasHTML;
    if (contenedorMobile) contenedorMobile.innerHTML = formulasHTML;
}

// Inicialización
calcularAceleracion();
actualizarResultados();
actualizarFormulasIntuitivas();
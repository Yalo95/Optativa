const URL = "./my_model/";

let model, webcam, maxPredictions;
let webcamActiva = false;
let animacionId = null;
let ultimoRegistroValido = ""; // Para evitar duplicados excesivos en la tabla

// Referencias del DOM
const preview = document.getElementById("preview");
const labelContainer = document.getElementById("label-container");
const statusEl = document.getElementById("status");
const uploadInput = document.getElementById("imageUpload");
const uploadLabel = document.getElementById("upload-label");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const thresholdInput = document.getElementById("threshold");
const thresholdVal = document.getElementById("threshold-val");
const mensajeSalida = document.getElementById("mensaje-salida");
const historialBody = document.getElementById("historial-body");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// Control del deslizador del umbral
thresholdInput.addEventListener("input", (e) => {
  thresholdVal.textContent = e.target.value + "%";
});

// Cargar el modelo al abrir
async function cargarModelo() {
  try {
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    maxPredictions = model.getTotalClasses();

    // Crear la estructura de barras de predicción
    labelContainer.innerHTML = "";
    const nombres = model.getClassLabels();
    for (let i = 0; i < maxPredictions; i++) {
      const div = document.createElement("div");
      div.className = "clase";
      div.innerHTML = `
        <div class="clase-nombre"><span>${nombres[i]}</span><span class="valor">0%</span></div>
        <div class="barra"><div class="relleno"></div></div>`;
      labelContainer.appendChild(div);
    }

    statusEl.textContent = "Modelo cargado con éxito.";
    statusEl.style.backgroundColor = "#dcfce7";
    statusEl.style.color = "#15803d";

    // Habilitar controles
    uploadInput.disabled = false;
    uploadLabel.classList.remove("disabled");
    startBtn.disabled = false;
  } catch (e) {
    statusEl.textContent = "Error al cargar el modelo. Revisa el servidor local y la ruta.";
    statusEl.style.backgroundColor = "#fee2e2";
    statusEl.style.color = "#991b1b";
    console.error(e);
  }
}

// Clasificar imagen / frame
async function predict(elemento, origen = "Webcam") {
  const prediction = await model.predict(elemento);
  const umbralActual = parseFloat(thresholdInput.value);
  
  let claseSuperaUmbral = null;
  let maxProbSuperada = 0;

  for (let i = 0; i < maxPredictions; i++) {
    const prob = prediction[i].probability * 100;
    const fila = labelContainer.childNodes[i];
    
    fila.querySelector(".valor").textContent = prob.toFixed(1) + "%";
    fila.querySelector(".relleno").style.width = prob + "%";

    // Comprobar si supera el umbral configurado
    if (prob >= umbralActual && prob > maxProbSuperada) {
      maxProbSuperada = prob;
      claseSuperaUmbral = prediction[i].className;
    }
  }

  // Actualizar mensaje de salida e historial según el umbral
  if (claseSuperaUmbral) {
    mensajeSalida.className = "mensaje-salida success";
    mensajeSalida.textContent = `Coincidencia detectada: ${claseSuperaUmbral} (${maxProbSuperada.toFixed(1)}%)`;

    // Registrar en el historial si es una nueva detección relevante
    if (ultimoRegistroValido !== claseSuperaUmbral || origen === "Imagen subida") {
      agregarAlHistorial(claseSuperaUmbral, maxProbSuperada.toFixed(1) + "%", origen);
      ultimoRegistroValido = claseSuperaUmbral;
    }
  } else {
    mensajeSalida.className = "mensaje-salida warning";
    mensajeSalida.textContent = `Ninguna clase supera el umbral configurado (${umbralActual}%).`;
  }
}

// ---- Funcionalidad de Subir Imagen ----
uploadInput.addEventListener("change", (event) => {
  const archivo = event.target.files[0];
  if (!archivo) return;

  if (webcamActiva) detenerWebcam();

  const img = new Image();
  img.onload = async () => {
    preview.innerHTML = "";
    preview.appendChild(img);
    await predict(img, "Imagen subida");
  };
  img.src = window.URL.createObjectURL(archivo);
  uploadInput.value = ""; 
});

// ---- Controles de Webcam ----
startBtn.addEventListener("click", async () => {
  if (!webcamActiva) await iniciarWebcam();
});

stopBtn.addEventListener("click", () => {
  if (webcamActiva) detenerWebcam();
});

async function iniciarWebcam() {
  try {
    const flip = true;
    webcam = new tmImage.Webcam(300, 300, flip);
    await webcam.setup();
    await webcam.play();

    preview.innerHTML = "";
    preview.appendChild(webcam.canvas);

    webcamActiva = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    loop();
  } catch (e) {
    statusEl.textContent = "Error al acceder a la webcam.";
    console.error(e);
  }
}

async function loop() {
  if (!webcamActiva) return;
  webcam.update();
  await predict(webcam.canvas, "Webcam");
  animacionId = window.requestAnimationFrame(loop);
}

function detenerWebcam() {
  webcamActiva = false;
  if (animacionId) cancelAnimationFrame(animacionId);
  if (webcam) webcam.stop();
  
  preview.innerHTML = '<span class="placeholder-text">Sin imagen cargada</span>';
  mensajeSalida.className = "mensaje-salida hide";
  startBtn.disabled = false;
  stopBtn.disabled = true;
  ultimoRegistroValido = "";
}

// ---- Historial ----
function agregarAlHistorial(clase, porcentaje, origen) {
  const emptyRow = document.getElementById("empty-history-row");
  if (emptyRow) emptyRow.remove();

  const horaActual = new Date().toLocaleTimeString();
  const tr = document.createElement("tr");
  
  tr.innerHTML = `
    <td>${horaActual}</td>
    <td><strong>${clase}</strong></td>
    <td>${porcentaje}</td>
    <td><span class="text-muted">${origen}</span></td>
  `;

  historialBody.insertBefore(tr, historialBody.firstChild);
}

clearHistoryBtn.addEventListener("click", () => {
  historialBody.innerHTML = `
    <tr id="empty-history-row">
      <td colspan="4" class="text-center text-muted">No hay detecciones registradas superiores al umbral.</td>
    </tr>`;
  ultimoRegistroValido = "";
});

// Inicialización
cargarModelo();
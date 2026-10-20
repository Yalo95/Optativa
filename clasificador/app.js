// Carpeta del modelo exportado desde Teachable Machine
const URL = "./my_model/";

let model, webcam, maxPredictions;
let webcamActiva = false;
let animacionId = null;

const preview = document.getElementById("preview");
const labelContainer = document.getElementById("label-container");
const statusEl = document.getElementById("status");
const uploadInput = document.getElementById("imageUpload");
const uploadBtn = document.getElementById("upload-btn");
const webcamBtn = document.getElementById("webcam-btn");

// Cargar el modelo al abrir la página
async function cargarModelo() {
  try {
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    maxPredictions = model.getTotalClasses();

    // Crear barras para cada clase
    const nombres = model.getClassLabels();
    for (let i = 0; i < maxPredictions; i++) {
      const div = document.createElement("div");
      div.className = "clase";
      div.innerHTML = `
        <div class="clase-nombre"><span>${nombres[i]}</span><span class="valor">0%</span></div>
        <div class="barra"><div class="relleno"></div></div>`;
      labelContainer.appendChild(div);
    }

    statusEl.textContent = "Modelo cargado. Sube una imagen o activa la webcam.";
    uploadInput.disabled = false;
    uploadBtn.classList.remove("deshabilitado");
    webcamBtn.disabled = false;
  } catch (e) {
    statusEl.textContent = "Error al cargar el modelo. Revisa la ruta y usa un servidor local.";
    console.error(e);
  }
}

// Mostrar predicciones
async function predict(elemento) {
  const prediction = await model.predict(elemento);
  for (let i = 0; i < maxPredictions; i++) {
    const prob = prediction[i].probability;
    const fila = labelContainer.childNodes[i];
    fila.querySelector(".valor").textContent = (prob * 100).toFixed(1) + "%";
    fila.querySelector(".relleno").style.width = (prob * 100) + "%";
  }
}

// ---- Subir imagen ----
uploadInput.addEventListener("change", (event) => {
  const archivo = event.target.files[0];
  if (!archivo) return;

  if (webcamActiva) detenerWebcam();

  const img = new Image();
  img.onload = async () => {
    preview.innerHTML = "";
    preview.appendChild(img);
    await predict(img);
  };
  img.src = window.URL.createObjectURL(archivo);
  uploadInput.value = ""; // permite volver a subir la misma imagen
});

// ---- Webcam ----
webcamBtn.addEventListener("click", async () => {
  if (webcamActiva) {
    detenerWebcam();
  } else {
    await iniciarWebcam();
  }
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
    webcamBtn.textContent = "⏹ Detener webcam";
    webcamBtn.classList.add("activa");
    loop();
  } catch (e) {
    statusEl.textContent = "No se pudo acceder a la webcam.";
    console.error(e);
  }
}

async function loop() {
  if (!webcamActiva) return;
  webcam.update();
  await predict(webcam.canvas);
  animacionId = window.requestAnimationFrame(loop);
}

function detenerWebcam() {
  webcamActiva = false;
  if (animacionId) cancelAnimationFrame(animacionId);
  if (webcam) webcam.stop();
  preview.innerHTML = '<span style="color:#999">Sin imagen</span>';
  webcamBtn.textContent = "📷 Usar webcam";
  webcamBtn.classList.remove("activa");
}

cargarModelo();
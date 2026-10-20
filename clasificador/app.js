const URL = "./model/";
let model, maxPredictions;
let webcam; 
let labelContainer;

// Referencias a los elementos del DOM (tanto para la webcam como para las imágenes)
const selectorImagen = document.getElementById('selector-imagen');
const vistaPrevia = document.getElementById('vista-previa');
const resultadoDiv = document.getElementById('resultado-div');

// 1. Cargar el modelo e iniciar la webcam (o puedes separar la inicialización)
async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        console.log("Modelo cargado correctamente");
    } catch(error) {
        console.error("Error al cargar el modelo:", error);
        alert("Error al cargar el modelo. Verifica que la carpeta './model/' contenga los archivos necesarios.");
        return; // Detenemos la ejecución si el modelo falla
    }

    // Configurar y arrancar la webcam
    try {
        const flip = true; 
        webcam = new tmImage.Webcam(200, 200, flip); 
        await webcam.setup(); 
        await webcam.play();
        window.requestAnimationFrame(loop);

        // Añadir el canvas de la webcam al HTML
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        
        // Crear los contenedores de etiquetas para la webcam
        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
    } catch(error) {
        console.error("No se pudo iniciar la webcam:", error);
        alert("Asegúrate de dar permisos a la cámara.");
    }
}

// Bucle de actualización de la webcam
async function loop() {
    webcam.update(); 
    await predictWebcam();
    window.requestAnimationFrame(loop);
}

// Predicción continua para la webcam
async function predictWebcam() {
    const prediction = await model.predict(webcam.canvas);
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + (prediction[i].probability * 100).toFixed(2) + "%";
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }
}


// --- 2. LÓGICA PARA SUBIR IMAGEN DESDE UN ARCHIVO ---
selectorImagen.addEventListener('change', function(evento) {
    const archivos = evento.target.files;
    if (archivos.length === 0) return;

    const archivo = archivos[0];
    const lector = new FileReader();
    
    lector.onload = function(e) {
        vistaPrevia.style.display = 'block';
        vistaPrevia.src = e.target.result;
    }
    lector.readAsDataURL(archivo);
});

// Cuando la imagen cargada se dibuje en pantalla, ejecutamos la predicción estática
vistaPrevia.onload = async function() {
    if (!model) {
        resultadoDiv.innerHTML = "El modelo aún se está cargando...";
        return;
    }

    const prediction = await model.predict(vistaPrevia);
    let mejorPrediccion = { className: "", probability: 0 };
    
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > mejorPrediccion.probability) {
            mejorPrediccion = prediction[i];
        }
    }

    const porcentaje = (mejorPrediccion.probability * 100).toFixed(2);
    resultadoDiv.innerHTML = `<br><strong>Predicción de la imagen:</strong> ${mejorPrediccion.className} (${porcentaje}%)`;
};
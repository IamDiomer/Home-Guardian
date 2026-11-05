
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import base64
import binascii
import numpy as np
import os
from datetime import datetime

app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:4200",
            "http://127.0.0.1:4200"
        ]
    }
})

# Cargar el modelo YOLOv8
modelo = YOLO("best.pt")

# Carpeta donde se guardan las imágenes
carpeta_resultados = os.path.join(
    app.static_folder,
    "resultados"
)

os.makedirs(carpeta_resultados, exist_ok=True)


@app.route("/", methods=["GET"])
def inicio():
    return jsonify({
        "estado": "activo",
        "mensaje": "API de detección YOLOv8",
        "endpoints": [
            "/api/estado",
            "/detectar",
            "/detectar_camara",
            "/guardar_deteccion"
        ]
    })


@app.route("/api/estado", methods=["GET"])
def estado():
    return jsonify({
        "estado": "correcto",
        "mensaje": "La API funciona correctamente"
    })


def detectar_objetos(imagen, guardar=False):
    resultados = modelo.predict(
        source=imagen,
        conf=0.5,
        verbose=False
    )

    resultado = resultados[0]
    objetos = []

    for caja in resultado.boxes:
        clase = int(caja.cls[0])
        confianza = float(caja.conf[0])

        objetos.append({
            "nombre": modelo.names[clase],
            "confianza": round(confianza * 100, 2)
        })

    # Imagen con las cajas y nombres de los objetos
    imagen_resultado = resultado.plot()

    nombre_archivo = None

    # Guardar automáticamente solo si se solicita
    if guardar:
        nombre_archivo = datetime.now().strftime(
            "deteccion_%Y%m%d_%H%M%S_%f.jpg"
        )

        ruta_imagen = os.path.join(
            carpeta_resultados,
            nombre_archivo
        )

        if not cv2.imwrite(ruta_imagen, imagen_resultado):
            raise RuntimeError("No se pudo guardar la imagen")

    correcto, buffer = cv2.imencode(
        ".jpg",
        imagen_resultado
    )

    if not correcto:
        raise RuntimeError("No se pudo procesar la imagen")

    imagen_base64 = base64.b64encode(
        buffer.tobytes()
    ).decode("utf-8")

    return {
        "imagen": imagen_base64,
        "objetos": objetos,
        "total": len(objetos),
        "archivo": nombre_archivo
    }


# Detectar objetos en una imagen subida
@app.route("/detectar", methods=["POST"])
def detectar():
    if "imagen" not in request.files:
        return jsonify({
            "error": "No se recibió ninguna imagen"
        }), 400

    archivo = request.files["imagen"]

    datos = np.frombuffer(
        archivo.read(),
        np.uint8
    )

    imagen = cv2.imdecode(
        datos,
        cv2.IMREAD_COLOR
    )

    if imagen is None:
        return jsonify({
            "error": "La imagen no es válida"
        }), 400

    try:
        resultado = detectar_objetos(imagen, guardar=True)
        return jsonify(resultado)

    except Exception:
        app.logger.exception("Error al detectar la imagen")
        return jsonify({
            "error": "No se pudo procesar la imagen"
        }), 500


# Detectar objetos en los fotogramas de la cámara
# Esta ruta NO guarda imágenes en la carpeta
@app.route("/detectar_camara", methods=["POST"])
def detectar_camara():
    if "imagen" not in request.files:
        return jsonify({
            "error": "No se recibió el fotograma de la cámara"
        }), 400

    archivo = request.files["imagen"]

    datos = np.frombuffer(
        archivo.read(),
        np.uint8
    )

    imagen = cv2.imdecode(
        datos,
        cv2.IMREAD_COLOR
    )

    if imagen is None:
        return jsonify({
            "error": "El fotograma no es válido"
        }), 400

    try:
        resultado = detectar_objetos(imagen, guardar=False)
        return jsonify(resultado)

    except Exception:
        app.logger.exception("Error al procesar el fotograma")
        return jsonify({
            "error": "No se pudo procesar el fotograma"
        }), 500


# Guardar manualmente una detección de la cámara
@app.route("/guardar_deteccion", methods=["POST"])
def guardar_deteccion():
    datos_json = request.get_json(silent=True) or {}
    imagen_base64 = datos_json.get("imagen", "")

    if not isinstance(imagen_base64, str) or not imagen_base64:
        return jsonify({
            "error": "No se recibió la imagen para guardar"
        }), 400

    try:
        # Aceptar tanto Base64 puro como una data URL
        if "," in imagen_base64:
            imagen_base64 = imagen_base64.split(",", 1)[1]

        contenido = base64.b64decode(
            imagen_base64,
            validate=True
        )

        matriz = np.frombuffer(
            contenido,
            dtype=np.uint8
        )

        imagen = cv2.imdecode(
            matriz,
            cv2.IMREAD_COLOR
        )

        if imagen is None:
            return jsonify({
                "error": "La imagen enviada no es válida"
            }), 400

        nombre_archivo = datetime.now().strftime(
            "deteccion_%Y%m%d_%H%M%S_%f.jpg"
        )

        ruta_imagen = os.path.join(
            carpeta_resultados,
            nombre_archivo
        )

        if not cv2.imwrite(ruta_imagen, imagen):
            raise RuntimeError("No se pudo escribir el archivo")

        return jsonify({
            "mensaje": "Detección guardada correctamente",
            "archivo": nombre_archivo,
            "url": f"/static/resultados/{nombre_archivo}"
        }), 201

    except (ValueError, binascii.Error):
        return jsonify({
            "error": "La imagen Base64 no es válida"
        }), 400

    except Exception:
        app.logger.exception("Error al guardar la detección")
        return jsonify({
            "error": "No se pudo guardar la detección"
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )

# Home Guardian

Copia independiente del proyecto original, con Angular 20 y una interfaz orientada a detectar humo y fuego en interiores. El backend Flask, sus modelos y su lógica de inferencia se conservan sin cambios.

## Iniciar

Desde esta carpeta, abre dos terminales de PowerShell.

Backend:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Frontend (Node.js compatible con Angular 20, por ejemplo Node 22.12 o posterior de la rama 22):
```powershell
cd frontend
npm ci
npm start
```

Abre http://localhost:4200. La API utiliza http://127.0.0.1:5000. Ejecuta el backend desde su carpeta para que encuentre best.pt.

## Funciones conservadas

- Cámara local con selección de dispositivo y análisis de fotogramas.
- Carga de imágenes y visualización de resultados anotados.
- Guardado automático de imágenes analizadas y manual de fotogramas en backend/static/resultados.
- Historial de cámara en el navegador; vaciarlo no elimina los archivos del servidor.
- Etiquetas y porcentajes originales del modelo, con umbral de inferencia de 0.5.

La cabecera comprueba la conexión real con la API cada 15 segundos. La sala de la portada es una ilustración, no una transmisión ni un resultado real.

Las capacidades de detección dependen de las clases y entrenamiento del modelo best2.pt original; el rediseño no modifica ni vuelve a entrenar los pesos. Un resultado vacío no garantiza ausencia de peligro. Esta herramienta de apoyo visual no sustituye detectores de humo certificados.

La copia incluye los archivos y modelos originales; omite node_modules, dist y la caché .angular, regenerables con npm ci y npm run build.

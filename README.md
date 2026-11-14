# Tres en raya 3D

Juego de tres en raya en un tablero de 3 × 3 × 3. La interfaz está hecha con HTML, CSS y JavaScript, y Three.js renderiza el tablero y sus fichas en 3D. También incluye una vista 2D por capas y modos de jugador contra IA o jugador contra jugador.

## Requisitos

- Python 3.9 o posterior para el backend y servidor web.
- Node.js 20 o posterior para ejecutar las pruebas automatizadas.
- Conexión a Internet para cargar las bibliotecas, MediaPipe y los estilos externos de CDN usados por la página.

El backend usa únicamente la biblioteca estándar de Python y SQLite. No hay que instalar paquetes.

## Controles y preferencias

- En ordenador usa las flechas para seleccionar una casilla, `Q` / `E` para cambiar de capa y `Enter` para colocar una ficha. En móviles juega directamente con la pantalla táctil: toca una casilla para colocar y arrastra el tablero para rotarlo. Usa las pestañas de la vista 2D para elegir una capa.
- En la pantalla inicial elige **Sin gestos** para jugar normalmente o **Usar gestos** para activar la cámara. Un dedo selecciona una casilla y la pinza entre pulgar e índice juega; la mano abierta rota el cubo; el puño repliega las capas y abrirlo lentamente las expande. La vista de cámara se puede contraer para no tapar el tablero y muestra los puntos detectados y las coordenadas del índice. Puedes quitar el control por cámara con el botón de video. Los gestos se procesan en el navegador; el video no se envía al backend.
- El marcador de victorias y empates se guarda en la base de datos SQLite `scores.sqlite3`, mediante el backend Python. El tema, modo, dificultad, formas, expansión de capas, sonidos y música se guardan en el almacenamiento local del navegador.
- Al cambiar el modo o la dificultad en medio de una partida, el juego pide confirmación antes de reiniciarla. Los efectos de sonido y la música ambiental original, sintetizada en el navegador, vienen activados por defecto y se pueden apagar en Opciones. La música empieza después de la primera interacción porque los navegadores bloquean la reproducción automática.
- Hay cinco dificultades: Principiante (aleatoria), Fácil (1 nivel de búsqueda), Medio (2), Difícil (3) y Experto (búsqueda iterativa hasta 5 niveles con un límite de 35 000 nodos). La búsqueda acotada mantiene la respuesta ágil en móviles.
- El modo Difícil y Experto muestran un distintivo que identifica el nivel y el estilo musical activo, con color e icono propios. Cada estilo tiene además un arreglo avanzado exclusivo para esas dificultades: capas brillantes en Espacial, percusión reforzada en Pulso y arpegios ascendentes en Calma. En Opciones se puede elegir entre los tres estilos musicales originales; la selección se guarda en el navegador.
- Al ganar cualquiera de los jugadores o terminar en empate, el indicador de turno se muestra temporalmente en el centro y luego se anima hasta su posición pequeña habitual en la cabecera.
- El juego respeta la preferencia del sistema para reducir movimiento en animaciones.

## Ejecutar el juego web

Desde la carpeta del proyecto, inicia el backend y el servidor web:

```powershell
python server.py
```

Abre [http://localhost:8000](http://localhost:8000) en el navegador. Para detener el servidor, pulsa `Ctrl+C` en la terminal. La cámara funciona en `localhost` y requiere permiso explícito del navegador.

No abras `index.html` directamente como archivo: la página necesita el backend para guardar y cargar puntuaciones.

## Desplegar en Render

El archivo `render.yaml` configura un servicio web Python gratuito. En Render, crea un **Blueprint** y selecciona este repositorio de GitHub. Render instalará el servicio con `python server.py` y comprobará su estado mediante `/api/health`.

En el plan gratuito, el archivo SQLite vive en el disco efímero de la instancia: las puntuaciones pueden reiniciarse al reiniciar o volver a desplegar el servicio. Para conservarlas, se necesita configurar almacenamiento persistente y establecer `DATABASE_PATH` en la ruta del disco.

## Ejecutar las pruebas

Con Node.js 20 o posterior, ejecuta desde la carpeta del proyecto:

```powershell
node --test
```

Las pruebas usan el ejecutor integrado de Node.js; no hace falta instalar paquetes. Para probar el backend y la base de datos:

```powershell
python -m unittest discover -s tests
```

## Arquitectura actual

`script.js` contiene la interfaz, las reglas y la IA con minimax y poda alfa-beta. MediaPipe reconoce los gestos localmente en el navegador. `server.py` sirve la aplicación y ofrece la API `/api/health`, `/api/scores` y `/api/games`; los resultados y el historial de partidas se almacenan en SQLite.

## Solución de problemas

- **El marcador indica que el backend no está conectado:** inicia la aplicación con `python server.py`; no uses un servidor estático separado.
- **No inicia la cámara:** permite el acceso cuando el navegador lo solicite, comprueba que ninguna otra aplicación la esté usando y confirma que MediaPipe cargó desde CDN.
- **No cargan los gráficos, estilos o gestos:** comprueba la conexión a Internet; Three.js, MediaPipe, Tailwind CSS, Font Awesome y Confetti se cargan desde CDN.
- **El puerto ya está ocupado:** cambia el puerto `8000` en `server.py` y abre el nuevo puerto en el navegador.

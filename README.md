# MinutoFMS — demo web

Demo: https://imlegendco55.github.io/FMStv/

Interfaz vertical y adaptable para minutos de freestyle. Incluye dos cassettes de audio sintetizado (80 y 93.532 BPM), generados en el navegador; no incluye música privada ni grabaciones de batallas.

## Probar

Selecciona una carátula y pulsa el icono de reproducción. El + permite importar un cassette ZIP propio. El audio empieza únicamente al pulsar reproducción. Los archivos importados se procesan localmente en el navegador y no se envían a ningún servidor; la biblioteca de esta versión dura mientras la página siga abierta.

PREPARADO ocupa los tres primeros compases de la intro. La cuarta barra muestra 3, 2, 1 y TIEMPO, un tiempo cada uno. TIEMPO permanece el primer segundo del verso y el primer número visible es 59. Las palabras cambian cada 10 segundos. A los 60 segundos el reloj desaparece y el último bloque de audio termina antes del Outro completo.

## Desarrollo

Requiere Node.js 22 y npm.

```sh
npm ci
npm run dev
```

El desarrollo normal abre la biblioteca vacía. Para compilar el demo con los dos cassettes sintéticos:

```sh
npm run build:demo
npm run preview
```

Para compilar sin precargar demos: `npm run build`.

## Comprobar

```sh
npm test
npx playwright install chromium
npm run test:browser
```

## Publicar en GitHub Pages

En Settings → Pages, selecciona **GitHub Actions** como Source. Cada push a `main` ejecuta `.github/workflows/pages.yml`: instala con el lockfile, ejecuta pruebas del motor, compila el demo y publica `dist`. También puede iniciarse desde Actions → Deploy demo to GitHub Pages → Run workflow.

Las rutas relativas permiten servir el demo en `/FMStv/`. El logo, las texturas y los recursos necesarios están incluidos; no se descargan fuentes externas. No se necesitan claves, backend ni servicios de pago.

## ZIP de cassette

WAV PCM: INTRO, uno o más VERSO, OUTRO y BREAK1 opcional; COVER.png/jpg/webp opcional. Se aceptan carpetas contenedoras y alias comunes. Intro, versos y break representan cuatro compases. La app conserva los audios completos y respeta las regiones musicales cuando están presentes.

Proyecto independiente, sin afiliación oficial con FMS ni Urban Roosters. El logotipo aportado como referencia conserva los derechos de sus titulares. Las texturas vectoriales y los cassettes sintéticos del demo se generan como parte de este proyecto.

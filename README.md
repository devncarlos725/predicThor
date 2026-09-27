# PredicThor ⚡

**PredicThor** es una aplicación móvil diseñada para ayudar a usuarios residenciales y comerciales a entender, auditar y predecir su consumo de energía eléctrica y el costo estimado de su próxima factura (optimizado para esquemas tarifarios de EDET, Tucumán).

---

## 🚀 Características Principales

- **📄 Extracción de Datos por IA (Paso 1):** Procesa fotos o archivos PDF de facturas anteriores para extraer de forma automática:

  - Categoría tarifaria (N1 - Ingresos Altos, N2 - Bajos, N3 - Medios).

  - Tipo de facturación (Bimestral / Mensual - Bloque 1 o 2).

  - Lectura anterior (kWh de referencia) y fecha de cierre.

  - Estimación de impuestos fijos y tasas municipales previas.

- **🔢 Guía de Lectura de Medidor (Paso 2):** 

  - Incluye un instructivo claro e intuitivo para medidores digitales y analógicos.

  - Permite tomar una fotografía al medidor o ingresar el estado actual manualmente.

- **📊 Informe Proyectado & Compartir (Paso 3):**

  - Calcula el promedio diario de kWh consumidos y la proyección al cierre de período.

  - Estima el Subtotal Neto, IVA (21%) y recargos.

  - **Compartir Informe:** Permite exportar los resultados como mensaje directo de texto formateado para WhatsApp o mediante un informe formal en PDF.

- **✍️ Carga Manual:** Opción para usuarios avanzados que desean auditar o modificar sus lecturas paso a paso.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** React Native con Expo SDK 57

- **Lenguaje:** TypeScript / JavaScript

- **Módulos Expo:**

  - `expo-camera` & `expo-image-picker` (Captura de boleta y medidores)

  - `expo-document-picker` (Carga de archivos PDF)

  - `expo-print` (Generación de informes PDF dinámicos en HTML/CSS)

  - `expo-sharing` (Integración nativa para compartir en WhatsApp y redes)

---

## 📌 Estado del Proyecto & Próximos Pasos

1. Integración completa del modelo OCR/IA de análisis de visión para lectura directa de imágenes de facturas.

2. Generación de builds instalables `.apk`) mediante EAS Build para pruebas en dispositivos físicos.

3. Incorporación de anuncios (Google AdMob) para monetización.
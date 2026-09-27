import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Modal, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function App() {
  const [pantalla, setPantalla] = useState<'inicio' | 'manual' | 'escaneo'>('inicio');
  const [menuVisible, setMenuVisible] = useState(false);

  // Estados de datos de factura (Extraídos por IA)
  const [datosFactura, setDatosFactura] = useState<any>(null);
  const [procesandoFactura, setProcesandoFactura] = useState(false);

  // Estados de la lectura del medidor actual (Paso 2)
  const [pasoActual, setPasoActual] = useState<'subir_factura' | 'instrucciones_medidor' | 'informe_final'>('subir_factura');
  const [lecturaMedidorActual, setLecturaMedidorActual] = useState('');
  const [fechaLecturaActual, setFechaLecturaActual] = useState(new Date().toISOString().split('T')[0]);

  // Estados Carga Manual Directa
  const [lecturaAncla, setLecturaAncla] = useState('6995');
  const [fechaAncla, setFechaAncla] = useState('2026-09-08');
  const [precioKwh, setPrecioKwh] = useState('292.05');
  const [lecturaManualHoy, setLecturaManualHoy] = useState('');
  const [resultadoManual, setResultadoManual] = useState<any>(null);

  // Informe final calculado
  const [informeFinal, setInformeFinal] = useState<any>(null);

  // 1. Escanear / Cargar Boleta (Paso 1)
  const procesarBoletaIA = (metodo: string) => {
    setProcesandoFactura(true);
    setTimeout(() => {
      setProcesandoFactura(false);
      
      // Datos extraídos ÚNICAMENTE de la factura de luz anterior
      const extraido = {
        categoria: 'N1 - Ingresos Altos (Sin Subsidio)',
        esquema: 'Bimestral (Bloque 1 de 2)',
        lecturaAncla: 6995,
        fechaBoleta: '2026-09-08',
        precioKwhEst: 292.05,
        ivaPorcentaje: 21,
        impuestosOtrosAnt: 28500.00 // Tasas municipales, alumbrado, etc. de la factura previa
      };

      setDatosFactura(extraido);
      setLecturaAncla(extraido.lecturaAncla.toString());
      setFechaAncla(extraido.fechaBoleta);
    }, 1800);
  };

  const capturarFotoBoleta = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Se necesita acceso a la cámara.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) procesarBoletaIA("CamaraBoleta");
  };

  const seleccionarGaleriaBoleta = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Se necesita acceso a la galería.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) procesarBoletaIA("GaleriaBoleta");
  };

  const seleccionarPDFBoleta = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled) procesarBoletaIA("PDFBoleta");
  };

  // 2. Tomar Foto / Cargar Lectura Actual del Medidor
  const capturarFotoMedidor = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permiso requerido", "Se necesita acceso a la cámara.");
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      // Simulación de lectura OCR de la imagen del medidor
      setLecturaMedidorActual('7202');
      Alert.alert("Medidor Detectado 📸", "Se detectó la lectura: 7202 kWh en la foto.");
    }
  };

  // 3. Generar Cálculo Proyectado Final
  const calcularProyeccionIA = () => {
    const estadoActual = parseFloat(lecturaMedidorActual);
    if (isNaN(estadoActual) || estadoActual <= datosFactura.lecturaAncla) {
      Alert.alert("Lectura Inválida", `La lectura actual debe ser mayor a la lectura de la boleta anterior (${datosFactura.lecturaAncla} kWh).`);
      return;
    }

    const estadoAncla = datosFactura.lecturaAncla;
    const kwhConsumidos = estadoActual - estadoAncla;

    const fInicial = new Date(datosFactura.fechaBoleta);
    const fFinal = new Date(fechaLecturaActual);
    const diffTime = Math.abs(fFinal.getTime() - fInicial.getTime());
    const diasTranscurridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const promedioDiario = kwhConsumidos / diasTranscurridos;
    const proyeccion60DiasKwh = promedioDiario * 60; // Proyección bimestral

    // Cálculos Monetarios
    const subtotalNeto = proyeccion60DiasKwh * datosFactura.precioKwhEst;
    const ivaCalculado = subtotalNeto * (datosFactura.ivaPorcentaje / 100);
    const otrosImpuestos = datosFactura.impuestosOtrosAnt;
    const totalEstimado = subtotalNeto + ivaCalculado + otrosImpuestos;

    setInformeFinal({
      diasTranscurridos,
      kwhConsumidos,
      promedioDiario: promedioDiario.toFixed(2),
      proyeccion60DiasKwh: proyeccion60DiasKwh.toFixed(1),
      subtotalNeto,
      ivaCalculado,
      otrosImpuestos,
      totalEstimado
    });

    setPasoActual('informe_final');
  };

  // Compartir por WhatsApp
  const compartirTextoWhatsApp = async () => {
    if (!informeFinal || !datosFactura) return;

    const texto = `⚡ *PREDICTHOR - INFORME ESTIMADO DE LUZ* ⚡\n\n` +
      `📋 *Categoría:* ${datosFactura.categoria}\n` +
      `📅 *Esquema:* ${datosFactura.esquema}\n` +
      `⏱️ *Días evaluados:* ${informeFinal.diasTranscurridos} días\n` +
      `📊 *Consumo a la fecha:* ${informeFinal.kwhConsumidos} kWh (${informeFinal.promedioDiario} kWh/día)\n` +
      `📈 *Proyección Bimestral:* ${informeFinal.proyeccion60DiasKwh} kWh\n\n` +
      `💡 *DESGLOSE DE ESTIMACIÓN:* \n` +
      `• Neto Estimado: $${informeFinal.subtotalNeto.toLocaleString('es-AR', {maximumFractionDigits:2})}\n` +
      `• IVA (${datosFactura.ivaPorcentaje}%): $${informeFinal.ivaCalculado.toLocaleString('es-AR', {maximumFractionDigits:2})}\n` +
      `• Impuestos Municipales/Cargos (Factura Anterior): $${informeFinal.otrosImpuestos.toLocaleString('es-AR', {maximumFractionDigits:2})}\n\n` +
      `💵 *TOTAL ESTIMADO A PAGAR:* *$${informeFinal.totalEstimado.toLocaleString('es-AR', {maximumFractionDigits:2})}*\n\n` +
      `_Informe generado por PredicThor_ ⚡`;

    try {
      await Sharing.shareAsync(`data:text/plain;base64,${btoa(unescape(encodeURIComponent(texto)))}`, {
        dialogTitle: 'Compartir Informe de Luz',
      });
    } catch (e) {
      Alert.alert("Compartir Informe", texto);
    }
  };

  // Compartir PDF
  const generarPDF = async () => {
    if (!informeFinal || !datosFactura) return;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #007bff; text-align: center;">PredicThor ⚡ - Informe de Consumo</h2>
          <hr />
          <p><strong>Categoría Tarifaria:</strong> ${datosFactura.categoria}</p>
          <p><strong>Días Medidos:</strong> ${informeFinal.diasTranscurridos} días</p>
          <p><strong>Consumo Actual:</strong> ${informeFinal.kwhConsumidos} kWh (${informeFinal.promedioDiario} kWh/día)</p>
          <p><strong>Proyección Bimestre:</strong> ${informeFinal.proyeccion60DiasKwh} kWh</p>
          <hr />
          <h3>Desglose de Costos Estimados:</h3>
          <p>Subtotal Neto: $${informeFinal.subtotalNeto.toFixed(2)}</p>
          <p>IVA (21%): $${informeFinal.ivaCalculado.toFixed(2)}</p>
          <p>Impuestos / Cargos Anteriores: $${informeFinal.otrosImpuestos.toFixed(2)}</p>
          <h2 style="color: #28a745;">Total a Pagar Estimado: $${informeFinal.totalEstimado.toFixed(2)}</h2>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Error", "No se pudo generar el documento PDF.");
    }
  };

  // Carga Manual Directa
  const calcularManualDirecto = () => {
    const estadoAnt = parseFloat(lecturaAncla);
    const estadoHoy = parseFloat(lecturaManualHoy);
    const precio = parseFloat(precioKwh);

    if (isNaN(estadoHoy) || estadoHoy <= estadoAnt) {
      Alert.alert("Error", "Ingresá una lectura actual mayor a la lectura anterior.");
      return;
    }

    const kwh = estadoHoy - estadoAnt;
    const estConsumoNeto = kwh * precio;
    const estIva = estConsumoNeto * 0.21;
    const totalEst = estConsumoNeto + estIva;

    setResultadoManual({
      kwh,
      estConsumoNeto,
      estIva,
      totalEst
    });
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#007bff" />
      <SafeAreaView style={styles.safeArea}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.btnMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.logoText}>PredicThor ⚡</Text>
        </View>

        {/* MENÚ LATERAL */}
        <Modal visible={menuVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.menuContainer}>
              <Text style={styles.menuTitulo}>PredicThor ⚡</Text>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setPantalla('inicio'); setMenuVisible(false); }}>
                <Text style={styles.menuItemText}>🏠 Inicio</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setPantalla('escaneo'); setPasoActual('subir_factura'); setMenuVisible(false); }}>
                <Text style={styles.menuItemText}>📷 Analizar Boleta + Medidor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setPantalla('manual'); setMenuVisible(false); }}>
                <Text style={styles.menuItemText}>✍️ Carga Manual</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, styles.btnCerrar]} onPress={() => setMenuVisible(false)}>
                <Text style={styles.btnCerrarTexto}>Cerrar Menú</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* VISTA 1: INICIO */}
        {pantalla === 'inicio' ? (
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.saludo}>¡Bienvenido a PredicThor! ⚡{"\n"}Calculá el costo exacto de tu factura</Text>

            <View style={styles.grid}>
              <TouchableOpacity style={[styles.card, styles.cardScan]} onPress={() => { setPantalla('escaneo'); setPasoActual('subir_factura'); }}>
                <Text style={styles.cardIcon}>📸</Text>
                <Text style={styles.cardTitle}>Escanear Boleta + Medidor</Text>
                <Text style={styles.cardSub}>La IA lee tu boleta anterior y te guía para cargar tu medidor actual</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.card, styles.cardManual]} onPress={() => setPantalla('manual')}>
                <Text style={styles.cardIcon}>✍️</Text>
                <Text style={styles.cardTitle}>Carga Manual Directa</Text>
                <Text style={styles.cardSub}>Ingresá los números de tus lecturas manualmente</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : pantalla === 'escaneo' ? (
          /* VISTA 2: FLUJO DE ESCANEO / PREDICCIÓN (3 PASOS) */
          <ScrollView contentContainerStyle={styles.body}>
            <TouchableOpacity onPress={() => setPantalla('inicio')} style={styles.btnVolver}>
              <Text style={styles.txtVolver}>← Volver al Inicio</Text>
            </TouchableOpacity>

            {/* PASO 1: CARGAR LA FACTURA ANTERIOR */}
            {pasoActual === 'subir_factura' && (
              <View>
                <Text style={styles.tituloSeccion}>📄 Paso 1: Cargar Factura Anterior</Text>
                <Text style={styles.subtituloSeccion}>Subí la última boleta de luz para extraer la tarifa, la lectura base y los impuestos de referencia:</Text>

                <View style={styles.btnGroupVertical}>
                  <TouchableOpacity style={styles.btnCamara} onPress={capturarFotoBoleta}>
                    <Text style={styles.btnAccionText}>📸 Foto de la Boleta</Text>
                  </TouchableOpacity>

                  <View style={styles.btnGroupHorizontal}>
                    <TouchableOpacity style={styles.btnAccion} onPress={seleccionarGaleriaBoleta}>
                      <Text style={styles.btnAccionText}>🖼️ Galería</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btnAccion, styles.btnPdf]} onPress={seleccionarPDFBoleta}>
                      <Text style={styles.btnAccionText}>📄 Subir PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {procesandoFactura && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                    <Text style={styles.loadingText}>Analizando datos de la boleta de EDET...</Text>
                  </View>
                )}

                {datosFactura && !procesandoFactura && (
                  <View style={styles.cardDatosExtraidos}>
                    <Text style={styles.extraidoTitulo}>✅ Datos Extraídos de la Boleta:</Text>
                    <Text style={styles.extraidoTexto}>• Categoría: <Text style={styles.bold}>{datosFactura.categoria}</Text></Text>
                    <Text style={styles.extraidoTexto}>• Esquema: <Text style={styles.bold}>{datosFactura.esquema}</Text></Text>
                    <Text style={styles.extraidoTexto}>• Lectura Boleta Anterior: <Text style={styles.bold}>{datosFactura.lecturaAncla} kWh</Text></Text>
                    <Text style={styles.extraidoTexto}>• Fecha de la Boleta: <Text style={styles.bold}>{datosFactura.fechaBoleta}</Text></Text>

                    <TouchableOpacity style={styles.btnSiguientePaso} onPress={() => setPasoActual('instrucciones_medidor')}>
                      <Text style={styles.btnSiguienteTexto}>⚡ Predecir Próxima Factura →</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* PASO 2: INSTRUCTIVO + LECTURA DEL MEDIDOR ACTUAL */}
            {pasoActual === 'instrucciones_medidor' && (
              <View>
                <Text style={styles.tituloSeccion}>🔢 Paso 2: Lectura de tu Medidor</Text>
                
                {/* INSTRUCTIVO INTEGENTE */}
                <View style={styles.cardInstructivo}>
                  <Text style={styles.instructivoHeader}>💡 ¿Cómo leer tu medidor de luz?</Text>
                  <Text style={styles.instructivoTexto}>
                    • <Text style={styles.bold}>Medidor Digital:</Text> ¡Atención! Los números van cambiando automáticamente. Muestra el voltaje (V) y amperios (A). <Text style={styles.bold}>Esperá a que aparezca el número en kWh</Text> (es el valor acumulado superior a tu lectura anterior de <Text style={styles.bold}>{datosFactura?.lecturaAncla} kWh</Text>).
                  </Text>
                  <Text style={styles.instructivoTexto}>
                    • <Text style={styles.bold}>Medidor Analógico:</Text> Anotá únicamente los números negros de los relojes o rueditas.
                  </Text>
                </View>

                <Text style={styles.labelInput}>Ingresá o fotografiá el número de hoy:</Text>

                <TouchableOpacity style={styles.btnFotoMedidor} onPress={capturarFotoMedidor}>
                  <Text style={styles.btnAccionText}>📸 Tomar Foto al Medidor con IA</Text>
                </TouchableOpacity>

                <Text style={styles.labelOr}>o ingresalo manualmente:</Text>

                <TextInput 
                  style={styles.inputMedidor} 
                  placeholder={`Ej. mayor a ${datosFactura?.lecturaAncla || 6995}`}
                  keyboardType="numeric"
                  value={lecturaMedidorActual}
                  onChangeText={setLecturaMedidorActual}
                />

                <TouchableOpacity style={styles.btnCalcularFinal} onPress={calcularProyeccionIA}>
                  <Text style={styles.btnCalcularFinalTexto}>📊 Generar Informe Proyectado</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* PASO 3: INFORME FINAL Y OPCIONES DE COMPARTIR */}
            {pasoActual === 'informe_final' && informeFinal && (
              <View>
                <Text style={styles.tituloSeccion}>📊 Informe de Consumo Proyectado</Text>

                <View style={styles.cardInformeFinal}>
                  <Text style={styles.informeHeader}>PredicThor ⚡ - Próxima Factura</Text>

                  <View style={styles.infoFila}>
                    <Text style={styles.infoLabel}>Categoría Tarifaria:</Text>
                    <Text style={styles.infoValor}>{datosFactura.categoria}</Text>
                  </View>

                  <View style={styles.infoFila}>
                    <Text style={styles.infoLabel}>Días Evaluados:</Text>
                    <Text style={styles.infoValor}>{informeFinal.diasTranscurridos} días</Text>
                  </View>

                  <View style={styles.infoFila}>
                    <Text style={styles.infoLabel}>Consumo Actual:</Text>
                    <Text style={styles.infoValor}>{informeFinal.kwhConsumidos} kWh ({informeFinal.promedioDiario} kWh/día)</Text>
                  </View>

                  <View style={styles.infoFila}>
                    <Text style={styles.infoLabel}>Proyección Cierre (60 días):</Text>
                    <Text style={styles.infoValor}>{informeFinal.proyeccion60DiasKwh} kWh</Text>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.subtituloDesglose}>Desglose de Costos Estimados:</Text>
                  <Text style={styles.montoDetalle}>• Neto Consumo Estimado: ${informeFinal.subtotalNeto.toLocaleString('es-AR', {maximumFractionDigits:2})}</Text>
                  <Text style={styles.montoDetalle}>• IVA ({datosFactura.ivaPorcentaje}%): ${informeFinal.ivaCalculado.toLocaleString('es-AR', {maximumFractionDigits:2})}</Text>
                  <Text style={styles.montoDetalle}>• Impuestos / Otros Cargos (Factura Ant.): ${informeFinal.otrosImpuestos.toLocaleString('es-AR', {maximumFractionDigits:2})}</Text>

                  <View style={styles.boxTotalFinal}>
                    <Text style={styles.lblTotalFinal}>TOTAL ESTIMADO A PAGAR:</Text>
                    <Text style={styles.valTotalFinal}>${informeFinal.totalEstimado.toLocaleString('es-AR', {maximumFractionDigits:2})}</Text>
                  </View>

                  <Text style={styles.subShareTitle}>📤 Compartir Informe:</Text>
                  <View style={styles.btnGroupHorizontal}>
                    <TouchableOpacity style={styles.btnWpText} onPress={compartirTextoWhatsApp}>
                      <Text style={styles.btnWpTexto}>💬 Mensaje WP</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.btnPdfShare} onPress={generarPDF}>
                      <Text style={styles.btnWpTexto}>📄 Documento PDF</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.btnEditarManual} onPress={() => setPantalla('manual')}>
                    <Text style={styles.btnEditarTexto}>✍️ Ver / Ajustar en Carga Manual</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          /* VISTA 3: CARGA MANUAL DIRECTA */
          <ScrollView contentContainerStyle={styles.body}>
            <TouchableOpacity onPress={() => setPantalla('inicio')} style={styles.btnVolver}>
              <Text style={styles.txtVolver}>← Volver al Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.tituloSeccion}>✍️ Carga Manual de Lecturas</Text>

            <View style={styles.cardForm}>
              <Text style={styles.subtituloForm}>1. Datos Factura Anterior</Text>
              <Text style={styles.label}>Lectura Anterior (kWh):</Text>
              <TextInput style={styles.input} value={lecturaAncla} onChangeText={setLecturaAncla} keyboardType="numeric" />
              
              <Text style={styles.label}>Fecha Boleta (AAAA-MM-DD):</Text>
              <TextInput style={styles.input} value={fechaAncla} onChangeText={setFechaAncla} />
            </View>

            <View style={styles.cardForm}>
              <Text style={styles.subtituloForm}>2. Medición Actual</Text>
              <Text style={styles.label}>Lectura del Medidor Hoy (kWh):</Text>
              <TextInput style={styles.input} value={lecturaManualHoy} onChangeText={setLecturaManualHoy} keyboardType="numeric" placeholder="Ej. 7202" />

              <Text style={styles.label}>Precio Neto por kWh ($):</Text>
              <TextInput style={styles.input} value={precioKwh} onChangeText={setPrecioKwh} keyboardType="numeric" />
            </View>

            <TouchableOpacity style={styles.botonCalcular} onPress={calcularManualDirecto}>
              <Text style={styles.textoBotonCalcular}>Calcular Estimación</Text>
            </TouchableOpacity>

            {resultadoManual && (
              <View style={styles.cardResultado}>
                <Text style={styles.resTitulo}>📊 Resultado Calculado</Text>
                <Text style={styles.resTexto}>• Consumo a la fecha: {resultadoManual.kwh} kWh</Text>
                <Text style={styles.resTexto}>• Consumo Neto: ${resultadoManual.estConsumoNeto.toFixed(2)}</Text>
                <Text style={styles.resTexto}>• IVA (21%): ${resultadoManual.estIva.toFixed(2)}</Text>
                <Text style={styles.resDestacado}>Total Est. (Sin impuestos aux.): ${resultadoManual.totalEst.toFixed(2)}</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* BANNER PUBLICIDAD */}
        <View style={styles.adBanner}>
          <Text style={styles.adText}>Espacio de Publicidad (Google AdMob)</Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#007bff' },
  safeArea: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { height: 60, backgroundColor: '#007bff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  btnMenu: { padding: 5, marginRight: 15 },
  menuIcon: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  body: { padding: 20, paddingBottom: 30 },
  saludo: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center', lineHeight: 28 },
  grid: { gap: 15 },
  card: { padding: 20, borderRadius: 12, elevation: 3, alignItems: 'center', marginBottom: 15 },
  cardScan: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: '#90caf9' },
  cardManual: { backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#a5d6a7' },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1565c0', textAlign: 'center', marginBottom: 5 },
  cardSub: { fontSize: 12, color: '#666', textAlign: 'center' },
  btnVolver: { marginBottom: 15 },
  txtVolver: { color: '#007bff', fontWeight: 'bold', fontSize: 15 },
  tituloSeccion: { fontSize: 20, fontWeight: 'bold', color: '#1a252c', marginBottom: 5 },
  subtituloSeccion: { fontSize: 14, color: '#666', marginBottom: 15 },
  btnGroupVertical: { gap: 10, marginBottom: 15 },
  btnCamara: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnGroupHorizontal: { flexDirection: 'row', gap: 10 },
  btnAccion: { flex: 1, backgroundColor: '#007bff', padding: 12, borderRadius: 10, alignItems: 'center' },
  btnPdf: { backgroundColor: '#fd7e14' },
  btnAccionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  loadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#007bff', fontWeight: 'bold' },
  cardDatosExtraidos: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginTop: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#28a745' },
  extraidoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#28a745', marginBottom: 10 },
  extraidoTexto: { fontSize: 14, color: '#333', marginBottom: 5 },
  bold: { fontWeight: 'bold' },
  btnSiguientePaso: { backgroundColor: '#007bff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  btnSiguienteTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardInstructivo: { backgroundColor: '#fff3cd', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ffeeba', marginBottom: 15 },
  instructivoHeader: { fontSize: 15, fontWeight: 'bold', color: '#856404', marginBottom: 8 },
  instructivoTexto: { fontSize: 13, color: '#856404', marginBottom: 6, lineHeight: 18 },
  labelInput: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  btnFotoMedidor: { backgroundColor: '#17a2b8', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  labelOr: { textAlign: 'center', color: '#777', marginVertical: 5 },
  inputMedidor: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  btnCalcularFinal: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnCalcularFinalTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardInformeFinal: { backgroundColor: '#fff', padding: 18, borderRadius: 12, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#007bff' },
  informeHeader: { fontSize: 18, fontWeight: 'bold', color: '#007bff', marginBottom: 12 },
  infoFila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel: { fontSize: 13, color: '#555', fontWeight: '600' },
  infoValor: { fontSize: 13, color: '#111', fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  subtituloDesglose: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  montoDetalle: { fontSize: 13, color: '#555', marginTop: 3 },
  boxTotalFinal: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  lblTotalFinal: { fontSize: 12, color: '#2e7d32', fontWeight: 'bold' },
  valTotalFinal: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginTop: 2 },
  subShareTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 15, marginBottom: 8 },
  btnWpText: { flex: 1, backgroundColor: '#25D366', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnPdfShare: { flex: 1, backgroundColor: '#dc3545', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnWpTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  btnEditarManual: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnEditarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  cardForm: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  subtituloForm: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#007bff' },
  label: { fontSize: 13, color: '#555', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4, backgroundColor: '#fafafa' },
  botonCalcular: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', marginVertical: 10 },
  textoBotonCalcular: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardResultado: { backgroundColor: '#e8f5e9', padding: 15, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#c8e6c9' },
  resTitulo: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  resTexto: { fontSize: 14, color: '#333', marginBottom: 5 },
  resDestacado: { fontSize: 16, fontWeight: 'bold', color: '#1b5e20', marginTop: 8 },
  adBanner: { height: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc' },
  adText: { color: '#777', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start' },
  menuContainer: { width: '75%', height: '100%', backgroundColor: '#fff', padding: 20, paddingTop: 50 },
  menuTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#007bff' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  menuItemText: { fontSize: 15, color: '#333' },
  btnCerrar: { marginTop: 30, backgroundColor: '#dc3545', borderRadius: 8, borderBottomWidth: 0 },
  btnCerrarTexto: { color: '#fff', textAlign: 'center', fontWeight: 'bold' }
});
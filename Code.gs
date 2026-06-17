// ============================================================
// LIGA DEPARTAMENTAL GUALEGUAY — Apps Script Backend
// Versión 3.1 — Junio 2026
// Ajustado a nombres y columnas reales del Sheets
// ============================================================

var TOKEN = 'pA_LigaGualeguay_2026_xK9m';

// Nombres EXACTOS de las hojas (copiados del archivo real)
var HOJAS = {
  config        : 'configuración ',
  recursos      : 'recursos',
  clubes        : 'clubes',
  posiciones    : 'tabla posiciones',
  resultados    : 'resultados',
  goleadores    : 'goleadores ',
  proximos      : 'proximos partidos',
  videos        : 'videos ',
  tribunal      : 'tribunal',
  comercios     : 'comercios ',
  transmisiones : 'transmisiones',
  noticias      : 'noticias',
  galeria       : 'galeria',
  portada_cards : 'portada',
  slider_ads    : 'slider_publicidades',
  perfil_clubes : 'perfil_clubes',
  plantel_clubes: 'plantel_clubes',
  eventos_clubes: 'eventos_clubes',
  ligas_er      : 'ligas_er_config'
};

// ============================================================
// ENTRY POINT
// ============================================================
function doGet(e) {
  var params = e ? e.parameter : {};
  if (params.token !== TOKEN) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: 'Token invalido' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var action = params.action || 'getData';
  var result;
  try {
    if      (action === 'getData')   result = getData();
    else if (action === 'getLigaER') result = getLigaER(params.liga || '');
    else                             result = { error: 'Accion desconocida' };
  } catch (err) {
    result = { error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// UTILIDADES
// ============================================================
function getSheet(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.getSheetByName(nombre.trim()) || null;
}

function fechaStr(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return String(val).trim();
}

function esSI(val) {
  var v = String(val).trim().toUpperCase();
  return v === 'SI' || v === 'SÍ' || v === 'TRUE' || v === '1' || v === 'VERDADERO';
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================
function getData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    config        : leerConfig(ss),
    recursos      : leerRecursos(ss),
    clubes        : leerClubes(ss),
    posiciones    : leerPosiciones(ss),
    resultados    : leerResultados(ss),
    goleadores    : leerGoleadores(ss),
    proximos      : leerProximos(ss),
    videos        : leerVideos(ss),
    tribunal      : leerTribunal(ss),
    comercios     : leerComercios(ss),
    transmisiones : leerTransmisiones(ss),
    noticias      : leerNoticias(ss),
    galeria       : leerGaleria(ss),
    portada_cards : leerPortadaCards(ss),
    slider_ads    : leerSliderAds(ss),
    perfil_clubes : leerPerfilClubes(ss),
    plantel_clubes: leerPlantelClubes(ss),
    eventos_clubes: leerEventosClubes(ss)
  };
}

// ============================================================
// HOJAS EXISTENTES — columnas ajustadas al Sheets real
// ============================================================

function leerConfig(ss) {
  // Hoja: configuración  — clave/valor sin header fijo
  var sh = getSheet(ss, HOJAS.config);
  if (!sh) return {};
  var data = sh.getDataRange().getValues();
  var map = {};
  data.forEach(function(row) {
    var k = String(row[0]).trim().toLowerCase().replace(/\s+/g,'_');
    var v = fechaStr(row[1]);
    if (k) map[k] = v;
  });
  return map;
}

function leerRecursos(ss) {
  // Cols: id_recurso | nombre_recurso | seccion_destino | url_github | activo | directorio_github | url_instagram
  var sh = getSheet(ss, HOJAS.recursos);
  if (!sh) return {};
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return {};
  var map = {};
  data.slice(1).forEach(function(row) {
    var id = String(row[0]).trim();
    if (!id) return;
    map[id] = {
      nombre    : String(row[1]).trim(),
      seccion   : String(row[2]).trim(),
      url       : String(row[3]).trim(),
      activo    : esSI(row[4]),
      directorio: String(row[5]).trim(),
      instagram : String(row[6]).trim()
    };
  });
  return map;
}

function leerClubes(ss) {
  // Cols: id_clubes | nombre_club | referencia | url_escudo | url_instagram | descripcion_club | activo
  var sh = getSheet(ss, HOJAS.clubes);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      id         : String(row[0]).trim(),
      nombre     : String(row[1]).trim(),
      escudo_url : String(row[3]).trim(),
      instagram  : String(row[4]).trim(),
      descripcion: String(row[5]).trim(),
      activo     : esSI(row[6])
    };
  }).filter(function(r) { return r.nombre && r.activo; });
}

function leerPosiciones(ss) {
  // Cols: categoria | posiciones | equipo | pts | pj | pg | pe | PP | gf | gc | dg
  var sh = getSheet(ss, HOJAS.posiciones);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      division : String(row[0]).trim(),
      pos      : row[1],
      club     : String(row[2]).trim(),
      pts      : row[3],
      pj       : row[4],
      pg       : row[5],
      pe       : row[6],
      pp       : row[7],
      gf       : row[8],
      gc       : row[9],
      dg       : row[10]
    };
  }).filter(function(r) { return r.club; });
}

function leerResultados(ss) {
  // Cols: resultados(fecha) | categoria | local | gl | visitante | gv
  var sh = getSheet(ss, HOJAS.resultados);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      fecha_num    : String(row[0]).trim(),
      division     : String(row[1]).trim(),
      local        : String(row[2]).trim(),
      goles_local  : row[3],
      visita       : String(row[4]).trim(),
      goles_visita : row[5]
    };
  }).filter(function(r) { return r.local && r.visita; });
}

function leerGoleadores(ss) {
  // Leer hoja goleadores  (con espacio)
  var sh = getSheet(ss, HOJAS.goleadores);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  // Detectar columnas por header
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase(); });
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    return obj;
  }).filter(function(r){ return r.nombre || r.jugador; });
}

function leerProximos(ss) {
  // Cols: division | local | visitante | horario_dia | cancha | num_fecha | notificaciones | url_vivo
  // (sin header en col A — col A es la división)
  var sh = getSheet(ss, HOJAS.proximos);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (!data.length) return [];
  // Saltar fila de encabezado si existe
  var inicio = (String(data[0][0]).trim().toLowerCase() === '' || isNaN(data[0][3])) ? 1 : 0;
  return data.slice(inicio).map(function(row) {
    return {
      division    : String(row[0]).trim(),
      local       : String(row[1]).trim(),
      visita      : String(row[2]).trim(),
      horario     : fechaStr(row[3]),
      cancha      : String(row[4]).trim(),
      fecha_num   : String(row[5]).trim(),
      notif       : esSI(row[6]),
      url_vivo    : String(row[7]).trim()
    };
  }).filter(function(r){ return r.local && r.visita; });
}

function leerVideos(ss) {
  // Hoja: videos  (con espacio)
  var sh = getSheet(ss, HOJAS.videos);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    // Extraer youtube_id si hay URL
    var url = String(obj.url || obj.url_video || '').trim();
    var ytMatch = url.match(/(?:v=|youtu\.be\/|live\/)([\w-]{11})/);
    obj.youtube_id = ytMatch ? ytMatch[1] : '';
    obj.thumb = obj.youtube_id ? 'https://img.youtube.com/vi/' + obj.youtube_id + '/mqdefault.jpg' : '';
    return obj;
  }).filter(function(r){ return r.titulo || r.youtube_id; });
}

function leerTribunal(ss) {
  var sh = getSheet(ss, HOJAS.tribunal);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  return data.slice(1).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    return obj;
  }).filter(function(r){ return r.titulo || r.numero || r.boletin; });
}

function leerComercios(ss) {
  // Hoja: comercios  (con espacio)
  var sh = getSheet(ss, HOJAS.comercios);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  return data.slice(1).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    return obj;
  }).filter(function(r){ return r.nombre || r.comercio; });
}

function leerTransmisiones(ss) {
  // Cols: activo | plataforma | url_stream | titulo | partido | fecha
  var sh = getSheet(ss, HOJAS.transmisiones);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  return data.slice(1).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = row[i]; });
    obj.activo = esSI(obj.activo);
    return obj;
  }).filter(function(r){ return r.url_stream; });
}

function leerNoticias(ss) {
  // Cols: tipo | titulo | imagen_url | texto | boton_texto | boton_url | activo
  var sh = getSheet(ss, HOJAS.noticias);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      tipo         : String(row[0]).trim(),
      titulo       : String(row[1]).trim(),
      imagen_url   : String(row[2]).trim(),
      texto        : String(row[3]).trim(),
      boton_texto  : String(row[4]).trim(),
      boton_url    : String(row[5]).trim(),
      activo       : esSI(row[6]),
      etiqueta_club: String(row[7] || '').trim().toLowerCase()
    };
  }).filter(function(r){ return r.titulo && r.activo; });
}

function leerGaleria(ss) {
  // Cols: nombre | url_escudos | descripcion | url_foto | categoria | activo | url_externo
  var sh = getSheet(ss, HOJAS.galeria);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      nombre      : String(row[0]).trim(),
      escudo_url  : String(row[1]).trim(),
      descripcion : String(row[2]).trim(),
      url_foto    : String(row[3]).trim(),
      categoria   : String(row[4]).trim(),
      activo      : esSI(row[5]),
      url_externo : String(row[6]).trim()
    };
  }).filter(function(r){ return r.url_foto && r.activo; });
}

// ============================================================
// HOJAS NUEVAS
// ============================================================

function leerPortadaCards(ss) {
  // Cols: activo | orden | tipo | titulo | subtitulo | contenido | imagen_url | link_externo | color_fondo | etiqueta | etiqueta_club
  var sh = getSheet(ss, HOJAS.portada_cards);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      activo       : String(row[0]).trim(),
      orden        : Number(row[1]) || 99,
      tipo         : String(row[2]).trim().toLowerCase().replace(/\s+/g,''),
      titulo       : String(row[3]).trim(),
      subtitulo    : String(row[4]).trim(),
      contenido    : String(row[5]).trim(),
      imagen_url   : String(row[6]).trim(),
      link_externo : String(row[7]).trim(),
      color_fondo  : String(row[8]).trim(),
      etiqueta     : String(row[9]).trim(),
      etiqueta_club: String(row[10] || '').trim().toLowerCase()
    };
  }).filter(function(r){ return r.titulo || r.imagen_url || r.contenido; });
}

function leerSliderAds(ss) {
  // Cols: activo | orden | imagen_url | link_externo | alt_texto
  var sh = getSheet(ss, HOJAS.slider_ads);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      activo      : String(row[0]).trim(),
      orden       : Number(row[1]) || 99,
      imagen_url  : String(row[2]).trim(),
      link_externo: String(row[3]).trim(),
      alt_texto   : String(row[4]).trim()
    };
  }).filter(function(r){ return r.imagen_url; });
}

function leerPerfilClubes(ss) {
  // Cols: nombre | banner_url | fundacion | colores | historia | instagram | web | url_escudo
  var sh = getSheet(ss, HOJAS.perfil_clubes);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      nombre    : String(row[0]).trim(),
      banner_url: String(row[1]).trim(),
      fundacion : String(row[2]).trim(),
      colores   : String(row[3]).trim(),
      historia  : String(row[4]).trim(),
      instagram : String(row[5]).trim(),
      web       : String(row[6]).trim(),
      escudo_url: String(row[7]).trim()
    };
  }).filter(function(r){ return r.nombre; });
}

function leerPlantelClubes(ss) {
  // Cols: club | nombre | posicion | detalle | activo
  // (sin columna número — no estaba en el Excel)
  var sh = getSheet(ss, HOJAS.plantel_clubes);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      club    : String(row[0]).trim().toLowerCase(),
      nombre  : String(row[1]).trim(),
      posicion: String(row[2]).trim(),
      detalle : String(row[3]).trim(),
      activo  : String(row[4]).trim()
    };
  }).filter(function(r){ return r.nombre && r.club; });
}

function leerEventosClubes(ss) {
  // Cols: activo | club | fecha | titulo | descripcion | imagen_url
  // (imagen_url aparece como "imgen_url" en el Excel — toleramos ambos)
  var sh = getSheet(ss, HOJAS.eventos_clubes);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(function(row) {
    return {
      activo     : String(row[0]).trim(),
      club       : String(row[1]).trim().toLowerCase(),
      fecha      : fechaStr(row[2]),
      titulo     : String(row[3]).trim(),
      descripcion: String(row[4]).trim(),
      imagen_url : String(row[5]).trim()
    };
  }).filter(function(r){ return r.titulo && r.club; });
}

// ============================================================
// LIGAS ENTRE RÍOS (estructura oculta)
// ============================================================
function getLigaER(nombreLiga) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = getSheet(ss, HOJAS.ligas_er);
  if (!sh) return { error: 'Sin configuracion de ligas' };
  var data = sh.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase(); });
  var config = data.slice(1).map(function(row){
    var o = {};
    headers.forEach(function(h,i){ o[h] = row[i]; });
    return o;
  }).find(function(l){ return l.id_hoja === nombreLiga && esSI(l.visible); });
  if (!config) return { error: 'Liga no disponible' };
  var prefijo = 'ligas_er_' + nombreLiga;
  return {
    config    : config,
    posiciones: hojaAObjetos(ss, prefijo + '_posiciones'),
    resultados: hojaAObjetos(ss, prefijo + '_resultados')
  };
}

function hojaAObjetos(ss, nombre) {
  var sh = getSheet(ss, nombre);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h){ return String(h).trim().toLowerCase().replace(/\s+/g,'_'); });
  return data.slice(1).map(function(row){
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = fechaStr(row[i]); });
    return obj;
  });
}

// ============================================================
// MENÚ EN SHEETS
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚽ Liga App')
    .addItem('✅ Probar getData()', 'testGetData')
    .addItem('📋 Ver hojas detectadas', 'verHojas')
    .show();
}

function testGetData() {
  var result = getData();
  var resumen = Object.keys(result).map(function(k) {
    var v = result[k];
    if (Array.isArray(v)) return '✅ ' + k + ': ' + v.length + ' filas';
    if (typeof v === 'object') return '✅ ' + k + ': objeto (' + Object.keys(v).length + ' claves)';
    return '⚠️ ' + k + ': vacío';
  }).join('\n');
  SpreadsheetApp.getUi().alert('getData() completado\n\n' + resumen);
}

function verHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var nombres = ss.getSheets().map(function(s){
    return '"' + s.getName() + '"';
  }).join('\n');
  SpreadsheetApp.getUi().alert('Hojas en el archivo:\n\n' + nombres);
}

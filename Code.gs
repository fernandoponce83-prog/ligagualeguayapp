// ============================================================
//  LIGA DEPARTAMENTAL FÚTBOL GUALEGUAY — Apps Script API v3
//  Alineado exactamente con la estructura del Sheets 13/06/2026
// ============================================================

var TOKEN_SECRETO = 'pA_LigaGualeguay_2026_xK9m';

// ── NORMALIZAR URLs DE GITHUB ────────────────────────────────
function normalizarUrlGithub(url) {
  if (!url || String(url).trim() === '' || url === 'null' || url === 'undefined') return '';
  url = String(url).trim();
  if (url.indexOf('github.com') !== -1 && url.indexOf('/blob/') !== -1) {
    url = url
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  url = url.replace('?raw=true','').replace('&raw=true','');
  // Remover subcarpeta liga-gualeguay-app/ si los archivos ahora están en raíz
  // (mantener ambas rutas por compatibilidad — el Code.gs no sabe dónde está cada imagen)
  return url;
}

// ── EXTRAER YOUTUBE ID ───────────────────────────────────────
function extraerYoutubeId(url) {
  if (!url) return '';
  var patrones = [
    /youtube\.com\/live\/([\w-]+)/,
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (var i = 0; i < patrones.length; i++) {
    var m = String(url).match(patrones[i]);
    if (m) return m[1].split('?')[0].split('&')[0];
  }
  return '';
}

// ── MAPEO CATEGORÍAS ─────────────────────────────────────────
var CAT_MAP = {
  'primera masculino':   '1° Masculino',
  'primera femenino':    '1° Femenino',
  'tercera division':    '3° División',
  'tercera división':    '3° División',
  'cuarta division':     '4° División',
  'cuarta división':     '4° División',
  'quinta division':     '5° División',
  'quinta división':     '5° División',
  'sexta division':      '6° División',
  'sexta división':      '6° División',
  'septima division':    '7° División',
  'septima división':    '7° División',
  'séptima division':    '7° División',
  'séptima división':    '7° División',
  'sub 14 femenino':     'Sub-14 Femenino',
  'sub-14 femenino':     'Sub-14 Femenino',
  'sub 18 femenino':     'Sub-18 Femenino',
  'sub-18 femenino':     'Sub-18 Femenino',
  'categoria 2015':      'Inf. 2015',
  'categoría 2015':      'Inf. 2015',
  'categoria 2016':      'Inf. 2016',
  'categoría 2016':      'Inf. 2016',
  'categoria 2017':      'Inf. 2017',
  'categoría 2017':      'Inf. 2017',
  'categoria 2018':      'Inf. 2018',
  'categoría 2018':      'Inf. 2018',
  'fútbol masculino':    '1° Masculino',
  'futbol masculino':    '1° Masculino',
  'fútbol femenino':     '1° Femenino',
  'futbol femenino':     '1° Femenino',
};

function normalizarCategoria(str) {
  if (!str) return '';
  var k = String(str).trim().toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/ñ/g,'n');
  return CAT_MAP[k] || String(str).trim();
}

// ── HELPERS ──────────────────────────────────────────────────
function strVal(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  return String(v).trim();
}
function numVal(v) {
  var n = parseInt(v);
  return isNaN(n) ? 0 : n;
}
function boolVal(v) {
  var s = strVal(v).toLowerCase();
  return s === 'si' || s === 'sí' || s === 'yes' || s === 'true' || s === '1';
}

function getSheet(ss, nombres) {
  var sheets = ss.getSheets();
  for (var i = 0; i < nombres.length; i++) {
    for (var j = 0; j < sheets.length; j++) {
      // Comparar ignorando espacios al inicio/fin y mayúsculas
      if (sheets[j].getName().trim().toLowerCase() === nombres[i].toLowerCase().trim()) {
        return sheets[j];
      }
    }
  }
  return null;
}

function getRows(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  // Headers: trim + lowercase + espacios → guion bajo
  var headers = data[0].map(function(h){
    return String(h || '').trim().toLowerCase().replace(/\s+/g,'_');
  });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    var isEmpty = true;
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (val !== '' && val !== null && val !== undefined) isEmpty = false;
      row[headers[j]] = val;
    }
    if (!isEmpty) rows.push(row);
  }
  return rows;
}

// ── PUNTO DE ENTRADA ─────────────────────────────────────────
function doGet(e) {
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  if (token !== TOKEN_SECRETO) {
    return ContentService
      .createTextOutput(JSON.stringify({error:'Unauthorized'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var result;
  try {
    var resultados = getResultados(SpreadsheetApp.getActiveSpreadsheet());
    result = getAllData(resultados);
  } catch(err) {
    result = {error: err.toString(), stack: err.stack};
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllData(resultados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    config:        getConfig(ss),
    recursos:      getRecursos(ss),
    clubes:        getClubes(ss),
    posiciones:    getPosiciones(ss, resultados),
    resultados:    resultados,
    goleadores:    getGoleadores(ss),
    vallas:        getVallas(ss),
    proximos:      getProximos(ss),
    videos:        getVideos(ss),
    tribunal:      getTribunal(ss),
    comercios:     getComercios(ss),
    transmisiones: getTransmisiones(ss),
    noticias:      getNoticias(ss),
    sponsors:      getSponsors(ss),
    portada_cards: getPortadaCards(ss),   // ← nuevo: hoja portada
  };
}

// ── CONFIG ────────────────────────────────────────────────────
// Hoja: "configuración " — col: campo_clave, valor
function getConfig(ss) {
  var sheet = getSheet(ss, ['configuración','configuracion','Configuración','Configuracion','Config']);
  var rows  = getRows(sheet);
  var map   = {};
  rows.forEach(function(r) {
    var clave = strVal(r['campo_clave'] || r['campo'] || r['clave'] || '')
      .toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
      .replace(/[úùü]/g,'u').replace(/ñ/g,'n')
      .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
    var valor = strVal(r['valor'] || r['value'] || '');
    if (clave) map[clave] = valor;
  });
  return map;
}

// ── RECURSOS ──────────────────────────────────────────────────
// Hoja: "recursos" — col: id_recurso, seccion_destino, nombre_recurso, url_github, activo
function getRecursos(ss) {
  var sheet = getSheet(ss, ['recursos','Recursos']);
  var rows  = getRows(sheet);
  var map   = {};
  rows.forEach(function(r) {
    if (!boolVal(r['activo'] !== undefined ? r['activo'] : 'si')) return;
    var id  = strVal(r['id_recurso'] || r['id'] || '');
    var url = normalizarUrlGithub(strVal(r['url_github'] || r['url'] || ''));
    if (id && url) map[id] = url;
  });
  return map;
}

// ── CLUBES ────────────────────────────────────────────────────
// Hoja: "clubes" — col: id_clubes, nombre_club, instagram, url_escudo, descripcion_club, activo
function getClubes(ss) {
  var sheet = getSheet(ss, ['clubes','Clubes']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        id:          strVal(r['id_clubes'] || r['id_club'] || r['id'] || ''),
        nombre:      strVal(r['nombre_club'] || r['nombre'] || ''),
        instagram:   strVal(r['instagram'] || ''),
        escudo_url:  normalizarUrlGithub(strVal(r['url_escudo'] || r['escudo_url'] || '')),
        descripcion: strVal(r['descripcion_club'] || r['descripcion'] || ''),
      };
    })
    .filter(function(c){ return c.nombre !== ''; });
}

// ── POSICIONES + FORMA RECIENTE ───────────────────────────────
// Hoja: "tabla posiciones" — col: categoria, posiciones, equipo, pts, pj, pg, pe, PP, gf, gc, dg
function getPosiciones(ss, resultados) {
  var sheet = getSheet(ss, ['tabla posiciones','tabla_posiciones','posiciones','Posiciones','Tabla de Posiciones']);
  var rows  = getRows(sheet);
  var filas = rows.map(function(r) {
    return {
      division:   normalizarCategoria(strVal(r['categoria'] || '')),
      pos:        numVal(r['posiciones'] || r['pos'] || ''),   // ← columna se llama "posiciones"
      club:       strVal(r['equipo'] || r['club'] || ''),
      pts:        numVal(r['pts']),
      pj:         numVal(r['pj']),
      g:          numVal(r['pg'] || r['g'] || ''),
      e:          numVal(r['pe'] || r['e'] || ''),
      p:          numVal(r['pp'] || r['p'] || ''),
      gf:         numVal(r['gf']),
      gc:         numVal(r['gc']),
      dg:         numVal(r['dg']),
      escudo_url: '',
      forma:      [],
    };
  }).filter(function(r){ return r.club !== ''; });

  // Calcular forma reciente
  if (resultados && resultados.length) {
    filas.forEach(function(fila) {
      var partidos = resultados.filter(function(res) {
        return res.division === fila.division &&
          (res.local.toLowerCase() === fila.club.toLowerCase() ||
           res.visita.toLowerCase() === fila.club.toLowerCase());
      }).sort(function(a,b){ return b.fecha_num - a.fecha_num; }).slice(0,5);

      fila.forma = partidos.map(function(res) {
        var esLocal = res.local.toLowerCase() === fila.club.toLowerCase();
        var gf = esLocal ? res.goles_local  : res.goles_visita;
        var gc = esLocal ? res.goles_visita : res.goles_local;
        if (gf > gc) return 'G';
        if (gf === gc) return 'E';
        return 'P';
      }).reverse();
    });
  }
  return filas;
}

// ── RESULTADOS ────────────────────────────────────────────────
// Hoja: "resultados" — col: resultados, categoria, local, gl, visitante, gv
function getResultados(ss) {
  var sheet = getSheet(ss, ['resultados','Resultados']);
  var rows  = getRows(sheet);
  return rows.map(function(r) {
    var fechaStr = strVal(r['resultados'] || r['fecha'] || '');
    var m = fechaStr.match(/(\d+)/);
    return {
      fecha_num:    m ? parseInt(m[1]) : 0,
      fecha_label:  fechaStr,
      division:     normalizarCategoria(strVal(r['categoria'] || r['categoría'] || '')),
      local:        strVal(r['local']),
      goles_local:  numVal(r['gl']),
      visita:       strVal(r['visitante']),
      goles_visita: numVal(r['gv']),
    };
  }).filter(function(r){ return r.local !== '' && r.visita !== ''; });
}

// ── GOLEADORES ────────────────────────────────────────────────
// Hoja: "goleadores " — col: categoria, nombre_jugador, goles, equipo, activo
function getGoleadores(ss) {
  var sheet = getSheet(ss, ['goleadores','Goleadores']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        nombre:    strVal(r['nombre_jugador'] || r['nombre'] || ''),
        club:      strVal(r['equipo'] || r['club'] || ''),
        cantidad:  numVal(r['goles'] || r['cantidad'] || ''),
        division:  normalizarCategoria(strVal(r['categoria'] || '1° Masculino')),
        escudo_url:'',
      };
    })
    .filter(function(r){ return r.nombre !== ''; })
    .sort(function(a,b){ return b.cantidad - a.cantidad; })
    .map(function(r,i){ r.pos = i+1; return r; });
}

// ── VALLAS ────────────────────────────────────────────────────
function getVallas(ss) {
  var sheet = getSheet(ss, ['vallas','Vallas','vallas invictas']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        nombre:    strVal(r['nombre'] || r['nombre_jugador'] || r['arquero'] || ''),
        club:      strVal(r['equipo'] || r['club'] || ''),
        cantidad:  numVal(r['partidos'] || r['vallas'] || r['cantidad'] || ''),
        escudo_url:'',
      };
    })
    .filter(function(r){ return r.nombre !== ''; })
    .sort(function(a,b){ return b.cantidad - a.cantidad; })
    .map(function(r,i){ r.pos = i+1; return r; });
}

// ── PRÓXIMOS PARTIDOS ─────────────────────────────────────────
// Hoja: "proximos partidos"
// ESTRUCTURA REAL: col A = categoria (sin header), col B = local, col C = visitante,
//                  col D = horario_dia, col E = cancha, col F = num_fecha, col G = notificaciones
// NOTA: la fila 1 tiene headers pero col A tiene None como header
function getProximos(ss) {
  var sheet = getSheet(ss, ['proximos partidos','proximos_partidos','Próximos Partidos','proximos']);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  // Leer headers de fila 1
  var headers = data[0].map(function(h){ return String(h||'').trim().toLowerCase().replace(/\s+/g,'_'); });
  // Col 0 no tiene header (None) → es la división/categoría
  var idxDiv     = 0; // siempre col A
  var idxLocal   = headers.indexOf('local_') !== -1 ? headers.indexOf('local_') : headers.indexOf('local') !== -1 ? headers.indexOf('local') : 1;
  var idxVisita  = headers.indexOf('visitante') !== -1 ? headers.indexOf('visitante') : 2;
  var idxHora    = headers.indexOf('horario_dia') !== -1 ? headers.indexOf('horario_dia') : 3;
  var idxCancha  = headers.indexOf('cancha') !== -1 ? headers.indexOf('cancha') : 4;
  var idxFecha   = headers.indexOf('num_fecha') !== -1 ? headers.indexOf('num_fecha') : 5;
  var idxNotif   = headers.indexOf('notificaciones_') !== -1 ? headers.indexOf('notificaciones_') : headers.indexOf('notificaciones') !== -1 ? headers.indexOf('notificaciones') : 6;

  var results = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var local  = String(row[idxLocal]  || '').trim();
    var visita = String(row[idxVisita] || '').trim();
    if (!local || !visita) continue;

    var division = normalizarCategoria(String(row[idxDiv] || '').trim());
    var hora     = row[idxHora] instanceof Date
      ? Utilities.formatDate(row[idxHora], Session.getScriptTimeZone(), 'HH:mm yyyy-MM-dd')
      : String(row[idxHora] || '').trim();

    results.push({
      division:     division,
      local:        local,
      visita:       visita,
      hora:         hora,
      cancha:       String(row[idxCancha] || '').trim(),
      fecha_label:  String(row[idxFecha]  || '').trim(),
      notificacion: String(row[idxNotif]  || '').trim().toLowerCase() === 'si',
      escudo_local: '',
      escudo_visita:'',
    });
  }
  return results;
}

// ── VIDEOS ────────────────────────────────────────────────────
// Hoja: "videos " — col: id, fecha_publicacion, categoria, fecha_torneo, medio, titulo_app, url_video, tipo_contenido
function getVideos(ss) {
  var sheet = getSheet(ss, ['videos','Videos']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){
      var url = strVal(r['url_video'] || r['url'] || '');
      return url !== '' && url !== 'undefined';
    })
    .map(function(r) {
      var url  = strVal(r['url_video'] || r['url'] || '');
      var ytId = extraerYoutubeId(url);
      var tipo = strVal(r['tipo_contenido'] || r['tipo'] || '').toLowerCase();
      return {
        id:           numVal(r['id'] || ''),
        fecha_pub:    strVal(r['fecha_publicacion'] || ''),
        categoria:    normalizarCategoria(strVal(r['categoria'] || '')),
        fecha_torneo: strVal(r['fecha_torneo'] || ''),
        medio:        strVal(r['medio'] || ''),
        titulo:       strVal(r['titulo_app'] || r['titulo'] || ''),
        youtube_id:   ytId,
        url_original: url,
        tipo:         tipo,
        es_en_vivo:   tipo.indexOf('vivo') !== -1 || tipo.indexOf('live') !== -1,
        es_resumen:   tipo.indexOf('resumen') !== -1,
        thumb:        ytId ? 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg' : '',
      };
    })
    .filter(function(r){ return r.youtube_id !== ''; })
    .sort(function(a,b){ return b.id - a.id; });
}

// ── TRIBUNAL ──────────────────────────────────────────────────
// Hoja: "tribunal" — col: titulo(número), fecha, descripcion, pdf, activo
function getTribunal(ss) {
  var sheet = getSheet(ss, ['tribunal','Tribunal','tribunal de penas','Tribunal de Penas']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      // En el Sheets "titulo" contiene el número del boletín (ej: 1185)
      var numeroRaw = strVal(r['titulo'] || r['numero'] || '');
      var numero    = numVal(numeroRaw) || 0;
      var pdfUrl    = normalizarUrlGithub(strVal(r['pdf'] || r['pdf_url'] || r['url'] || ''));
      return {
        numero:      numero,
        fecha:       strVal(r['fecha'] || r['fecha_'] || ''),
        descripcion: strVal(r['descripcion'] || r['descripción'] || ('Boletín N° ' + numero)),
        pdf_url:     pdfUrl,
        imagen_url:  normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
      };
    })
    .filter(function(r){ return r.numero > 0 || r.fecha !== ''; })
    .sort(function(a,b){ return b.numero - a.numero; });
}

// ── COMERCIOS ─────────────────────────────────────────────────
// Hoja: "comercios " — col: comercio, rubro, mensaje, imagen, whatsapp, instagram, tik tok, boton_texto, link_externo, destacado, activo
function getComercios(ss) {
  var sheet = getSheet(ss, ['comercios','Comercios']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        nombre:      strVal(r['comercio'] || r['nombre'] || ''),
        rubro:       strVal(r['rubro'] || ''),
        mensaje:     strVal(r['mensaje'] || ''),
        whatsapp:    strVal(r['whatsapp'] || ''),
        instagram:   strVal(r['instagram'] || ''),
        tiktok:      strVal(r['tik_tok'] || r['tiktok'] || ''),
        boton_texto: strVal(r['boton_texto'] || ''),
        link_externo:strVal(r['link_externo'] || ''),
        destacado:   boolVal(r['destacado'] || 'no'),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen'] || r['imagen_'] || r['logo_url'] || '')),
      };
    })
    .filter(function(r){ return r.nombre !== ''; });
}

// ── TRANSMISIONES ─────────────────────────────────────────────
// Hoja: "transmisiones" — col: categoria, url, Inicio, fin, canal, activo
// NOTA: Inicio y fin son objetos Date en el Sheets
function getTransmisiones(ss) {
  var sheet = getSheet(ss, ['transmisiones','Transmisiones']);
  var rows  = getRows(sheet);
  var ahora = new Date();

  return rows.map(function(r) {
    var url      = strVal(r['url'] || r['_url'] || '');
    var categoria = normalizarCategoria(strVal(r['categoria'] || ''));
    var canal    = strVal(r['canal'] || '');

    // Inicio y fin pueden ser Date objects
    var inicioRaw = r['inicio'] || r['inicio_'] || r['inicio '] || null;
    var finRaw    = r['fin']    || r['fin_']    || r['fin ']    || null;
    var inicio    = inicioRaw instanceof Date ? inicioRaw : (inicioRaw ? new Date(inicioRaw) : null);
    var fin       = finRaw    instanceof Date ? finRaw    : (finRaw    ? new Date(finRaw)    : null);

    var estado = 'programado';
    var minutosParaInicio = inicio ? (inicio - ahora) / 60000 : 999;
    if (inicio && fin && ahora >= inicio && ahora <= fin) estado = 'en_vivo';
    else if (fin && ahora > fin)                          estado = 'finalizado';
    else if (minutosParaInicio <= 60 && minutosParaInicio > 0) estado = 'proximo';

    var ytId = url ? extraerYoutubeId(url) : '';
    var inicioStr = inicio ? Utilities.formatDate(inicio, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : '';
    var finStr    = fin    ? Utilities.formatDate(fin,    Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : '';

    return {
      titulo:    categoria + (canal ? ' · ' + canal : ''),
      categoria: categoria,
      canal:     canal,
      url:       url,
      youtube_id:ytId,
      inicio:    inicioStr,
      fin:       finStr,
      estado:    estado,
      activo:    boolVal(r['activo'] || 'no'),
    };
  }).filter(function(r){ return r.categoria !== ''; });
}

// ── NOTICIAS ──────────────────────────────────────────────────
// Hoja: "noticias" — col: tipo, titulo, imagen_url, texto, boton_texto, boton_url, activo
function getNoticias(ss) {
  var sheet = getSheet(ss, ['noticias','Noticias']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        tipo:        strVal(r['tipo'] || ''),
        titulo:      strVal(r['titulo'] || r['título'] || ''),
        detalle:     strVal(r['texto'] || r['detalle'] || ''),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
        boton_texto: strVal(r['boton_texto'] || ''),
        boton_url:   strVal(r['boton_url'] || ''),
      };
    })
    .filter(function(r){ return r.titulo !== ''; });
}

// ── SPONSORS ─────────────────────────────────────────────────
function getSponsors(ss) {
  var sheet = getSheet(ss, ['sponsors_tabla','sponsors','Sponsors']);
  if (!sheet) return {};
  var rows = getRows(sheet);
  var map  = {};
  rows.filter(function(r){ return boolVal(r['activo'] || 'no'); })
    .forEach(function(r) {
      var seccion = strVal(r['seccion'] || '');
      if (seccion) map[seccion] = {
        nombre:   strVal(r['nombre'] || ''),
        logo_url: normalizarUrlGithub(strVal(r['logo'] || r['logo_url'] || '')),
        url:      strVal(r['url'] || ''),
      };
    });
  return map;
}

// ── TEST ──────────────────────────────────────────────────────
function testGetAllData() {
  var resultados = getResultados(SpreadsheetApp.getActiveSpreadsheet());
  var result = getAllData(resultados);
  Logger.log(JSON.stringify(result, null, 2));
}

// ── PORTADA CARDS (hoja "portada") ────────────────────────────
// Hoja: "portada" — col: activo, orden, tipo, titulo, subtitulo, imagen_url,
//                        link_externo, etiqueta, etiqueta_club
function getPortadaCards(ss) {
  var sheet = getSheet(ss, ['portada','Portada']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r) {
      // Incluir activas y también las sin valor (default = activo)
      var activo = r['activo'];
      if (activo === '' || activo === null || activo === undefined) return true;
      return boolVal(activo);
    })
    .map(function(r) {
      return {
        activo:       boolVal(r['activo'] !== '' && r['activo'] !== null && r['activo'] !== undefined ? r['activo'] : 'si') ? 'si' : 'no',
        orden:        numVal(r['orden'] || 99),
        tipo:         strVal(r['tipo'] || 'imagen').toLowerCase().trim(),
        titulo:       strVal(r['titulo'] || r['título'] || ''),
        subtitulo:    strVal(r['subtitulo'] || r['subtítulo'] || ''),
        imagen_url:   normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
        link_externo: strVal(r['link_externo'] || r['link'] || ''),
        etiqueta:     strVal(r['etiqueta'] || '').toLowerCase().trim(),
        etiqueta_club:strVal(r['etiqueta_club'] || '').trim(),
        contenido:    strVal(r['contenido'] || ''),
        color_fondo:  strVal(r['color_fondo'] || ''),
      };
    })
    .filter(function(r) { return r.activo === 'si'; })
    .sort(function(a,b){ return a.orden - b.orden; });
}

// ============================================================
//  LIGA DEPARTAMENTAL FÚTBOL GUALEGUAY — Apps Script API v3
//  + MUNDIAL 2026 vía API-Football
// ============================================================

var TOKEN_SECRETO = 'pA_LigaGualeguay_2026_xK9m';

// ── API-FOOTBALL (Mundial 2026) ──────────────────────────────
var MUNDIAL_LEAGUE_ID = 1;
var MUNDIAL_SEASON    = 2026;
var API_BASE          = 'https://v3.football.api-sports.io';
var MUNDIAL_CACHE_TTL = 300; // segundos

// ── CACHE (persiste entre ejecuciones) ───────────────────────
function apiCacheGet(key) {
  var raw = CacheService.getScriptCache().get(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

function apiCacheSet(key, value) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), MUNDIAL_CACHE_TTL);
  } catch(e) {
    Logger.log('Cache write error: ' + e.message);
  }
}

// ── CONFIGURAR API KEY (ejecutar UNA vez) ───────────────────
function configurarApiKeyFootball() {
  PropertiesService.getScriptProperties().setProperty('API_FOOTBALL_KEY', 'ab9be1a59cb81afbd99b937a60994aee');
  Logger.log('✅ API_FOOTBALL_KEY guardada en Script Properties');
}

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
  'primera masculino':   'Primera Masculino',
  '1 masculino':         'Primera Masculino',
  '1° masculino':        'Primera Masculino',
  'futbol masculino':    'Primera Masculino',
  'fútbol masculino':    'Primera Masculino',
  'primera femenino':    'Primera Femenino',
  '1 femenino':          'Primera Femenino',
  '1° femenino':         'Primera Femenino',
  'futbol femenino':     'Primera Femenino',
  'fútbol femenino':     'Primera Femenino',
  'sub 18 femenino':     'Sub 18 Femenino',
  'sub-18 femenino':     'Sub 18 Femenino',
  'sub18 femenino':      'Sub 18 Femenino',
  'sub 14 femenino':     'Sub 14 Femenino',
  'sub-14 femenino':     'Sub 14 Femenino',
  'sub14 femenino':      'Sub 14 Femenino',
  'tercera division':    'Tercera División',
  'tercera división':    'Tercera División',
  '3 division':          'Tercera División',
  '3° division':         'Tercera División',
  '3 división':          'Tercera División',
  '3° división':         'Tercera División',
  'cuarta division':     'Cuarta División',
  'cuarta división':     'Cuarta División',
  '4 division':          'Cuarta División',
  '4° division':         'Cuarta División',
  '4 división':          'Cuarta División',
  '4° división':         'Cuarta División',
  'quinta division':     'Quinta División',
  'quinta división':     'Quinta División',
  '5 division':          'Quinta División',
  '5° division':         'Quinta División',
  '5 división':          'Quinta División',
  '5° división':         'Quinta División',
  'sexta division':      'Sexta División',
  'sexta división':      'Sexta División',
  '6 division':          'Sexta División',
  '6° division':         'Sexta División',
  '6 división':          'Sexta División',
  '6° división':         'Sexta División',
  'septima division':    'Séptima División',
  'septima división':    'Séptima División',
  'séptima division':    'Séptima División',
  'séptima división':    'Séptima División',
  '7 division':          'Séptima División',
  '7° division':         'Séptima División',
  '7 división':          'Séptima División',
  '7° división':         'Séptima División',
  'categoria 2015':      'Categoría 2015',
  'categoría 2015':      'Categoría 2015',
  'inf. 2015':           'Categoría 2015',
  'inf 2015':            'Categoría 2015',
  'categoria 2016':      'Categoría 2016',
  'categoría 2016':      'Categoría 2016',
  'inf. 2016':           'Categoría 2016',
  'inf 2016':            'Categoría 2016',
  'categoria 2017':      'Categoría 2017',
  'categoría 2017':      'Categoría 2017',
  'inf. 2017':           'Categoría 2017',
  'inf 2017':            'Categoría 2017',
  'categoria 2018':      'Categoría 2018',
  'categoría 2018':      'Categoría 2018',
  'inf. 2018':           'Categoría 2018',
  'inf 2018':            'Categoría 2018',
  'supercopa':           'Supercopa',
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

// ── HOJAS: mapa optimizado (un solo recorrido) ───────────────
function buildSheetMap(ss) {
  var map = {};
  ss.getSheets().forEach(function(s) {
    map[s.getName().trim().toLowerCase()] = s;
  });
  return map;
}

function getSheetByMap(map, nombres) {
  for (var i = 0; i < nombres.length; i++) {
    var key = nombres[i].toLowerCase().trim();
    if (map[key]) return map[key];
  }
  return null;
}

function getRows(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
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

// ── HELPER: responder JSON ───────────────────────────────────
function responder(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── PUNTO DE ENTRADA ─────────────────────────────────────────
function doGet(e) {
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';
  if (token !== TOKEN_SECRETO) {
    return responder({error:'Unauthorized'});
  }

  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  // Routing por action
  if (action === 'mundial') {
    var tab = e.parameter.tab || 'hoy';
    return responder(getMundialData(tab));
  } else if (action === 'enviarNotif') {
    var titulo  = e.parameter.titulo  || 'Liga Gualeguay';
    var mensaje = e.parameter.mensaje || '';
    var dest    = e.parameter.dest    || 'todos';
    var club    = e.parameter.club    || '';
    
    if (!mensaje) return responder({ error: 'Sin mensaje' });
    
    return responder(enviarNotifFCM(titulo, mensaje, dest, club));
  }

  // Comportamiento original: devolver todo
  var result;
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetMap = buildSheetMap(ss);
    var resultados = getResultados(sheetMap);
    result = getAllData(sheetMap, resultados);
  } catch(err) {
    result = {error: err.toString(), stack: err.stack};
  }
  return responder(result);
}

function getAllData(sheetMap, resultados) {
  return {
    config:               getConfig(sheetMap),
    recursos:             getRecursos(sheetMap),
    clubes:               getClubes(sheetMap),
    posiciones:           getPosiciones(sheetMap, resultados),
    resultados:           resultados,
    goleadores:           getGoleadores(sheetMap),
    vallas:               getVallas(sheetMap),
    proximos:             getProximos(sheetMap),
    videos:               getVideos(sheetMap),
    tribunal:             getTribunal(sheetMap),
    comercios:            getComercios(sheetMap),
    transmisiones:        getTransmisiones(sheetMap),
    noticias:             getNoticias(sheetMap),
    sponsors:             getSponsors(sheetMap),
    portada_cards:        getPortadaCards(sheetMap),
    galeria:              getSliderPublicidades(sheetMap),
    slider_publicidades:  getSliderPublicidades(sheetMap),
    envivo_admin:         getEnVivoAdmin(sheetMap),
  };
}

// ── CONFIG ────────────────────────────────────────────────────
function getConfig(map) {
  var sheet = getSheetByMap(map, ['configuración','configuracion','Configuración','Configuracion','Config']);
  var rows  = getRows(sheet);
  var cfg   = {};
  rows.forEach(function(r) {
    var clave = strVal(r['campo_clave'] || r['campo'] || r['clave'] || '')
      .toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
      .replace(/[úùü]/g,'u').replace(/ñ/g,'n')
      .replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
    var valor = strVal(r['valor'] || r['value'] || '');
    if (clave) cfg[clave] = valor;
  });
  return cfg;
}

// ── RECURSOS ──────────────────────────────────────────────────
function getRecursos(map) {
  var sheet = getSheetByMap(map, ['recursos','Recursos']);
  var rows  = getRows(sheet);
  var out   = {};
  rows.forEach(function(r) {
    if (!boolVal(r['activo'] !== undefined ? r['activo'] : 'si')) return;
    var id  = strVal(r['id_recurso'] || r['id'] || '');
    var url = normalizarUrlGithub(strVal(r['url_github'] || r['url'] || ''));
    if (id && url) out[id] = url;
  });
  return out;
}

// ── CLUBES ────────────────────────────────────────────────────
function getClubes(map) {
  var sheet = getSheetByMap(map, ['clubes','Clubes']);
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
function getPosiciones(map, resultados) {
  var sheet = getSheetByMap(map, ['tabla posiciones','tabla_posiciones','posiciones','Posiciones','Tabla de Posiciones']);
  var rows  = getRows(sheet);
  var filas = rows.map(function(r) {
    return {
      division:   normalizarCategoria(strVal(r['categoria'] || '')),
      pos:        numVal(r['posiciones'] || r['pos'] || ''),
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
function getResultados(map) {
  var sheet = getSheetByMap(map, ['resultados','Resultados']);
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
function getGoleadores(map) {
  var sheet = getSheetByMap(map, ['goleadores','Goleadores']);
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
function getVallas(map) {
  var sheet = getSheetByMap(map, ['vallas','Vallas','vallas invictas']);
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
function getProximos(map) {
  var sheet = getSheetByMap(map, ['proximos partidos','proximos_partidos','Próximos Partidos','proximos']);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h){ return String(h||'').trim().toLowerCase().replace(/\s+/g,'_'); });
  var idxDiv    = 0;
  var idxLocal  = headers.indexOf('local_') !== -1 ? headers.indexOf('local_') : headers.indexOf('local') !== -1 ? headers.indexOf('local') : 1;
  var idxVisita = headers.indexOf('visitante') !== -1 ? headers.indexOf('visitante') : 2;
  var idxHora   = headers.indexOf('horario_dia') !== -1 ? headers.indexOf('horario_dia') : 3;
  var idxCancha = headers.indexOf('cancha') !== -1 ? headers.indexOf('cancha') : 4;
  var idxFecha  = headers.indexOf('num_fecha') !== -1 ? headers.indexOf('num_fecha') : 5;
  var idxNotif  = headers.indexOf('notificaciones_') !== -1 ? headers.indexOf('notificaciones_') : headers.indexOf('notificaciones') !== -1 ? headers.indexOf('notificaciones') : 6;

  var tz    = 'America/Argentina/Buenos_Aires';
  var ahora = new Date();
  var DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

  var results = [];
  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var local  = String(row[idxLocal]  || '').trim();
    var visita = String(row[idxVisita] || '').trim();
    if (!local || !visita) continue;

    var division = normalizarCategoria(String(row[idxDiv] || '').trim());
    var rawHora  = row[idxHora];
    var horaStr  = '';
    var diaLabel = '';
    var fechaISO = '';
    var jugado   = false;

    if (rawHora instanceof Date && !isNaN(rawHora.getTime())) {
      horaStr  = Utilities.formatDate(rawHora, tz, 'HH:mm');
      fechaISO = Utilities.formatDate(rawHora, tz, 'yyyy-MM-dd');
      var dd   = rawHora.getDate();
      var mm   = rawHora.getMonth() + 1;
      var diaSemana = DIAS[rawHora.getDay()];
      diaLabel = diaSemana + ' ' + (dd < 10 ? '0'+dd : dd) + '/' + (mm < 10 ? '0'+mm : mm);
      var dosHorasDespues = new Date(rawHora.getTime() + 2 * 60 * 60 * 1000);
      jugado = ahora > dosHorasDespues;
    } else {
      var raw = String(rawHora || '').trim();
      if (raw !== '') {
        var mHora = raw.match(/(\d{1,2}):(\d{2})/);
        if (mHora) horaStr = mHora[1].padStart(2,'0') + ':' + mHora[2];
        diaLabel = raw;
      }
    }

    results.push({
      division:      division,
      local:         local,
      visita:        visita,
      hora:          horaStr,
      dia_label:     diaLabel,
      fecha_iso:     fechaISO,
      cancha:        String(row[idxCancha] || '').trim(),
      fecha_label:   String(row[idxFecha]  || '').trim(),
      estado:        jugado ? 'jugado' : 'programado',
      notificacion:  String(row[idxNotif]  || '').trim().toLowerCase() === 'si',
      escudo_local:  '',
      escudo_visita: '',
    });
  }
  return results;
}

// ── VIDEOS ────────────────────────────────────────────────────
function getVideos(map) {
  var sheet = getSheetByMap(map, ['videos','Videos']);
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
function getTribunal(map) {
  var sheet = getSheetByMap(map, ['tribunal','Tribunal','tribunal de penas','Tribunal de Penas']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
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
function getComercios(map) {
  var sheet = getSheetByMap(map, ['comercios','Comercios']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] !== undefined ? r['activo'] : 'si'); })
    .map(function(r) {
      return {
        nombre:       strVal(r['comercio'] || r['nombre'] || ''),
        rubro:        strVal(r['rubro'] || ''),
        mensaje:      strVal(r['mensaje'] || ''),
        whatsapp:     strVal(r['whatsapp'] || ''),
        instagram:    strVal(r['instagram'] || ''),
        tiktok:       strVal(r['tik_tok'] || r['tiktok'] || ''),
        boton_texto:  strVal(r['boton_texto'] || ''),
        link_externo: strVal(r['link_externo'] || ''),
        destacado:    boolVal(r['destacado'] || 'no'),
        imagen_url:   normalizarUrlGithub(strVal(r['imagen'] || r['imagen_'] || r['logo_url'] || '')),
      };
    })
    .filter(function(r){ return r.nombre !== ''; });
}

// ── TRANSMISIONES ─────────────────────────────────────────────
function getTransmisiones(map) {
  var sheet = getSheetByMap(map, ['transmisiones','Transmisiones']);
  var rows  = getRows(sheet);
  var ahora = new Date();

  return rows.map(function(r) {
    var url       = strVal(r['url'] || r['_url'] || '');
    var categoria = normalizarCategoria(strVal(r['categoria'] || ''));
    var canal     = strVal(r['canal'] || '');

    var inicioRaw = r['inicio'] || r['inicio_'] || r['inicio '] || null;
    var finRaw    = r['fin']    || r['fin_']    || r['fin ']    || null;
    var inicio    = inicioRaw instanceof Date ? inicioRaw : (inicioRaw ? new Date(inicioRaw) : null);
    var fin       = finRaw    instanceof Date ? finRaw    : (finRaw    ? new Date(finRaw)    : null);

    var estado = 'programado';
    var mins   = inicio ? (inicio - ahora) / 60000 : 999;
    if (inicio && fin && ahora >= inicio && ahora <= fin)     estado = 'en_vivo';
    else if (fin && ahora > fin)                                estado = 'finalizado';
    else if (mins <= 60 && mins > 0)                           estado = 'proximo';

    var ytId      = url ? extraerYoutubeId(url) : '';
    var inicioStr = inicio ? Utilities.formatDate(inicio, 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm') : '';
    var finStr    = fin    ? Utilities.formatDate(fin,    'America/Argentina/Buenos_Aires', 'yyyy-MM-dd HH:mm') : '';

    return {
      titulo:     categoria + (canal ? ' · ' + canal : ''),
      categoria:  categoria,
      canal:      canal,
      url:        url,
      youtube_id: ytId,
      inicio:     inicioStr,
      fin:        finStr,
      estado:     estado,
      activo:     boolVal(r['activo'] || 'no'),
    };
  }).filter(function(r){ return r.categoria !== ''; });
}

// ── NOTICIAS ──────────────────────────────────────────────────
function getNoticias(map) {
  var sheet = getSheetByMap(map, ['noticias','Noticias']);
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
function getSponsors(map) {
  var sheet = getSheetByMap(map, ['sponsors_tabla','sponsors','Sponsors']);
  if (!sheet) return {};
  var rows = getRows(sheet);
  var out  = {};
  rows.filter(function(r){ return boolVal(r['activo'] || 'no'); })
    .forEach(function(r) {
      var seccion = strVal(r['seccion'] || '');
      if (seccion) out[seccion] = {
        nombre:   strVal(r['nombre'] || ''),
        logo_url: normalizarUrlGithub(strVal(r['logo'] || r['logo_url'] || '')),
        url:      strVal(r['url'] || ''),
      };
    });
  return out;
}

// ── SLIDER DE PUBLICIDADES ────────────────────────────────────
function getSliderPublicidades(map) {
  var sheet = getSheetByMap(map, ['slider_publicidades','slider publicidades','Slider Publicidades','slider']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r) {
      var a = r['activo'];
      return (a === '' || a === null || a === undefined) ? true : boolVal(a);
    })
    .map(function(r) {
      return {
        activo:      'si',
        orden:       numVal(r['orden'] || 99),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
        link_externo:strVal(r['link_externo'] || r['link'] || ''),
        alt_texto:   strVal(r['alt_texto'] || r['alt'] || r['nombre'] || 'Publicidad'),
      };
    })
    .filter(function(r){ return r.imagen_url !== ''; })
    .sort(function(a,b){ return a.orden - b.orden; });
}

// ── EN VIVO ADMIN ─────────────────────────────────────────────
// Devuelve un ARRAY con todos los partidos activos (multi-stream).
// Antes devolvía solo el primer activo como objeto único.
function getEnVivoAdmin(map) {
  var sheet = getSheetByMap(map, ['envivo_admin','en_vivo_admin','envivo admin','En Vivo Admin']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  var activos = rows.filter(function(r){ return boolVal(r['activo'] || 'no'); });
  if (!activos.length) return [];
  return activos.map(function(r, i) {
    var url   = strVal(r['url_stream'] || r['url'] || '');
    var notas = strVal(r['notas'] || '').trim().toLowerCase();
    return {
      activo:         true,
      url_stream:     url,
      youtube_id:     extraerYoutubeId(url),
      titulo_partido: strVal(r['titulo_partido'] || r['titulo'] || ''),
      canal:          strVal(r['canal'] || ''),
      notas:          strVal(r['notas'] || ''),
      es_vivo:        notas.indexOf('vivo') !== -1 && notas.indexOf('diferido') === -1,
      orden:          numVal(r['orden'] || (i + 1)),
    };
  }).sort(function(a, b){ return a.orden - b.orden; });
}

// ── PORTADA CARDS ────────────────────────────────────────────
function getPortadaCards(map) {
  var sheet = getSheetByMap(map, ['portada','Portada']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  var out  = [];
  rows.forEach(function(r) {
    var a = r['activo'];
    if (!(a === '' || a === null || a === undefined ? true : boolVal(a))) return;
    out.push({
      activo:        'si',
      orden:         numVal(r['orden'] || 99),
      tipo:          String(r['tipo'] || 'imagen').trim().toLowerCase(),
      titulo:        strVal(r['titulo'] || r['título'] || ''),
      subtitulo:     strVal(r['subtitulo'] || r['subtítulo'] || ''),
      imagen_url:    normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
      link_externo:  strVal(r['link_externo'] || r['link'] || ''),
      etiqueta:      strVal(r['etiqueta'] || '').trim(),
      etiqueta_club: strVal(r['etiqueta_club'] || '').trim(),
      contenido:     strVal(r['contenido'] || ''),
      color_fondo:   strVal(r['color_fondo'] || ''),
    });
  });
  return out.sort(function(a,b){ return a.orden - b.orden; });
}


// ============================================================
//  MUNDIAL 2026 — football-data.org (reemplaza el bloque anterior)
// ============================================================

var FD_BASE    = 'https://api.football-data.org/v4';
var FD_COMP    = 'WC';  // código del Mundial en football-data.org
var FD_CACHE_TTL = 300; // segundos

// ── Guardar API Key (ejecutar UNA vez) ───────────────────────
function configurarApiKeyFD() {
  PropertiesService.getScriptProperties()
    .setProperty('FD_API_KEY', '0f88d266174340268bfd85539f4d0df4');
  Logger.log('✅ FD_API_KEY guardada en Script Properties');
}

// ── Helper: llamada a football-data.org ──────────────────────
function apiFD(endpoint) {
  var cacheKey = 'fd_' + endpoint;
  var cached   = apiCacheGet(cacheKey);
  if (cached !== null) return cached;

  var apiKey = PropertiesService.getScriptProperties().getProperty('FD_API_KEY');
  if (!apiKey) {
    Logger.log('FD_API_KEY no configurada. Ejecutá configurarApiKeyFD()');
    return null;
  }

  var url = FD_BASE + endpoint;
  var options = {
    method: 'GET',
    headers: { 'X-Auth-Token': apiKey },
    muteHttpExceptions: true,
    timeout: 10000
  };

  try {
    var resp = UrlFetchApp.fetch(url, options);
    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('FD API error HTTP ' + code + ': ' + resp.getContentText());
      return null;
    }
    var json = JSON.parse(resp.getContentText());
    apiCacheSet(cacheKey, json);
    return json;
  } catch(e) {
    Logger.log('FD fetch error: ' + e.message);
    return null;
  }
}

// ── Traducir status de football-data.org → códigos cortos ───
function traducirStatusFD(status, minute) {
  var map = {
    'SCHEDULED':   'NS',
    'TIMED':       'NS',
    'IN_PLAY':     '1H',
    'PAUSED':      'HT',
    'FINISHED':    'FT',
    'AWARDED':     'FT',
    'POSTPONED':   'PST',
    'CANCELLED':   'CANC',
    'SUSPENDED':   'SUSP'
  };
  var s = map[status] || status || 'NS';
  // Si está en juego y tenemos minuto, devolvemos el minuto
  if (status === 'IN_PLAY' && minute) s = minute + "'";
  return s;
}

function traducirStatusTextoFD(status) {
  var map = {
    'SCHEDULED': 'No comenzado',
    'TIMED':     'No comenzado',
    'IN_PLAY':   'En juego',
    'PAUSED':    'Entretiempo',
    'FINISHED':  'Finalizado',
    'AWARDED':   'Finalizado',
    'POSTPONED': 'Postergado',
    'CANCELLED': 'Cancelado',
    'SUSPENDED': 'Suspendido'
  };
  return map[status] || status || '';
}

function esEnVivoFD(status) {
  return status === 'IN_PLAY' || status === 'PAUSED';
}

function esFinalizadoFD(status) {
  return status === 'FINISHED' || status === 'AWARDED';
}

// ── Traducir rondas al español ───────────────────────────────
function traducirRondaFD(stage) {
  var map = {
    'GROUP_STAGE':   'Fase de Grupos',
    'LAST_32':       'Ronda de 32',
    'LAST_16':       'Octavos de Final',
    'QUARTER_FINALS':'Cuartos de Final',
    'SEMI_FINALS':   'Semifinales',
    'THIRD_PLACE':   '3° y 4° Puesto',
    'FINAL':         'FINAL'
  };
  return map[stage] || stage || '';
}

// ── Formatear un partido al esquema que espera el frontend ───
function formatMatchFD(m) {
  var status  = m.status || 'SCHEDULED';
  var minute  = m.minute || null;
  var sCorto  = traducirStatusFD(status, minute);
  var vivo    = esEnVivoFD(status);
  var fin     = esFinalizadoFD(status);

  // Banderas: football-data.org provee crest (escudo) por equipo
  // Las banderas por ISO2 las construimos con flagcdn.com (gratis, sin key)
  var homeCrest = (m.homeTeam && m.homeTeam.crest) ? m.homeTeam.crest : '';
  var awayCrest = (m.awayTeam && m.awayTeam.crest) ? m.awayTeam.crest : '';

  var homeScore = null;
  var awayScore = null;
  if (m.score) {
    if (fin && m.score.fullTime) {
      homeScore = m.score.fullTime.home;
      awayScore = m.score.fullTime.away;
    } else if (vivo && m.score.halfTime) {
      homeScore = m.score.halfTime.home;
      awayScore = m.score.halfTime.away;
    }
  }

  return {
    fixture: {
      id:          m.id,
      date:        m.utcDate,
      status:      sCorto,
      status_text: traducirStatusTextoFD(status),
      en_vivo:     vivo,
      finalizado:  fin,
      elapsed:     minute,
      venue:       (m.venue || ''),
      venue_city:  ''
    },
    league: {
      round: traducirRondaFD(m.stage),
      group: m.group || '',
      name:  'FIFA World Cup 2026',
      flag:  ''
    },
    teams: {
      home: {
        name:   (m.homeTeam && m.homeTeam.name)      ? m.homeTeam.name      : 'Por definir',
        code:   (m.homeTeam && m.homeTeam.tla)       ? m.homeTeam.tla       : '',
        logo:   homeCrest,
        winner: (m.score && m.score.winner === 'HOME_TEAM')
      },
      away: {
        name:   (m.awayTeam && m.awayTeam.name)      ? m.awayTeam.name      : 'Por definir',
        code:   (m.awayTeam && m.awayTeam.tla)       ? m.awayTeam.tla       : '',
        logo:   awayCrest,
        winner: (m.score && m.score.winner === 'AWAY_TEAM')
      }
    },
    goals: {
      home: homeScore,
      away: awayScore
    },
    score: {
      halftime: {
        home: m.score && m.score.halfTime  ? m.score.halfTime.home  : null,
        away: m.score && m.score.halfTime  ? m.score.halfTime.away  : null
      },
      fulltime: {
        home: m.score && m.score.fullTime  ? m.score.fullTime.home  : null,
        away: m.score && m.score.fullTime  ? m.score.fullTime.away  : null
      },
      extratime: {
        home: m.score && m.score.extraTime ? m.score.extraTime.home : null,
        away: m.score && m.score.extraTime ? m.score.extraTime.away : null
      },
      penalty: {
        home: m.score && m.score.penalties ? m.score.penalties.home : null,
        away: m.score && m.score.penalties ? m.score.penalties.away : null
      }
    }
  };
}

// ── getMundialData (router) ──────────────────────────────────
function getMundialData(tab) {
  switch(tab) {
    case 'hoy':      return getMundialHoy();
    case 'fixture':  return getMundialFixture();
    case 'grupos':   return getMundialGrupos();
    case 'knockout': return getMundialKnockout();
    default:         return { error: 'Tab desconocida: ' + tab };
  }
}

// ── HOY ─────────────────────────────────────────────────────
function getMundialHoy() {
  var hoy  = Utilities.formatDate(
    new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd'
  );
  var data = apiFD('/competitions/' + FD_COMP + '/matches?dateFrom=' + hoy + '&dateTo=' + hoy);
  if (!data || !data.matches) return { fecha: hoy, matches: [], argentina: null };

  var matches    = data.matches.map(formatMatchFD);
  var argentina  = matches.filter(function(m) {
    return m.teams.home.name === 'Argentina' || m.teams.away.name === 'Argentina';
  });

  return {
    fecha:     hoy,
    matches:   matches,
    argentina: argentina.length ? argentina : null
  };
}

// ── FIXTURE COMPLETO ────────────────────────────────────────
function getMundialFixture() {
  var data = apiFD('/competitions/' + FD_COMP + '/matches');
  if (!data || !data.matches) return { matches: [] };

  var matches = data.matches.map(formatMatchFD);
  matches.sort(function(a, b) {
    return (a.fixture.date || '').localeCompare(b.fixture.date || '');
  });
  return { matches: matches };
}

// ── GRUPOS ──────────────────────────────────────────────────
function getMundialGrupos() {
  var data = apiFD('/competitions/' + FD_COMP + '/standings');
  if (!data || !data.standings) return { groups: {} };

  var grupos = {};
  data.standings.forEach(function(standing) {
    // football-data.org devuelve type: TOTAL / HOME / AWAY
    // Solo queremos TOTAL
    if (standing.type !== 'TOTAL') return;
    var grupo = standing.group || 'Grupo';
    // Normalizar nombre: "GROUP_A" → "Grupo A"
    var nombreGrupo = grupo.replace('GROUP_', 'Grupo ');

    grupos[nombreGrupo] = (standing.table || []).map(function(eq) {
      return {
        rank:   eq.position,
        team:   eq.team ? eq.team.name  : '',
        logo:   eq.team ? (eq.team.crest || '') : '',
        played: eq.playedGames,
        won:    eq.won,
        draw:   eq.draw,
        lost:   eq.lost,
        gf:     eq.goalsFor,
        gc:     eq.goalsAgainst,
        dg:     eq.goalDifference,
        points: eq.points,
        form:   eq.form || '',
        desc:   eq.description || ''
      };
    });
  });
  return { groups: grupos };
}

// ── ELIMINACIÓN DIRECTA ─────────────────────────────────────
function getMundialKnockout() {
  var data = apiFD('/competitions/' + FD_COMP + '/matches');
  if (!data || !data.matches) return { knockout: [] };

 var rondasOrden = [
  'LAST_32',
  'LAST_16', 
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL'
]; var rondasOrden = [
    'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS',
    'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'
  ];

  var porRonda = {};
  data.matches.forEach(function(m) {
    var stage = m.stage || '';
    if (rondasOrden.indexOf(stage) === -1) return;
    if (!porRonda[stage]) porRonda[stage] = [];
    porRonda[stage].push(formatMatchFD(m));
  });

  var result = [];
  rondasOrden.forEach(function(ronda) {
    if (porRonda[ronda] && porRonda[ronda].length) {
      result.push({
        name:    traducirRondaFD(ronda),
        matches: porRonda[ronda]
      });
    }
  });

  return { knockout: result };
}

// ============================================================
//  NOTIFICACIONES PUSH — FCM HTTP v1
// ============================================================
function enviarNotifFCM(titulo, mensaje, dest, club) {
  // Leer tokens desde Firebase REST API
  var dbUrl = 'https://liga-gualeguay-default-rtdb.firebaseio.com/usuarios.json';
  var token = ScriptApp.getOAuthToken();

  try {
    var resp = UrlFetchApp.fetch(dbUrl + '?auth=' + token, {
      method: 'GET', muteHttpExceptions: true
    });
    var usuarios = JSON.parse(resp.getContentText());
    if (!usuarios) return { enviados: 0, errores: 0 };

    // Recolectar tokens según destinatario
    var tokens = [];
    Object.keys(usuarios).forEach(function(uid) {
      var u = usuarios[uid];
      if (!u || !u.fcm_token || !u.notif_activo) return;
      if (dest === 'club' && u.club !== club) return;
      tokens.push(u.fcm_token);
    });

    if (!tokens.length) return { enviados: 0, errores: 0, msg: 'Sin tokens registrados' };

    // Enviar via FCM HTTP v1
    var projectId = 'liga-gualeguay';
    var fcmUrl = 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send';
    var oauthToken = ScriptApp.getOAuthToken();

    var enviados = 0;
    var errores  = 0;

    tokens.forEach(function(fcmToken) {
      var body = JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title: titulo, body: mensaje },
          data: { url: './', titulo: titulo, body: mensaje },
          webpush: {
            notification: {
              title: titulo, body: mensaje,
              icon: 'https://ligagualeguay.vercel.app/imagenes/logo-pasion-azul.png',
              badge: 'https://ligagualeguay.vercel.app/imagenes/logo-pasion-azul.png',
              vibrate: [200, 100, 200]
            },
            fcm_options: { link: 'https://ligagualeguay.vercel.app/' }
          }
        }
      });
      try {
        var r = UrlFetchApp.fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + oauthToken,
            'Content-Type': 'application/json'
          },
          payload: body,
          muteHttpExceptions: true
        });
        var code = r.getResponseCode();
        if (code === 200) { enviados++; }
        else {
          errores++;
          Logger.log('FCM error token ' + fcmToken.substring(0,10) + ': ' + r.getContentText());
        }
      } catch(e) {
        errores++;
        Logger.log('FCM fetch error: ' + e.message);
      }
    });

    return { enviados: enviados, errores: errores };
  } catch(e) {
    Logger.log('enviarNotifFCM error: ' + e.message);
    return { error: e.message };
  }
}

// ── DIAGNÓSTICO actualizado ──────────────────────────────────
function diagnosticCompleto() {
  Logger.log('=== DIAGNÓSTICO ===');

  var fdKey = PropertiesService.getScriptProperties().getProperty('FD_API_KEY');
  Logger.log('FD API Key: ' + (fdKey ? 'SÍ' : 'NO — ejecutá configurarApiKeyFD()'));

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var m  = buildSheetMap(ss);
  ['configuración','recursos','clubes','tabla posiciones','resultados','goleadores',
   'vallas','proximos partidos','videos','tribunal','comercios','transmisiones',
   'noticias','sponsors_tabla','slider_publicidades','envivo_admin','portada'
  ].forEach(function(h) {
    Logger.log((m[h] ? '✅' : '❌') + ' ' + h);
  });

  if (fdKey) {
    try {
      var r = UrlFetchApp.fetch(FD_BASE + '/competitions/' + FD_COMP, {
        method: 'GET',
        headers: { 'X-Auth-Token': fdKey },
        muteHttpExceptions: true
      });
      var st = JSON.parse(r.getContentText());
      Logger.log('Mundial WC: ' + (st.name ? '✅ ' + st.name : '❌ no encontrado'));
    } catch(e) {
      Logger.log('❌ FD API error: ' + e.message);
    }
  }
  Logger.log('=== FIN ===');
}


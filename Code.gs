// ============================================================
//  LIGA DEPARTAMENTAL FÚTBOL GUALEGUAY — Apps Script API v3
//  + MUNDIAL 2026 vía API-Football
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
  if (action === 'ligaprofesional') {
    var tab = e.parameter.tab || 'zonas';
    return responder(getLigaProfesionalData(tab));
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

// ── POSICIONES + FORMA RECIENTE + AUTOCÁLCULO ─────────────────
// Cualquier categoría con resultados cargados en la hoja "resultados" se
// recalcula sola (tabla, pts, pj, gf, gc, dg, forma, estado en vivo).
// Las categorías SIN resultados cargados siguen usando la hoja manual
// "tabla posiciones" como respaldo. Supercopa se suma sola (ver abajo).
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
      en_vivo:    false,
      vivo:       null,
    };
  }).filter(function(r){ return r.club !== ''; });

  // ── Forma reciente manual (para las categorías que NO se autocalculan) ──
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

  // ── Autocálculo desde "resultados": cualquier categoría con al menos
  //    un resultado cargado se recalcula sola y pisa la fila manual ──────
  var CATS_AUTO = [];
  if (resultados && resultados.length) {
    var vistos = {};
    resultados.forEach(function(res) {
      if (res.division && res.division !== 'Supercopa' && !vistos[res.division]) {
        vistos[res.division] = true;
        CATS_AUTO.push(res.division);
      }
    });
  }

  CATS_AUTO.forEach(function(catAuto) {
    var resCategoria = resultados.filter(function(res) { return res.division === catAuto; });
    if (!resCategoria.length) return;

    var tabla = {};
    resCategoria.forEach(function(res) {
      var local  = res.local.trim();
      var visita = res.visita.trim();
      var gl     = res.goles_local;
      var gv     = res.goles_visita;
      if (!local || !visita) return;
      if (!tabla[local])  tabla[local]  = {pts:0,pj:0,g:0,e:0,p:0,gf:0,gc:0,partidos:[],vivo:null};
      if (!tabla[visita]) tabla[visita] = {pts:0,pj:0,g:0,e:0,p:0,gf:0,gc:0,partidos:[],vivo:null};

      // Los goles/puntos del partido EN VIVO se suman igual que uno finalizado,
      // así la tabla refleja el parcial apenas se actualiza gl/gv en la hoja.
      tabla[local].pj++;  tabla[visita].pj++;
      tabla[local].gf  += gl; tabla[local].gc  += gv;
      tabla[visita].gf += gv; tabla[visita].gc += gl;
      if (gl > gv)       { tabla[local].g++;  tabla[local].pts  += 3; tabla[visita].p++; }
      else if (gl === gv){ tabla[local].e++;  tabla[local].pts  += 1; tabla[visita].e++; tabla[visita].pts += 1; }
      else               { tabla[visita].g++; tabla[visita].pts += 3; tabla[local].p++; }
      tabla[local].partidos.push({esLocal:true,  gl:gl, gv:gv, en_vivo:res.en_vivo});
      tabla[visita].partidos.push({esLocal:false, gl:gl, gv:gv, en_vivo:res.en_vivo});

      if (res.en_vivo) {
        var resLocal  = gl > gv ? 'G' : (gl === gv ? 'E' : 'P');
        var resVisita = gv > gl ? 'G' : (gl === gv ? 'E' : 'P');
        tabla[local].vivo  = {rival: visita, gf: gl, gc: gv, resultado: resLocal};
        tabla[visita].vivo = {rival: local,  gf: gv, gc: gl, resultado: resVisita};
      }
    });

    filas = filas.filter(function(f){ return f.division !== catAuto; });

    var pos = 1;
    var nuevas = Object.keys(tabla).map(function(club) {
      var t  = tabla[club];
      var dg = t.gf - t.gc;
      var completos = t.partidos.filter(function(p){ return !p.en_vivo; });
      var forma = completos.slice(-5).map(function(p) {
        var gf = p.esLocal ? p.gl : p.gv;
        var gc = p.esLocal ? p.gv : p.gl;
        if (gf > gc) return 'G'; if (gf === gc) return 'E'; return 'P';
      });
      return {division:catAuto, club:club, pts:t.pts, pj:t.pj, g:t.g, e:t.e, p:t.p,
              gf:t.gf, gc:t.gc, dg:dg, escudo_url:'', forma:forma,
              en_vivo: !!t.vivo, vivo: t.vivo, pos: 0};
    }).sort(function(a,b){
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg  !== a.dg)  return b.dg  - a.dg;
      return b.gf - a.gf;
    });
    nuevas.forEach(function(r){ r.pos = pos++; });
    filas = filas.concat(nuevas);
  });

  // ── SUPERCOPA — se calcula sola sumando Primera Masculino + 3° + 4° ──
  var supercopaCalc = calcularSupercopa(filas);
  if (supercopaCalc.length) {
    filas = filas.filter(function(f){ return f.division !== 'Supercopa'; });
    filas = filas.concat(supercopaCalc);
  }

  return filas;
}

// Suma pts, pj, gf, gc por club a través de Primera Masculino + 3° + 4° División
function calcularSupercopa(filas) {
  var DIVS_SUPERCOPA = ['Primera Masculino', 'Tercera División', 'Cuarta División'];
  var mapa = {};
  filas.forEach(function(f) {
    if (DIVS_SUPERCOPA.indexOf(f.division) === -1) return;
    if (!mapa[f.club]) mapa[f.club] = {pts:0, pj:0, gf:0, gc:0, en_vivo:false, divisiones:0};
    mapa[f.club].pts += f.pts;
    mapa[f.club].pj  += f.pj;
    mapa[f.club].gf  += f.gf;
    mapa[f.club].gc  += f.gc;
    mapa[f.club].divisiones++;
    if (f.en_vivo) mapa[f.club].en_vivo = true;
  });
  var clubes = Object.keys(mapa);
  if (!clubes.length) return [];
  var filasSuper = clubes.map(function(club) {
    var t = mapa[club];
    return {
      division: 'Supercopa', club: club, pts: t.pts, pj: t.pj,
      g: null, e: null, p: null,
      gf: t.gf, gc: t.gc, dg: t.gf - t.gc,
      escudo_url: '', forma: [], en_vivo: t.en_vivo, vivo: null,
      divisiones_computadas: t.divisiones
    };
  }).sort(function(a,b){
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg  !== a.dg)  return b.dg  - a.dg;
    return b.gf - a.gf;
  });
  var pos = 1;
  filasSuper.forEach(function(r){ r.pos = pos++; });
  return filasSuper;
}

// ── RESULTADOS ────────────────────────────────────────────────
// "estado" es OPCIONAL y retrocompatible: vacío = finalizado (igual que antes).
// Valores esperados: "en_curso" / "en vivo" → marca el partido como EN VIVO.
function getResultados(map) {
  var sheet = getSheetByMap(map, ['resultados','Resultados']);
  var rows  = getRows(sheet);
  return rows.map(function(r) {
    var fechaStr = strVal(r['resultados'] || r['fecha'] || '');
    var sF = fechaStr.toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e');
    var mR = sF.match(/ronda\s*(\d+)/), mFe = sF.match(/fecha\s*(\d+)/);
    var ordenGlobal = (mR || mFe)
      ? (mR ? parseInt(mR[1]) : 0) * 100 + (mFe ? parseInt(mFe[1]) : 0)
      : (fechaStr.match(/(\d+)/) ? parseInt(fechaStr.match(/(\d+)/)[1]) : 0);
    var estadoRaw = strVal(r['estado'] || '').toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u');
    var enVivo = estadoRaw.indexOf('curso') !== -1 || estadoRaw.indexOf('vivo') !== -1;
    return {
      fecha_num:    ordenGlobal,
      fecha_label:  fechaStr,
      division:     normalizarCategoria(strVal(r['categoria'] || r['categoría'] || '')),
      local:        strVal(r['local']),
      goles_local:  numVal(r['gl']),
      visita:       strVal(r['visitante']),
      goles_visita: numVal(r['gv']),
      en_vivo:      enVivo,
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
  var data    = sheet.getDataRange().getValues();
  var display = sheet.getDataRange().getDisplayValues(); // texto tal cual se ve en la celda, sin conversión de timezone
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
    var row        = data[i];
    var rowDisplay = display[i];
    var local  = String(row[idxLocal]  || '').trim();
    var visita = String(row[idxVisita] || '').trim();
    if (!local || !visita) continue;

    var division    = normalizarCategoria(String(row[idxDiv] || '').trim());
    var rawHora      = row[idxHora];
    var horaDisplay  = String(rowDisplay[idxHora] || '').trim(); // "15:00" tal cual está escrito en Sheets
    var horaStr  = '';
    var diaLabel = '';
    var fechaISO = '';
    var jugado   = false;

    if (rawHora instanceof Date && !isNaN(rawHora.getTime())) {
      // La HORA se toma del texto mostrado en la celda (nunca del objeto Date
      // convertido) — así evitamos el desfasaje horario según el timezone
      // configurado en el archivo de Sheets.
      var mHoraDisp = horaDisplay.match(/(\d{1,2}):(\d{2})/);
      horaStr = mHoraDisp
        ? (mHoraDisp[1].length < 2 ? '0' + mHoraDisp[1] : mHoraDisp[1]) + ':' + mHoraDisp[2]
        : Utilities.formatDate(rawHora, tz, 'HH:mm');

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
//  NOTIFICACIONES PUSH — FCM HTTP v1
// ============================================================
function enviarNotifFCM(titulo, mensaje, dest, club) {
  var dbUrl = 'https://liga-gualeguay-default-rtdb.firebaseio.com/usuarios.json';
  var token = ScriptApp.getOAuthToken();

  try {
    var resp = UrlFetchApp.fetch(dbUrl + '?auth=' + token, {
      method: 'GET', muteHttpExceptions: true
    });
    var usuarios = JSON.parse(resp.getContentText());
    if (!usuarios) return { enviados: 0, errores: 0 };

    var tokens = [];
    Object.keys(usuarios).forEach(function(uid) {
      var u = usuarios[uid];
      if (!u || !u.fcm_token || !u.notif_activo) return;
      if (dest === 'club' && u.club !== club) return;
      tokens.push(u.fcm_token);
    });

    if (!tokens.length) return { enviados: 0, errores: 0, msg: 'Sin tokens registrados' };

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
// ============================================================
//  LIGA PROFESIONAL ARGENTINA + COPA ARGENTINA — API-Football
//  Reemplaza todo el bloque anterior de "Mundial" (API-Football
//  viejo Y el bloque de football-data.org).
// ============================================================
var LPF_LEAGUE_ID      = 128; // Liga Profesional Argentina
var COPA_ARG_LEAGUE_ID = 130; // Copa Argentina
var AFA_SEASON         = 2026;
var AFA_BASE           = 'https://v3.football.api-sports.io';

// Snapshot guardado en Script Properties — lo llena el trigger cada 15 min.
// doGet SOLO lee esto, nunca llama a la API en el momento que alguien abre la app.
var AFA_PROP_KEY_LPF  = 'afa_snapshot_lpf';
var AFA_PROP_KEY_COPA = 'afa_snapshot_copa';
var AFA_PROP_KEY_TS   = 'afa_snapshot_ts';

// ── Helper: llamada a API-Football — SOLO la usa el trigger ──
function apiFootballFetch(endpoint) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('API_FOOTBALL_KEY');
  if (!apiKey) { Logger.log('API_FOOTBALL_KEY no configurada'); return null; }
  var url = AFA_BASE + endpoint;
  var options = {
    method: 'GET',
    headers: { 'x-apisports-key': apiKey },
    muteHttpExceptions: true,
    timeout: 10000
  };
  try {
    var resp = UrlFetchApp.fetch(url, options);
    if (resp.getResponseCode() !== 200) {
      Logger.log('API-Football error HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText());
      return null;
    }
    return JSON.parse(resp.getContentText());
  } catch(e) {
    Logger.log('API-Football fetch error: ' + e.message);
    return null;
  }
}

// ── TRIGGER — configurar UNA vez ──────────────────────────────
// Editor de Apps Script → ⏰ Activadores (panel izquierdo) → Agregar activador
//   Función a ejecutar: actualizarSnapshotAFA
//   Fuente del evento: Basado en tiempo
//   Tipo: Temporizador de minutos → Cada 45 minutos ✅ (confirmado con Fer:
//   3 llamadas por ejecución × 32 ejecuciones/día = 96/día, justo debajo
//   del límite de 100/día del plan free)
function actualizarSnapshotAFA() {
  var props = PropertiesService.getScriptProperties();

  // Liga Profesional: standings (Zona A/B) + fixtures
  var standingsLPF = apiFootballFetch('/standings?league=' + LPF_LEAGUE_ID + '&season=' + AFA_SEASON);
  var fixturesLPF  = apiFootballFetch('/fixtures?league=' + LPF_LEAGUE_ID + '&season=' + AFA_SEASON);
  if (standingsLPF && fixturesLPF) {
    props.setProperty(AFA_PROP_KEY_LPF, JSON.stringify({ standings: standingsLPF, fixtures: fixturesLPF }));
  } else {
    Logger.log('⚠️ No se pudo actualizar snapshot Liga Profesional — se mantiene el anterior');
  }

  // Copa Argentina: solo fixtures (formato copa, sin tabla de posiciones)
  var fixturesCopa = apiFootballFetch('/fixtures?league=' + COPA_ARG_LEAGUE_ID + '&season=' + AFA_SEASON);
  if (fixturesCopa) {
    props.setProperty(AFA_PROP_KEY_COPA, JSON.stringify({ fixtures: fixturesCopa }));
  } else {
    Logger.log('⚠️ No se pudo actualizar snapshot Copa Argentina — se mantiene el anterior');
  }

  props.setProperty(AFA_PROP_KEY_TS, String(Date.now()));
  Logger.log('✅ Snapshot AFA actualizado ' + new Date());
}

// Con el trigger cada 45 min: 3 llamadas × 32/día = 96/día — justo debajo
// del límite free. Si ves en el dashboard que sobra margen, podés bajar a
// cada 30 min los fines de semana (día de partido) más adelante.

// ── Lectura del snapshot (esto es lo que llama doGet) ─────────
function leerSnapshotAFA(key) {
  var raw = PropertiesService.getScriptProperties().getProperty(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

// ── Router (reemplaza a getMundialData) ────────────────────────
function getLigaProfesionalData(tab) {
  switch(tab) {
    case 'zonas':   return getLPFZonas();
    case 'anual':   return getLPFAnual();
    case 'fixture': return getLPFFixture();
    case 'copa':    return getCopaArgentina();
    default:        return { error: 'Tab desconocida: ' + tab };
  }
}

// ── ZONA A / ZONA B ─────────────────────────────────────────────
function getLPFZonas() {
  var snap = leerSnapshotAFA(AFA_PROP_KEY_LPF);
  if (!snap || !snap.standings || !snap.standings.response || !snap.standings.response.length) {
    return { zonas: {}, actualizado: null };
  }
  var tablas = snap.standings.response[0].league.standings || [];
  var zonas = {};
  tablas.forEach(function(zona, idx) {
    // API-Football suele traer el nombre de zona en cada equipo (group).
    // Si no viene, se lo asignamos por orden: Zona A, Zona B...
    var nombreZona = (zona[0] && zona[0].group) ? zona[0].group : 'Zona ' + String.fromCharCode(65 + idx);
    zonas[nombreZona] = zona.map(function(eq) {
      return {
        rank:   eq.rank,
        team:   eq.team.name,
        logo:   eq.team.logo,
        played: eq.all.played,
        won:    eq.all.win,
        draw:   eq.all.draw,
        lost:   eq.all.lose,
        gf:     eq.all.goals.for,
        gc:     eq.all.goals.against,
        dg:     eq.goalsDiff,
        points: eq.points,
        form:   eq.form || ''
      };
    });
  });
  return { zonas: zonas, actualizado: leerTimestampAFA() };
}

// ── TABLA ANUAL / ACUMULADA (Zona A + Zona B combinadas) ────────
function getLPFAnual() {
  var z = getLPFZonas().zonas;
  var todos = [];
  Object.keys(z).forEach(function(k){ todos = todos.concat(z[k]); });
  todos.sort(function(a,b){
    if (b.points !== a.points) return b.points - a.points;
    if (b.dg     !== a.dg)     return b.dg     - a.dg;
    return b.gf - a.gf;
  });
  todos.forEach(function(r, i){ r.rank = i + 1; });
  return { tabla: todos, actualizado: leerTimestampAFA() };
}

// ── FIXTURE COMPLETO LIGA PROFESIONAL ───────────────────────────
function getLPFFixture() {
  var snap = leerSnapshotAFA(AFA_PROP_KEY_LPF);
  if (!snap || !snap.fixtures || !snap.fixtures.response) return { matches: [] };
  var matches = snap.fixtures.response.map(formatMatchAFA);
  matches.sort(function(a, b){ return (a.fixture.date || '').localeCompare(b.fixture.date || ''); });
  return { matches: matches, actualizado: leerTimestampAFA() };
}

// ── COPA ARGENTINA (por rondas, formato eliminación) ────────────
function getCopaArgentina() {
  var snap = leerSnapshotAFA(AFA_PROP_KEY_COPA);
  if (!snap || !snap.fixtures || !snap.fixtures.response) return { rondas: [] };
  var porRonda = {};
  snap.fixtures.response.forEach(function(m) {
    var ronda = (m.league && m.league.round) ? m.league.round : 'Sin ronda';
    if (!porRonda[ronda]) porRonda[ronda] = [];
    porRonda[ronda].push(formatMatchAFA(m));
  });
  var rondas = Object.keys(porRonda).map(function(r) {
    return { name: r, matches: porRonda[r] };
  });
  return { rondas: rondas, actualizado: leerTimestampAFA() };
}

function leerTimestampAFA() {
  var ts = PropertiesService.getScriptProperties().getProperty(AFA_PROP_KEY_TS);
  return ts ? parseInt(ts) : null;
}

// ── Traducción de status de API-Football (ya vienen en códigos cortos) ──
function esEnVivoAFA(status) {
  return ['1H','HT','2H','ET','BT','P','LIVE','SUSP','INT'].indexOf(status) !== -1;
}
function esFinalizadoAFA(status) {
  return ['FT','AET','PEN'].indexOf(status) !== -1;
}

// ── Formatear un partido: API-Football ya viene casi en el formato
//    que espera el frontend (por eso el bloque de football-data.org
//    lo traducía A este mismo esquema). Acá solo normalizamos. ──────
function formatMatchAFA(m) {
  var statusShort = m.fixture.status.short;
  return {
    fixture: {
      id:          m.fixture.id,
      date:        m.fixture.date,
      status:      statusShort,
      status_text: m.fixture.status.long || '',
      en_vivo:     esEnVivoAFA(statusShort),
      finalizado:  esFinalizadoAFA(statusShort),
      elapsed:     m.fixture.status.elapsed,
      venue:       (m.fixture.venue && m.fixture.venue.name) || '',
      venue_city:  (m.fixture.venue && m.fixture.venue.city) || ''
    },
    league: {
      round: (m.league && m.league.round) || '',
      group: '',
      name:  (m.league && m.league.name)  || '',
      flag:  (m.league && m.league.flag)  || ''
    },
    teams: {
      home: { name: m.teams.home.name, code: '', logo: m.teams.home.logo, winner: m.teams.home.winner },
      away: { name: m.teams.away.name, code: '', logo: m.teams.away.logo, winner: m.teams.away.winner }
    },
    goals: { home: m.goals.home, away: m.goals.away },
    score: m.score
  };
}


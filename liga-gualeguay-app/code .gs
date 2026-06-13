// ============================================================
//  LIGA DEPARTAMENTAL FÚTBOL GUALEGUAY — Apps Script API v2
//  Archivo: Code.gs
//  Deploy: Aplicación web → Acceso: Cualquier persona
// ============================================================

var TOKEN_SECRETO = 'pA_LigaGualeguay_2026_xK9m';

// ── NORMALIZAR URLs DE GITHUB ────────────────────────────────
function normalizarUrlGithub(url) {
  if (!url || url.trim() === '') return '';
  url = url.trim();
  // Convertir blob/main a raw.githubusercontent.com
  // https://github.com/user/repo/blob/main/... → https://raw.githubusercontent.com/user/repo/main/...
  if (url.indexOf('github.com') !== -1 && url.indexOf('blob/') !== -1) {
    url = url
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  // Remover ?raw=true si ya es raw.githubusercontent
  if (url.indexOf('raw.githubusercontent.com') !== -1) {
    url = url.replace('?raw=true', '').replace('&raw=true', '');
  }
  // Agregar ?raw=true solo si todavía es github.com (no raw)
  if (url.indexOf('github.com') !== -1 && url.indexOf('?raw=true') === -1) {
    url = url + '?raw=true';
  }
  return url;
}

// ── EXTRAER YOUTUBE ID ───────────────────────────────────────
function extraerYoutubeId(url) {
  if (!url) return '';
  url = url.trim();
  var patrones = [
    /youtube\.com\/live\/([\w-]+)/,
    /youtube\.com\/watch\?v=([\w-]+)/,
    /youtu\.be\/([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
  ];
  for (var i = 0; i < patrones.length; i++) {
    var m = url.match(patrones[i]);
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
  'séptima division':    '7° División',
  'septima división':    '7° División',
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
  var k = str.trim().toLowerCase()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
    .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
    .replace(/[úùü]/g,'u').replace(/ñ/g,'n');
  return CAT_MAP[k] || str.trim();
}

// ── HELPERS ──────────────────────────────────────────────────
function strVal(v) {
  return (v === null || v === undefined) ? '' : String(v).trim();
}
function numVal(v) {
  var n = parseInt(v);
  return isNaN(n) ? 0 : n;
}
function boolVal(v) {
  return strVal(v).toLowerCase() === 'si' || strVal(v).toLowerCase() === 'sí';
}

function getSheet(ss, nombres) {
  var sheets = ss.getSheets();
  for (var i = 0; i < nombres.length; i++) {
    for (var j = 0; j < sheets.length; j++) {
      if (sheets[j].getName().trim().toLowerCase() === nombres[i].toLowerCase()) {
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
  var headers = data[0].map(function(h){ return strVal(h).toLowerCase().replace(/\s+/g,'_'); });
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
  // Verificar token
  var token = e && e.parameter && e.parameter.token ? e.parameter.token : '';
  if (token !== TOKEN_SECRETO) {
    return ContentService
      .createTextOutput(JSON.stringify({error:'Unauthorized'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var action = e.parameter.action || 'getData';
  var result;
  try {
    if (action === 'getData') result = getAllData();
    else result = {error: 'Acción desconocida'};
  } catch(err) {
    result = {error: err.toString()};
  }

  var output = ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── RECOLECTOR PRINCIPAL ─────────────────────────────────────
function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resultados = getResultados(ss);
  var posiciones = getPosiciones(ss, resultados);
  return {
    config:        getConfig(ss),
    recursos:      getRecursos(ss),
    clubes:        getClubes(ss),
    posiciones:    posiciones,
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
  };
}

// ── CONFIG ────────────────────────────────────────────────────
function getConfig(ss) {
  var sheet = getSheet(ss, ['configuracion','configuración','Configuracion','Configuración','Config','config']);
  var rows  = getRows(sheet);
  var map = {};
  rows.forEach(function(r) {
    var clave = strVal(r['campo_clave'] || r['campo'] || r['clave'] || r['key'] || '')
      .toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o')
      .replace(/[úùü]/g,'u').replace(/ñ/g,'n')
      .replace(/\s+/g,'_');
    var valor = strVal(r['valor'] || r['value'] || '');
    if (clave) map[clave] = valor;
  });
  return map;
}

// ── RECURSOS / BANNERS ────────────────────────────────────────
function getRecursos(ss) {
  var sheet = getSheet(ss, ['recursos','Recursos','banners','Banners']);
  var rows  = getRows(sheet);
  var map = {};
  rows.forEach(function(r) {
    var seccion = strVal(r['id'] || r['seccion_destino'] || r['seccion'] || '');
    var url     = normalizarUrlGithub(strVal(r['url_github'] || r['url'] || ''));
    if (seccion && url) map[seccion] = url;
  });
  return map;
}

// ── CLUBES ────────────────────────────────────────────────────
function getClubes(ss) {
  var sheet = getSheet(ss, ['clubes','Club','Clubes']);
  var rows  = getRows(sheet);
  return rows.map(function(r) {
    return {
      id:          numVal(r['id_club'] || r['id'] || ''),
      nombre:      strVal(r['nombre_club'] || r['club'] || r['nombre'] || ''),
      instagram:   strVal(r['instagram'] || ''),
      escudo_url:  normalizarUrlGithub(strVal(r['url_escudo'] || r['escudo_url'] || r['escudo'] || '')),
      descripcion: strVal(r['descripcion_club'] || r['descripcion'] || ''),
    };
  }).filter(function(c){ return c.nombre !== ''; });
}

// ── POSICIONES + FORMA RECIENTE ───────────────────────────────
function getPosiciones(ss, resultados) {
  var sheet = getSheet(ss, ['tabla_posiciones','posiciones','Posiciones','Tabla de Posiciones','tabla posiciones']);
  var rows  = getRows(sheet);
  var filas = rows.map(function(r) {
    return {
      division:   normalizarCategoria(strVal(r['categoria'] || r['categoría'] || r['division'] || '')),
      pos:        numVal(r['pos']),
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

  // Calcular forma reciente desde resultados
  if (resultados && resultados.length) {
    filas.forEach(function(fila) {
      var partidos = resultados.filter(function(res) {
        return res.division === fila.division &&
          (res.local.toLowerCase() === fila.club.toLowerCase() ||
           res.visita.toLowerCase() === fila.club.toLowerCase());
      }).sort(function(a,b){ return b.fecha_num - a.fecha_num }).slice(0,5);

      fila.forma = partidos.map(function(res) {
        var esLocal = res.local.toLowerCase() === fila.club.toLowerCase();
        var gf = esLocal ? res.goles_local  : res.goles_visita;
        var gc = esLocal ? res.goles_visita : res.goles_local;
        if (gf > gc) return 'G';
        if (gf === gc) return 'E';
        return 'P';
      }).reverse(); // más antiguo a la izquierda, más reciente a la derecha
    });
  }

  return filas;
}

// ── RESULTADOS ────────────────────────────────────────────────
function getResultados(ss) {
  var sheet = getSheet(ss, ['resultados','Resultados']);
  var rows  = getRows(sheet);
  return rows.map(function(r) {
    var fechaStr = strVal(r['resultados'] || r['fecha'] || '');
    var m = fechaStr.match(/(\d+)/);
    return {
      fecha_num:     m ? parseInt(m[1]) : 0,
      fecha_label:   fechaStr,
      division:      normalizarCategoria(strVal(r['categoria'] || r['categoría'] || '')),
      local:         strVal(r['local']),
      goles_local:   numVal(r['gl']),
      visita:        strVal(r['visitante']),
      goles_visita:  numVal(r['gv']),
      escudo_local:  '',
      escudo_visita: '',
    };
  }).filter(function(r){ return r.local !== '' && r.visita !== ''; });
}

// ── GOLEADORES ────────────────────────────────────────────────
function getGoleadores(ss) {
  var sheet = getSheet(ss, ['goleadores','Goleadores']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] === undefined ? 'si' : r['activo']); })
    .map(function(r, i) {
      return {
        pos:        i + 1,
        nombre:     strVal(r['nombre_jugador'] || r['nombre'] || ''),
        club:       strVal(r['equipo'] || r['club'] || ''),
        cantidad:   numVal(r['goles'] || r['cantidad'] || ''),
        division:   normalizarCategoria(strVal(r['categoria'] || r['division'] || 'Primera Masculino')),
        escudo_url: normalizarUrlGithub(strVal(r['escudo_url'] || '')),
      };
    })
    .filter(function(r){ return r.nombre !== ''; })
    .sort(function(a,b){ return b.cantidad - a.cantidad })
    .map(function(r, i){ r.pos = i+1; return r; });
}

// ── VALLAS ────────────────────────────────────────────────────
function getVallas(ss) {
  var sheet = getSheet(ss, ['vallas','Vallas','vallas invictas','Vallas Invictas']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] === undefined ? 'si' : r['activo']); })
    .map(function(r, i) {
      return {
        pos:        i + 1,
        nombre:     strVal(r['nombre'] || r['arquero'] || ''),
        club:       strVal(r['equipo'] || r['club'] || ''),
        cantidad:   numVal(r['partidos'] || r['vallas'] || r['cantidad'] || ''),
        escudo_url: normalizarUrlGithub(strVal(r['escudo_url'] || '')),
      };
    })
    .filter(function(r){ return r.nombre !== ''; })
    .sort(function(a,b){ return b.cantidad - a.cantidad })
    .map(function(r, i){ r.pos = i+1; return r; });
}

// ── PRÓXIMOS PARTIDOS ─────────────────────────────────────────
function getProximos(ss) {
  var sheet = getSheet(ss, ['proximos partidos','proximos_partidos','Próximos Partidos','proximos','Proximos']);
  var rows  = getRows(sheet);
  // Detectar cuál columna tiene la división
  return rows.map(function(r) {
    // La primera columna puede llamarse distinto según cómo armó Fer el Sheets
    var divisionRaw = strVal(
      r['division'] || r['categoria'] || r['categoría'] ||
      r['local\nvisitante'] || r['division_categoria'] || ''
    );
    // Si la "division" está mezclada con el local, intentar separar
    // Si tiene un local separado, usar ese
    var local  = strVal(r['local']     || '');
    var visita = strVal(r['visitante'] || '');

    // Saltar filas que son encabezados de sección (local vacío)
    if (!local || !visita) return null;

    return {
      division:      normalizarCategoria(divisionRaw),
      local:         local,
      visita:        visita,
      hora:          strVal(r['horario_dia'] || r['horario/dia'] || r['hora'] || ''),
      cancha:        strVal(r['cancha'] || ''),
      fecha_label:   strVal(r['num_fecha'] || r['fecha_label'] || ''),
      dia_label:     strVal(r['horario_dia'] || r['dia'] || ''),
      notificacion:  boolVal(r['notificaciones'] || 'no'),
      escudo_local:  '',
      escudo_visita: '',
    };
  }).filter(function(r){ return r !== null; });
}

// ── VIDEOS ────────────────────────────────────────────────────
function getVideos(ss) {
  var sheet = getSheet(ss, ['videos','Videos']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){
      var url = strVal(r['url_video'] || r['url'] || r['youtube_id'] || '');
      return url !== '';
    })
    .map(function(r) {
      var url  = strVal(r['url_video'] || r['url'] || '');
      var ytId = strVal(r['youtube_id'] || '');
      if (!ytId && url) ytId = extraerYoutubeId(url);

      var tipo = strVal(r['tipo_contenido'] || r['tipo'] || '').toLowerCase();
      var esEnVivo = tipo.indexOf('vivo') !== -1 || tipo.indexOf('live') !== -1;
      var esResumen = tipo.indexOf('resumen') !== -1;

      return {
        id:          numVal(r['id'] || ''),
        fecha_pub:   strVal(r['fecha_publicacion'] || ''),
        categoria:   normalizarCategoria(strVal(r['categoria'] || '')),
        fecha_torneo:strVal(r['fecha_torneo'] || ''),
        medio:       strVal(r['medio'] || ''),
        titulo:      strVal(r['titulo_app'] || r['titulo'] || ''),
        youtube_id:  ytId,
        url_original:url,
        tipo:        tipo,
        es_en_vivo:  esEnVivo,
        es_resumen:  esResumen,
        // Deep link para abrir en app YouTube nativa
        deep_link_android: ytId ? 'intent://watch?v=' + ytId + '#Intent;scheme=vnd.youtube;package=com.google.android.youtube;end' : '',
        deep_link_ios:     ytId ? 'youtube://watch?v=' + ytId : '',
        deep_link_web:     ytId ? 'https://www.youtube.com/watch?v=' + ytId : url,
        thumb:             ytId ? 'https://img.youtube.com/vi/' + ytId + '/mqdefault.jpg' : '',
      };
    })
    .filter(function(r){ return r.youtube_id !== ''; })
    .sort(function(a,b){ return b.id - a.id }); // más reciente primero
}

// ── TRIBUNAL ──────────────────────────────────────────────────
function getTribunal(ss) {
  var sheet = getSheet(ss, ['tribunal de penas','Tribunal de Penas','tribunal','Tribunal']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] === undefined ? 'si' : r['activo']); })
    .map(function(r) {
      var titulo   = strVal(r['titulo'] || r['título'] || '');
      var numero   = numVal(r['numero'] || r['id'] || titulo.match(/\d+/) && titulo.match(/\d+/)[0] || '0');
      var pdfUrl   = strVal(r['pdf'] || r['pdf_url'] || r['url'] || '');
      return {
        numero:      numero,
        fecha:       strVal(r['fecha'] || ''),
        descripcion: strVal(r['descripcion'] || r['descripción'] || titulo),
        pdf_url:     normalizarUrlGithub(pdfUrl),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
      };
    })
    .filter(function(r){ return r.numero > 0 || r.fecha !== ''; })
    .sort(function(a,b){ return b.numero - a.numero });
}

// ── COMERCIOS ─────────────────────────────────────────────────
function getComercios(ss) {
  var sheet = getSheet(ss, ['comercios','Comercios']);
  var rows  = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] === undefined ? 'si' : r['activo']); })
    .map(function(r) {
      return {
        nombre:      strVal(r['comercio'] || r['nombre'] || ''),
        rubro:       strVal(r['rubro'] || r['descripcion'] || ''),
        mensaje:     strVal(r['mensaje'] || ''),
        whatsapp:    strVal(r['whatsapp'] || ''),
        instagram:   strVal(r['instagram'] || ''),
        tiktok:      strVal(r['tik_tok'] || r['tiktok'] || ''),
        boton_texto: strVal(r['boton_texto'] || ''),
        link_externo:strVal(r['link_externo'] || ''),
        destacado:   boolVal(r['destacado'] || 'no'),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen'] || r['logo_url'] || '')),
      };
    })
    .filter(function(r){ return r.nombre !== ''; });
}

// ── TRANSMISIONES ─────────────────────────────────────────────
function getTransmisiones(ss) {
  var sheet = getSheet(ss, ['transmisiones','Transmisiones']);
  var rows  = getRows(sheet);
  var ahora = new Date();

  return rows.map(function(r) {
    var url      = strVal(r['url'] || '');
    var titulo   = strVal(r['titulo'] || r['título'] || '');
    var canal    = strVal(r['canal'] || '');
    var categoria = normalizarCategoria(strVal(r['categoria'] || ''));

    // Parsear fechas
    var inicioStr = strVal(r['inicio'] || r['inicio_'] || '');
    var finStr    = strVal(r['fin']    || r['fin_']    || '');
    var inicio    = inicioStr ? new Date(inicioStr) : null;
    var fin       = finStr    ? new Date(finStr)    : null;

    // Calcular estado
    var estado = 'programado';
    var minutosParaInicio = inicio ? (inicio - ahora) / 60000 : 999;
    if (inicio && fin && ahora >= inicio && ahora <= fin) {
      estado = 'en_vivo';
    } else if (fin && ahora > fin) {
      estado = 'finalizado'; // mostrar como repetición
    } else if (minutosParaInicio <= 60 && minutosParaInicio > 0) {
      estado = 'proximo';   // amarillo
    }

    var ytId = url ? extraerYoutubeId(url) : '';

    return {
      titulo:        titulo || categoria,
      categoria:     categoria,
      canal:         canal,
      url:           url,
      youtube_id:    ytId,
      deep_link:     ytId ? 'https://www.youtube.com/watch?v=' + ytId : url,
      inicio:        inicioStr,
      fin:           finStr,
      estado:        estado,         // en_vivo | proximo | programado | finalizado
      activo:        boolVal(r['activo'] || 'no'),
    };
  }).filter(function(r){ return r.categoria !== '' || r.url !== ''; });
}

// ── NOTICIAS ──────────────────────────────────────────────────
function getNoticias(ss) {
  var sheet = getSheet(ss, ['noticias','Noticias']);
  if (!sheet) return [];
  var rows = getRows(sheet);
  return rows
    .filter(function(r){ return boolVal(r['activo'] === undefined ? 'si' : r['activo']); })
    .map(function(r) {
      return {
        tipo:        strVal(r['tipo'] || ''),
        titulo:      strVal(r['titulo'] || r['título'] || ''),
        categoria:   normalizarCategoria(strVal(r['categoria'] || '')),
        nombre:      strVal(r['nombre'] || ''),
        equipo:      strVal(r['equipo'] || ''),
        detalle:     strVal(r['texto'] || r['detalle'] || ''),
        imagen_url:  normalizarUrlGithub(strVal(r['imagen_url'] || r['imagen'] || '')),
        boton_texto: strVal(r['boton_texto'] || ''),
        boton_url:   strVal(r['boton_url'] || ''),
      };
    })
    .filter(function(r){ return r.titulo !== ''; });
}

// ── SPONSORS POR SECCIÓN ──────────────────────────────────────
function getSponsors(ss) {
  var sheet = getSheet(ss, ['sponsors_tabla','sponsors','Sponsors']);
  if (!sheet) return {};
  var rows = getRows(sheet);
  var map  = {};
  rows
    .filter(function(r){ return boolVal(r['activo'] || 'no'); })
    .forEach(function(r) {
      var seccion = strVal(r['seccion'] || '');
      if (seccion) {
        map[seccion] = {
          nombre:   strVal(r['nombre'] || ''),
          logo_url: normalizarUrlGithub(strVal(r['logo'] || r['logo_url'] || '')),
          url:      strVal(r['url'] || ''),
        };
      }
    });
  return map;
}

// ── TEST ──────────────────────────────────────────────────────
function testGetAllData() {
  var result = getAllData();
  Logger.log(JSON.stringify(result, null, 2));
}

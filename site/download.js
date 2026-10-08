/* 养老金融区域指数数据库 · 前端数据下载
 *
 * 两种部署都能用：
 *   - 有后端（server.py）：直接调用 /api/download，服务端生成 CSV / XLSX / JSON；
 *   - 纯静态托管（无后端）：在浏览器内用内置的最简 ZIP 写入器生成真正的 .xlsx。
 */
(function () {
  'use strict';

  var EXPORT_COLS = ['指标代码', '指标名称', '四大类', '指标分组', '地区层级', '地区代码', '地区名称',
    '统计期', '数值', '单位', '时间类型', '制度对象', '统计范围', '审查状态', '证据等级',
    '来源机构', '权威来源'];
  var IND_COLS = ['指标代码', '指标名称', '四大类', '指标分组', '地区层级', '覆盖期', '单位',
    '当前状态', '数据层', '来源机构', '权威来源', '统计范围', '制度对象', '时间类型', '口径提示', '展示规则'];
  var CLASS_COLS = ['支柱层次', '指标主题', '来源表组', '数据用途', '分类版本', '分类依据', '原指标名称'];
  EXPORT_COLS = EXPORT_COLS.concat(CLASS_COLS, ['适用险种', '适用人群', '统筹区', '地区档次', '工资参考年度', '生效日期', '终止日期', '政策文号']);
  IND_COLS = IND_COLS.concat(['覆盖完整性'], CLASS_COLS);

  /* 是否具备后端下载接口：启动时探测一次，避免静态托管误判 */
  var HAS_API = false;
  function probeApi() {
    if (window.PORTAL_STATIC) { HAS_API = false; return; }
    if (!/^https?:$/.test(window.location.protocol)) { HAS_API = false; return; }
    fetch('/api/status', { method: 'GET' })
      .then(function (r) { HAS_API = r.ok; })
      .catch(function () { HAS_API = false; });
  }
  probeApi();

  /* ---------------------------------------------------------- 通用工具 */
  var ALL_VALUES = ['all', '__all__', '', '全部', '全部地区', '全部时期'];

  function isAll(v) { return ALL_VALUES.indexOf(String(v == null ? '' : v)) >= 0; }

  function state() {
    var nav = document.querySelector('.nav-item.active');
    var code = nav ? nav.getAttribute('data-code') : '';
    var regions = [], yFrom = '', yTo = '';
    var rsel = document.getElementById('region-filter');
    var ysel = document.getElementById('year-filter');
    if (!rsel && !ysel) {
      var sels = document.querySelectorAll('main select');
      rsel = sels[0] || null;
      ysel = sels[1] || null;
    }
    if (rsel && !isAll(rsel.value)) {
      var opt = rsel.options && rsel.selectedIndex >= 0 ? rsel.options[rsel.selectedIndex] : null;
      regions = [opt ? String(opt.textContent || opt.value).trim() : rsel.value];
    }
    if (ysel && !isAll(ysel.value)) { yFrom = ysel.value; yTo = ysel.value; }
    return { code: code || '', regions: regions, yearFrom: yFrom, yearTo: yTo,
             data: window.PORTAL_DATA || { records: [], indicators: [] } };
  }

  function indMap(data) {
    var m = {};
    ((data || {}).indicators || []).forEach(function (i) { m[i['指标代码']] = i; });
    return m;
  }

  function rowsFor(st, scope) {
    st = st || {};
    var data = st.data || window.PORTAL_DATA || { records: [], indicators: [] };
    var im = indMap(data), out = [];
    var regions = st.regions || [];
    (data.records || []).forEach(function (r) {
      if (scope !== 'all') {
        if (st.code && r['指标代码'] !== st.code) return;
        if (regions.length && regions.indexOf(r['地区名称']) < 0) return;
        var y = String(r['统计期'] || '');
        if (st.yearFrom && /^\d+$/.test(y) && +y < +st.yearFrom) return;
        if (st.yearTo && /^\d+$/.test(y) && +y > +st.yearTo) return;
      }
      var row = {};
      EXPORT_COLS.forEach(function (k) { row[k] = r[k] == null ? '' : r[k]; });
      var ind = im[r['指标代码']] || {};
      row['指标分组'] = ind['指标分组'] || '';
      CLASS_COLS.forEach(function (k) { row[k] = ind[k] || ''; });
      out.push(row);
    });
    out.sort(function (a, b) {
      return String(a['指标代码']).localeCompare(String(b['指标代码'])) ||
        String(a['地区名称']).localeCompare(String(b['地区名称'])) ||
        String(a['统计期']).localeCompare(String(b['统计期']));
    });
    return out;
  }

  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  function saveBlob(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1200);
  }

  /* ---------------------------------------------------------- CSV */
  function toCsv(rows, fields) {
    var q = function (v) {
      var s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var lines = [fields.map(q).join(',')];
    rows.forEach(function (r) { lines.push(fields.map(function (f) { return q(r[f]); }).join(',')); });
    return '\ufeff' + lines.join('\r\n');
  }

  /* ---------------------------------------------------------- 最简 ZIP（store，无压缩） */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(str) {
    if (window.TextEncoder) return new TextEncoder().encode(str);
    var s = unescape(encodeURIComponent(str)), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  function zipStore(files) {
    var chunks = [], central = [], offset = 0, now = new Date();
    var dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    var dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

    function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
    function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }

    files.forEach(function (f) {
      var name = utf8(f.name), data = f.data, crc = crc32(data);
      var local = [].concat([0x50, 0x4B, 0x03, 0x04], u16(20), u16(0x0800), u16(0),
        u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length),
        u16(name.length), u16(0), Array.prototype.slice.call(name));
      chunks.push(new Uint8Array(local), data);
      central.push([].concat([0x50, 0x4B, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0),
        u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length),
        u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset),
        Array.prototype.slice.call(name)));
      offset += local.length + data.length;
    });

    var cd = [], cdSize = 0;
    central.forEach(function (c) { cd.push(new Uint8Array(c)); cdSize += c.length; });
    var end = new Uint8Array([].concat([0x50, 0x4B, 0x05, 0x06], u16(0), u16(0),
      u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0)));
    return new Blob(chunks.concat(cd, [end]),
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------------------------------------------------------- XLSX */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function colName(i) {
    var s = ''; i += 1;
    while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; }
    return s;
  }

  function cellXml(ref, v, header) {
    if (v === null || v === undefined || v === '') return '';
    var style = header ? ' s="1"' : '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + style + '><v>' + v + '</v></c>';
    var s = String(v);
    if (/^-?\d+(\.\d+)?$/.test(s)) return '<c r="' + ref + '"' + style + '><v>' + s + '</v></c>';
    return '<c r="' + ref + '"' + style + ' t="inlineStr"><is><t xml:space="preserve">' + esc(s) + '</t></is></c>';
  }

  function sheetXml(rows) {
    var body = '';
    rows.forEach(function (row, ri) {
      var cells = '';
      row.forEach(function (v, ci) { cells += cellXml(colName(ci) + (ri + 1), v, ri === 0); });
      body += '<row r="' + (ri + 1) + '">' + cells + '</row>';
    });
    var ncol = Math.max.apply(null, rows.map(function (r) { return r.length; }).concat([1]));
    var nrow = Math.max(rows.length, 1);
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + colName(ncol - 1) + nrow + '"/>' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/><sheetData>' + body + '</sheetData>' +
      '<autoFilter ref="A1:' + colName(ncol - 1) + nrow + '"/></worksheet>';
  }

  function safeName(n, used) {
    var s = String(n || 'Sheet').replace(/[\[\]:*?\/\\]/g, '_').slice(0, 31) || 'Sheet';
    var base = s, k = 2;
    while (used.indexOf(s) >= 0) { s = base.slice(0, 31 - String(k).length - 1) + '_' + k; k++; }
    used.push(s);
    return s;
  }

  function toXlsx(sheets) {
    var used = [], files = [], names = [];
    sheets.forEach(function (sh, i) { names.push(safeName(sh.name, used)); });

    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) {
        return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      }).join('') + '</Types>';

    files.push({ name: '[Content_Types].xml', data: utf8(ct) });
    files.push({
      name: '_rels/.rels', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    });
    files.push({
      name: 'xl/workbook.xml', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') +
        '</sheets></workbook>')
    });
    files.push({
      name: 'xl/_rels/workbook.xml.rels', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (s, i) {
          return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
        }).join('') +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    });
    files.push({
      name: 'xl/styles.xml', data: utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="等线"/></font><font><b/><sz val="11"/><name val="等线"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF3F6"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
    });
    sheets.forEach(function (s, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: utf8(sheetXml(s.rows)) });
    });
    return zipStore(files);
  }

  /* ---------------------------------------------------------- 说明表 */
  function summaryRows(st, rows, scope, fmt) {
    var data = st.data;
    var cur = null;
    (data.indicators || []).forEach(function (i) { if (i['指标代码'] === st.code) cur = i; });
    var L = [
      ['养老金融区域指数数据库 · 数据下载说明', ''],
      ['', ''],
      ['底库版本', data.version || ''],
      ['生成时间', new Date().toLocaleString('zh-CN')],
      ['导出格式', String(fmt).toUpperCase()],
      ['导出范围', scope === 'indicators' ? '全部指标元数据' :
        (scope === 'all' ? '全库' : ('指标：' + (cur ? cur['指标名称'] : st.code)))],
      ['地区筛选', st.regions.length ? st.regions.join('、') : '全部'],
      ['年份筛选', (st.yearFrom || '不限') + ' ~ ' + (st.yearTo || '不限')],
      ['记录条数', rows.length],
      ['指标个数', Object.keys(rows.reduce(function (a, r) { a[r['指标代码']] = 1; return a; }, {})).length],
      ['', ''],
      ['数据来源', '国家统计局 · 世界银行 · OECD · 人力资源和社会保障部 · 全国人民代表大会常务委员会'],
      ['', ''],
      ['使用限制', '本库数据仅供研究与教学使用；不得用于发布地区排名或地区优劣判断。'],
      ['', '国际口径数据与国内口径数据不得混合比较或合并计算。'],
      ['', '制度参数（政策规定值）不得当作地区统计观测值使用。'],
      ['', '待核验数据为候选浏览层，不得作为正式结论引用。']
    ];
    if (cur) {
      L.splice(10, 0, ['口径提示', cur['口径提示'] || ''], ['统计范围', cur['统计范围'] || ''],
        ['制度对象', cur['制度对象'] || ''], ['权威来源', cur['权威来源'] || '']);
    }
    return L;
  }

  /* ---------------------------------------------------------- 下载入口 */
  function apiUrl(params) {
    return '/api/download?' + Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
  }

  function doDownload(scope, fmt) {
    var st = state();
    var indScope = scope !== 'all' && scope !== 'indicators';
    // 带上页面当前选中的地区与时间区间，让「本指标」下载只导出所选范围，
    // 而不是一股脑导出该指标的全部记录。
    var f = window.PortalFilter || null;
    var cur = f ? {
      regions: f.regions ? f.regions() : [],
      yearFrom: f.yearFrom ? f.yearFrom() : null,
      yearTo: f.yearTo ? f.yearTo() : null
    } : { regions: [], yearFrom: null, yearTo: null };
    if (indScope && f) {
      st.regions = cur.regions;
      st.yearFrom = cur.yearFrom;
      st.yearTo = cur.yearTo;
      if (st.filters) { st.filters.regions = cur.regions; st.filters.yearFrom = cur.yearFrom; st.filters.yearTo = cur.yearTo; }
    }
    var params = {
      scope: indScope ? 'indicator' : scope, format: fmt,
      code: indScope ? st.code : '',
      regions: indScope ? cur.regions.join(',') : '',
      yearFrom: indScope ? (cur.yearFrom == null ? '' : cur.yearFrom) : '',
      yearTo: indScope ? (cur.yearTo == null ? '' : cur.yearTo) : ''
    };
    if (HAS_API) { window.location.href = apiUrl(params); return; }

    /* 纯静态：浏览器内生成 */
    if (scope === 'indicators') {
      var inds = (st.data.indicators || []).map(function (i) {
        var o = {}; IND_COLS.forEach(function (k) { o[k] = i[k] == null ? '' : i[k]; }); return o;
      });
      if (fmt === 'csv') {
        saveBlob(new Blob([toCsv(inds, IND_COLS)], { type: 'text/csv;charset=utf-8' }),
          'PensionRegionalIndexDB_indicators_' + stamp() + '.csv');
      } else {
        saveBlob(toXlsx([{ name: '指标元数据', rows: [IND_COLS].concat(inds.map(function (r) {
          return IND_COLS.map(function (k) { return r[k]; });
        })) }]), 'PensionRegionalIndexDB_indicators_' + stamp() + '.xlsx');
      }
      return;
    }
    var rows = rowsFor(st, scope === 'all' ? 'all' : 'filtered');
    if (!rows.length) { alert('当前筛选条件下没有数据。'); return; }
    var tail = scope === 'all' ? 'all' : ('data_' + (st.code || ''));
    if (fmt === 'csv') {
      saveBlob(new Blob([toCsv(rows, EXPORT_COLS)], { type: 'text/csv;charset=utf-8' }),
        'PensionRegionalIndexDB_' + tail + '_' + stamp() + '.csv');
    } else if (fmt === 'json') {
      saveBlob(new Blob([JSON.stringify({
        generatedAt: new Date().toISOString(), version: st.data.version, scope: scope,
        indicator: st.code || null, count: rows.length, fields: EXPORT_COLS, records: rows
      }, null, 1)], { type: 'application/json;charset=utf-8' }),
        'PensionRegionalIndexDB_' + tail + '_' + stamp() + '.json');
    } else {
      saveBlob(toXlsx([
        { name: '数据', rows: [EXPORT_COLS].concat(rows.map(function (r) {
          return EXPORT_COLS.map(function (k) { return r[k]; });
        })) },
        { name: '口径与来源', rows: summaryRows(st, rows, scope, fmt) }
      ]), 'PensionRegionalIndexDB_' + tail + '_' + stamp() + '.xlsx');
    }
  }

  /* ---------------------------------------------------------- 界面 */
  /* 下载收成一个下拉按钮。原先把五种下载全部平铺在工具栏上，占地方且不是页面的重点。
     现在点「下载」展开菜单，选一项即导出。 */
  function build() {
    var tabs = document.querySelector('.view-tabs');
    if (!tabs || document.getElementById('dl-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'dl-bar';
    bar.className = 'dl-bar';
    bar.innerHTML =
      '<div class="dl-wrap">' +
        '<button type="button" class="dl-main" id="dl-main" aria-haspopup="true" aria-expanded="false">' +
          '<span class="dl-icon">⤓</span>下载<span class="dl-caret">▾</span>' +
        '</button>' +
        '<div class="dl-menu" id="dl-menu" hidden>' +
          '<div class="dl-menu-title">本指标（按当前所选地区与时间）</div>' +
          '<button type="button" class="dl-btn" data-scope="indicator" data-fmt="csv">CSV 格式</button>' +
          '<button type="button" class="dl-btn" data-scope="indicator" data-fmt="xlsx">Excel 格式</button>' +
          '<div class="dl-menu-title">全库（全部指标、全部地区、全部年份）</div>' +
          '<button type="button" class="dl-btn" data-scope="all" data-fmt="csv">CSV 格式</button>' +
          '<button type="button" class="dl-btn" data-scope="all" data-fmt="xlsx">Excel 格式</button>' +
          '<div class="dl-menu-title">指标目录</div>' +
          '<button type="button" class="dl-btn" data-scope="indicators" data-fmt="xlsx">Excel 格式</button>' +
        '</div>' +
      '</div>';
    tabs.parentNode.insertBefore(bar, tabs.nextSibling);

    var main = bar.querySelector('#dl-main');
    var menu = bar.querySelector('#dl-menu');
    function close() { menu.hidden = true; main.setAttribute('aria-expanded', 'false'); }
    function open() { menu.hidden = false; main.setAttribute('aria-expanded', 'true'); }
    main.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener('click', function (e) {
      if (!bar.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

    menu.addEventListener('click', function (e) {
      var b = e.target.closest('.dl-btn');
      if (!b) return;
      var old = b.textContent;
      b.disabled = true;
      b.textContent = '生成中…';
      try { doDownload(b.getAttribute('data-scope'), b.getAttribute('data-fmt')); }
      catch (err) { alert('导出失败：' + err.message); }
      setTimeout(function () { b.disabled = false; b.textContent = old; close(); }, 1200);
    });
  }

  /* 导出内部函数，便于自动化测试与二次开发 */
  window.PortalDownload = {
    toCsv: toCsv, toXlsx: toXlsx, doDownload: doDownload,
    rowsFor: rowsFor, state: state, zipStore: zipStore, EXPORT_COLS: EXPORT_COLS,
    hasApi: function () { return HAS_API; },
    isStatic: function () { return !!window.PORTAL_STATIC || !HAS_API; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 60); });
  else setTimeout(build, 60);
  window.addEventListener('load', function () { setTimeout(build, 200); });
})();

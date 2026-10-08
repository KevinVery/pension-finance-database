/* 养老金融区域指数数据库 · 图表引擎（SVG，零依赖）
 *
 * 相比原实现补齐：
 *   1. 完整的 X / Y 坐标轴、刻度、网格线、轴标题（单位）
 *   2. 分省多年指标：每个地区一条时间序列（趋势图）／按年分组柱（柱状图）
 *   3. 趋势图与柱状图都支持缩放与平移：滚轮缩放、拖拽平移、按钮控制、双击复位
 */
(function () {
  'use strict';

  var PALETTE = ['#2379b8', '#d98b24', '#2e8b57', '#c0504d', '#7b68a8',
    '#489e9e', '#c48f3c', '#5f7387', '#b5651d', '#3f7fbf',
    '#8e6c88', '#6b9e3f', '#bf5b77', '#3d8b8b', '#a3782c'];
  var INK = '#263543', MUTED = '#7a8c9c', GRID = '#dbe6ef', AXIS = '#8fa3b0';

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmt(n) {
    var v = Number(n);
    if (!isFinite(v)) return String(n);
    var a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿';
    if (a >= 1e4) return (v / 1e4).toFixed(2).replace(/\.?0+$/, '') + '万';
    if (a >= 1000) return v.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    if (a >= 1) return String(Math.round(v * 100) / 100);
    return String(Math.round(v * 10000) / 10000);
  }

  /* 坐标轴刻度专用：一律用千分位数字，不用「万/亿」缩写，
     避免在单位为「亿元」的轴上出现「2万」被误读成 2 万元。 */
  function fmtAxis(n) {
    var v = Number(n);
    if (!isFinite(v)) return String(n);
    var a = Math.abs(v);
    if (a >= 1) return v.toLocaleString('zh-CN', { maximumFractionDigits: a >= 100 ? 0 : 2 });
    return String(Math.round(v * 10000) / 10000);
  }

  function niceStep(span, target) {
    var raw = span / Math.max(target, 1);
    var mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  /* ---------------------------------------------------------- 数据整理 */
  function prepare(rows) {
    var regions = [], years = [], units = '', series = {}, names = {};
    rows.forEach(function (r) {
      var reg = String(r['地区名称'] || ''), y = String(r['统计期'] || '');
      var v = Number(r['数值']);
      if (!reg) return;
      if (!isFinite(v)) return;
      if (regions.indexOf(reg) < 0) regions.push(reg);
      if (years.indexOf(y) < 0) years.push(y);
      if (!units && r['单位']) units = String(r['单位']);
      names[reg] = reg;
      (series[reg] = series[reg] || {})[y] = v;
    });
    years.sort(function (a, b) { return a.localeCompare(b, 'zh-CN', { numeric: true }); });
    return { regions: regions, years: years, series: series, units: units };
  }

  /* ---------------------------------------------------------- 坐标轴 */
  function axisLayer(L, T, pw, ph, ymin, ymax, ystep, unit) {
    var s = '';
    // 网格 + Y 轴刻度
    for (var v = ymin; v <= ymax + 1e-9; v += ystep) {
      var y = T + ph - ph * ((v - ymin) / ((ymax - ymin) || 1));
      s += '<line x1="' + L + '" y1="' + y.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + y.toFixed(1) +
        '" stroke="' + (Math.abs(v) < 1e-9 ? AXIS : GRID) + '" stroke-width="1"/>';
      s += '<text x="' + (L - 8) + '" y="' + (y + 4).toFixed(1) +
        '" text-anchor="end" class="axis-tick">' + esc(fmtAxis(v)) + '</text>';
    }
    // Y 轴标题
    s += '<text x="' + (L - 56) + '" y="' + (T + ph / 2) + '" text-anchor="middle" class="axis-title" ' +
      'transform="rotate(-90 ' + (L - 56) + ' ' + (T + ph / 2) + ')">' + esc(unit || '数值') + '</text>';
    // 轴线
    s += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="' + AXIS + '" stroke-width="1"/>';
    s += '<line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="' + AXIS + '" stroke-width="1"/>';
    return s;
  }

  function xLabels(years, xOf, T, ph) {
    var s = '', maxLabels = 14;
    var step = Math.max(1, Math.ceil(years.length / maxLabels));
    years.forEach(function (y, i) {
      if (i % step && i !== years.length - 1) return;
      var x = xOf(i);
      s += '<text x="' + x.toFixed(1) + '" y="' + (T + ph + 20) + '" text-anchor="middle" ' +
        'class="axis-tick">' + esc(y) + '</text>';
      s += '<line x1="' + x.toFixed(1) + '" y1="' + (T + ph) + '" x2="' + x.toFixed(1) + '" y2="' + (T + ph + 5) +
        '" stroke="' + AXIS + '" stroke-width="1"/>';
    });
    s += '<text x="' + (T + ph + 44) + '" y="0" style="display:none"></text>';
    return s;
  }

  /* 图例：按可用宽度自动换行，返回 {svg, rows} */
  function layoutLegend(regions, avail) {
    var svg = '', rows = 1, x = 0, y = 0, CHAR = 12.6;
    regions.forEach(function (r, i) {
      var col = PALETTE[i % PALETTE.length];
      var w = 26 + String(r).length * CHAR + 20;
      if (x + w > avail && x > 0) { rows++; x = 0; y += 22; }
      svg += '<line x1="' + x + '" y1="' + (y - 4) + '" x2="' + (x + 22) + '" y2="' + (y - 4) +
        '" stroke="' + col + '" stroke-width="3"/>';
      svg += '<text x="' + (x + 28) + '" y="' + y + '" class="legend-text">' + esc(r) + '</text>';
      x += w;
    });
    return { svg: svg, rows: rows, height: rows * 22 };
  }

  function legendTop(rows) { return 14 + rows * 22 + 8; }

  /* ---------------------------------------------------------- 缩放状态 */
  var state = { from: 0, to: 1 };          // 可见的年份区间（0–1 相对比例）
  var view = null, host = null;

  function applyZoom() {
    if (!view || !host) return;
    var d = view.data, years = d.years;
    var n = years.length;
    var i0 = Math.max(0, Math.floor(state.from * (n - 1)));
    var i1 = Math.min(n - 1, Math.ceil(state.to * (n - 1)));
    if (i1 - i0 < 1) i1 = Math.min(n - 1, i0 + 1);
    var vis = years.slice(i0, i1 + 1);
    var rows = [];
    d.regions.forEach(function (reg) {
      vis.forEach(function (y) {
        if (d.series[reg] && d.series[reg][y] !== undefined) {
          rows.push({ '地区名称': reg, '统计期': y, '数值': d.series[reg][y], '单位': d.units });
        }
      });
    });
    host.innerHTML = draw(view.type, prepare(rows), true);
    bindZoom();
  }

  function bindZoom() {
    if (!host) return;
    var svg = host.querySelector('svg');
    if (!svg) return;
    var dragging = false, lastX = 0;

    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var span = state.to - state.from;
      var k = e.deltaY > 0 ? 1.25 : 0.8;
      var ns = Math.min(1, Math.max(0.02, span * k));
      var box = svg.getBoundingClientRect();
      var frac = (e.clientX - box.left) / Math.max(box.width, 1);
      var center = state.from + span * frac;
      var from = center - ns * frac, to = center + ns * (1 - frac);
      if (from < 0) { to -= from; from = 0; }
      if (to > 1) { from -= (to - 1); to = 1; }
      state.from = Math.max(0, from); state.to = Math.min(1, to);
      applyZoom();
    }, { passive: false });

    svg.addEventListener('mousedown', function (e) { dragging = true; lastX = e.clientX; svg.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', function () { dragging = false; if (svg) svg.style.cursor = 'grab'; });
    window.addEventListener('mousemove', function (e) {
      if (!dragging || !svg) return;
      var box = svg.getBoundingClientRect();
      var span = state.to - state.from;
      var dx = (e.clientX - lastX) / Math.max(box.width, 1) * span;
      lastX = e.clientX;
      var from = state.from - dx, to = state.to - dx;
      if (from < 0) { to -= from; from = 0; }
      if (to > 1) { from -= (to - 1); to = 1; }
      state.from = Math.max(0, from); state.to = Math.min(1, to);
      applyZoom();
    });
    svg.addEventListener('dblclick', function () { state.from = 0; state.to = 1; applyZoom(); });
    svg.style.cursor = 'grab';
  }

  function toolbar() {
    return '<div class="chart-zoom">' +
      '<span class="hint">滚轮缩放 · 拖拽平移 · 双击复位</span>' +
      '<button type="button" data-z="in">＋</button>' +
      '<button type="button" data-z="out">－</button>' +
      '<button type="button" data-z="reset">复位</button></div>';
  }

  function bindToolbar() {
    if (!host) return;
    host.querySelectorAll('.chart-zoom button').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-z');
        if (a === 'reset') { state.from = 0; state.to = 1; }
        else {
          var span = state.to - state.from;
          var ns = Math.min(1, Math.max(0.02, a === 'in' ? span * 0.7 : span / 0.7));
          var c = (state.from + state.to) / 2;
          state.from = Math.max(0, c - ns / 2);
          state.to = Math.min(1, c + ns / 2);
        }
        applyZoom();
      });
    });
  }

  /* ---------------------------------------------------------- 柱状图 */
  function drawBar(d, internal) {
    var W = 1100, H = 420, L = 92, R = 24, B = 62;
    var lg = d.regions.length > 1 ? layoutLegend(d.regions, W - L - R) : { svg: '', rows: 0, height: 0 };
    var T = lg.rows ? legendTop(lg.rows) : 22;
    var pw = W - L - R, ph = H - T - B;
    var years = d.years, regions = d.regions;
    var grouped = regions.length > 1 && years.length > 1;
    var ymax = 0, ymin = 0;
    regions.forEach(function (reg) {
      years.forEach(function (y) {
        var v = d.series[reg][y];
        if (v === undefined) return;
        if (v > ymax) ymax = v;
        if (v < ymin) ymin = v;
      });
    });
    if (ymax === 0 && ymin === 0) ymax = 1;
    var span = ymax - ymin;
    var step = niceStep(span || Math.abs(ymax) || 1, 6);
    ymax = Math.ceil(ymax / step) * step;
    ymin = ymin < 0 ? Math.floor(ymin / step) * step : 0;
    if (ymax === ymin) ymax = ymin + step;

    var yOf = function (v) { return T + ph - ph * ((v - ymin) / ((ymax - ymin) || 1)); };
    var slot = pw / Math.max(years.length, 1);
    var groups = grouped ? regions.length : 1;
    var bw = Math.max(2, Math.min(38, (slot * 0.72) / groups));

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">';
    if (lg.rows) s += '<g transform="translate(' + L + ',14)">' + lg.svg + '</g>';
    s += axisLayer(L, T, pw, ph, ymin, ymax, step, d.units);
    s += xLabels(years, function (i) { return L + slot * (i + 0.5); }, T, ph);

    years.forEach(function (y, i) {
      var cx = L + slot * (i + 0.5);
      regions.forEach(function (reg, k) {
        var v = d.series[reg][y];
        if (v === undefined) return;
        var x = grouped ? cx - (groups * bw) / 2 + k * bw : cx - bw / 2;
        var y0 = yOf(0), y1 = yOf(v);
        var top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
        s += '<rect x="' + x.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) +
          '" height="' + h.toFixed(1) + '" fill="' + PALETTE[k % PALETTE.length] + '" rx="2"><title>' +
          esc(reg + ' ' + y + '：' + fmt(v) + (d.units ? ' ' + d.units : '')) + '</title></rect>';
        if (!grouped) {
          s += '<text x="' + cx.toFixed(1) + '" y="' + (top - 6).toFixed(1) +
            '" text-anchor="middle" class="bar-num">' + esc(fmt(v)) + '</text>';
        }
      });
      if (grouped) {
        s += '<text x="' + cx.toFixed(1) + '" y="' + (T + ph + 20) + '" text-anchor="middle" class="axis-tick">' + esc(y) + '</text>';
      }
    });
    s += '</svg>';
    return (internal ? '' : toolbar()) + s;
  }

  /* ---------------------------------------------------------- 趋势图 */
  function drawLine(d) {
    var W = 1100, H = 430, L = 92, R = 30, B = 64;
    var lg = d.regions.length > 1 ? layoutLegend(d.regions, W - L - R) : { svg: '', rows: 0, height: 0 };
    var T = lg.rows ? legendTop(lg.rows) : 22;
    var pw = W - L - R, ph = H - T - B;
    var years = d.years, regions = d.regions;
    var ymax = -Infinity, ymin = Infinity;
    regions.forEach(function (reg) {
      years.forEach(function (y) {
        var v = d.series[reg][y];
        if (v === undefined) return;
        if (v > ymax) ymax = v;
        if (v < ymin) ymin = v;
      });
    });
    if (!isFinite(ymax)) { ymax = 1; ymin = 0; }
    var span = (ymax - ymin) || Math.abs(ymax) || 1;
    var step = niceStep(span, 6);
    ymax = Math.ceil(ymax / step) * step;
    ymin = ymin < 0 ? Math.floor(ymin / step) * step : Math.max(0, Math.floor((ymin - span * 0.06) / step) * step);
    if (ymax === ymin) ymax = ymin + step;

    var xOf = function (i) { return years.length === 1 ? L + pw / 2 : L + pw * (i / (years.length - 1)); };
    var yOf = function (v) { return T + ph - ph * ((v - ymin) / ((ymax - ymin) || 1)); };

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg" role="img" preserveAspectRatio="xMidYMid meet">';
    if (lg.rows) s += '<g transform="translate(' + L + ',14)">' + lg.svg + '</g>';
    s += axisLayer(L, T, pw, ph, ymin, ymax, step, d.units);
    s += xLabels(years, xOf, T, ph);

    regions.forEach(function (reg, k) {
      var col = PALETTE[k % PALETTE.length];
      var pts = [];
      years.forEach(function (y, i) {
        var v = d.series[reg][y];
        if (v === undefined) return;
        pts.push({ x: xOf(i), y: yOf(v), y_: y, v: v });
      });
      if (pts.length > 1) {
        s += '<polyline points="' + pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ') +
          '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      }
      pts.forEach(function (p) {
        s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3.2" fill="' + col +
          '"><title>' + esc(reg + ' ' + p.y_ + '：' + fmt(p.v) + (d.units ? ' ' + d.units : '')) + '</title></circle>';
      });
      // 末点数值标注（地区不多时才标，避免拥挤）
      if (pts.length && regions.length <= 6) {
        var last = pts[pts.length - 1];
        s += '<text x="' + (last.x + 8).toFixed(1) + '" y="' + (last.y + 4).toFixed(1) +
          '" class="line-num" fill="' + col + '">' + esc(fmtAxis(last.v)) + '</text>';
      }
    });
    s += '</svg>';
    return toolbar() + s;
  }

  /* ---------------------------------------------------------- 入口 */
  function draw(type, d, internal) {
    if (!d.years.length) return '<div class="empty-chart">当前筛选条件下没有可展示记录。</div>';
    if (d.years.length === 1 && type === 'line') {
      return '<div class="empty-chart">只有一个时期，无法绘制趋势线；请切换到「柱状图」或放宽统计期筛选。</div>';
    }
    return type === 'bar' ? drawBar(d, internal) : drawLine(d);
  }

  function render(el, type, rows) {
    host = el;
    view = { type: type, data: prepare(rows) };
    state.from = 0; state.to = 1;
    if (!view.data.years.length) {
      el.innerHTML = '<div class="empty-chart">当前筛选条件下没有可展示记录。</div>';
      return;
    }
    el.innerHTML = draw(type, view.data, false);
    bindZoom();
    bindToolbar();
  }

  window.PortalCharts = { render: render, prepare: prepare, fmt: fmt };
})();

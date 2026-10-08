/* 把列式分片还原为 window.PORTAL_DATA（app.js 依赖的结构） */
(function () {
  var parts = window.PORTAL_DATA_PARTS || [];
  var meta = window.PORTAL_DATA_META || {};
  var inds = [], recs = [];
  parts.forEach(function (p) {
    if (p.indicators) Array.prototype.push.apply(inds, p.indicators);
    var F = p.fields || [], rows = p.records || [];
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i], o = {};
      for (var k = 0; k < F.length; k++) o[F[k]] = a[k];
      recs.push(o);
    }
  });
  var by = {};
  inds.forEach(function (i) { by[i['指标代码']] = i; });
  // 同一主题拆为多片时，各片都携带元数据；按代码去重后再交给导航。
  inds = Object.keys(by).map(function (code) { return by[code]; });
  for (var j = 0; j < recs.length; j++) {
    var r = recs[j], ind = by[r['指标代码']] || {};
    if (!r['指标名称']) r['指标名称'] = ind['指标名称'] || '';
    if (!r['四大类']) r['四大类'] = ind['四大类'] || '';
    if (!r['数据层']) r['数据层'] = ind['数据层'] || '';
  }
  window.PORTAL_DATA = {
    version: meta.version || '', updatedAt: meta.updatedAt || '',
    records: recs, indicators: inds
  };
})();

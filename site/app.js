(() => {
  const portal = window.PORTAL_DATA;
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", "\"":"&quot;" }[char]));
  const format = (value) => Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 4 });
  const indicatorByCode = (code) => portal.indicators.find((item) => item["指标代码"] === code);

  // 板块按业务重要性排序，不用字典序
  const BOARD_ORDER = ["养老保险", "其他险种", "国内制度参数", "国际制度比较",
                       "人口与就业", "工资与收入", "宏观背景"];
  const categories = [...BOARD_ORDER, ...new Set(portal.indicators.map(i=>i['四大类']).filter(n=>n && !BOARD_ORDER.includes(n)))];

  // 数据口径：保留口径页。不再提供「全部数据」——
  // 混在一起时，同一大项下会同时出现全国口径与分省口径的同名分组，
  // 读者容易误以为某一个分组是省级数据，去掉后各口径各自独立。
  // ★ 2026-10-08 加第四类「单省明细」✓：
  //   课题组定新增「单省明细」层级（仅覆盖 1 个省级地区的指标，共 148 个）✓，
  //   它【不是】31 省可比的分省面板 ✗ —— 若并进「分省数据」里，
  //   使用者会拿它去做横向比较，正是要避免的误用 ✓。
  //   ★ 若漏加此类，applyScope() 会把这 148 个指标在整个站点上隐藏 ✗（已踩过）
  const SCOPE_TABS = [
    { key: "全国", label: "全国数据", match: (i) => i["地区层级"] === "全国" },
    { key: "省级", label: "分省数据", match: (i) => i["地区层级"] === "省级" },
    { key: "单省明细", label: "单省明细", match: (i) => i["地区层级"] === "单省明细" },
    { key: "国际", label: "国际数据", match: (i) => i["地区层级"] === "国际" },
    { key: "地级市", label: "地市数据", match: (i) => i["地区层级"] === "地级市" },
    { key: "区县级", label: "区县数据", match: (i) => i["地区层级"] === "区县级" },
    { key: "汇总层级", label: "财政汇总", match: (i) => i["地区层级"] === "汇总层级" },
  ];

  const state = {
    indicator: null, view: "table",
    regions: [],          // 多选地区；空数组表示全部
    yearFrom: null, yearTo: null,   // 手动输入的时间区间；null 表示不限
    scope: "全国",
  };


  let navQuery = "", navCategory = "all", branchSerial = 0;
  function setOpen(branch, open) {
    branch.classList.toggle("collapsed", !open);
    branch.querySelector(":scope > .nav-toggle").setAttribute("aria-expanded", String(open));
  }
  function renderNav() {
    const nav = $("navigation");
    function branch(label, children, kind, extra = "") {
      const id = `nav-children-${++branchSerial}`;
      return `<section class="nav-branch collapsed ${kind}" ${extra}><button type="button" class="nav-toggle" aria-expanded="false" aria-controls="${id}"><span class="nav-label">${escapeHtml(label)}</span><span class="nav-count"></span></button><div class="nav-children" id="${id}">${children}</div></section>`;
    }
    function leaves(items, path) {
      return items.slice().sort((a,b)=>String(a['指标名称']).localeCompare(String(b['指标名称']), 'zh')).map(i =>
        `<button class="nav-item" data-code="${escapeHtml(i['指标代码'])}" data-level="${escapeHtml(i['地区层级'])}" data-search="${escapeHtml(path + ' ' + i['指标名称'])}"><span class="label">${escapeHtml(i['指标名称'])}</span><span class="scope-tag">${escapeHtml(i['地区层级'])}</span></button>`).join("");
    }
    function groups(items, path) {
      const names=[...new Set(items.map(i=>i['指标分组'] || '其他指标'))];
      return names.map(group=>{
        const rows = items.filter(i=>(i['指标分组'] || '其他指标')===group);
        const topics = [...new Set(rows.map(i=>i['指标主题'] || group))];
        const content = topics.length === 1 && topics[0] === group ? leaves(rows, path+' '+group) : topics.map(topic=>{
          const topicRows=rows.filter(i=>(i['指标主题'] || group)===topic);
          return branch(topic, leaves(topicRows,path+' '+group+' '+topic), 'nav-topic');
        }).join('');
        return branch(group, content, 'nav-system');
      }).join('');
    }
    nav.innerHTML = categories.map(category=>{
      const items = portal.indicators.filter(i=>i['四大类']===category);
      const content = category === '养老保险' ? ['第一支柱','第二支柱','第三支柱'].map(pillar=>{
        const rows = items.filter(i=>String(i['支柱层次']).startsWith(pillar));
        return rows.length ? branch(pillar, groups(rows,category+' '+pillar), 'nav-pillar') : '';
      }).join('') : groups(items,category);
      return items.length ? branch(category, content, 'nav-section', `data-cat="${escapeHtml(category)}"`) : '';
    }).join('');
    window.PortalTreeNavigation = true;
    nav.addEventListener('click', event=>{
      const toggle = event.target.closest('.nav-toggle');
      if(toggle) setOpen(toggle.parentElement, toggle.parentElement.classList.contains('collapsed'));
      const item = event.target.closest('[data-code]');
      if(item) selectIndicator(item.dataset.code);
    });
    const box = document.createElement('div'); box.className='side-search';
    box.innerHTML='<p class="framework-hint">仅展示当前数据口径下已有的指标。目录计数含候选指标，核验状态请查看记录。</p><input id="nav-search" type="search" aria-label="搜索当前口径的制度、主题或指标" placeholder="搜索制度、主题或指标"><div class="nav-chips" id="nav-chips"></div><div class="nav-tools"><button type="button" data-act="expand">全部展开</button><button type="button" data-act="collapse">全部折叠</button></div>';
    nav.before(box);
    box.querySelector('input').addEventListener('input', event=>{ navQuery=event.target.value.trim().toLowerCase(); filterNav(); });
    box.querySelectorAll('[data-act]').forEach(button=>button.addEventListener('click', ()=>nav.querySelectorAll('.nav-branch').forEach(b=>setOpen(b, button.dataset.act==='expand'))));
    $('nav-chips').addEventListener('click', event=>{
      const button=event.target.closest('[data-cat]'); if(!button)return;
      navCategory=button.dataset.cat; filterNav();
      nav.querySelectorAll('.nav-section').forEach(b=>setOpen(b, navCategory!=='all' && b.dataset.cat===navCategory));
    });
  }
  function filterNav() {
    const nav=$('navigation'), tab=SCOPE_TABS.find(t=>t.key===state.scope);
    nav.querySelectorAll('.nav-item').forEach(item=>{
      const match=tab.match(indicatorByCode(item.dataset.code)) && (!navQuery || item.dataset.search.toLowerCase().includes(navQuery));
      item.style.display=match?'':'none';
    });
    [...nav.querySelectorAll('.nav-branch')].reverse().forEach(b=>{
      const count=[...b.querySelectorAll('.nav-item')].filter(i=>i.style.display!=='none').length;
      b.dataset.visibleCount=String(count);
      b.querySelector(':scope > .nav-toggle > .nav-count').textContent=String(count);
      b.style.display=count?'':'none';
      if(navQuery && count)setOpen(b,true);
    });
    const sections=[...nav.querySelectorAll('.nav-section')];
    const total=sections.reduce((sum,b)=>sum+Number(b.dataset.visibleCount),0);
    $('nav-chips').innerHTML=[{label:'全部',count:total},...sections.filter(b=>b.style.display!=='none').map(b=>({label:b.dataset.cat,count:Number(b.dataset.visibleCount)}))].map(c=>`<button type="button" class="nav-chip${navCategory===(c.label==='全部'?'all':c.label)?' on':''}" data-cat="${escapeHtml(c.label==='全部'?'all':c.label)}">${escapeHtml(c.label)}<span class="n">${c.count || '待补'}</span></button>`).join('');
    sections.forEach(b=>{if(navCategory!=='all' && b.dataset.cat!==navCategory)b.style.display='none';});
  }
  function applyScope() {
    navCategory='all'; navQuery=''; $('nav-search').value='';
    $('navigation').querySelectorAll('.nav-branch').forEach(b=>setOpen(b,false));
    filterNav();
  }

  function renderScopeTabs() {
    const box = $("scope-tabs");
    if (!box) return;
    box.innerHTML = SCOPE_TABS.map((t) => {
      const n = portal.indicators.filter(t.match).length;
      return `<button type="button" class="scope-tab${state.scope === t.key ? " on" : ""}" `
        + `data-scope="${t.key}">${t.label}<span class="n">${n}</span></button>`;
    }).join("");
    box.querySelectorAll(".scope-tab").forEach((b) => b.addEventListener("click", () => {
      state.scope = b.dataset.scope; renderScopeTabs(); applyScope();
    }));
  }

  // 导航及筛选在本文件统一管理，保留对外刷新入口。
  window.PortalApplyScope = applyScope;

  function selectIndicator(code) {
    const meta=indicatorByCode(code);
    if(!meta)return;
    if(meta['地区层级']!==state.scope){state.scope=meta['地区层级'];renderScopeTabs();applyScope();}
    if(navCategory!=='all' || navQuery){navCategory='all';navQuery='';$('nav-search').value='';filterNav();}
    const selected=[...$('navigation').querySelectorAll('.nav-item')].find(i=>i.dataset.code===code);
    if(selected){let parent=selected.parentElement;while(parent && parent!==$('navigation')){if(parent.classList.contains('nav-branch'))setOpen(parent,true);parent=parent.parentElement;}}
    state.indicator = code; state.regions = []; state.view = "table";
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.code === code));
    resetYearRange();
    renderWorkspace();
  }

  /* 刚进网站时不选中任何指标，只显示一句提示，左侧保持全部收起 */
  function showWelcome() {
    const meta = state.indicator ? indicatorByCode(state.indicator) : null;
    if (meta) return;
    $("workspace").hidden = true;
    const empty = $("empty-state");
    empty.hidden = false;
    empty.innerHTML = `<h1>养老金融区域指数数据库</h1>`
      + `<p>请从左侧选择数据口径与指标。</p>`
      + `<p>统计覆盖包括全国、分省、单省明细、地级市、区县、国际和汇总层级，各层级分别浏览。</p>`
      + `<p>养老保险按「支柱 → 制度 → 主题 → 指标」逐层展开；点击各层标题可以收起。其他大项按分类与主题浏览。</p>`;
    empty.innerHTML += `<p>目录仅展示所选地区层级下已有的指标；核验状态和适用范围请查看指标说明与数据记录。</p>`;
  }

  function relevantRecords() { return portal.records.filter((record) => record["指标代码"] === state.indicator); }

  function filteredRecords() {
    return relevantRecords().filter((record) => {
      if (state.regions.length && !state.regions.includes(record["地区名称"])) return false;
      const y = Number(record["统计期"]);
      if (state.yearFrom != null && y < state.yearFrom) return false;
      if (state.yearTo != null && y > state.yearTo) return false;
      return true;
    });
  }

  /* 时间区间：默认展示该指标的全部年份，可手动输入起止年 */
  function yearBounds() {
    const ys = relevantRecords().map((r) => Number(r["统计期"])).filter((n) => Number.isFinite(n));
    return ys.length ? [Math.min(...ys), Math.max(...ys)] : [null, null];
  }

  function resetYearRange() {
    const [lo, hi] = yearBounds();
    state.yearFrom = lo; state.yearTo = hi;
    const a = $("year-from"), b = $("year-to");
    if (a) a.value = lo == null ? "" : lo;
    if (b) b.value = hi == null ? "" : hi;
    const hint = $("year-hint");
    if (hint) hint.textContent = `可用年份 ${lo} 至 ${hi}`;
  }

  function applyYearRange() {
    const [lo, hi] = yearBounds();
    const clamp = (v) => {
      const n = parseInt(String(v).replace(/[^0-9]/g, ""), 10);
      return Number.isFinite(n) ? n : null;
    };
    let a = clamp($("year-from").value), b = clamp($("year-to").value);
    if (a != null && lo != null) a = Math.min(Math.max(a, lo), hi);
    if (b != null && lo != null) b = Math.min(Math.max(b, lo), hi);
    if (a != null && b != null && a > b) { const t = a; a = b; b = t; }
    state.yearFrom = a; state.yearTo = b;
    $("year-from").value = a == null ? "" : a;
    $("year-to").value = b == null ? "" : b;
    renderView();
  }

  /* 地区多选：紧凑下拉，点「地区」或点别处都能收起 */
  let rpDocBound = false;
  function renderRegionPicker() {
    const box = $("region-picker");
    if (!box) return;
    const names = [...new Set(relevantRecords().map((r) => r["地区名称"]))];
    box.innerHTML = `<button type="button" class="rp-toggle" id="rp-toggle" aria-expanded="false">`
      + `<span>地区</span><span class="rp-sum">${state.regions.length ? state.regions.length + " 个" : "全部"}</span>`
      + `<span class="rp-arrow">▾</span></button>`
      + `<div class="rp-panel" hidden>`
      + `<div class="rp-panel-head"><span>选择地区</span>`
      + `<span class="rp-panel-act"><button type="button" data-act="all">全选</button>`
      + `<button type="button" data-act="none">清空</button>`
      + `<button type="button" class="rp-close" data-act="close">收起 ✕</button></span></div>`
      + `<div class="rp-body">`
      + names.map((n) => `<label class="rp-item"><input type="checkbox" value="${escapeHtml(n)}" `
          + `${state.regions.includes(n) ? "checked" : ""}><span>${escapeHtml(n)}</span></label>`).join("")
      + `</div></div>`;
    const panel = box.querySelector(".rp-panel");
    const toggle = box.querySelector("#rp-toggle");
    const close = () => { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); };
    const open = () => { panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); };
    const syncSum = () => {
      const s = box.querySelector(".rp-sum");
      s.textContent = state.regions.length ? state.regions.length + " 个" : "全部";
    };
    toggle.addEventListener("click", (e) => { e.stopPropagation(); panel.hidden ? open() : close(); });
    panel.addEventListener("click", (e) => e.stopPropagation());
    if (!rpDocBound) {
      document.addEventListener("click", () => {
        const p = document.querySelector(".rp-panel");
        const t = document.querySelector("#rp-toggle");
        if (p && !p.hidden) { p.hidden = true; if (t) t.setAttribute("aria-expanded", "false"); }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const p = document.querySelector(".rp-panel"); const t = document.querySelector("#rp-toggle");
        if (p && !p.hidden) { p.hidden = true; if (t) t.setAttribute("aria-expanded", "false"); }
      });
      rpDocBound = true;
    }
    box.querySelectorAll(".rp-item input").forEach((cb) => cb.addEventListener("change", () => {
      state.regions = [...box.querySelectorAll(".rp-item input:checked")].map((x) => x.value);
      syncSum(); renderView();
    }));
    box.querySelector('[data-act="all"]').addEventListener("click", () => {
      box.querySelectorAll(".rp-item input").forEach((cb) => { cb.checked = true; });
      state.regions = names.slice(); syncSum(); renderView();
    });
    box.querySelector('[data-act="none"]').addEventListener("click", () => {
      box.querySelectorAll(".rp-item input").forEach((cb) => { cb.checked = false; });
      state.regions = []; syncSum(); renderView();
    });
    box.querySelector('[data-act="close"]').addEventListener("click", close);
    box.hidden = names.length <= 1;
  }

  function renderWorkspace() {
    const meta = indicatorByCode(state.indicator);
    const workspace = $("workspace"), empty = $("empty-state");
    if (meta["是否可视化"] !== "是") {
      workspace.hidden = true; empty.hidden = false;
      empty.innerHTML = `<h1>${escapeHtml(meta["指标名称"])}</h1><p>${escapeHtml(meta["口径提示"])}</p>`;
      return;
    }
    empty.hidden = true; workspace.hidden = false;
    $("category-label").textContent = meta["四大类"];
    $("group-label").textContent = [meta["指标分组"], meta["指标主题"]].filter(Boolean).join(" / ");
    $("indicator-title").textContent = meta["指标名称"];
    $("indicator-subtitle").textContent = `${meta["地区层级"]}口径　${meta["覆盖期"]}　${meta["统计范围"]}`;
    $("meta-level").textContent = meta["地区层级"];
    // ★ 2026-10-08：把「覆盖完整性」追加到「覆盖期」后面 ✓
    //   该字段由脚本自动反算（满员年数/总年数 + 不满年份）✓
    //   它回答的是「每一年有几个地区」—— 而「覆盖期」只回答「从哪年到哪年」✗
    //   ★ 改这一处【必须改本文件（05_网页原型/app.js）】✓ ——
    //     build_portal_site.py 是从本目录取源复制到 养老金融数据门户/web/ 的 ✓，
    //     直接改 web/ 下的副本会在下次构建时被覆盖 ✗（2026-10-08 已踩过）
    $("meta-period").textContent = meta["覆盖期"]
      + (meta["覆盖完整性"] ? "　" + meta["覆盖完整性"] : "");
    $("meta-unit").textContent = meta["单位"];
    $("method-note").textContent = meta["口径提示"];
    $("source-agency").textContent = meta["来源机构"];
    $("source-detail").textContent = meta["权威来源"];
    $("scope-detail").textContent = meta["统计范围"];
    $("scheme-detail").textContent = [meta["制度对象"], meta["支柱层次"], meta["数据用途"]].filter(Boolean).join("；");
    $("time-detail").textContent = meta["时间类型"];
    $("update-detail").textContent = relevantRecords().map((record) => record["更新时间"])[0] || "";
    renderRegionPicker();
    resetYearRange();
    const chartViewsAllowed = relevantRecords().some((r) => r["审查状态"] === "已核验") && meta["是否可视化"] !== "否";
    if (!chartViewsAllowed) state.view = "table";
    document.querySelector(".view-tabs").hidden = !chartViewsAllowed;
    document.querySelectorAll(".view-button").forEach((b) => b.classList.toggle("active", b.dataset.view === state.view));
    renderView();
  }

  function renderView() {
    const rows = filteredRecords(), table = $("data-table"), chart = $("chart-view");
    table.hidden = state.view !== "table"; chart.hidden = state.view === "table";
    if (state.view === "table") {
      table.innerHTML = `<div class="table-note">共 ${rows.length} 条记录`
        + `（地区 ${state.regions.length ? state.regions.length + " 个" : "全部"}`
        + `，时间 ${state.yearFrom ?? "-"} 至 ${state.yearTo ?? "-"}）</div>`
        + `<table class="data-table"><thead><tr><th>地区</th><th>统计期</th><th>数值</th><th>单位</th>`
        + `<th>制度对象</th><th>适用范围与执行期</th><th>审查状态</th><th>来源机构</th></tr></thead><tbody>`
        + rows.map((r) => `<tr><td>${escapeHtml(r["地区名称"])}</td><td>${escapeHtml(r["统计期"])}</td>`
            + `<td class="number">${format(r["数值"])}</td><td>${escapeHtml(r["单位"])}</td>`
            + `<td>${escapeHtml(r["制度对象"])}</td><td>${escapeHtml([r["适用险种"], r["统筹区"], r["地区档次"], r["生效日期"] ? r["生效日期"] + "至" + (r["终止日期"] || "待核") : "", r["政策文号"]].filter(Boolean).join("；"))}</td><td>${escapeHtml(r["审查状态"] || "待核验")}</td><td>${escapeHtml(r["来源机构"])}</td></tr>`).join("")
        + `</tbody></table>`;
      return;
    }
    const verifiedRows = rows.filter((r) => r["审查状态"] === "已核验");
    if (!verifiedRows.length) { chart.innerHTML = '<div class="empty-chart">当前筛选条件下没有已核验记录。</div>'; return; }
    const title = `${indicatorByCode(state.indicator)["指标名称"]}（${rows[0]["单位"]}）`;
    chart.innerHTML = `<div class="chart-title">${escapeHtml(title)}</div>`
      + (verifiedRows.length < rows.length ? `<div class="table-note">图表仅展示已核验记录，${rows.length - verifiedRows.length} 条待核验记录请在表格中查看。</div>` : "")
      + `<div id="chart-body"></div>`;
    if (window.PortalCharts) PortalCharts.render(document.getElementById("chart-body"), state.view, verifiedRows);
    else chart.innerHTML += '<div class="empty-chart">图表组件未加载。</div>';
  }

  $("year-from").addEventListener("change", applyYearRange);
  $("year-to").addEventListener("change", applyYearRange);
  document.querySelectorAll(".view-button").forEach((b) => b.addEventListener("click", () => {
    state.view = b.dataset.view; renderWorkspace();
  }));

  // 供下载模块读取当前筛选条件
  window.PortalFilter = {
    regions: () => state.regions.slice(),
    yearFrom: () => state.yearFrom,
    yearTo: () => state.yearTo,
    indicator: () => state.indicator,
  };

  renderNav();
  renderScopeTabs();
  applyScope();
  showWelcome();
})();

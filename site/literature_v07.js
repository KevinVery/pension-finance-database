(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeURL = v => {try {const u = new URL(v); return ['https:','http:'].includes(u.protocol) ? u.href : '';} catch {return '';}};
  const relevanceNames = {core_pension:'养老核心候选',core_social_security:'社保核心文献',adjacent_mechanism:'相关机制文献',manual_review:'相关性待复核'};
  const filters = ['theme','language','journal','year','period'];
  const series = r => r['期刊'] || (r['文献类型'] === '工作论文' ? 'NBER 工作论文' : 'NBER 会议论文');
  let data = [], filtered = [], limit = 60;
  function options(id, values) {
    [...new Set(values.filter(Boolean).map(v=>id==='year'?String(v):v))].sort((a,b) => id === 'year' ? (Number.isFinite(Number(a))?0:1)-(Number.isFinite(Number(b))?0:1)||(Number(b)||0)-(Number(a)||0) : a.localeCompare(b,'zh-Hans')).forEach(value => {
      const o = document.createElement('option'); o.value = value; o.textContent = id === 'relevance' ? (relevanceNames[value] || value) : value; $(id).appendChild(o);
    });
  }
  function render(reset = true) {
    if (reset) limit = 60;
    const q = $('query').value.trim().toLowerCase();
    filtered = data.filter(r => (!q || [r['标题'],r['作者'],r['摘要'],r['期刊'],r['研究主题'].join(' '),r['文献ID'],r['NBER编号']].join(' ').toLowerCase().includes(q))
      && window.LibraryLinks.paperMatches(r) && (!$('theme').value || r['分类大类']===$('theme').value)
      && (!$('language').value || r['语言'] === $('language').value)
      && (!$('journal').value || series(r) === $('journal').value)
      && (!$('year').value || String(r['年份']) === $('year').value)
      && (!$('period').value || (Number(r['年份']) >= 2010 && Number(r['年份']) <= 2026)));
    filtered.sort((a,b)=> {
      const ay=Number(a['年份']),by=Number(b['年份']);
      const missing=(Number.isFinite(ay)?0:1)-(Number.isFinite(by)?0:1);
      const date = missing || (Number.isFinite(ay)&&Number.isFinite(by)?by-ay:0);
      const mode = $('sort').value;
      if(mode==='related')return window.LibraryLinks.relatedScore(b['文献ID'])-window.LibraryLinks.relatedScore(a['文献ID'])||date||a['文献ID'].localeCompare(b['文献ID']);
      if(mode==='policy')return b['关联政策数']-a['关联政策数']||date||a['文献ID'].localeCompare(b['文献ID']);
      if(mode==='cited'){const ac=a['被引次数'],bc=b['被引次数'];return (ac==null)-(bc==null)||(ac==null?0:bc-ac)||date||a['文献ID'].localeCompare(b['文献ID']);}
      if (mode === 'oldest') return missing || (Number.isFinite(ay)&&Number.isFinite(by)?ay-by:0) || a['标题'].localeCompare(b['标题']);
      if (mode === 'journal') return (a['期刊']||a['来源']).localeCompare(b['期刊']||b['来源'],'zh-Hans') || date;
      if (mode === 'theme') return a['研究主题'].join(' ').localeCompare(b['研究主题'].join(' '),'zh-Hans') || date;
      return date || a['标题'].localeCompare(b['标题']);
    });
    document.querySelectorAll('[data-topic]').forEach(b=>{b.classList.toggle('selected',b.dataset.topic === $('theme').value);b.setAttribute('aria-pressed',String(b.dataset.topic === $('theme').value));});
    document.querySelectorAll('[data-sort]').forEach(b=>{const on=b.dataset.sort===$('sort').value;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
    $('stats').innerHTML = '<span>'+($('period').value?'2010年及以后':'全年份')+' · 检索结果 <strong>'+filtered.length+'</strong> 篇</span><span>中文 '+filtered.filter(r=>r['语言']==='中文').length+' 篇 · 英文 '+filtered.filter(r=>r['语言']==='英文').length+' 篇</span><span>当前显示 '+Math.min(limit,filtered.length)+' 篇</span>';
    $('rows').innerHTML = filtered.slice(0,limit).map(r => {
      const issue = String(r['期号'] || '').trim().replace(/^第/, '').replace(/期$/, '');
      const issueLabel = r['文献ID']==='CN6-SS054' ? '增刊' : /^\d+$/.test(issue) ? (Number(issue)>12 ? '源目录刊期编号'+issue+'（刊期待核）' : '第'+Number(issue)+'期') : issue;
      const citation = r['期刊'] ? '《'+r['期刊']+'》 · '+r['年份']+'年'+issueLabel+' · '+r['页码'] : series(r)+' · '+r['NBER编号']+' · '+r['年份'];
      const source = safeURL(r['来源页']), pdf = safeURL(r['官方PDF']);
      return '<article class="paper" data-id="'+esc(r['文献ID'])+'" data-year="'+esc(r['年份'])+'" data-language="'+esc(r['语言'])+'"><div class="paper-top"><div class="topics">'+[r['分类大类']].map(t=>'<span class="theme">'+esc(t)+'</span>').join('')+'</div><span>'+esc(r['语言'])+' · '+esc(r['文献类型'])+'</span></div><h2>'+esc(r['标题'])+'</h2><p class="authors">'+esc(r['作者'])+'</p><p class="citation">'+esc(citation)+'</p>'+window.LibraryLinks.paperPanel(r)+'<details class="abstract-panel"><summary>查看摘要</summary><p class="abstract">'+esc(r['摘要']||'暂无摘要，请进入来源页面核对。')+'</p></details><details><summary>研究主题</summary><p>'+esc(r['研究主题'].join('；'))+'</p></details><div class="links">'+(source?'<a href="'+esc(source)+'" target="_blank" rel="noopener noreferrer">'+(r['文献类型']==='工作论文'&&r['NBER编号']?'NBER 原站页面':'期刊／论文原站')+' ↗</a>':'')+(pdf?'<a href="'+esc(pdf)+'" target="_blank" rel="noopener noreferrer">原站全文入口 ↗</a>':'')+'</div></article>';
    }).join('') || '<p class="empty">当前条件下没有文献，请调整筛选条件。</p>';
    $('more').hidden = filtered.length <= limit;
    $('download').disabled = !filtered.length;
  }
  function download() {
    const fields = ['文献ID','标题','作者','年份','语言','文献类型','期刊','期号','页码','分类大类','研究主题','关联政策数','明确提及政策数','被引次数','被引来源','被引核对日期','被引来源链接','摘要','来源','来源页','官方PDF','论文版本关联'];
    const cell = value => {let s = Array.isArray(value) ? value.join('；') : String(value ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'"+s; return '"'+s.replace(/"/g,'""')+'"';};
    const csv = '\uFEFF'+[fields,...filtered.map(r=>fields.map(f=>r[f]))].map(row=>row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a = document.createElement('a'); a.href=url; a.download='社保文献题录_'+($('period').value?'2010年及以后':'全部年份')+'_'+filtered.length+'篇.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function init() {
    let d = window.LITERATURE_LIBRARY;
    if (!d) {const res=await fetch('data/literature_public_v05.json?v=20261019b'); if (!res.ok) throw Error('文献库数据暂未加载，请刷新页面'); d=await res.json();}
    await window.LibraryLinks.init();
    data = d.records || [];
    $('link-context').innerHTML=window.LibraryLinks.context('paper');
    $('sort').value=new URLSearchParams(location.search).has('policy')?'related':'newest';
    $('theme').value='';
    options('theme',d.meta.linkMetrics.categories); options('language',data.map(r=>r['语言'])); options('journal',data.map(series));
    options('year',data.map(r=>r['年份']));
    $('library-summary').textContent='收录 '+d.meta.records+' 篇文献';
    $('topic-chips').innerHTML = [['', '全部文献'],...d.meta.linkMetrics.categories.map(t=>[t,t])].map(([v,t])=>'<button type="button" data-topic="'+esc(v)+'">'+esc(t)+' <span>'+data.filter(r=>!v||r['分类大类']===v).length+'</span></button>').join('');
    $('topic-chips').addEventListener('click',e=>{const b=e.target.closest('[data-topic]');if(b){$('theme').value=b.dataset.topic;render();}});
    document.querySelectorAll('[data-sort]').forEach(b=>b.addEventListener('click',()=>{$('sort').value=b.dataset.sort;render();}));
    $('sort').addEventListener('change',()=>render());
    filters.forEach(id=>$(id).addEventListener('change',()=>render())); $('query').addEventListener('input',()=>render());
    $('reset').addEventListener('click',()=>{$('query').value='';filters.forEach(id=>$(id).value='');render();});
    $('more').addEventListener('click',()=>{limit+=60;render(false);}); $('download').addEventListener('click',download); render();
  }
  init().catch(e=>{$('rows').innerHTML='<p class="empty">'+esc(e.message)+'</p>';});
})();

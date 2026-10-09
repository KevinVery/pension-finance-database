(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeLink = value => /^https?:\/\/[^\s]+$/i.test(value || '') ? escapeHtml(value) : '';
  let all = [], relations = [], filtered = [], limit = 20;
  function options(id, values) {
    [...new Set(values.filter(Boolean))].sort().forEach(value => { const o = document.createElement('option'); o.value=value; o.textContent=value; $(id).appendChild(o); });
  }
  function citation(p) { return `${p['发文机关']}：《${p['标题']}》，${p['文号'] || '文号见原文'}，成文日期：${p['成文日期'] || '待核'}。${p['原文URL'] || p['原文链接线索'] || ''}（原文核验：${p['核验日期'] || '待核'}；效力：${p['效力状态']}）`; }
  function render(reset = true) {
    if(reset) limit=20;
    const query=$('query').value.trim().toLowerCase();
    filtered=all.filter(p => (!query || [p['标题'],p['文号'],p['发文机关'],p['内容摘要'],p['关联制度'],p['全文']].join(' ').toLowerCase().includes(query)) &&
      (!$('group').value || p['政策库分组']===$('group').value) && (!$('region').value || p['适用地区']===$('region').value) &&
      (!$('review').value || p['核验状态']===$('review').value));
    const direction=$('order').value==='old'?1:-1;
    filtered.sort((a,b)=>direction*(a['成文日期']||'').localeCompare(b['成文日期']||'') || a['政策ID'].localeCompare(b['政策ID']));
    $('stats').textContent=`检索结果 ${filtered.length} 条 · 原文已核验 ${all.filter(p=>p['核验状态']==='原文已核验').length} 份 · 全部条目 ${all.length} 条`;
    $('rows').innerHTML=filtered.slice(0,limit).map(p=>{
      const checked=p['核验状态']==='原文已核验';
      const link=checked?p['原文URL']:(p['原文链接线索']||'').split('|')[0];
      const rel=relations.filter(r=>[r['起始政策ID'],r['目标政策ID']].includes(p['政策ID'])).map(r=>{
        const target=all.find(x=>x['政策ID']===(r['起始政策ID']===p['政策ID']?r['目标政策ID']:r['起始政策ID']));
        return `<li>${escapeHtml(r['关系类型'])}：${escapeHtml(target?.['标题']||'')}（${escapeHtml(r['核验状态'])}）</li>`;
      }).join('');
      return `<article class="policy-card"><div class="card-top"><span class="badge ${checked?'checked':'candidate'}">${escapeHtml(p['核验状态'])}</span><span>${escapeHtml(p['政策库分组'])} · ${escapeHtml(p['适用地区'])}</span></div>
        <h2>${escapeHtml(p['标题'])}</h2><p class="issuer">${escapeHtml(p['发文机关'])} ${p['文号']?'· '+escapeHtml(p['文号']):''}</p>
        <div class="dates"><span>成文 ${escapeHtml(p['成文日期']||'待核')}</span><span>发布 ${escapeHtml(p['网页发布日期']||'待核')}</span><span>生效 ${escapeHtml(p['生效日期']||'待核')}</span><span>效力 ${escapeHtml(p['效力状态'])}</span></div>
        <p>${escapeHtml(p['内容摘要'])}</p><details><summary>${checked?'查看原文与引用':'查看目录线索与核验说明'}</summary><div class="detail">
        <p><strong>适用制度：</strong>${escapeHtml(p['关联制度'])}；${escapeHtml(p['适用对象'])}</p><p><strong>核验说明：</strong>${escapeHtml(p['核验说明'])}</p>
        ${p['原文条款定位']?'<p><strong>条款定位：</strong>'+escapeHtml(p['原文条款定位'])+'</p>':''}
        ${safeLink(link)?`<p><a href="${safeLink(link)}" target="_blank" rel="noopener">${checked?'打开官方原文':'打开目录原文链接（待核验）'} ↗</a></p>`:''}
        ${checked?`<blockquote>${escapeHtml(citation(p))}</blockquote><button class="copy" data-id="${escapeHtml(p['政策ID'])}">复制引用</button><pre class="fulltext">${escapeHtml(p['全文'])}</pre>`:''}
        ${rel?'<p>关联文件</p><ul>'+rel+'</ul>':''}</div></details></article>`;
    }).join('') || '<p class="empty">当前条件下没有政策。可调整关键词或核验状态。</p>';
    $('more').hidden=filtered.length<=limit;
    document.querySelectorAll('.copy').forEach(btn=>btn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(citation(all.find(p=>p['政策ID']===btn.dataset.id)));btn.textContent='已复制';}catch{btn.textContent='请选中上方引用文字复制';}}));
  }
  function download() {
    const fields=['政策ID','标题','发文机关','文号','成文日期','网页发布日期','生效日期','失效日期','效力状态','政策库分组','关联制度','适用地区','核验状态','原文URL','原文链接线索','原文条款定位','核验说明'];
    const cell=v=>'"'+String(v||'').replace(/"/g,'""')+'"';
    const csv='\ufeff'+[fields.map(cell).join(','),...filtered.map(p=>fields.map(k=>cell(p[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='社保政策库_检索结果_policy_v02.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function init() {
    let data=window.POLICY_LIBRARY;
    if(!data) {const response=await fetch('data/policy_public_v02.json');if(!response.ok)throw Error('政策数据暂未加载，请刷新页面');data=await response.json();}
    all=data.policies||[];relations=data.relations||[];
    options('group',all.map(p=>p['政策库分组']));options('region',all.map(p=>p['适用地区']));
    $('version').textContent=`政策库 ${data.meta.version} · 核验更新 ${data.meta.updatedAt}`;
    ['query','group','region','review','order'].forEach(id=>$(id).addEventListener(id==='query'?'input':'change',()=>render()));
    $('more').addEventListener('click',()=>{limit+=20;render(false);});$('download').addEventListener('click',download);
    render();
  }
  init().catch(e=>{$('stats').textContent=e.message;});
}());

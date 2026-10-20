/* Shared progressive enhancement. No dependencies or changes to source data. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isData=!!$('navigation'), isPolicy=!!$('policy-chips');
 const ids=isPolicy?['query','group','year-from','year-to','system','topic','issuer','form','source-channel','publisher','region','review','order']:['query','period','theme','journal','year','language','sort'];
 const defaults={review:'已核验公开资料',order:'new',sort:'newest'};
 let restoring=false, restored=false;
 function restore(){
   restoring=true;
   const p=new URLSearchParams(location.search);
   for(const id of ids){const el=$(id),v=p.get('ui_'+id);if(!el||v===null)continue;
     if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===v)){
       if(!['year-from','year-to'].includes(id)||!/^\d{4}$/.test(v)||+v<1900||+v>2100)continue;
       const option=document.createElement('option');option.value=v;option.textContent=v;el.append(option);
     }
     el.value=v;
   }
   restoring=false;restored=true;
 }
 function refresh(){
   const active=$('active-filters');if(!active)return;
   const selections=ids.filter(id=>!['order','sort'].includes(id)).map(id=>{
     const el=$(id);if(!el||!el.value||el.value===defaults[id]||(id==='region'&&$('region-label')?.hidden))return '';
     const text=el.tagName==='SELECT'?el.selectedOptions[0]?.textContent:el.value;
     const label=id==='query'?'关键词':el.closest('label')?.childNodes[0]?.textContent.trim()||id;
     return `<button type="button" data-clear="${id}" aria-label="移除${esc(label)}：${esc(text)}">${esc(label)}：${esc(text)}<span aria-hidden="true">×</span></button>`;
   }).join('');
   active.innerHTML=selections;
   const count=active.children.length;
   const toggle=$('filter-toggle');if(toggle)toggle.firstElementChild.textContent=count?`筛选条件 · 已选 ${count} 项`:'筛选条件';
   const p=new URLSearchParams(location.search);
   if(restored&&!restoring&&location.protocol!=='file:'){
     for(const id of ids){const el=$(id);if(!el)continue;const value=el.value;if(value&&value!==(defaults[id]||''))p.set('ui_'+id,value);else p.delete('ui_'+id);}
     // Keep association/focus parameters intact; only own parameters are changed.
     if(isPolicy){const scope=document.querySelector('.scope-tabs [aria-selected="true"]')?.dataset.scope;if(scope==='分省政策')p.set('ui_scope',scope);else p.delete('ui_scope');}
     const query=p.toString();try{history.replaceState(null,'',location.pathname+(query?'?'+query:'')+location.hash);}catch{/* Local previews can prohibit history writes. */}
   }
 }
 window.ResearchUI={restore,refresh};
 function boot(){
   document.body.classList.toggle('data-page',isData);
   const main=document.querySelector('main');main.id=main.id||'main-content';main.tabIndex=-1;
   const skip=document.createElement('a');skip.className='skip-link';skip.href='#'+main.id;skip.textContent='跳到主要内容';document.body.prepend(skip);
   document.querySelectorAll('nav[aria-label="资料模块"] a').forEach(a=>{if(a.classList.contains('active')||(isData&&a.getAttribute('href')==='index.html'))a.setAttribute('aria-current','page');});
   const top=document.createElement('button');top.type='button';top.className='back-top';top.textContent='↑';top.setAttribute('aria-label','返回顶部');top.hidden=true;document.body.append(top);
   const scroller=isData?main:window;
   scroller.addEventListener('scroll',()=>{top.hidden=(isData?main.scrollTop:window.scrollY)<600;},{passive:true});
   top.addEventListener('click',()=>{scroller.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});main.focus({preventScroll:true});});
   if(isData){
     const side=document.querySelector('.sidebar'),btn=document.createElement('button');btn.type='button';btn.className='mobile-directory';btn.textContent='展开指标目录';btn.setAttribute('aria-controls','navigation');btn.setAttribute('aria-expanded','false');document.querySelector('.side-head').append(btn);
     btn.addEventListener('click',()=>{const open=side.classList.toggle('directory-open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'收起指标目录':'展开指标目录';});
     $('navigation').addEventListener('click',e=>{if(e.target.closest('[data-code]')&&matchMedia('(max-width:760px)').matches){side.classList.remove('directory-open');btn.setAttribute('aria-expanded','false');btn.textContent='展开指标目录';main.scrollIntoView({block:'start'});main.focus({preventScroll:true});}});
     $('nav-search').addEventListener('input',()=>{if($('nav-search').value&&matchMedia('(max-width:760px)').matches){side.classList.add('directory-open');btn.setAttribute('aria-expanded','true');btn.textContent='收起指标目录';}});
     const welcome=$('empty-state');
     if(welcome&&!welcome.hidden){
       welcome.innerHTML='<div class="welcome-kicker">PENSION FINANCE / DATA & RESEARCH</div><h1>养老金融研究，<br>从可追溯的资料开始。</h1><p class="welcome-lead">查询统计数据，查阅制度原文，检索相关研究。数据、政策与文献按各自口径呈现，来源随条目保留。</p><div class="welcome-grid"><button type="button" class="welcome-card" id="start-query"><b>01 / 统计数据查询</b><span>先选地区层级，再按支柱、制度与主题查找指标。支持时间与地区筛选、表格与图表，以及当前指标下载。</span><em>搜索指标 →</em></button><a class="welcome-card" href="policy.html"><b>02 / 社保政策库</b><span>按制度、年份和机关检索政策，查看原文、执行日期及来源。</span><em>查阅政策 →</em></a><a class="welcome-card" href="literature.html"><b>03 / 社保文献库</b><span>检索中英文研究，阅读摘要，查看具体政策关联证据与原站全文入口。</span><em>检索文献 →</em></a></div><p class="welcome-note">数据使用提示：全国、分省、单省明细及其他层级分别浏览；核验状态以每条记录为准。制度参数、研究情景与统计事实分别使用。</p>';
       $('start-query').addEventListener('click',()=>{$('nav-search').focus();if(matchMedia('(max-width:760px)').matches){side.classList.add('directory-open');btn.setAttribute('aria-expanded','true');btn.textContent='收起指标目录';side.scrollIntoView({block:'start'});}});
     }
     return;
   }
   const filters=document.querySelector('.filters'),results=document.querySelector('.results');filters.id='library-filters';
   if(!filters.querySelector('h2')){const h=document.createElement('h2');h.textContent='筛选政策';filters.prepend(h);}
   const toggle=document.createElement('button');toggle.id='filter-toggle';toggle.className='filter-toggle';toggle.type='button';toggle.innerHTML='<span>筛选条件</span><span aria-hidden="true">展开 ＋</span>';toggle.setAttribute('aria-controls',filters.id);toggle.setAttribute('aria-expanded','false');filters.before(toggle);
   toggle.addEventListener('click',()=>{const open=filters.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));toggle.lastElementChild.textContent=open?'收起 −':'展开 ＋';});
   const active=document.createElement('div');active.id='active-filters';active.className='active-filters';active.setAttribute('aria-label','已选筛选条件，点击可移除');results.prepend(active);
   active.addEventListener('click',e=>{const b=e.target.closest('[data-clear]');if(!b)return;const el=$(b.dataset.clear);el.value=defaults[el.id]||'';el.dispatchEvent(new Event(el.id==='query'?'input':'change',{bubbles:true}));if(el.getClientRects().length)el.focus({preventScroll:true});else toggle.focus({preventScroll:true});});
   const rows=$('rows');rows.tabIndex=-1;
   const stats=$('stats');stats.setAttribute('role','status');stats.setAttribute('aria-live','polite');stats.setAttribute('aria-atomic','true');
   const jump=document.createElement('a');jump.className='to-results';jump.href='#rows';jump.textContent='跳到检索结果 ↓';document.querySelector('.heading').append(jump);
   refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

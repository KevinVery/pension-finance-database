(function(){
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const params=new URLSearchParams(location.search);
 window.LibraryLinks={
  data:null,papers:new Map(),policies:new Map(),paperFilter:null,policyFilter:null,scores:new Map(),
  async init(){
   this.data=window.POLICY_PAPER_LINKS;
   if(!this.data){const r=await fetch('data/policy_paper_links_v03.json?v=20261019c');if(!r.ok)throw Error('关联研究暂未加载，请刷新重试');this.data=await r.json();}
   this.data.papers.forEach((r,i)=>this.papers.set(r.id,{...r,index:i}));
   this.data.policies.forEach((p,i)=>this.policies.set(p.id,{...p,index:i}));
   const p=params.get('policy'),r=params.get('paper');
   if(p){this.paperFilter=new Set();const i=this.policies.get(p)?.index;for(const e of this.data.links)if(e[1]===i){const id=this.data.papers[e[0]].id;this.paperFilter.add(id);this.scores.set(id,e[2]);}}
   if(r){this.policyFilter=new Set();const i=this.papers.get(r)?.index;for(const e of this.data.links)if(e[0]===i){const id=this.data.policies[e[1]].id;this.policyFilter.add(id);this.scores.set(id,e[2]);}}
   this.explicit=new Map(this.data.explicitEvidence.map(e=>[e['文献ID']+'|'+e['政策ID'],e]));return this.data;
  },
  relatedScore(id){return this.scores.get(id)||0;},
  paperMatches(r){return (!params.get('id')||r['文献ID']===params.get('id'))&&(!this.paperFilter||this.paperFilter.has(r['文献ID']));},
  policyMatches(p){return (!params.get('id')||p['政策ID']===params.get('id'))&&(!this.policyFilter||this.policyFilter.has(p['政策ID']));},
  context(type){const id=params.get(type==='paper'?'policy':'paper'),focus=params.get('id');if(!id&&!focus)return '';const source=(type==='paper'?this.policies:this.papers).get(id);return '<div class="link-context">'+esc(source?'关联研究：'+source['标题']:'指定条目')+' <a href="'+(type==='paper'?'literature.html':'policy.html')+'">返回全部条目</a></div>';},
  evidence(edge){
   const r=this.data.papers[edge[0]],p=this.data.policies[edge[1]],direct=this.explicit.get(r.id+'|'+p.id);
   if(direct)return '<small>'+esc(direct['关系类型'])+'</small><p>'+esc(direct['关联理由'])+'</p><blockquote>论文依据（'+esc(direct['证据字段'])+'）：'+esc(direct['证据摘录'])+'</blockquote><small>政策依据：'+esc(direct['政策依据'])+'</small>';
   const topics=edge[3].slice(0,4);
   return '<small>主题相关研究 · '+esc(topics.map(t=>this.data.topics[t]).join('、'))+'</small><details class="match-evidence"><summary>为什么相关</summary>'+topics.map(t=>'<p><strong>'+esc(this.data.topics[t])+'</strong></p><blockquote>论文：'+esc(r['主题'][t]['片段'])+'<br>政策：'+esc(p['主题'][t]['片段'])+'</blockquote>').join('')+'</details>';
  },
  paperPanel(r){
   const ids=r['政策关联']||[],direct=r['明确提及政策数']||0;
   const citation=r['被引次数']==null?'被引次数：未收录':'Crossref 被引 '+esc(r['被引次数'])+' 次（'+esc(r['被引核对日期'])+'）';
   return '<div class="link-metrics"><span>关联政策 '+ids.length+' 项</span><span>'+citation+'</span>'+(direct?'<span>明确提及文件 '+direct+' 项</span>':'')+'</div><details class="related-panel"><summary>相关政策'+(ids.length?' · '+ids.length+' 项':'')+'</summary><p>仅计能够对应具体文件或中国具体改革的证据；同主题和国外经验不计入，关联也不等于引用或采纳。</p>'+(ids.length?'<ul>'+ids.slice(0,8).map(idx=>{const e=this.data.links[idx],p=this.data.policies[e[1]];return '<li><a href="policy.html?id='+encodeURIComponent(p.id)+'">'+esc(p['标题'])+'</a>'+this.evidence(e)+'</li>';}).join('')+'</ul><a href="policy.html?paper='+encodeURIComponent(r['文献ID'])+'">查看全部 '+ids.length+' 项关联政策 →</a>':'<p>当前题名、摘要中暂无可核定的具体政策关联；可继续通过文献主题检索相关研究。</p>')+(r['被引来源链接']?'<p><a href="'+esc(r['被引来源链接'])+'" target="_blank" rel="noopener">被引数据来源 ↗</a></p>':'')+'</details>';
  },
  policyPanel(p){
   const ids=p['文献关联']||[],direct=p['明确文件提及论文数']||0;
   return '<div class="link-metrics"><span>关联论文 '+ids.length+' 篇</span><span>库内文件引用 '+Number(p['库内文件引用数']||0)+' 次</span>'+(direct?'<span>明确提及文件 '+direct+' 篇</span>':'')+'</div><details class="related-panel"><summary>相关研究论文'+(ids.length?' · '+ids.length+' 篇':'')+'</summary><p>仅计能够对应具体文件或中国具体改革的证据；同主题和国外经验不计入，关联也不等于引用或采纳。</p>'+(ids.length?'<ul>'+ids.slice(0,8).map(idx=>{const e=this.data.links[idx],r=this.data.papers[e[0]];return '<li><a href="literature.html?id='+encodeURIComponent(r.id)+'">'+esc(r['标题'])+'</a><small>'+esc(r['年份'])+'</small>'+this.evidence(e)+'</li>';}).join('')+'</ul><a href="literature.html?policy='+encodeURIComponent(p['政策ID'])+'">查看全部 '+ids.length+' 篇关联论文 →</a>':'<p>当前文献题名、摘要中暂无可核定的具体关联；不代表没有研究，须进一步核对全文证据。</p>')+'</details>';
  }
 };
})();

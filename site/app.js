(() => {
  const portal = window.PORTAL_DATA;
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", "\"":"&quot;" }[char]));
  const format = (value) => Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 4 });
  const indicatorByCode = (code) => portal.indicators.find((item) => item["指标代码"] === code);
  const framework = {"version": "framework_v01", "date": "2026-10-08", "basis": "20261008文件/养老金融数据库讨论大会和小会20261008.txt：大会05:38、29:35、32:31、40:57、45:13；小会03:29、04:03、09:36、10:45", "principle": "先明确制度、主题和证据边界，再填充资料。框架栏目不代表已有数据，更不代表数值为零或具备指数资格。", "topics": {"参保与领取": {"fields": "在职参保、离退休参保、领取待遇人数；企业职工在职口径与全口径分别登记", "unit": "万人或人（原表单位分别保留）", "sources": "人社部统计公报、中国劳动统计年鉴、地方人社统计公报", "check": "在职、离退休、总参保仅在同一制度、同一时点、同一覆盖下校验；企业职工在职人数不可与机关事业全口径直接相加"}, "基金收入": {"fields": "总收入、保险费收入、财政补贴、利息、投资收益、转移及其他收入", "unit": "亿元或万元（统一转换后保留原单位）", "sources": "财政部及省级财政社会保险基金决算、人社部门公报", "check": "先识别收入构成与调剂资金处理方式，再校验分项与总额；预算数、决算数不得拼接"}, "基金支出": {"fields": "总支出、基本养老金支出、其他待遇、转移及其他支出", "unit": "亿元或万元", "sources": "财政部及省级财政社会保险基金决算、人社部门公报", "check": "总基金支出不等于基本养老金支出；必须记录支出项目、时间范围及制度对象"}, "基金结余": {"fields": "当期结余、累计结余、年初及年末余额", "unit": "亿元或万元", "sources": "财政社会保险基金决算、官方统计年鉴", "check": "核验年初余额＋当期收支与年末余额；说明调整及调剂项，保留合法负值"}, "待遇与人均支出": {"fields": "官方平均养老金、基础养老金标准、养老金调整、可复算人均基金支出", "unit": "元/月、元/年或比例（必须区分）", "sources": "人社部门待遇政策、公报、财政决算；派生项回溯分子分母", "check": "政策最低标准、实际平均待遇、人均基金支出分开；年末领取人数不冒充年均人数"}, "资产与投资运营": {"fields": "资产规模、受托投资规模、投资收益、收益率及资产配置", "unit": "亿元、百分比；注明存量或期间流量", "sources": "全国社会保障基金理事会、人社部年金业务报告、受托机构公开报告", "check": "区分基本养老保险受托资金、全国社保基金储备、年金资产；不同统计对象不可合并"}, "统筹与调剂": {"fields": "统筹层次、全国统筹或历史中央调剂上解下拨、财政责任与跨地区转移", "unit": "制度文本或亿元；分别建表", "sources": "国务院、人社部、财政部政策及基金决算", "check": "区分历史中央调剂与全国统筹，禁止将政策机制当数值观测或重复计入基金收入"}, "账户与缴存": {"fields": "开户人数、实际缴费人数、缴存金额与年度缴费分布", "unit": "人、万人、亿元", "sources": "人社部个人养老金公开信息、相关监管机构", "check": "开户不等于缴费；全国数据不能按人口比例伪造省级数据；累计开户与当期新增分开"}, "领取与税收": {"fields": "领取人数与金额、领取条件、缴费扣除限额、投资及领取税收规则", "unit": "金额、人数及政策条目分别存储", "sources": "人社部、财政部、国家税务总局官方文件", "check": "个人养老金与制度外养老金融产品分开；税收优惠规则不得当实际减税额"}}, "pillars": [{"name": "第一支柱", "systems": [{"name": "企业职工基本养老保险", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "待遇与人均支出", "资产与投资运营", "统筹与调剂"]}, {"name": "机关事业单位基本养老保险", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "待遇与人均支出", "资产与投资运营", "统筹与调剂"]}, {"name": "城乡居民基本养老保险", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "待遇与人均支出", "资产与投资运营", "统筹与调剂"]}, {"name": "城镇职工基本养老保险（全口径）", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "待遇与人均支出", "资产与投资运营"], "note": "官方全口径汇总，独立保存；不是可与企业职工及机关事业重复相加的第三个制度"}, {"name": "基本养老保险（官方汇总口径）", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余"], "note": "跨制度官方汇总，不替代具体制度数据"}, {"name": "新型农村社会养老保险试点", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余"], "note": "历史制度，保留有效期，不直接拼接城乡居民序列"}, {"name": "小城镇基本养老保险（上海）", "topics": ["基金收入", "基金支出", "基金结余"], "note": "地方历史制度；不要求或虚构31省同类面板"}]}, {"name": "第二支柱", "systems": [{"name": "企业年金", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "资产与投资运营"]}, {"name": "职业年金", "topics": ["参保与领取", "基金收入", "基金支出", "基金结余", "资产与投资运营"]}]}, {"name": "第三支柱", "systems": [{"name": "个人养老金", "topics": ["账户与缴存", "资产与投资运营", "领取与税收"], "note": "先建设个人养老金制度模块；纳入制度的产品资格需逐产品核验，不把全部养老理财归入个人养老金"}, {"name": "其他个人养老储备（制度边界待核）", "topics": ["覆盖与规模", "制度衔接与历史试点"], "note": "只保留边界研究位置；商业养老金融产品是否属于第三支柱逐项论证，不与个人养老金直接合计"}]}], "domains": [{"name": "其他险种", "groups": ["社会保险基金汇总与结构", "医疗保险", "职工基本医疗保险", "城乡居民基本医疗保险", "失业保险", "工伤保险", "生育保险", "长期护理保险（养老交叉专题）"], "fields": "保留已入库其他险种；新扩展只优先处理与养老、照护有明确联系的指标", "sources": "国家医保局、人社部、财政部及地方公开资料", "check": "养老与其他险种不混归，长期护理与基本医疗分别识别；不在本轮扩大一般医保研究范围"}, {"name": "国内制度参数", "groups": ["缴费基数与工资口径", "养老金计发参数", "法定退休年龄", "弹性退休", "最低缴费年限", "缴费费率与财政补助", "社会保险统筹层次", "税收优惠与征缴规则"], "fields": "参数值、制度对象、适用人群、统筹区、执行起止、文号及版本关系", "sources": "国务院、人社部、财政部、税务总局及省市官方文件", "check": "省内多档逐项存储；社平工资、平均工资、缴费工资、缴费基数及养老金计发基数不可互换"}, {"name": "国际制度比较", "groups": ["国际比较（OECD）", "国际比较（世界银行）", "制度与税收规则", "自动加入与行为机制", "基金投资与治理"], "fields": "国家、制度、统计或模型性质、年度、口径与可比边界", "sources": "OECD、世界银行、ILO、ISSA及各国官方机构", "check": "模型替代率与实际统计待遇不可混比；参数年份与出版年份分别登记"}, {"name": "人口与就业", "groups": ["人口", "就业规模", "城乡就业", "城镇单位就业", "就业结构", "私营与个体", "失业", "年龄结构与老龄化", "灵活就业与参保基础"], "fields": "人口年龄结构、劳动年龄人口、就业、劳动参与与失业；注明普查或抽样", "sources": "国家统计局人口普查、统计年鉴、地方统计机构", "check": "普查与年度抽样断点说明；就业人数不等于参保人数；年龄组和地区边界一致"}, {"name": "工资与收入", "groups": ["工资水平", "工资与缴费口径", "居民收入", "居民消费", "社会救助", "退休前收入与生命周期"], "fields": "私营及非私营工资、可支配收入、消费、税前税后、年龄与队列收入", "sources": "国家统计局、地方年鉴；后续合法授权微观调查", "check": "退休前个人工资与当期平均工资不同；年/月和税前/税后分别标注，不能简单替代"}, {"name": "宏观背景", "groups": ["宏观背景", "财政能力", "物价与生活成本", "养老与照护供给"], "fields": "GDP、财政收入支出、价格指数及养老照护服务供给", "sources": "国家统计局、财政部、民政部及地方官方机构", "check": "初步数与修订数分别留痕；名义、实际及基期不可混用；背景变量不自动视为养老绩效"}, {"name": "养老金融产品与机构", "groups": ["养老目标基金", "养老理财", "养老储蓄", "商业养老保险", "机构与受托管理", "养老产业金融工具"], "fields": "产品或机构ID、类型、发行或管理机构、时点、规模、费用、风险、个人养老金资格；产业金融工具单列", "sources": "金融监管总局、证监会、基金业协会、发行机构正式披露及交易所", "check": "机构、产品、地区为不同主键；产品发行地不代表投资者居住地，不强配为省级指数变量"}, {"name": "政策库", "groups": ["第一支柱政策", "第二支柱政策", "第三支柱政策", "缴费征缴与税收", "基金统筹与投资", "养老服务与照护", "地方政策与历史版本"], "fields": "标题、机关、文号、发布日期、生效与失效、适用范围、原文、替代废止关系", "sources": "中国政府网、人社部、财政部、税务总局、民政部、省级官网；北大法宝作为授权可用检索与核验线索", "check": "现行、废止、被替代、待核分别登记；原文与摘录分开；政策不能作为已发生统计事实"}, {"name": "文献与资讯", "groups": ["经济学与社会保障文献", "基金投资与养老金融文献", "国际权威资讯", "研究报告与证据索引"], "fields": "作者或机构、题名、年份、DOI或URL、证据类型、研究问题、原文定位", "sources": "期刊、国际组织和官方机构；行业报告另标证据等级", "check": "官方事实、研究结论和新闻描述分开，不将报告估计升级为官方数据"}, {"name": "调研与微观数据", "groups": ["养老金融素养", "家庭养老资产配置", "参保缴费与退休行为", "照护需求与消费"], "fields": "调查名称、授权、样本设计、权重、变量口径、轮次、地区代表性及使用限制", "sources": "课题组调查、合法授权学术调查及其方法说明", "check": "先登记可用权限；样本不等于总体，地区估计须满足设计；公开层只展示合规汇总或目录"}, {"name": "专题研究与指数方法", "groups": ["替代率与待遇充足性", "养老金购买力与照护支出", "缴费基数与制度变迁", "生命周期与代际比较", "基金收支与可持续性", "区域指数候选与方法"], "fields": "研究问题、证据、分子分母、假设、预注册、代码、复算结果及使用边界", "sources": "关联本平台已核验统计、政策及合规文献和调研资料", "check": "预测情景与统计事实分层；替代率分母须声明；指数未达到准入条件不计算或发布地区排名"}]};

  // 板块按业务重要性排序，不用字典序
  const BOARD_ORDER = ["养老保险", "其他险种", "国内制度参数", "国际制度比较",
                       "人口与就业", "工资与收入", "宏观背景"];
  const categories = [...BOARD_ORDER, ...framework.domains.map(d=>d.name).filter(n=>!BOARD_ORDER.includes(n))];

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


  let navQuery = "", navCategory = "all", branchSerial = 0, navMode = "framework";
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
    function emptyNote(text) { return `<p class="nav-empty">${escapeHtml(text)}</p>`; }
    function leaves(items, path) {
      return items.slice().sort((a,b)=>String(a['指标名称']).localeCompare(String(b['指标名称']), 'zh')).map(i =>
        `<button class="nav-item" data-code="${escapeHtml(i['指标代码'])}" data-level="${escapeHtml(i['地区层级'])}" data-search="${escapeHtml(path + ' ' + i['指标名称'])}"><span class="label">${escapeHtml(i['指标名称'])}</span><span class="scope-tag">${escapeHtml(i['地区层级'])}</span></button>`).join("");
    }
    function groups(items, path, definitions = []) {
      const names=[...new Set([...definitions.map(d=>typeof d==='string'?d:d.name),...items.map(i=>i['指标分组'] || '其他指标')])];
      return names.map(group=>{
        const rows = items.filter(i=>(i['指标分组'] || '其他指标')===group);
        const definition=definitions.find(d=>(typeof d==='string'?d:d.name)===group);
        const topics = [...new Set([...(definition?.topics || []),...rows.map(i=>i['指标主题'] || group)])];
        const content = topics.length === 1 && topics[0] === group ? leaves(rows, path+' '+group) : topics.map(topic=>{
          const topicRows=rows.filter(i=>(i['指标主题'] || group)===topic);
          const spec=framework.topics[topic];
          return branch(topic, leaves(topicRows,path+' '+group+' '+topic)+(!topicRows.length?emptyNote('待补充资料。'+(spec?'目标：'+spec.fields+'。优先来源：'+spec.sources+'。':'先确定定义、适用范围与权威来源。')):''), 'nav-topic', `data-framework="true" data-path="${escapeHtml(path+' '+group+' '+topic)}"`);
        }).join('');
        return branch(group, (definition?.note?emptyNote(definition.note):'') + content + (!rows.length && !topics.length ? emptyNote('待建设栏目；暂无已入库指标。'):''), 'nav-system', `data-framework="true" data-path="${escapeHtml(path+' '+group)}"`);
      }).join('');
    }
    nav.innerHTML = categories.map(category=>{
      const items = portal.indicators.filter(i=>i['四大类']===category);
      const domain=framework.domains.find(d=>d.name===category);
      const content = category === '养老保险' ? framework.pillars.map(definition=>{
        const pillar=definition.name;
        const rows = items.filter(i=>String(i['支柱层次']).startsWith(pillar));
        return branch(pillar, (!rows.length?emptyNote('暂无已入库指标；先建设制度和主题框架。'):'')+groups(rows,category+' '+pillar,definition.systems), 'nav-pillar', `data-framework="true" data-path="${escapeHtml(category+' '+pillar)}"`);
      }).join('') : (domain?emptyNote('建设范围：'+domain.fields+'。优先来源：'+domain.sources+'。核验要点：'+domain.check+'。'):'')+groups(items,category,domain?.groups || []);
      return branch(category, content, 'nav-section', `data-cat="${escapeHtml(category)}" data-framework="true" data-path="${escapeHtml(category)}"`);
    }).join('');
    window.PortalTreeNavigation = true;
    nav.addEventListener('click', event=>{
      const toggle = event.target.closest('.nav-toggle');
      if(toggle) setOpen(toggle.parentElement, toggle.parentElement.classList.contains('collapsed'));
      const item = event.target.closest('[data-code]');
      if(item) selectIndicator(item.dataset.code);
    });
    const box = document.createElement('div'); box.className='side-search';
    box.innerHTML='<div class="nav-mode"><button type="button" data-mode="framework" aria-pressed="true">完整框架</button><button type="button" data-mode="data" aria-pressed="false">已有指标</button></div><p class="framework-hint">先搭框架，再填数据。「待补」表示当前口径无指标，不代表数值为零。目录计数含候选指标，核验状态请查看记录。</p><input id="nav-search" type="search" aria-label="搜索当前口径的制度、主题或指标" placeholder="搜索制度、主题或指标"><div class="nav-chips" id="nav-chips"></div><div class="nav-tools"><button type="button" data-act="expand">全部展开</button><button type="button" data-act="collapse">全部折叠</button></div>';
    nav.before(box);
    box.querySelector('input').addEventListener('input', event=>{ navQuery=event.target.value.trim().toLowerCase(); filterNav(); });
    box.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
      navMode=button.dataset.mode;navCategory='all';
      box.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      filterNav();
    }));
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
      b.querySelector(':scope > .nav-toggle > .nav-count').textContent=count || '待补';
      const frameworkMatch=navMode==='framework' && b.dataset.framework==='true' && (!navQuery || (b.dataset.path || '').toLowerCase().includes(navQuery) || [...b.querySelectorAll('.nav-branch')].some(child=>child.style.display!=='none'));
      b.style.display=count || frameworkMatch?'':'none';
      const children=b.querySelector(':scope > .nav-children');
      let status=children.querySelector(':scope > .nav-scope-empty');
      if(!status){status=document.createElement('p');status.className='nav-empty nav-scope-empty';children.prepend(status);}
      status.textContent=`${state.scope}口径暂无已入库指标。框架位置已预留；需核验公开资料是否可得及是否适用。`;
      status.hidden=count>0 || navMode!=='framework';
      if(navQuery && (count || frameworkMatch))setOpen(b,true);
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
    empty.innerHTML += `<p>默认展示完整建设框架：暂无指标的栏目标为「待补」。可切换「已有指标」集中查数。政策、产品、调研、文献与研究模块分别建设，框架预留不代表已完成采集或具备可比数据。</p>`;
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

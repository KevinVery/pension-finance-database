import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'deployment-manifest.json'),'utf8'));
function assert(ok,message){if(!ok)throw Error(message);}
assert(manifest.files.length<=20000,'Pages文件数量超限');
for(const file of manifest.files){
 const bytes=fs.readFileSync(path.join(root,'site',file.path));
 assert(bytes.length===file.bytes&&bytes.length<=25*1024*1024,'文件大小/清单差异 '+file.path);
 assert(crypto.createHash('sha256').update(bytes).digest('hex')===file.sha256,'文件哈希差异 '+file.path);
}
const html=fs.readFileSync(path.join(root,'site/index.html'),'utf8');
assert(!html.includes('admin-link'),'不应公开后台入口');
for(const name of ['app.js','style.css','charts.js','download.js'])assert(html.includes(name+'?v='),'缺少版本化资源 '+name);
const headers=fs.readFileSync(path.join(root,'site/_headers'),'utf8');
assert(/\n\/\s*\n\s*Cache-Control: no-cache/.test('\n'+headers),'首页必须禁长缓存');
const app=fs.readFileSync(path.join(root,'site/app.js'),'utf8');
assert(app.includes('仅展示当前数据口径下已有的指标')&&!app.includes('PORTAL_FRAMEWORK')&&!app.includes('data-mode="framework"'),'公开导航须仅展示已有指标');
console.log(JSON.stringify({ok:true,files:manifest.files.length,version:manifest.version,records:manifest.records,indicators:manifest.indicators}));
assert(html.includes('href="policy.html"'),'缺少政策库导航');
const policy=fs.readFileSync(path.join(root,'site/policy.html'),'utf8');
assert(policy.includes('policy_v39.js?v=') && policy.includes('policy_v39.css?v='),'政策资源缺少版本');
assert(policy.includes('library-layout')&&policy.includes('id="policy-chips"')&&policy.includes('id="decades"'),'政策布局缺少专题、侧栏或年代检索');
const data=JSON.parse(fs.readFileSync(path.join(root,'site/data/policy_public_v38.json'),'utf8'));
assert(data.meta.policies===data.policies.length,'政策数量不一致');
assert(data.policies.filter(p=>['原文已核验','法宝转载文本已核验'].includes(p['核验状态'])).length===data.meta.originals,'核验数量不一致');
assert(!JSON.stringify(data).includes('D:\\') && !JSON.stringify(data).includes('本地只读路径'),'公开数据包含本地路径');
assert(!/_内部质检[\\/]/.test(JSON.stringify(data)),'公开政策历史核验记录不得包含内部快照路径');
console.log(JSON.stringify({policyLibrary:true,...data.meta}));
const literature=fs.readFileSync(path.join(root,'site/literature.html'),'utf8');
assert(literature.includes('literature_v04.js?v=')&&literature.includes('社保文献库'),'缺少社保文献库页面');
assert(literature.includes('library-layout')&&literature.includes('topic-chips')&&literature.includes('id="sort"'),'文献布局缺失');
const downloads=fs.readFileSync(path.join(root,'site/download.js'),'utf8');
assert(!downloads.includes('data-scope="all"')&&!downloads.includes('data-scope="indicators"'),'不得提供整库导出');
assert(downloads.includes("scope !== 'indicator' ||")&&downloads.includes('f.indicator()'),'下载必须校验单指标且使用当前筛选');
const literatureData=JSON.parse(fs.readFileSync(path.join(root,'site/data/literature_public_v03.json'),'utf8'));
assert(literatureData.meta.records===literatureData.records.length,'文献数量不一致');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'site/data/literature_public_v02.json'),'utf8'));
const byId=new Map(literatureData.records.map(r=>[r['文献ID'],r]));
assert(baseline.records.length===2155&&baseline.records.every(r=>byId.has(r['文献ID'])),'既有2155条基线未保留');
assert(baseline.records.filter(r=>r['文献ID'].startsWith('CN6-')).every(r=>byId.get(r['文献ID']).原件SHA256===r.原件SHA256),'中文原件哈希基线被更改');
assert(literatureData.meta.chineseRecords===literatureData.records.filter(r=>r['语言']==='中文').length,'中文数量不一致');
assert(literatureData.meta.recordsSince2010===literatureData.records.filter(r=>Number(r['年份'])>=2010).length,'2010年及以后视图数量不一致');
assert(literature.includes('id="period"')&&literature.includes('id="verification"')&&literature.includes('id="path"'),'时间或来源核验筛选缺失');
assert(literatureData.records.every(r=>/^https?:\/\//.test(r['来源页'])&&r['研究主题'].length),'文献来源或研究主题缺失');
assert(literatureData.records.filter(r=>baseline.records.some(b=>b['文献ID']===r['文献ID'])&&r['语言']==='英文').every(r=>r['官方PDF'].startsWith('https://')),'NBER全文入口缺失');
assert(new Set(literatureData.records.map(r=>r['文献ID'])).size===literatureData.records.length,'文献ID重复');
assert(literatureData.meta.legacyChineseLocalFulltexts===298&&literatureData.meta.legacyChineseMissingFulltexts===1,'中文全文状态不符');
assert(!JSON.stringify(literatureData).includes('D:\\codex')&&!JSON.stringify(literatureData).includes('D:\\deepseek'),'文献公开数据包含本地路径');
console.log(JSON.stringify({literatureLibrary:true,...literatureData.meta}));
assert(data.meta.national+data.meta.provincial===data.policies.length,'全国/分省数量不一致');
assert(data.policies.every(p=>['全国政策','分省政策'].includes(p['政策层级'])),'政策层级缺失');
assert(data.meta.defaultScope==='全国政策' && data.meta.defaultSort==='成文日期降序','默认应全国政策、时间降序');
assert(policy.includes('id="national"')&&policy.includes('id="provincial"'),'缺少全国/分省栏目');
const css=fs.readFileSync(path.join(root,'site/policy_v39.css'),'utf8');
assert(css.includes('.header nav a,.header nav a:visited')&&css.includes('color:#fff'),'政策页导航必须白色');
assert(html.includes('href="policy.html" style="color:#fff'),'首页导航必须白色');
assert(data.meta.auditedNationalLeads===125 && data.nationalAudit.length===125,'必须逐条交代原125条全国线索');
assert(new Set(data.nationalAudit.map(r=>r['原始线索ID'])).size===125,'原125条核验ID重复');
assert(data.meta.unresolvedNationalLeads===0,'原始全国线索核验未完成');
assert(data.meta.nationalOriginals===data.policies.filter(p=>p['政策层级']==='全国政策'&&p['核验状态']==='原文已核验').length && data.meta.nationalOfficialReports===1 && data.meta.national>124,'全国正文/消息/去重数量不符');
assert(data.policies.filter(p=>p['政策层级']==='全国政策').every(p=>['原文已核验','法宝转载文本已核验','官方发布信息已核验'].includes(p['核验状态'])),'全国不得混入未核验线索');
for(const [id,date] of [['POL-CN-2015-001','2014-10-01'],['POL-CN-2019-001','2019-05-01'],['POL-CN-2024-001','2025-01-01'],['POL-CN-2024-002','2025-01-01'],['POL-CN-ELASTIC2024','2025-01-01']]){
 const p=data.policies.find(p=>p['政策ID']===id);assert(p&&p['生效日期']===date,'关键改革缺失或实施日期错误 '+id);
}

assert(data.meta.nationalPkulawTexts===138&&data.meta.pkulawPrimaryTexts===138&&data.meta.pkulawSupplementalMatches===38,"法宝政策数量不符");
assert(data.policies.every(p=>JSON.parse(p['补充来源链接']||'[]').every(s=>/^https?:\/\//.test(s.URL||'')&&s['名称'])),'政策补充来源须有名称与有效URL');
const dispute=data.policies.filter(p=>p['标题'].includes('社会保险行政争议处理办法'));
assert(dispute.length===1&&dispute[0]['成文日期']==='2001-05-27'&&dispute[0]['生效日期']==='2001-05-27','2001年行政争议办法须同文合并并以公布日期登记');
assert(data.meta.policies===506&&data.meta.national===500&&data.meta.relations===137,'逐年补齐批次数量不符');
assert(data.meta.collectionOrder.includes('2026年起'),'采集顺序必须由近到远');

assert(literatureData.records.every(r=>Array.isArray(r['发现来源'])&&r['官网核验']),'来源或核验层级缺失');
assert(literatureData.records.every(r=>!r['官方PDF']||/^https:\/\//.test(r['官方PDF'])),'新全文链接协议非法');



assert(literatureData.meta.recordsBefore2010+literatureData.meta.recordsSince2010+literatureData.meta.recordsUnknownYear===literatureData.records.length,'时间范围数量不闭合');

for(const id of ['period','verification','path'])assert(literature.split('id="'+id+'"').length===2,'文献筛选控件重复');

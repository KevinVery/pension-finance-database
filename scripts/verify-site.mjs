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
assert(policy.includes('policy_v15.js?v=') && policy.includes('policy_v15.css?v='),'政策资源缺少版本');
const data=JSON.parse(fs.readFileSync(path.join(root,'site/data/policy_public_v15.json'),'utf8'));
assert(data.meta.policies===data.policies.length,'政策数量不一致');
assert(data.policies.filter(p=>p['核验状态']==='原文已核验').length===data.meta.originals,'核验数量不一致');
assert(!JSON.stringify(data).includes('D:\\') && !JSON.stringify(data).includes('本地只读路径'),'公开数据包含本地路径');
console.log(JSON.stringify({policyLibrary:true,...data.meta}));
assert(data.meta.national+data.meta.provincial===data.policies.length,'全国/分省数量不一致');
assert(data.policies.every(p=>['全国政策','分省政策'].includes(p['政策层级'])),'政策层级缺失');
assert(data.meta.defaultScope==='全国政策' && data.meta.defaultSort==='成文日期升序','默认应全国政策、时间升序');
assert(policy.includes('id="national"')&&policy.includes('id="provincial"'),'缺少全国/分省栏目');
const css=fs.readFileSync(path.join(root,'site/policy_v15.css'),'utf8');
assert(css.includes('.header nav a,.header nav a:visited,.header nav a:hover{color:#fff'),'政策页导航必须白色');
assert(html.includes('href="policy.html" style="color:#fff'),'首页导航必须白色');
assert(data.meta.auditedNationalLeads===125 && data.nationalAudit.length===125,'必须逐条交代原125条全国线索');
assert(new Set(data.nationalAudit.map(r=>r['原始线索ID'])).size===125,'原125条核验ID重复');
assert(data.meta.unresolvedNationalLeads===0,'原始全国线索核验未完成');
assert(data.meta.nationalOriginals===data.policies.filter(p=>p['政策层级']==='全国政策'&&p['核验状态']==='原文已核验').length && data.meta.nationalOfficialReports===1 && data.meta.national>124,'全国正文/消息/去重数量不符');
assert(data.policies.filter(p=>p['政策层级']==='全国政策').every(p=>['原文已核验','官方发布信息已核验'].includes(p['核验状态'])),'全国不得混入未核验线索');
for(const [id,date] of [['POL-CN-2015-001','2014-10-01'],['POL-CN-2019-001','2019-05-01'],['POL-CN-2024-001','2025-01-01'],['POL-CN-2024-002','2025-01-01'],['POL-CN-ELASTIC2024','2025-01-01']]){
 const p=data.policies.find(p=>p['政策ID']===id);assert(p&&p['生效日期']===date,'关键改革缺失或实施日期错误 '+id);
}

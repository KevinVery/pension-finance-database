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
assert(policy.includes('policy_v02.js?v=') && policy.includes('policy_v02.css?v='),'政策资源缺少版本');
const data=JSON.parse(fs.readFileSync(path.join(root,'site/data/policy_public_v02.json'),'utf8'));
assert(data.meta.policies===data.policies.length,'政策数量不一致');
assert(data.policies.filter(p=>p['核验状态']==='原文已核验').length===data.meta.originals,'核验数量不一致');
assert(!JSON.stringify(data).includes('D:\\') && !JSON.stringify(data).includes('本地只读路径'),'公开数据包含本地路径');
console.log(JSON.stringify({policyLibrary:true,...data.meta}));

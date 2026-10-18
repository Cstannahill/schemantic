const ts = require('typescript');
const path = require('path');
const Module = require('module');
const fsp = require('fs/promises');
const { Schemantic } = require('../../dist');
const captured = new Map();
fsp.mkdir = async () => undefined;
fsp.writeFile = async (p, c) => captured.set(path.resolve(p), String(c));
function load(content) {
  const filename = path.join(process.cwd(), 'probe-virtual.cjs');
  const m = new Module(filename, module); m.filename = filename;
  m.paths = Module._nodeModulePaths(process.cwd());
  m._compile(ts.transpileModule(content, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText, filename);
  return m.exports;
}
function diagnostics() {
  const opts = {strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,skipLibCheck:true};
  const host = ts.createCompilerHost(opts);
  const get = host.getSourceFile.bind(host), read = host.readFile.bind(host), exists = host.fileExists.bind(host), directoryExists = host.directoryExists.bind(host);
  host.directoryExists = p => [...captured.keys()].some(f => f.startsWith(path.resolve(p) + path.sep)) || directoryExists(p);
  host.fileExists = p => captured.has(path.resolve(p)) || exists(p);
  host.readFile = p => captured.get(path.resolve(p)) ?? read(p);
  host.getSourceFile = (p,v,e,n) => captured.has(path.resolve(p)) ? ts.createSourceFile(p,captured.get(path.resolve(p)),v,true) : get(p,v,e,n);
  return ts.getPreEmitDiagnostics(ts.createProgram([...captured.keys()],opts,host)).map(d=>({code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
}
const base = {openapi:'3.1.0',info:{title:'Probe',version:'1'},paths:{},components:{schemas:{User:{type:'object',required:['id'],properties:{id:{type:'integer',minimum:1}}},Group:{type:'object',required:['name'],properties:{name:{type:'string'}}},UserId:{type:'string',format:'uuid'}}}};
async function generate(name, options={}, schema=base, client=false) {
  captured.clear();
  const result = await new Schemantic({schemaData:schema,outputDir:path.join(process.cwd(),'test-output/reaudit-plugins/in-memory'),generateTypes:true,generateApiClient:client,plugins:[{name,enabled:true,options}]}).generate();
  return {result,types:[...captured.entries()].find(([p])=>p.endsWith('types.ts'))?.[1],client:[...captured.entries()].find(([p])=>p.endsWith('api-client.ts'))?.[1]};
}
const print = obj => console.log(JSON.stringify(obj));
(async()=>{
  let p=await generate('branded-types'),m=load(p.types);
  print({probe:'branded-multiple-types',success:p.result.success,diagnostics:diagnostics(),invalidGuard:m.isUser({}),arrayGuard:m.isUser([]),assertInvalid:(()=>{try{m.assertUser({});return 'accepted';}catch{return 'rejected';}})(),primitiveBranded:!!m.createUserId});
  p=await generate('branded-types',{enableRuntimeGuards:false,enableAssertionFunctions:false,enableTypePredicates:false});
  print({probe:'branded-disable-options',guardStillEmitted:p.types.includes('export function isUser('),assertStillEmitted:p.types.includes('export function assertUser(')});
  p=await generate('strict-mode');
  print({probe:'strict-mode',success:p.result.success,strictHelper:p.types.includes('StrictType'),strictFile:[...captured.keys()].some(p=>p.endsWith('strict-types.ts'))});
  p=await generate('performance-monitoring',{enableRequestTiming:false},{...base,components:{schemas:{User:base.components.schemas.User}}},true);
  print({probe:'monitoring-disabled-timing',success:p.result.success,diagnostics:diagnostics()});
  p=await generate('zod-validation',{strictMode:false},{...base,components:{schemas:{User:base.components.schemas.User}}},true);m=load(p.client);
  print({probe:'permissive-validation',invalidResponse:m.validateResponse('wrong',require('zod').z.number())??'undefined'});
  p=await generate('request-deduplication',{}, {...base,components:{schemas:{}}},true);m=load(p.client);
  let d=new m.RequestDeduplicator(),calls=0;
  const a=await d.execute('GET','https://example.com/Aa',async()=>{calls++;return 'Aa';});
  const b=await d.execute('GET','https://example.com/BB',async()=>{calls++;return 'BB';});
  print({probe:'fingerprint-collision',a,b,calls});
  d=new m.RequestDeduplicator();calls=0;
  let x=await d.execute('GET','https://example.com/user',async()=>{calls++;return 'tenantA';},{headers:{'X-Api-Key':'tenantA'}});
  let y=await d.execute('GET','https://example.com/user',async()=>{calls++;return 'tenantB';},{headers:{'X-Api-Key':'tenantB'}});
  print({probe:'header-separation',x,y,calls});
  p=await generate('request-deduplication',{defaultTTL:10,endpointPolicies:{'/user':{ttl:10,staleWhileRevalidate:false}}},{...base,components:{schemas:{}}},true);m=load(p.client);d=new m.RequestDeduplicator();
  const realNow=Date.now;let now=100000;Date.now=()=>now;calls=0;
  await d.execute('GET','https://example.com/user',async()=>{calls++;return 'old';});now+=1000;
  const stale=await d.execute('GET','https://example.com/user',async()=>{calls++;return 'new';});Date.now=realNow;
  print({probe:'endpoint-no-stale',stale,calls});
  d=new m.RequestDeduplicator();calls=0;
  await d.execute('GET','https://example.com/user',async()=>{calls++;return 1;});d.invalidate(/user/);
  let invalidated=await d.execute('GET','https://example.com/user',async()=>{calls++;return 2;});
  print({probe:'regex-invalidation',invalidated,calls,stats:d.getStats()});
  const schema={...base,components:{schemas:{Both:{allOf:[{type:'object',required:['a'],properties:{a:{type:'string'}}},{type:'object',required:['b'],properties:{b:{type:'string'}}}]},Exclusive:{oneOf:[{type:'number'},{type:'integer'}]},Bounded:{type:'array',items:{type:'integer'},minItems:2,maxItems:3,uniqueItems:true},Positive:{type:'number',exclusiveMinimum:0},ConstrainedEnum:{type:'string',enum:['a','aa'],minLength:2}}}};
  p=await generate('zod-validation',{},schema);m=load(p.types);
  print({probe:'zod-schema-constraints',allOfValid:m.BothSchema.safeParse({a:'a',b:'b'}).success,oneOfOverlap:m.ExclusiveSchema.safeParse(1).success,minItems:m.BoundedSchema.safeParse([]).success,uniqueItems:m.BoundedSchema.safeParse([1,1]).success,exclusiveMinimum:m.PositiveSchema.safeParse(0).success,enumMinLength:m.ConstrainedEnumSchema.safeParse('a').success});
  const throwing = new Schemantic({schemaData:base,outputDir:'test-output/reaudit-plugins/in-memory',generateTypes:true,plugins:[{name:'throwing-probe',enabled:true}]});
  throwing.getPluginManager().registerPlugin({name:'throwing-probe',version:'1',description:'probe',afterTypeGeneration:()=>{throw new Error('required validation failed');}});
  captured.clear();const thrown=await throwing.generate();print({probe:'plugin-failure-reporting',success:thrown.success,errors:thrown.errors,warnings:thrown.warnings});
})().catch(e=>{console.error(e);process.exitCode=1;});

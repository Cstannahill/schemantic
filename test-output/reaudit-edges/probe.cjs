const fs = require('node:fs/promises');
const path = require('node:path');
const ts = require('typescript');
const http = require('node:http');
const { Schemantic } = require('../../dist/core/schemantic');
const root = __dirname;
const summary = [];
const doc = (schemas = {}, paths = {}) => ({openapi:'3.1.0',info:{title:'Edge API',version:'1'},paths,components:{schemas}});
const response = (media, schema) => ({description:'ok', content:{[media]: schema === undefined ? {} : {schema}}});
const operation = (id, responses, extra={}) => ({operationId:id,responses,...extra});
async function compile(dir, consumer='', options={}) {
  await fs.writeFile(path.join(dir,'consumer.ts'), consumer);
  const files = (await fs.readdir(dir)).filter(f=>f.endsWith('.ts')).map(f=>path.join(dir,f));
  const program = ts.createProgram(files,{strict:true,noEmit:true,exactOptionalPropertyTypes:true,noUncheckedIndexedAccess:true,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,skipLibCheck:true,types:[],lib:['lib.es2020.d.ts','lib.dom.d.ts'],...options});
  return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file&&path.basename(d.file.fileName),line:d.file&&d.file.getLineAndCharacterOfPosition(d.start).line+1,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
}
async function generate(name, data, consumer='', options={}) {
  const outputDir = path.join(root,name);
  await fs.mkdir(outputDir,{recursive:true});
  await fs.writeFile(path.join(outputDir,'schema.json'),JSON.stringify(data,null,2));
  const result = await new Schemantic({schemaData:data,outputDir}).generate();
  const diagnostics = result.success ? await compile(outputDir,consumer,options) : [];
  const entry = {name,success:result.success,errors:result.errors,endpoints:result.statistics.totalEndpoints,diagnostics};
  summary.push(entry);
  return {result,entry,outputDir};
}
async function load(dir) {
 const src=await fs.readFile(path.join(dir,'api-client.ts'),'utf8');
 const result=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}});
 const exports={};new Function('exports','require',result.outputText)(exports,require);
 return exports.EdgeApiClient;
}
async function main(){
 await generate('dictionary-known-property',doc({MixedDictionary:{type:'object',required:['name'],properties:{name:{type:'string'}},additionalProperties:{type:'number'}}}),"import { MixedDictionary } from './types'; const value: MixedDictionary = { name: 'valid', score: 2 };");
 await generate('allof-required-only',doc({RequiredByComposition:{allOf:[{type:'object',properties:{id:{type:'string'}}},{required:['id']}]}}),"import { RequiredByComposition } from './types'; const invalid: RequiredByComposition = {};");
 await generate('ref-required-sibling',doc({Base:{type:'object',properties:{id:{type:'string'}}},Child:{$ref:'#/components/schemas/Base',required:['id']}}),"import { Child } from './types'; const invalid: Child = {};");
 const referenced=doc({}, {'/thing':{$ref:'#/components/pathItems/Thing'}});
 referenced.components.pathItems={Thing:{get:operation('getThing',{'200':response('application/json',{type:'string'})})}};
 await generate('pathitem-ref',referenced);
 await generate('multipart-binary',doc({Upload:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary'}}}},{'/upload':{post:operation('upload',{'204':{description:'ok'}},{requestBody:{required:true,content:{'multipart/form-data':{schema:{$ref:'#/components/schemas/Upload'}}}}})}}),"import { EdgeApiClient } from './api-client'; new EdgeApiClient({baseUrl:'http://localhost'}).upload({file:new Blob(['abc'])});");
 await generate('raw-binary',doc({}, {'/upload':{post:operation('upload',{'204':{description:'ok'}},{requestBody:{required:true,content:{'application/octet-stream':{schema:{type:'string',format:'binary'}}}}})}}),"import { EdgeApiClient } from './api-client'; new EdgeApiClient({baseUrl:'http://localhost'}).upload(new Blob(['abc']));");
 const readWrite=doc({User:{type:'object',required:['id','name','password'],properties:{id:{type:'integer',readOnly:true},name:{type:'string'},password:{type:'string',writeOnly:true}}}},{'/user':{post:operation('createUser',{'200':response('application/json',{$ref:'#/components/schemas/User'})},{requestBody:{required:true,content:{'application/json':{schema:{$ref:'#/components/schemas/User'}}}}})}}); readWrite.openapi='3.0.3';
 await generate('readonly-writeonly',readWrite,"import { EdgeApiClient } from './api-client'; new EdgeApiClient({baseUrl:'http://localhost'}).createUser({name:'Alice',password:'secret'}).then(user=>{const id:number=user.id;});");
 await generate('verbatim-module',doc({User:{type:'object',properties:{id:{type:'string'}}}},{'/user':{get:operation('getUser',{'200':response('application/json',{$ref:'#/components/schemas/User'})})}}),'',{module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,verbatimModuleSyntax:true});
 await generate('global-blob-name',doc({Blob:{type:'string',enum:['small','big']}},{'/thing':{get:operation('getThing',{'200':response('application/json',{$ref:'#/components/schemas/Blob'})})}}));
 for(const version of ['3.0.4','3.1.1','3.1.2']) {const d=doc();d.openapi=version;await generate('version-'+version,d);}
 await generate('boolean-schema',doc({Anything:true,Nothing:false}));
 const componentsOnly=doc({Model:{type:'string'}}); delete componentsOnly.paths; await generate('components-without-paths',componentsOnly);
 const {OpenAPIParser}=require('../../dist/parsers/openapi');
 const yamlParser=new OpenAPIParser({outputDir:root});let yamlError;try{await yamlParser.parse({string:'openapi: 3.0.3\ninfo:\n  title: Example\n  version: "1"\npaths: {}\n'});}catch(e){yamlError=e.message;}
 summary.push({name:'yaml-advertised',metadata:yamlParser.getMetadata(),error:yamlError});
 const auth=await generate('auth-headers',doc({}, {'/auth':{get:operation('getAuth',{'200':response('application/json',{type:'object'})})}}));
 const binaryNoSchema=await generate('binary-no-schema',doc({}, {'/bin':{get:operation('getBinary',{'200':response('application/octet-stream')})}}));
 const defaultResponse=await generate('default-response',doc({}, {'/default':{get:operation('getDefault',{default:response('application/json',{type:'object',properties:{ok:{type:'boolean'}}})})}}));
 const xml=await generate('xml-response',doc({}, {'/xml':{get:operation('getXml',{'200':response('application/xml',{type:'string'})})}}));
 const query=await generate('object-query',doc({}, {'/query':{get:operation('getQuery',{'200':response('application/json',{type:'object'})},{parameters:[{name:'filter',in:'query',schema:{type:'object',properties:{role:{type:'string'},active:{type:'boolean'}}}}]})}}));
 const accept=await generate('multi-media-response',doc({}, {'/multi':{get:operation('getMulti',{'200':{description:'ok',content:{'text/plain':{schema:{type:'string'}},'application/json':{schema:{type:'object',properties:{ok:{type:'boolean'}}}}}}})}}));
 const server=http.createServer((req,res)=>{
  if(req.url==='/bin'){res.setHeader('Content-Type','application/octet-stream');res.end('abc');}
  else if(req.url==='/default'){res.setHeader('Content-Type','application/json');res.end('{"ok":true}');}
  else if(req.url==='/xml'){res.setHeader('Content-Type','application/xml');res.end('<ok>true</ok>');}
  else if(req.url==='/multi'){res.setHeader('Content-Type','application/json');res.end('{"ok":true}');}
  else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({url:req.url,authorization:req.headers.authorization}));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const baseUrl='http://127.0.0.1:'+server.address().port;
  for(const [item,method,args] of [[binaryNoSchema,'getBinary',[]],[defaultResponse,'getDefault',[]],[xml,'getXml',[]],[query,'getQuery',[{role:'admin',active:true}]],[accept,'getMulti',[]]]){
   const C=await load(item.outputDir); const value=await new C({baseUrl,retries:0})[method](...args);
   item.entry.runtime={type:typeof value,constructor:value?.constructor?.name,value:value instanceof Blob?await value.text():value};
  }
  const C=await load(auth.outputDir);const client=new C({baseUrl,retries:0,headers:{authorization:'Bearer original'}});client.setAuthToken('new');const afterSet=await client.getAuth();client.clearAuthToken();auth.entry.runtime={afterSet,afterClear:await client.getAuth()};
 }finally{await new Promise(r=>server.close(r));}
 await fs.writeFile(path.join(root,'summary.json'),JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

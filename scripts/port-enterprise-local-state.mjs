import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve('.runtime/platform-api'),mode=process.argv[2];
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function inventory(directory) {
  const state=JSON.parse(await readFile(join(directory,'state.json'),'utf8'));
  const sessions=state.classSessions??[];
  const runtimes=Object.fromEntries(Object.entries(state.classroomRuntimes??{}).map(([id,runtime])=>[id,Object.fromEntries(['deckId','deckVersion','slideIndex','slideKey','slideInteractions'].map(key=>[key,runtime[key]??null]))]));
  const tables={};
  for(const file of (await readdir(directory)).filter(name=>name.endsWith('.sqlite'))){
    const db=new DatabaseSync(join(directory,file),{readOnly:true});
    try{
      assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
      for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'enterprise_%'").all()){
        const rows=db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all();
        const rawHash=digest(rows.map(row=>JSON.stringify(row)).sort());
        let businessRows=rows;
        if(file==='port-simulation.sqlite'&&name==='port_simulation_runs')businessRows=rows.map(({updated_at,...row})=>row);
        if(file==='port-simulation.sqlite'&&name==='port_simulation_checkpoints')businessRows=rows.map(({created_at,checkpoint_json,...row})=>{
          const {serverTime,state,...checkpoint}=JSON.parse(checkpoint_json);
          const {presenceRevision,...business}=state;
          return {...row,checkpoint_json:JSON.stringify({...checkpoint,state:business})};
        });
        tables[file+':'+name]={rows:rows.length,hash:digest(businessRows.map(row=>JSON.stringify(row)).sort()),rawHash};
      }
    }finally{db.close();}
  }
  return {sessions,runtimes,tables};
}
if(mode==='before'){
  const directory=resolve('.runtime/backups/port-enterprise-integration-'+new Date().toISOString().replace(/[^0-9]/g,''));
  await mkdir(directory,{recursive:true});
  await copyFile(join(root,'state.json'),join(directory,'state.json'));
  for(const file of (await readdir(root)).filter(name=>name.endsWith('.sqlite'))){
    const db=new DatabaseSync(join(root,file),{readOnly:true});
    try{await backup(db,join(directory,file));}finally{db.close();}
  }
  const before=await inventory(directory);
  await writeFile(join(directory,'before.json'),JSON.stringify(before,null,2));
  await mkdir('output/port-enterprise-integration',{recursive:true});
  await writeFile('output/port-enterprise-integration/state-backup.json',JSON.stringify({directory,createdAt:new Date().toISOString(),sessions:before.sessions.length,runtimes:Object.keys(before.runtimes).length,legacyTables:Object.keys(before.tables).length},null,2));
  console.log(JSON.stringify({backup:directory,sessions:before.sessions.length,runtimes:Object.keys(before.runtimes).length,legacyTables:Object.keys(before.tables).length}));
}else if(mode==='after'){
  const receipt=JSON.parse(await readFile('output/port-enterprise-integration/state-backup.json','utf8'));
  const before=await inventory(receipt.directory),after=await inventory(root);
  for(const session of before.sessions)assert.deepEqual(after.sessions.find(s=>s.id===session.id),session,'historical classroom metadata changed: '+session.id);
  for(const [id,runtime] of Object.entries(before.runtimes))assert.deepEqual(after.runtimes[id],runtime,'historical deck/slide/reveal changed: '+id);
  const metadataChanges=[];
  for(const [name,table] of Object.entries(before.tables)){
    assert.equal(after.tables[name]?.rows,table.rows,'legacy row count changed: '+name);
    assert.equal(after.tables[name]?.hash,table.hash,'legacy business rows changed: '+name);
    if(after.tables[name].rawHash!==table.rawHash)metadataChanges.push({table:name,fields:name.endsWith(':port_simulation_runs')?['updated_at']:['created_at','checkpoint.serverTime','checkpoint.state.presenceRevision'],reason:'existing restart persistence refreshes timestamps and transient presence revision; business state and stored state_hash remain identical'});
  }
  const report={...receipt,checkedAt:new Date().toISOString(),preserved:true,sqliteIntegrity:'ok',metadataChanges};
  await writeFile('output/port-enterprise-integration/state-preservation.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({preserved:true,sessions:before.sessions.length,runtimes:Object.keys(before.runtimes).length,legacyTables:Object.keys(before.tables).length}));
}else throw Error('Use before or after.');

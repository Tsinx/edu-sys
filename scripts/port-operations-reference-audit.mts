import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {createPortSession,defaultPortPlan,defaultPortConfig,applyPortCommand,advancePortSession,servicePortReference,portScore,portHandoverItems,serializePortSession,portReferenceCost,runPortReference} from "../packages/port-simulation-core/src/index.js";
const output=fileURLToPath(new URL("../output/port-operations-qa/",import.meta.url));await mkdir(output,{recursive:true});
const config=defaultPortConfig();const reference=portReferenceCost(config);console.log("Reference cost calculated",reference);
const plan=defaultPortPlan();plan.equipment.yardMachine="rmg";plan.equipment.gateSystem="smart";plan.equipment.vehicle="agv";plan.equipment.dispatch.drivers=3;plan.equipment.cranes=5;plan.equipment.dispatch.berthCranes=[2,3];plan.equipment.dispatch.craneOperators=5;
const session=createPortSession("battle",config,plan);applyPortCommand(session,{kind:"start"});const start=Date.now();
while(session.second<172800){servicePortReference(session);advancePortSession(session,120);}
applyPortCommand(session,{kind:"handover",entries:portHandoverItems(session).map(({object,team,next})=>({object,team,next}))});
const score=portScore(session,reference);assert.equal(score.deductions,0);assert.ok(score.cargo>45);assert.ok(score.unitCost<reference.unitCost);assert.equal(session.status,"completed");
await writeFile(`${output}efficient-plan.json`,serializePortSession(session,{review:true}));
await writeFile(`${output}reference-comparison.json`,JSON.stringify({config,reference,efficient:{score,elapsedMs:Date.now()-start,plan}},null,2));console.log(JSON.stringify({score,elapsedMs:Date.now()-start}));

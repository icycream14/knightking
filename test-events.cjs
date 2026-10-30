'use strict';
const assert=require('node:assert/strict');
const {ScxTriggerRuntime}=require('./dist/scx-trigger-runtime.js');
const base=[0,1,2,3,4,5,6,7];
const owners=(...ids)=>Array.from({length:28},(_,i)=>ids.includes(i)?1:0);
const c=(type,value=0,more={})=>({type,flags:0,player:0,value,comparison:0,unit:0,resource:0,location:64,...more});
const a=(type,value=0,more={})=>({type,value,modifier:7,flags:0,player:0,unit:0,location:64,string:0,...more});
function make(triggers,units=[]){return new ScxTriggerRuntime({triggers,units,locations:[{id:2,bounds:[32,32,64,64]},{id:3,bounds:[128,128,160,160]}],strings:{7:'실제 원본 대사'},activePlayers:base,forceMembers:[[0],[1,2,3,4,5],[6,7],[]],capPerStep:1000})}
{
 const t={id:1,owners:owners(0),conditions:[c(22)],actions:[a(13,12,{modifier:4}),a(9,0,{string:7})]};
 const sim=make([t]);sim.step(100);sim.step(100);assert.equal(sim.switches[12],true);assert.equal(sim.messages.length,1);assert.equal(sim.status().executions,1);
}
{
 const t={id:2,owners:owners(0),conditions:[c(11,0,{resource:17,comparison:3})],actions:[a(13,17,{modifier:4}),a(3)]};
 const sim=make([t]);sim.step(100);sim.step(100);assert.equal(sim.status().executions,1);
}
{
 const t={id:3,owners:owners(0),conditions:[c(22)],actions:[a(44,0,{location:2,modifier:3,unit:15,player:0})]};
 const sim=make([t]);sim.step(100);assert.equal(sim.units.length,3);assert.equal(sim.units[0].x>0,true);
}
{
 const unit={id:1,x:43,y:43,owner:0,type:15,hp:100,alive:true};
 const t={id:4,owners:owners(0),conditions:[c(3,1,{location:2,comparison:0,unit:15})],actions:[a(39,3,{unit:15,location:2,modifier:1,player:0})]};
 const sim=make([t],[unit]);sim.step(100);assert.ok(unit.x>120);assert.ok(unit.y>120);
}
{
 const t={id:5,owners:owners(19),conditions:[c(22)],actions:[a(45,3,{unit:204,player:13,modifier:7})]};
 const sim=make([t]);sim.step(100);for(const p of [1,2,3,4,5])assert.equal(sim.getVal(sim.deaths,p,204),3);
 assert.equal(sim.getVal(sim.deaths,0,204),0);
}
{
 const t={id:6,owners:owners(0),conditions:[c(22)],actions:[a(4,0,{time:350}),a(9,0,{string:7})]};
 const sim=make([t]);sim.step(100);assert.equal(sim.messages.length,0);sim.step(100);sim.step(100);sim.step(100);assert.equal(sim.messages.length,0);sim.step(100);assert.equal(sim.messages.length,1);
 const copy=make([t]);copy.load(sim.save());assert.equal(copy.messages.length,1);
}
console.log('PASS: triggers, switches, actions, force ownership, unit movement, waits and save');

{
 const sim=make([]);sim.putVal(sim.resources,1,0,5);sim.putVal(sim.resources,1,0,10,9);assert.equal(sim.getVal(sim.resources,1,0),0);
 sim.alliances.set(sim.key(1,0),2);assert(sim.belongs(0,15,1));assert(!sim.belongs(0,14,1));
 console.log('PASS: resource subtraction saturates at zero and allied victory is friendly');
}

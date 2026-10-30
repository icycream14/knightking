'use strict';
// Reuse the real-map VM harness, replacing only the scenario, not the game code.
const fs=require('node:fs'),Module=require('node:module');
const scenario=String.raw`
selected=0;newGame();paused=false;scxEngine.triggers=[];scxEngine.index=new Map();
// Real native commanders retain their health and are tracked without legacy story advancement.
tickOriginalEvents(.1);let commander=entities.find(e=>e.type===65&&e.alive);assert(commander?.boss);assert.equal(commander.maxHealth,world.stats[65].hp);assert(boss);
// Buildings are reachable from the footprint, while allies and invincible enemies reject damage.
const tower={id:'test',type:126,owner:7,alive:true,health:100,maxHealth:100,x:player.x+100,y:player.y,hostile:true};entities.push(tower);assert(targetDistance(tower)<100);selectedTarget=tower;player.attackCd=0;attack();assert(tower.health<100);
let hp=tower.health;tower.owner=0;scxEngine.alliances.set(scxEngine.key(1,0),2);hit(tower,9999);assert.equal(tower.health,hp);assert(!attackable(tower));
tower.owner=7;tower.invincible=true;hit(tower,9999);assert.equal(tower.health,hp);tower.invincible=false;
// Damage and ownership survive save/load and the first event tick, without stale placed units.
let native=scxUnits.find(u=>u.id===commander.scxId||u.id===commander.id);commander.health=1234;native.owner=0;commander.owner=0;saveGame();loadGame();paused=false;scxEngine.triggers=[];scxEngine.index=new Map();tickOriginalEvents(.1);let restored=entities.find(e=>e.scxId===native.id);assert.equal(restored.health,1234);assert.equal(restored.owner,0);assert(!isHostile(restored));
// Scripted ownership transfer and move to the staging area update rendering consistently.
restored.owner=7;native=scxUnits.find(u=>u.id===restored.scxId);native.owner=7;tickOriginalEvents(.1);assert(isHostile(restored));assert(restored.boss);native.x=7900;restored.x=7900;tickOriginalEvents(.1);assert.equal(restored.alive,false);tickOriginalEvents(.1);assert.equal(native.alive,true);
// Player death is counted once and the revive timer cannot be bypassed by reloading.
invuln=0;player.hp=10;let actor=scxUnits.find(u=>u.id===scxActorId),deaths=scxEngine.getVal(scxEngine.deaths,1,actor.type);damagePlayer(100000);assert(deathTimer>0);assert.equal(scxEngine.getVal(scxEngine.deaths,1,actor.type),deaths+1);saveGame();let remaining=deathTimer;loadGame();assert.equal(deathTimer,remaining);assert.equal(player.hp,0);paused=false;scxEngine.triggers=[];scxEngine.index=new Map();entities=[];update(remaining);assert.equal(deathTimer,0);assert.equal(player.hp,player.maxHp);
// Only equipped skills are castable, and all six starting slots are unique.
assert.equal(skillSlots.length,6);assert.equal(new Set(skillSlots).size,6);let mana=player.mp;cast(99999);assert.equal(player.mp,mana);
// Missing sprites request an asset but return false so the visible fallback renders.
spriteDefs={};assert.equal(drawOriginal(ctx,999,0,0),false);
console.log('PASS: native bosses, building attacks, alliances, invincibility, ownership, saved health, death, revive and six skills');
`;
let source=fs.readFileSync('test-native-fast.cjs','utf8');source=source.replace('let sandbox={console,','let sandbox={assert,console,');let start=source.indexOf('const cases='),end=source.indexOf('\nlet nearestBuf=',start);source=source.slice(0,start)+'const cases='+JSON.stringify(scenario)+';'+source.slice(end);let mod=new Module(__filename,module);mod.filename=__filename;mod.paths=module.paths;mod._compile(source,__filename);

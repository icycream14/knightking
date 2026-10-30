'use strict';
const fs=require('node:fs'),Module=require('node:module');
const scenario=String.raw`
selected=0;newGame();paused=false;scxEngine.triggers=[];scxEngine.index=new Map();walkGrid=new Uint8Array(1048576).fill(1);entities=[];buildingCells=new Map();player.x=4000;player.y=4000;player.hp=player.maxHp=100000;equip=[];
assert.equal(scxEngine.matchesType({type:65},230),true);assert.equal(scxEngine.matchesType({type:112},230),false);assert.equal(scxEngine.matchesType({type:112},231),true);assert.equal(scxEngine.matchesType({type:65},229),true);assert.equal(scxEngine.matchesType({type:65},228),false);
let castCount=0;
for(let [type,skills] of Object.entries(bossProfiles)){
 type=+type;let e={id:'probe'+type,type,owner:7,x:4000,y:4000,health:500,maxHealth:1000,alive:true,boss:true,hostile:true,cd:0};entities=[e];let native={id:scxEngine.nextUnitId++,type,owner:7,x:4000,y:4000,hp:500,maxHp:1000,alive:true};scxUnits=[native];scxEngine.units=scxUnits;
 for(let i=0;i<skills.length;i++){clock+=20;player.x=4000;player.y=4000;deathTimer=0;invuln=0;e.health=500;e.bossAI={cooldown:0,next:i,casts:0};effects=[];updateBossSkills(e,.05);let f=effects.find(f=>f.bossCast);assert(f,'telegraph '+type+':'+i);assert.equal(f.label,skills[i][0]);assert.equal(e.bossAI.casts,1);let hp=player.hp;resolveBossSkill(f);if(['circle','line','dash','drain'].includes(f.skillKind))assert(player.hp<hp,'damage '+type+':'+i);if(f.skillKind==='heal')assert(e.health>500);if(f.skillKind==='shield')assert(e.bossAI.shieldUntil>clock);if(f.skillKind==='summon')assert(scxUnits.some(u=>u.browserSummoner===e.id));castCount++;}
 // Dead commanders cannot finish a queued spell.
 e.alive=false;let hp=player.hp;resolveBossSkill({sourceId:e.id,skillKind:'circle',x:player.x,y:player.y,r:500,power:100,phase:1});assert.equal(player.hp,hp);
}
// Use an actual original capture rule and the actual actor's Men group.
initOriginalEvents();scxEngine.triggers=[];scxEngine.index=new Map();let rule=captureRules.find(t=>t.id===945);assert(rule);let loc=scxEngine.loc(86),center=scxEngine.center(86);player.x=center[0];player.y=center[1];deathTimer=0;invuln=0;let actor=scxUnits.find(u=>u.id===scxActorId);actor.x=player.x;actor.y=player.y;actor.hp=player.hp;actor.alive=true;let u={id:scxEngine.nextUnitId++,type:112,owner:7,x:player.x+60,y:player.y,hp:1000,maxHp:1000,alive:true};scxUnits=[actor,u];scxEngine.units=scxUnits;scxEngine.typeIndex=null;scxEngine.invalidateUnits();entities=[{id:'scx'+u.id,scxId:u.id,type:112,owner:7,x:u.x,y:u.y,health:1000,maxHealth:1000,alive:true,hostile:true}];captureRules=[rule];captureRuleIds=new Set([rule.id]);
assert(startCapture({target:entities[0],rule}));updateCapture(3.9);assert.equal(captureReady,null);updateCapture(.2);assert.equal(captureReady,rule.id);scxEngine.runActions(rule.id+':1',rule,1,0,scxEngine.elapsed);assert.equal(u.owner,1);tickOriginalEvents(.1);updateCapture(.1);assert.equal(entities[0].owner,1);assert.equal(captureState,null);saveGame();loadGame();paused=false;scxEngine.triggers=[];scxEngine.index=new Map();tickOriginalEvents(.1);assert(entities.some(e=>e.scxId===u.id&&e.owner===1));
// A nearby enemy tower is hittable by basic attack at the building perimeter.
let tower={id:'tower',type:125,owner:7,x:player.x+90,y:player.y,health:1000,maxHealth:1000,alive:true,hostile:true};entities=[tower];selectedTarget=tower;player.attackCd=0;attack();assert(tower.health<1000);
console.log('PASS: 16 boss kits, '+castCount+' skills, dead-caster cancellation, original capture hold/ownership/save, macro IDs and basic building attacks');
`;
let source=fs.readFileSync('test-native-fast.cjs','utf8').replace('let sandbox={console,','let sandbox={assert,console,');let start=source.indexOf('const cases='),end=source.indexOf('\nlet nearestBuf=',start);source=source.slice(0,start)+'const cases='+JSON.stringify(scenario)+';'+source.slice(end);let mod=new Module(__filename,module);mod.filename=__filename;mod.paths=module.paths;mod._compile(source,__filename);

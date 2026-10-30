/* 왕의기사 Zero CHK TRIG 실행기.
   조건/행동은 StarCraft CHK 레코드의 실제 정수 값을 이용한다.
   EUD 임의 메모리 쓰기, 스타크래프트 내부 AI 스크립트 엔진, 원본 리소스 사운드/스프라이트는
   순수 브라우저에서 원본과 정확히 동일하게 구현할 수 없으므로 진단으로 노출한다. */
(function(root){'use strict';
const MAX_UNITS=6000, EPS=0.00001;
const BUILDINGS = new Set([106,107,108,109,110,111,112,113,114,115,116,117,118,120,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203]);
const playerIndex = (v, current) => v === 13 ? current : v;
const u32 = n => n >>> 0;
const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
const compare = (a,mode,b) => mode === 0 ? a >= b : mode === 1 ? a <= b : mode === 10 ? a === b : false;
class ScxTriggerRuntime {
  constructor({triggers=[],units=[],locations=[],strings={},callbacks={},player=0,activePlayers=[0,1,2,3,4,5,6,7],forceMembers=null,unitProperties=[],unitDefaults={},capPerStep=180}={}) {
    this.triggers=triggers.map((t,i)=>({id:t.id??i,owners:t.owners||[],conditions:t.conditions||[],actions:t.actions||[],flags:t.flags||0}));
    this.unitProperties=unitProperties;this.unitDefaults=unitDefaults;this.units=units;this.locations=new Map(locations.map(l=>[l.id,l]));this.strings=strings;this.callbacks=callbacks;
    this.player=player;this.activePlayers=activePlayers;this.forceMembers=forceMembers||[[0],[1,2,3,4,5],[6,7],[]];this.capPerStep=capPerStep;
    this.elapsed=0;this.frame=0;this.countdown=0;this.timerRunning=false;this.switches=Array(256).fill(false);
    this.deaths=new Map();this.resources=new Map();this.kills=new Map();this.scores=new Map();this.doodads=new Map();this.alliances=new Map();
    this.done=new Set();this.pending=new Map();this.waiting=new Set();this.messages=[];this.executed=0;
    this.stats={evaluations:0,executions:0,actions:0,errors:0,unsupported:0,unitCap:0,unknownTypes:{},eudReads:0,eudWrites:0,aiScripts:0};
    this.suspended=false;this.vision=new Map();this.index=new Map();this.nextUnitId=Math.max(0,...units.map(u=>u.id||0))+1;
    for(const t of this.triggers)for(const owner of this.ownersOf(t)){
      if(!this.index.has(owner))this.index.set(owner,[]);
      this.index.get(owner).push(t);
    }
    this.runtimeKeys={};this.ownerPools=new Map();this.queryCache=new Map();this.typeIndex=null;this.liveVersion=0;
  }
  ownersOf(t){const owners=[];for(let i=0;i<t.owners.length;i++)if(t.owners[i]===1){
    if(i<12)owners.push(i);
    else if(i===17)owners.push(...this.activePlayers);
    else if(i>=18&&i<=21)owners.push(...(this.forceMembers[i-18]||[]));
  }return [...new Set(owners)].filter(x=>this.activePlayers.includes(x));}
  key(p,unit){return `${p}:${unit}`;}
  getVal(table,p,unit=0){return table.get(this.key(p,unit))||0;}
  putVal(table,p,unit,value,modifier=7){const key=this.key(p,unit),old=table.get(key)||0;
    let n=modifier===8?old+value:modifier===9?old-value:value;table.set(key,clamp(n,0,4294967295));return table.get(key);}
  playersOf(group,current){
    if(group===13)return [current];
    if(group===17)return Array.from({length:12},(_,i)=>i);if(group===26)return this.activePlayers.slice();
    if(group>=18&&group<=21)return (this.forceMembers[group-18]||[]).slice();
    if(group===14)return this.activePlayers.filter(x=>x!==current&&!(this.alliances.get(this.key(current,x))>=1));
    if(group===15)return this.activePlayers.filter(x=>x!==current&&this.alliances.get(this.key(current,x))>=1);
    if(group===16)return [11];
    if(group>=0&&group<=11)return [group];
    return [];
  }
  belongs(owner,query,current){if(query===12)return true;if(query===13)return owner===current;if(query===17)return owner>=0&&owner<=11;
    if(query===14)return owner!==current && !(this.alliances.get(this.key(current,owner))>=1);
    if(query===15)return owner!==current && this.alliances.get(this.key(current,owner))>=1;
    if(query===16)return owner===11;
    if(query>=18&&query<=21)return (this.forceMembers[query-18]||[]).includes(owner);
    if(query===26)return owner<8;if(query===27)return owner>=8&&owner<=11;
    return owner===query;}
  // CHK macro IDs: None 228, Any Unit 229, Men 230, Buildings 231, Factories 232.
  // https://github.com/bwapi/bwapi/blob/main/bwapi/include/BWAPI/UnitType.h
  matchesType(u,type){if(type===228)return false;if(type===229)return true;if(type===230)return !BUILDINGS.has(u.type);if(type===231)return BUILDINGS.has(u.type);if(type===232)return [106,111,113,114,131,132,133,154,155,160,167].includes(u.type);return u.type===type;}
  inLoc(u,loc){if(!loc||loc.id===64||loc.id===0)return true;
    let [left,top,right,bottom]=loc.bounds||[0,0,8192,8192];if(left>right)[left,right]=[right,left];if(top>bottom)[top,bottom]=[bottom,top];
    return u.x>=left&&u.x<=right&&u.y>=top&&u.y<=bottom;}
  loc(id){return id===64||id===0?{id,bounds:[0,0,8192,8192]}:this.locations.get(id);}
  invalidateUnits(){this.ownerPools.clear();this.queryCache.clear();this.liveVersion++;}
  unitPool(type){if(!this.typeIndex){this.typeIndex=new Map([[229,[]],[230,[]],[231,[]],[232,[]]]);for(const u of this.units){if(u.hp<=0||u.alive===false)continue;this.indexUnit(u);}}return this.typeIndex.get(type)||[];}
  indexUnit(u){let keys=[u.type,229,BUILDINGS.has(u.type)?231:230];if(this.matchesType(u,232))keys.push(232);for(let key of keys){let a=this.typeIndex.get(key);if(!a)this.typeIndex.set(key,a=[]);a.push(u);}}
  queryOwners(p,cur){if(p===13)return [cur];if(p>=0&&p<12)return [p];let result=[];for(let owner=0;owner<12;owner++)if(this.belongs(owner,p,cur))result.push(owner);return result;}
  ownerPool(type){let owners=this.ownerPools.get(type);if(!owners){owners=new Map();owners.order=new Map();let ordinal=0;for(let u of this.unitPool(type)){owners.order.set(u,ordinal++);if(u.hp<=0||u.alive===false)continue;let list=owners.get(u.owner);if(!list)owners.set(u.owner,list=[]);list.push(u);}this.ownerPools.set(type,owners);}return owners;}
  unitsAt(p,type,locId,cur){const key='units:'+(p===13?cur:p)+':'+type+':'+locId+':'+(p===14||p===15?cur:0);if(this.queryCache.has(key))return this.queryCache.get(key);const owners=this.queryOwners(p,cur),pools=this.ownerPool(type),area=this.loc(locId),result=[];for(let owner of owners)for(let u of pools.get(owner)||[])if(u.hp>0&&u.alive!==false&&this.inLoc(u,area))result.push(u);if(owners.length>1)result.sort((a,b)=>pools.order.get(a)-pools.order.get(b));this.queryCache.set(key,result);return result;}
  countUnits(p,type,locId,cur,limit){if(limit<=0)return 0;return Math.min(limit,this.unitsAt(p,type,locId,cur).length);}

  ownedUnits(p,type,cur){return this.unitsAt(p,type,64,cur);}
  deathsAt(p,type,cur){if(p===13)return this.getVal(this.deaths,cur,type);
    return this.playersOf(p,cur).reduce((n,x)=>n+this.getVal(this.deaths,x,type),0);}
  condition(c,cur){if(c.flags&2)return true;
    const p=playerIndex(c.player,cur), v=c.value, cmp=c.comparison, type=c.type;
    switch(type){
      case 1:return compare(this.countdown/1000,cmp,v);
      case 2:return compare(this.countUnits(c.player,c.unit,64,cur,cmp===0?v:v+1),cmp,v);
      case 3:return compare(this.countUnits(c.player,c.unit,c.location,cur,cmp===0?v:v+1),cmp,v);
      case 4:return compare(this.playersOf(c.player,cur).reduce((n,x)=>n+this.getVal(this.resources,x,c.resource),0),cmp,v);
      case 5:return compare(this.playersOf(c.player,cur).reduce((n,x)=>n+this.getVal(this.kills,x,c.unit),0),cmp,v);
      case 11:{const b=this.switches[c.resource&255];return cmp===2?b:cmp===3?!b:false;}
      case 12:return compare(Math.floor(this.elapsed/1000),cmp,v);
      case 15:return compare(this.deathsAt(c.player,c.unit,cur),cmp,v);
      case 21:return compare(this.playersOf(c.player,cur).reduce((n,x)=>n+this.getVal(this.scores,x,c.resource),0),cmp,v);
      case 22:return true;
      case 23:return false; // Never
      default:this.stats.unknownTypes['condition:'+type]=(this.stats.unknownTypes['condition:'+type]||0)+1;return false;
    }
  }
  emit(type,payload){try{this.callbacks[type]?.(payload)}catch(e){this.stats.errors++;this.callbacks.error?.(String(e));}}
  center(id){const l=this.loc(id);if(!l)return null;const [left,top,right,bottom]=l.bounds;return [(left+right)/2,(top+bottom)/2];}
  spawn(a,cur,properties=false){this.invalidateUnits();if(this.units.filter(u=>u.hp>0&&u.alive!==false).length>=MAX_UNITS){this.stats.unitCap++;return;}
    const pt=this.center(a.location);if(!pt)return;
    const count=clamp(a.modifier||0,0,70);
    for(let n=0;n<count;n++){
      const column=n%8,row=Math.floor(n/8),u={id:this.nextUnitId++,x:pt[0]+column*13-40,y:pt[1]+row*13-30,type:a.unit,owner:playerIndex(a.player,cur),hp:BUILDINGS.has(a.unit)?200:100,maxHp:BUILDINGS.has(a.unit)?200:100,energy:100,shield:100,alive:true,vx:0,vy:0,order:null,animTime:0};
      const defaults=this.unitDefaults[a.unit];if(defaults){u.hp=u.maxHp=defaults.hp||100;u.shield=defaults.shield||0;}
      if(properties){let prop=this.unitProperties[(a.value||1)-1];if(prop){if(prop.validUnit&2)u.hp=Math.round(u.maxHp*prop.hp/100);if(prop.validUnit&4)u.shield=Math.round((u.shield||100)*prop.shield/100);if(prop.validUnit&8)u.energy=prop.energy;if(prop.validUnit&16)u.resource=prop.resources;if(prop.validUnit&32)u.hangar=prop.hangar;if(prop.validSpecial&16)u.invincible=!!(prop.special&16);}}
      this.units.push(u);if(this.typeIndex)this.indexUnit(u);this.emit('spawn',u);
    }
  }
  select(a,cur,locOverride=null){return this.unitsAt(a.player,a.unit,locOverride===null?a.location:locOverride,cur);}
  changeUnits(a,cur,fn,count=null){const pool=this.select(a,cur),q=(count ?? (a.value===0?Infinity:a.value));for(const u of pool.slice(0,q))fn(u);this.invalidateUnits();}
  aiCode(value){return String.fromCharCode(value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255)}
  execute(a,cur,t,executionKey){this.stats.actions++;const p=playerIndex(a.player,cur),mod=a.modifier;const value=a.value,loc=a.location;
    switch(a.type){
      case 1:this.emit('end',{victory:true,player:cur,trigger:t.id});break;
      case 2:this.emit('end',{victory:false,player:cur,trigger:t.id});break;
      case 3:this.waiting.add(executionKey);break; // Preserve Trigger
      case 4:return Math.min(120000,Math.max(0,a.time));
      case 8:this.emit('sound',{id:a.wav,source:'SCX',duration:a.time,player:cur});break;
      case 9:{const message=String(this.strings[a.string]||'').replace(/[\x00-\x08\x0b-\x1f]/g,'').trim();
        if(message){const row={trigger:t.id,player:cur,id:a.string,text:message,time:this.elapsed};this.messages.push(row);if(this.messages.length>300)this.messages.shift();this.emit('message',row)}break;}
      case 10:this.emit('camera',{location:loc,point:this.center(loc)});break;
      case 11:this.spawn(a,cur,true);break;
      case 13:{const index=value&255;if(mod===4)this.switches[index]=true;else if(mod===5)this.switches[index]=false;else if(mod===6)this.switches[index]=!this.switches[index];else if(mod===11)this.switches[index]=Math.random()<.5;break;}
      case 14:this.countdown=mod===8?this.countdown+a.time*1000:mod===9?Math.max(0,this.countdown-a.time*1000):a.time*1000;this.timerRunning=true;break;
      case 15:case 16:{
        this.stats.aiScripts++;const code=this.aiCode(value);
        if(/^[+-]Vi[0-7]$/.test(code)){const slot=Number(code[3]);this.vision.set(this.key(cur,slot),code[0]==='+');}
        else if(code==='JYDg'){const area=this.loc(loc);for(const u of this.units){if(u.hp<=0||BUILDINGS.has(u.type)||!this.inLoc(u,area))continue;
          const center=this.center(loc)||[u.x,u.y];u.order={x:clamp(u.x+(Math.random()-.5)*150,0,8192),y:clamp(u.y+(Math.random()-.5)*150,0,8192),command:1,stopAt:10,aiCode:code,anchor:center};}}
        else if(code==='ReHe')this.emit('recall',{point:this.center(loc),player:cur,script:code});
        this.emit('ai',{script:code,location:loc,player:cur});break;}
      
      case 20:this.emit('leaderboard',{id:a.string,type:a.type,unit:a.unit});break;
      case 22:this.changeUnits(a,cur,u=>this.kill(u),Infinity);break;
      case 23:this.changeUnits(a,cur,u=>this.kill(u),mod===0?Infinity:mod);break;
      case 24:case 25:this.changeUnits(a,cur,u=>{u.hp=0;u.alive=false},a.type===24?Infinity:mod===0?Infinity:mod);break;
      case 26:for(const owner of this.playersOf(a.player,cur)){this.putVal(this.resources,owner,a.unit,value,mod);this.emit('resources',{player:owner,type:a.unit,value:this.getVal(this.resources,owner,a.unit)})}break;
      case 27:for(const owner of this.playersOf(a.player,cur))this.putVal(this.scores,owner,a.unit,value,mod);break;
      case 28:this.emit('ping',{point:this.center(loc),trigger:t.id});break;
      case 38:{const source=this.unitsAt(a.player,a.unit,a.value,cur)[0];const moving=this.locations.get(loc);if(source&&moving){const width=Math.abs(moving.bounds[2]-moving.bounds[0])/2,height=Math.abs(moving.bounds[3]-moving.bounds[1])/2;moving.bounds=[source.x-width,source.y-height,source.x+width,source.y+height];this.invalidateUnits()}}break;
      case 39:{const dest=this.center(a.value);if(!dest)break;
        // Move Unit: source Location=location, destination Location=value
        this.changeUnits(a,cur,u=>{u.x=clamp(dest[0]+Math.random()*10-5,0,8192);u.y=clamp(dest[1]+Math.random()*10-5,0,8192)},mod===0?Infinity:mod);break;}
      case 42:this.doodads.set(this.key(loc,a.unit),mod);this.changeUnits(a,cur,u=>{u.doodadState=mod},Infinity);this.emit('doodad',{location:loc,unit:a.unit,state:mod});break;
      case 43:this.changeUnits(a,cur,u=>{u.invincible=mod===4?true:mod===5?false:!u.invincible},Infinity);break;
      case 44:this.spawn(a,cur);break;
      case 45:for(const owner of this.playersOf(a.player,cur))this.putVal(this.deaths,owner,a.unit,value,mod);break;
      case 46:{const dest=this.center(a.value);if(!dest)break;
        this.changeUnits(a,cur,u=>{u.order={x:dest[0],y:dest[1],command:mod,stopAt:24};},Infinity);break;}
      case 47:break;
      case 48:this.changeUnits(a,cur,u=>{u.owner=playerIndex(value,cur)},mod===0?Infinity:mod);break;
      case 49:this.changeUnits(a,cur,u=>{u.maxHp=u.maxHp||Math.max(100,u.hp);u.hp=Math.round(u.maxHp*value/100)},Infinity);break;
      case 50:this.changeUnits(a,cur,u=>u.energy=value,Infinity);break;
      case 51:this.changeUnits(a,cur,u=>u.shield=value,Infinity);break;
      case 52:this.changeUnits(a,cur,u=>u.resource=value,1);break;
      case 53:this.changeUnits(a,cur,u=>u.hangar=value,Infinity);break;
      case 54:this.timerRunning=false;break;
      case 55:this.timerRunning=true;break;
      case 56:this.emit('end',{draw:true,player:cur});break;
      case 57:for(const owner of this.playersOf(a.player,cur))this.alliances.set(this.key(cur,owner),a.unit);break;
      default:this.stats.unsupported++;this.stats.unknownTypes['action:'+a.type]=(this.stats.unknownTypes['action:'+a.type]||0)+1;
        this.emit('unsupported',{trigger:t.id,type:a.type});
    }
    return 0;
  }
  kill(u,killer){this.invalidateUnits();if(u.alive===false||u.hp<=0)return;u.hp=0;u.alive=false;this.putVal(this.deaths,u.owner,u.type,1,8);if(killer!==undefined)this.putVal(this.kills,killer,u.type,1,8);this.emit('kill',u);}
  finish(key,t){if(!this.waiting.has(key)&&!(t.flags&4))this.done.add(key);this.waiting.delete(key);this.pending.delete(key);}
  progress(key,t,cur,now){const state=this.pending.get(key);if(!state||now<state.until)return 0;this.pending.delete(key);return this.runActions(key,t,cur,state.next,now);}
  runActions(key,t,cur,start,now){for(let i=start;i<t.actions.length;i++){
    const a=t.actions[i];if(a.flags&2)continue;const delay=this.execute(a,cur,t,key);
    if(a.type===4&&delay>0){this.pending.set(key,{until:now+delay,next:i+1});return 1;}
  }this.finish(key,t);return 1;}
  step(dt=100,ownerOverride=null){if(this.suspended)return 0;this.typeIndex=null;this.invalidateUnits();dt=clamp(dt,0,200);this.elapsed+=dt;this.frame++;
    if(this.timerRunning)this.countdown=Math.max(0,this.countdown-dt);
    let ran=0;const players=ownerOverride==null?this.activePlayers:[ownerOverride];
    for(const cur of players){const list=this.index.get(cur)||[];
      for(const t of list){if(ran>=this.capPerStep)return ran;
        const key=`${t.id}:${cur}`;if((t.flags&8)||this.done.has(key))continue;
        if(this.pending.has(key)){ran+=this.progress(key,t,cur,this.elapsed);continue;}
        this.stats.evaluations++;
        if(t.conditions.length>0&&!t.conditions.every(c=>this.condition(c,cur)))continue;
        if(this.callbacks.canRun?.(t,cur)===false)continue;this.stats.executions++;this.executed++;ran+=this.runActions(key,t,cur,0,this.elapsed);
      }
    }
    return ran;
  }
  setPlayerState(p,{minerals,gas,kills}={}){if(Number.isFinite(minerals))this.putVal(this.resources,p,0,minerals);if(Number.isFinite(gas))this.putVal(this.resources,p,1,gas);}
  notifyPlayerKill(target,killer=0){this.kill(target,killer);}
  status(){return {elapsed:this.elapsed,frame:this.frame,executed:this.executed,pending:this.pending.size,complete:this.done.size,messages:this.messages.length,total:this.triggers.length, ...this.stats};}
  save(){return {elapsed:this.elapsed,countdown:this.countdown,timerRunning:this.timerRunning,switches:this.switches,deaths:[...this.deaths],resources:[...this.resources],kills:[...this.kills],scores:[...this.scores],done:[...this.done],pending:[...this.pending],waiting:[...this.waiting],messages:this.messages,nextUnitId:this.nextUnitId,vision:[...this.vision],stats:this.stats,locations:[...this.locations],doodads:[...this.doodads],alliances:[...this.alliances]};}
  load(state){if(!state)return;this.elapsed=state.elapsed||0;this.countdown=state.countdown||0;this.timerRunning=!!state.timerRunning;
    this.switches=state.switches||Array(256).fill(false);for(const table of ['deaths','resources','kills','scores'])this[table]=new Map(state[table]||[]);
    this.done=new Set(state.done||[]);this.pending=new Map(state.pending||[]);this.waiting=new Set(state.waiting||[]);this.messages=state.messages||[];this.vision=new Map(state.vision||[]);this.nextUnitId=state.nextUnitId||this.nextUnitId;if(state.locations)this.locations=new Map(state.locations);this.typeIndex=null;this.doodads=new Map(state.doodads||[]);this.alliances=new Map(state.alliances||[]);this.invalidateUnits();}
}
root.ScxTriggerRuntime=ScxTriggerRuntime;
if(typeof module!=='undefined'&&module.exports)module.exports={ScxTriggerRuntime};
})(typeof window!=='undefined'?window:globalThis);

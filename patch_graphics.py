from pathlib import Path
p=Path('dist/game.js');s=p.read_text();s=s.replace("let W,H,DPR=1,world,player", "let originalGraphics=true,spriteDefs={},spriteImages={},terrainImage=null,terrainFlags=[];\nlet W,H,DPR=1,world,player")
s=s.replace("function drawHero(c,x,y,h,scale=1,anim=0,angle=0,isEnemy=false){", "function drawHero(c,x,y,h,scale=1,anim=0,angle=0,isEnemy=false){if(originalGraphics&&h.type!==undefined&&drawOriginal(c,h.type,x,y,scale,anim,angle))return;")
s=s.replace("function drawEntity(e){let t=e.type;ctx.save();", "function drawEntity(e){let t=e.type;if(originalGraphics&&drawOriginal(ctx,t,e.x,e.y,1,e.anim||0,e.angle||0)){drawEntityLabel(e);return}ctx.save();")
s=s.replace("ctx.drawImage(mapImage,0,0,8192,8192);", "ctx.drawImage(terrainImage||mapImage,0,0,8192,8192);")
s=s.replace("for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){", "if(!terrainImage)for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){")
s=s.replace("原本", "원본")
s=s.replace('그래픽은 새로 그렸으며 전투 수치와 전쟁 진행은 싱글플레이용으로 각색했습니다.', '원본 지형과 스타크래프트 스프라이트를 연결했으며 전투 수치와 전쟁 진행은 싱글플레이용으로 각색했습니다.')
s=s.replace('실제 타일 그래픽과 통행 판정의 완전한 복원은 아직 포함되지 않았습니다.', '실제 타일 그래픽을 복원했습니다. 통행 판정은 CV5 기반의 근사치이며 원본 VF4 판정과 차이가 있습니다.')
s=s.replace('캐릭터와 건물은 새 그래픽입니다. 타일 번호를 보존했지만 실제 지형 이미지와 통행 판정은 미복원입니다.', '원본 타일 그래픽과 유닛 스프라이트를 복원했습니다. 통행 판정은 CV5 기반 근사치입니다. 원본과 동일한 애니메이션 스크립트는 아직 실행하지 않습니다.')
s=s.replace('기사 8명 선택, 원본 기술명, 원본 좌표에 배치한 건물과 유닛,', '기사 8명 선택, 원본 지형과 유닛 그래픽, 원본 기술명, 원본 좌표에 배치한 건물과 유닛,')
s=s.replace('<div class="list"><div class="entry"><div class="row"><h3>원본 배경음악과 효과음</h3>', '<div class="list"><div class="entry"><h3>유닛 그래픽</h3><p>원본 스프라이트 또는 기사풍 재해석 그래픽을 선택할 수 있습니다. 지형은 원본으로 유지됩니다.</p><button onclick="originalGraphics=!originalGraphics;settingsPanel()">${originalGraphics?\'원본 스프라이트 사용 중\':\'기사풍 그래픽 사용 중\'}</button></div><div class="entry"><div class="row"><h3>원본 배경음악과 효과음</h3>')
s=s.replace("world=await fetch('data/world.json').then", "world=await fetch('data/world.json').then")
s=s.replace("buildMap();initEntities();heroSelect();requestAnimationFrame(frame)", "buildMap();await loadGraphics();initEntities();heroSelect();requestAnimationFrame(frame)")
s=s.replace("blocked.delete(start.y*128+start.x);", "for(let by=24;by<128;by++)for(let bx=0;bx<128;bx++){if(!walkable(bx*64+32,by*64+32))blocked.add(by*128+bx)}blocked.delete(start.y*128+start.x);")
s=s.replace("if(found){let path=[]", "if(found){let path=[]")
# Guard direct movement against terrain; slide along a free axis.
s=s.replace("player.x+=dx/n*185*dt;player.y+=dy/n*185*dt;", "let nx=player.x+dx/n*185*dt,ny=player.y+dy/n*185*dt;if(walkable(nx,player.y))player.x=nx;if(walkable(player.x,ny))player.y=ny;")
s=s.replace("let en=nearestEnemy(500);", "let en=nearestEnemy(500);")
# keep enemy directional animation, and prevent armies crossing water.
s=s.replace("e.x+=(player.x-e.x)/d*speed*dt;e.y+=(player.y-e.y)/d*speed*dt;e.anim+=dt*9", "e.angle=Math.atan2(player.y-e.y,player.x-e.x);let nx=e.x+(player.x-e.x)/d*speed*dt,ny=e.y+(player.y-e.y)/d*speed*dt;if(walkable(nx,e.y))e.x=nx;if(walkable(e.x,ny))e.y=ny;e.anim+=dt*9")
s=s.replace("player.anim*=Math.exp(-dt*12)", "player.anim=0")
s=s.replace("function skillName(id){return text(id).replace", "function skillName(id){return text(id).replace")
# Fix trade quest reward check before starting a new quest.
start=s.index('function tradeQuest(){');end=s.index('\nfunction dialogueLog()',start)
s=s[:start]+'''function tradeQuest(){if(questState.trade==='done')return toast('이미 완료한 임무입니다.');if(questState.trade==='active'){if(killCount-(questState.tradeKills||0)<9)return toast('해적을 '+(9-(killCount-questState.tradeKills))+'명 더 격파하십시오.');questState.trade='done';player.gold+=50000;showDialogue([332,333,334]);saveGame();return}showDialogue([326,327,328,329,330],()=>{questState.trade='active';questState.tradeKills=killCount;for(let i=0;i<3;i++)spawnWave();toast('해적 9명을 격파하고 기록에서 보상을 받으십시오.');saveGame()})}
''' +s[end:]
s=s.replace("function newGame(){if(started", "function newGame(){if(started")
s=s.replace("clock=0;waveClock=0;salaryClock=0;deathTimer=0;", "clock=0;waveClock=0;salaryClock=0;deathTimer=0;boss=null;effects=[];floats=[];seen=new Set();route=[];destination=null;auto=false;$('#attack small').textContent='자동 OFF';")
# Fix starting at an actual walkable location nearest the original castle.
s=s.replace("player=basePlayer();storyIndex=0;", "player=basePlayer();let spawn=nearestWalkable(player.x,player.y);player.x=spawn.x;player.y=spawn.y;storyIndex=0;")
s += '''
async function loadGraphics(){const image=src=>new Promise((resolve,reject)=>{let i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src});let result=await Promise.allSettled([fetch('data/sprites.json').then(r=>r.json()),fetch('data/terrain-flags.json').then(r=>r.json()),image('assets/terrain-mobile.webp'),image('assets/minimap.webp')]);if(result[0].status==='fulfilled')spriteDefs=result[0].value;if(result[1].status==='fulfilled')terrainFlags=result[1].value;if(result[2].status==='fulfilled')terrainImage=result[2].value;if(result[3].status==='fulfilled')mapImage=result[3].value;let cache={};await Promise.all(Object.values(spriteDefs).map(async d=>{if(!cache[d.file])cache[d.file]=image('assets/'+d.file).catch(()=>null);spriteImages[d.file]=await cache[d.file]}))}
function drawOriginal(c,type,x,y,scale=1,anim=0,angle=0){let d=spriteDefs[type],im=d&&spriteImages[d.file];if(!im)return false;let direction=Math.round(((angle+Math.PI/2+Math.PI*2)%(Math.PI*2))/(Math.PI*2)*32)%32,flip=direction>16,dir=flip?32-direction:direction;let f=type<106?Math.min(d.count-1,dir+(anim>0?(1+Math.floor(anim)%Math.max(1,Math.floor(d.count/17)-1))*17:0)):0;c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.imageSmoothingEnabled=false;let sc=scale; c.drawImage(im,(f%d.cols)*d.w,Math.floor(f/d.cols)*d.h,d.w,d.h,-d.w*sc/2,-d.h*sc/2,d.w*sc,d.h*sc);c.restore();return true}
function drawEntityLabel(e){if((e.type>=106||e.boss)&&e.name){ctx.font=(e.boss?'bold ':'')+'10px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#1d2a24';ctx.lineWidth=3;let y=e.y+30;ctx.strokeText(e.name,e.x,y);ctx.fillStyle=e.hostile?'#efb79e':'#e4dfc1';ctx.fillText(e.name,e.x,y)}if(e.health<e.maxHealth||e.boss){ctx.fillStyle='#203025';ctx.fillRect(e.x-19,e.y-40,38,4);ctx.fillStyle=e.hostile?'#c48667':'#abc18c';ctx.fillRect(e.x-19,e.y-40,38*Math.max(0,e.health/e.maxHealth),4)}if(e.frozen>0){ctx.strokeStyle='#b5e8ee';ctx.strokeRect(e.x-15,e.y-30,30,35)}}
function walkable(x,y){let tx=Math.floor(x/32),ty=Math.floor(y/32);if(tx<0||tx>255||ty<46||ty>255)return false;let f=terrainFlags[ty*256+tx];if(f===undefined)return true;return !(f&4)&&world.tiles[ty*256+tx]>31}
function nearestWalkable(x,y){if(walkable(x,y))return {x,y};for(let r=16;r<600;r+=16)for(let a=0;a<6.28;a+=.4){let nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(walkable(nx,ny))return {x:nx,y:ny}}return {x,y}}
'''
p.write_text(s)

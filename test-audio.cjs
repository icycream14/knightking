'use strict';
const fs=require('node:fs'),Module=require('node:module');
const scenario=String.raw`
return (async()=>{
 selected=0;newGame();scxEngine.triggers=[];scxEngine.index=new Map();
 let beforeLog=log.length;scxEngine.emit('message',{id:45,text:'배경음악 ON',player:1});scxEngine.emit('message',{id:46,text:'배경음악 OFF',player:1});assert.equal(log.length,beforeLog);assert.equal(muted,true);
 toggleMusic();await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(muted,false);assert.equal(music.playCalls,1);let channel=music;
 for(let i=0;i<100;i++)originalSound({id:47});assert.equal(music,channel);assert.equal(music.playCalls,1);assert.equal(music.loop,true);
 for(let i=0;i<100;i++)sound('slash');assert.equal(audioVoices.get('audio/slash.wav').length,1);
 for(let i=0;i<20;i++)playEffect('audio/test'+i+'.wav');let active=0;for(let list of audioVoices.values())for(let a of list)if(!a.paused&&!a.ended)active++;assert.equal(active,8);
 // Muting stops every voice, including effects already playing, and persists.
 toggleMusic();assert(muted);assert(channel.paused);for(let list of audioVoices.values())for(let a of list)assert(a.paused);assert(JSON.parse(localStorage.getItem(SAVE+':audio')).muted);
 originalSound({id:47});assert.equal(channel.playCalls,1);setAudioVolume(.45);assert.equal(JSON.parse(localStorage.getItem(SAVE+':audio')).vol,.45);
 // A rejected autoplay request must not retry every event tick.
 channel.rejectPlay=true;toggleMusic();await Promise.resolve();await Promise.resolve();await Promise.resolve();let calls=channel.playCalls;for(let i=0;i<100;i++)originalSound({id:47});assert.equal(channel.playCalls,calls);assert(musicBlocked);
 console.log('PASS: single music channel, repeated original music events, ON/OFF message suppression, bounded effects, mute and autoplay rejection');
})();
`;
let source=fs.readFileSync('test-native-fast.cjs','utf8');source=source.replace('let sandbox={console,','let sandbox={assert,console,');let start=source.indexOf('const cases='),end=source.indexOf('\nlet nearestBuf=',start);source=source.slice(0,start)+'const cases='+JSON.stringify(scenario)+';'+source.slice(end);
source=source.replace('const t=performance.now();',`sandbox.Audio=class{constructor(src){this.src=src;this.paused=true;this.ended=false;this.playCalls=0;}play(){this.playCalls++;if(this.rejectPlay)return Promise.reject(Error('autoplay'));this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};const t=performance.now();`);
const mod=new Module(__filename,module);mod.filename=__filename;mod.paths=module.paths;mod._compile(source,__filename);

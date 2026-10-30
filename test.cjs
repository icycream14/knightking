'use strict';
const {execFileSync}=require('node:child_process');
for(const args of [['--check','dist/game.js'],['--check','dist/scx-trigger-runtime.js'],['verify-project.cjs'],['test-events.cjs'],['test-controls.cjs'],['test-combat.cjs'],['test-native-fast.cjs']])execFileSync(process.execPath,args,{stdio:'inherit'});

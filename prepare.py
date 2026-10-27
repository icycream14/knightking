exec(open('extract.py').read().split("out=pathlib.Path")[0])
import re,collections
out=pathlib.Path('dist/data');s=json.loads((out/'strings.json').read_text());clean=lambda x:re.sub(r'[\x00-\x08\x0b-\x1f]','',x).strip();s=list(map(clean,s));b=(out/'UNIx.bin').read_bytes();names={i:s[n] for i in range(228) if (n:=struct.unpack_from('<H',b,3192+i*2)[0]) and n<len(s)}
stats={i:dict(name=names.get(i,'유닛 '+str(i)),hp=struct.unpack_from('<I',b,228+i*4)[0]/256,shield=struct.unpack_from('<H',b,1140+i*2)[0],armor=b[1824+i],mineral=struct.unpack_from('<H',b,2280+i*2)[0]) for i in range(228)}
units=[];v=(out/'UNIT.bin').read_bytes()
for o in range(0,len(v),36):
 serial,x,y,t=struct.unpack_from('<IHHH',v,o);units.append(dict(id=len(units),x=x,y=y,type=t,owner=v[o+16],hp=v[o+17],name=names.get(t,'')))
loc=[];v=(out/'MRGN.bin').read_bytes()
for o in range(0,len(v),20):
 l,t,r,bot,n,fl=struct.unpack_from('<IIIIHH',v,o)
 if any([l,t,r,bot]):loc.append(dict(id=o//20+1,x=(l+r)/2,y=(t+bot)/2,l=l,t=t,r=r,b=bot,name=s[n] if n<len(s) else ''))
triggers=[];v=(out/'TRIG.bin').read_bytes()
for o in range(0,len(v),2400):
 conditions=[];actions=[]
 for j in range(16):
  a=struct.unpack_from('<IIIHBBBBH',v,o+j*20)
  if a[5]:conditions.append(a)
 for j in range(64):
  a=struct.unpack_from('<IIIIIIHBBBBH',v,o+320+j*32)
  if a[7]:actions.append(a)
 texts=[a[1] for a in actions if a[7] in (7,9,12) and a[1] and a[1]<len(s)]
 triggers.append(dict(id=o//2400,conditions=conditions,actions=actions,texts=texts,players=list(v[o+2372:o+2399])))
items=[]
for i in range(128,228):
 n=names.get(i,'');m=re.search(r'\[(\d+)gold\]',n,re.I)
 if m:items.append(dict(type=i,name=re.sub(r'[:\[\]]','',n.split('[')[0]).strip(),price=int(m[1])))
world=dict(title=s[1],description=s[2],size=[256,256],tileset=4,tiles=list(struct.unpack('<65536H',(out/'MTXM.bin').read_bytes())),units=units,locations=loc,stats=stats,strings=s,triggers=triggers,items=items)
(out/'world.json').write_text(json.dumps(world,ensure_ascii=False,separators=(',',':')))
print('units',len(units),'triggers',len(triggers),'locations',len(loc),'items',items)
print('hero positions',[(u['name'],u['x'],u['y'],u['owner']) for u in units if u['type'] in [74,53,54,5,79,99,61,0,190,157]])
audio=pathlib.Path('dist/audio');audio.mkdir(exist_ok=True)
for src,fn in [('staredit\\wav\\Flurry.wav','slash.wav'),('staredit\\wav\\Potion.wav','heal.wav'),('staredit\\wav\\gold.wav','gold.wav'),('staredit\\wav\\KingNight-GaBaRa..wav','theme.wav')]:
 try:(audio/fn).write_bytes(read(src))
 except Exception as e:print(e)
print('tilegroups',collections.Counter(x//16 for x in world['tiles']).most_common(35))

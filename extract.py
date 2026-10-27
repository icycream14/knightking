import struct,zlib,bz2,json,pathlib,dclimplode
p=pathlib.Path('/workspace/scratch/4d3afa9702ae/upload/왕의기사Zero_2.17ver.scx'); raw=p.read_bytes();base=raw.index(b'MPQ\x1a');d=raw[base:];u=lambda b:struct.unpack('<'+ 'I'*(len(b)//4),b)
ct=[0]*1280;seed=0x100001
for i in range(256):
 for j in range(5):
  seed=(seed*125+3)%0x2aaaab; a=(seed&65535)<<16;seed=(seed*125+3)%0x2aaaab;ct[i+j*256]=a|(seed&65535)
def h(s,t):
 a=0x7fed7fed;b=0xeeeeeeee
 for c in s.upper().encode():a=(ct[t*256+c]^(a+b))&0xffffffff;b=(c+a+b+(b<<5)+3)&0xffffffff
 return a
def dec(data,key):
 b=0xeeeeeeee;out=[]
 for v in u(data):
  b=(b+ct[0x400+(key&255)])&0xffffffff;x=v^((key+b)&0xffffffff);out.append(x);key=(((~key<<21)+0x11111111)|(key>>11))&0xffffffff;b=(x+b+(b<<5)+3)&0xffffffff
 return struct.pack('<'+'I'*len(out),*out)
_,asz,ver,shift,ho,bo,hn,bn=struct.unpack_from('<IIHHIIII',d,4)
ht=dec(d[ho:ho+hn*16],h('(hash table)',3));bt=dec(d[bo:bo+bn*16],h('(block table)',3))
def read(name):
 a,b=h(name,1),h(name,2)
 for off in range(0,len(ht),16):
  x,y,loc,plat,idx=struct.unpack_from('<IIHHI',ht,off)
  if (x,y)==(a,b):break
 else:raise Exception(name)
 pos,cs,sz,fl=struct.unpack_from('<IIII',bt,idx*16);v=d[pos:pos+cs];sector=512<<shift
 print(name,pos,cs,sz,hex(fl))
 def unpack(v):
  if v[0]==8:return dclimplode.decompressobj().decompress(v[1:])
  if v[0]==2:return zlib.decompress(v[1:])
  if v[0]==16:return bz2.decompress(v[1:])
  raise Exception(('compression',v[0]))
 key=h(name.split('\\')[-1],3)
 if fl&0x20000:key=((key+pos)^sz)&0xffffffff
 if fl&0x10000:
  n=(sz+sector-1)//sector; table=(n+1)*4;v=dec(v[:table],(key-1)&0xffffffff)+v[table:]
 if fl&0x1000000:return unpack(v) if cs<sz else v
 if fl&0x200:
  n=(sz+sector-1)//sector; offsets=struct.unpack_from('<'+'I'*(n+1),v);o=b''
  for i in range(n):
   chunk=v[offsets[i]:offsets[i+1]]
   if fl&0x10000: chunk=dec(chunk[:len(chunk)//4*4],(key+i)&0xffffffff)+chunk[len(chunk)//4*4:]
   o+=unpack(chunk) if len(chunk)<min(sector,sz-i*sector) else chunk
  return o
 return v
out=pathlib.Path('/workspace/sites/kings-knight-zero/dist/data'); chk=read('staredit\\scenario.chk');(out/'scenario.chk').write_bytes(chk)
sections={};off=0
while off+8<=len(chk):
 tag=chk[off:off+4].decode('latin1');n=struct.unpack_from('<I',chk,off+4)[0];off+=8
 if off+n>len(chk):break
 sections.setdefault(tag,[]).append(chk[off:off+n]);off+=n
print('sections',[(k,sum(map(len,v))) for k,v in sections.items()])
s=sections.get('STRx',sections.get('STR ',[b'']))[-1];wide='STRx' in sections;fmt='I' if wide else 'H';n=struct.unpack_from('<'+fmt,s)[0];strings=['']
for i in range(n):
 o=struct.unpack_from('<'+fmt,s,(i+1)*(4 if wide else 2))[0];strings.append(s[o:].split(b'\0')[0].decode('cp949',errors='replace'))
(out/'strings.json').write_text(json.dumps(strings,ensure_ascii=False));(out/'strings.txt').write_text('\n'.join(f'{i}: {s}' for i,s in enumerate(strings)))
for k,v in sections.items():(out/(k.strip()+'.bin')).write_bytes(b''.join(v))
try:print('list',read('(listfile)').decode(errors='replace')[:5000])
except Exception as e: print(e)
print('dim',struct.unpack('<HH',sections['DIM '][-1]));print('\n'.join(f'{i}: {s}' for i,s in enumerate(strings) if s)[:24000])

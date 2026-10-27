import pathlib,struct,json,subprocess,collections
from PIL import Image
root=pathlib.Path('/tmp/bwmapgfx/resources');out=pathlib.Path('dist');world=json.loads((out/'data/world.json').read_text());base=root/'tileset/jungle';cv=base.with_suffix('.cv5').read_bytes();vx=base.with_suffix('.vx4ex').read_bytes();vr=base.with_suffix('.vr4').read_bytes();pal=base.with_suffix('.wpe').read_bytes();palette=[tuple(pal[i:i+3]) for i in range(0,1024,4)];minis={};tiles={}
def getmini(n,flip):
 k=(n,flip)
 if k not in minis:
  im=Image.frombytes('P',(8,8),vr[n*64:n*64+64]);im.putpalette([x for p in palette for x in p]);im=im.convert('RGB');minis[k]=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if flip else im
 return minis[k]
def tile(t):
 if t not in tiles:
  g=t>>4;i=t&15;m=struct.unpack_from('<H',cv,g*52+20+i*2)[0];im=Image.new('RGB',(32,32))
  for j in range(16):
   n=struct.unpack_from('<I',vx,m*64+j*4)[0];im.paste(getmini(n>>1,n&1),((j%4)*8,(j//4)*8))
  tiles[t]=im
 return tiles[t]
im=Image.new('RGB',(8192,8192))
for i,t in enumerate(world['tiles']):im.paste(tile(t),((i%256)*32,(i//256)*32))
assets=out/'assets';assets.mkdir(exist_ok=True);im.save(assets/'terrain.webp',quality=92,method=4);im.resize((1024,1024),Image.Resampling.LANCZOS).save(assets/'minimap.webp',quality=90)
# Original GRP frame offsets and palette, stored as compact sprite atlases.
paths=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('/tmp/bw-chk/units.js')))"]))
sprites={};done={}
for typ in range(228):
 path=paths[typ] if typ<len(paths) else None
 if not path:continue
 path='unit/'+path.replace('\\','/').lower();p=root/path
 if not p.exists():continue
 if path in done:sprites[typ]=done[path];continue
 b=p.read_bytes();count,w,h=struct.unpack_from('<HHH',b);frames=[]
 # Preserve directional frames plus three motion blocks for mobile actors; buildings need their canonical frame.
 indices=list(range(min(count,85))) if typ<106 else [min(count-1,0)]
 cols=17 if typ<106 else 1;fw=min(w,256);fh=min(h,256);sheet=Image.new('RGBA',(cols*fw,((len(indices)+cols-1)//cols)*fh))
 for ii,f in enumerate(indices):
  x,y,rw,rh,off=struct.unpack_from('<BBBBI',b,6+f*8);rw+=256 if off&0x80000000 else 0;off&=0x7fffffff
  frame=Image.new('RGBA',(rw,rh));pix=frame.load()
  for yy in range(rh):
   pos=off+struct.unpack_from('<H',b,off+yy*2)[0];xx=0
   while xx<rw:
    v=b[pos];pos+=1
    if v&128:xx+=v&127
    elif v&64:
     n=v&63;col=b[pos];pos+=1
     for _ in range(n):
      if xx<rw:pix[xx,yy]=(*palette[col],255)
      xx+=1
    else:
     for _ in range(v):
      col=b[pos];pos+=1
      if xx<rw:pix[xx,yy]=(*palette[col],255)
      xx+=1
  sheet.paste(frame,(ii%cols*fw+x,ii//cols*fh+y),frame)
 fn='unit'+str(typ)+'.webp';sheet.save(assets/fn,lossless=True);data=dict(file=fn,w=fw,h=fh,cols=cols,count=len(indices));done[path]=data;sprites[typ]=data
(out/'data/sprites.json').write_text(json.dumps(sprites));print('terrain',len(tiles),'sprites',len(sprites),'unique',len(done),'size',sum(p.stat().st_size for p in assets.iterdir()))

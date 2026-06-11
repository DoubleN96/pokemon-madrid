from PIL import Image
import numpy as np
import glob, os

SRC="/home/n8nstratoma/pokemon-madrid/public/assets/portraits/anime"
OUT="/home/n8nstratoma/pokemon-madrid/docs/refs/upgrade/portraits-cleanup/anime"
os.makedirs(OUT, exist_ok=True)

def defringe(path, white_thr=222, passes=2):
    im=Image.open(path).convert("RGBA")
    a=np.array(im).astype(np.int16)
    h,w,_=a.shape
    removed_total=0
    for _ in range(passes):
        alpha=a[:,:,3]
        rgb=a[:,:,:3]
        opaque=alpha>180
        trans=alpha<40
        # neighbor-transparent mask
        border=np.zeros((h,w),bool)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dy==0 and dx==0: continue
                border |= np.roll(trans,(dy,dx),axis=(0,1))
        # very light pixel (near-white halo), low saturation
        mx=rgb.max(axis=2); mn=rgb.min(axis=2)
        light=(mx>white_thr)&((mx-mn)<28)
        fringe=opaque & border & light
        n=int(fringe.sum())
        removed_total+=n
        if n==0: break
        a[fringe,3]=0  # make those fringe pixels transparent
    out=Image.fromarray(a.astype(np.uint8),"RGBA")
    return out, removed_total

print(f"{'FILE':<40} {'FRINGE_PX_REMOVED'}")
print("="*60)
results=[]
for p in sorted(glob.glob(SRC+"/*.png")):
    out,n = defringe(p)
    name=os.path.basename(p)
    out.save(os.path.join(OUT,name))
    results.append((name,n))
    print(f"{name:<40} {n}")

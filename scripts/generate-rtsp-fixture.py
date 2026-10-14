"""Generate synthetic RTSP bench frames; never recognition acceptance data.

Requires Pillow. Encode frames losslessly before H.264 streaming. Counter IDs
refer to this finite clip and repeat on playback; they are not capture times.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("output", type=Path)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 22)
small = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 16)
positions = {1: [(1, 1)], 2: [(0, 0), (2, 2)], 3: [(0, 0), (1, 1), (2, 2)],
             4: [(0, 0), (2, 0), (0, 2), (2, 2)],
             5: [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)],
             6: [(x, y) for x in (0, 2) for y in (0, 1, 2)]}
labels = []
for n in range(300):
    image = Image.new("RGB", (960, 540), "#304838")
    d = ImageDraw.Draw(image)
    for y in range(3):
        for x in range(6):
            d.rectangle((x*160, y*180, x*160+159, y*180+179), outline="#708878")
            d.text((x*160+8, y*180+70), f"G{y*6+x:02}", font=small, fill="white")
    d.rectangle((0, 0, 959, 56), fill="black")
    d.text((10, 10), f"SYNTHETIC F{n:04} clip={n/10:05.1f}s", font=font, fill="white")
    for xy, text, color in [((8,64),"TL","red"),((904,64),"TR","lime"),
                            ((8,508),"BL","blue"),((904,508),"BR","yellow")]:
        d.text(xy, text, font=font, fill=color)
    scene = "A" if n < 100 else "motion" if n < 130 else "B" if n < 230 else "occluded" if n < 260 else "empty"
    values = [1,2,3,4,5] if n < 130 else [6,5,4,3,2]
    if scene != "empty":
        for i, value in enumerate(values):
            x = 100+i*160 + (n%10*4 if scene == "motion" else 0)
            y = 220
            d.rounded_rectangle((x,y,x+90,y+90), radius=8, fill="white", outline="black", width=3)
            for px, py in positions[value]:
                cx,cy=x+20+px*25,y+20+py*25
                d.ellipse((cx-7,cy-7,cx+7,cy+7), fill="black")
            d.text((x,y+96), f"D{i+1}={value}", font=small, fill="white")
    if scene == "occluded":
        d.rectangle((230,210,510,325), fill="#a08060")
    for i, color in enumerate(["red","lime","blue","black","#808080","white"]):
        d.rectangle((300+i*50,440,349+i*50,489), fill=color)
    filename = args.output / f"frame-{n:04}.png"
    image.save(filename)
    labels.append({"counter": n, "clipTimeSeconds": n/10, "scene": scene,
                   "values": values if scene != "empty" else [],
                   "sha256": hashlib.sha256(filename.read_bytes()).hexdigest()})
(args.output / "labels.json").write_text(json.dumps({"synthetic": True, "fps": 10,
    "width": 960, "height": 540, "frames": labels}, indent=2))

"""HW-006 ideal geometry; no recognition or physical acceptance claims.

Run with bundled Python. Outputs are alongside this file. No device access.
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
DIE = 16.0
SPAN = 290.0
R = SPAN / 2
rad = math.radians
deg = math.degrees


def elevation(h, r, d=DIE):
    return deg(math.atan2(h-d, r))


def view(x, y, h, azimuth):
    """Rim lens, center-top aim, ideal independent 103/55 degree apertures.

    Published apertures are not a calibrated rectilinear camera model.
    This checks point visibility, not full faces, focus, obstructions or pips.
    """
    nx, ny = math.cos(azimuth), math.sin(azimuth)
    t = R - (x*nx+y*ny)
    lateral = -x*ny+y*nx
    delta = h-DIE
    tilt = math.atan2(delta, R)
    depth = t*math.cos(tilt)+delta*math.sin(tilt)
    vertical = t*math.sin(tilt)-delta*math.cos(tilt)
    visible = depth > 0 and abs(lateral) <= depth*math.tan(rad(103/2)) and abs(vertical) <= depth*math.tan(rad(55/2))
    return visible, elevation(h, math.hypot(t, lateral))


heights = [40, 75, 100, 120, 150, 180]
height_rows = [{
    'lens_height_mm': h,
    'centre_top_elevation_deg': elevation(h, R),
    'far_top_elevation_deg': elevation(h, SPAN),
    'centre_top_foreshortened_depth_mm': DIE*math.sin(rad(elevation(h, R))),
    'floor_centreline_required_vertical_fov_deg': 90-deg(math.atan2(h, SPAN)),
} for h in heights]

# Regular octagon idealization: 290 across flats. Actual listing also gives
# 310 outer length; no inference that its internal polygon is regular.
# Inset centers by 12 mm from each edge, enough for all yaw orientations of
# a 16 mm square (half-diagonal 11.314 mm). Does not qualify complete-face FOV.
points = []
for x in range(-145, 146, 2):
    for y in range(-145, 146, 2):
        if abs(x) <= R-12 and abs(y) <= R-12 and abs(x)+abs(y) <= R*math.sqrt(2)-12*math.sqrt(2):
            points.append((x, y))
coverage = []
for h in [40, 100, 120, 150]:
    for count in [1, 2, 4, 8]:
        at_least_one, at_least_two, above30 = 0, 0, 0
        for x, y in points:
            views = [view(x, y, h, 2*math.pi*i/count) for i in range(count)]
            n = sum(v for v, a in views)
            at_least_one += n >= 1
            at_least_two += n >= 2
            above30 += any(v and a >= 30 for v, a in views)
        coverage.append({'height_mm': h, 'cameras': count, 'sample_points': len(points),
                         'point_in_one_fov_fraction': at_least_one/len(points),
                         'point_in_two_fovs_fraction': at_least_two/len(points),
                         'point_in_fov_at_30deg_fraction': above30/len(points)})

# Enumerate all 24 proper cube rotations, starting from a supported die map.
# Values +x=1,-x=6,+y=2,-y=5,+z=3,-z=4. Fix visible +x=1,+y=2.
# Swapping 3/4 makes the mirrored map with the same unordered side counts.
def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
axes = [(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]
labels = dict(zip(axes,[1,6,2,5,3,4]))
rotations = []
for a in axes:
    for b in axes:
        if sum(i*j for i,j in zip(a,b)) != 0:
            continue
        c = cross(a,b)
        # Columns a,b,c transform die axes to world axes.
        world = {}
        for axis, label in labels.items():
            rotated = tuple(axis[0]*a[i]+axis[1]*b[i]+axis[2]*c[i] for i in range(3))
            world[rotated] = label
        rotations.append(world)
known = {r[(0,0,1)] for r in rotations if r[(1,0,0)]==1 and r[(0,1,0)]==2}
assert len(rotations)==24 and known=={3}
assert abs(elevation(161,145)-45)<1e-10
assert abs(elevation(16,145))<1e-10
assert 1.57*25.4 < 40 and 11.42*25.4 > 290
results = {
    'assumptions': {'die_mm': DIE, 'nominal_span_mm': SPAN, 'model': 'ideal level cube; no occlusion, distortion, focus or recognition'},
    'height_rows': height_rows, 'coverage': coverage,
    'centre_height_for_30deg_mm': DIE+R*math.tan(rad(30)),
    'centre_height_for_45deg_mm': DIE+R,
    'far_height_for_30deg_mm': DIE+SPAN*math.tan(rad(30)),
    'overhead_lens_height_min_290_floor_mm': R/math.tan(rad(55/2)),
    'overhead_lens_height_min_290_die_top_mm': DIE+R/math.tan(rad(55/2)),
    'overhead_lens_height_min_310_die_top_mm': DIE+155/math.tan(rad(55/2)),
    'dice_orientation': {'proper_rotations': len(rotations), 'known_map_ordered_1_2_top': sorted(known), 'unknown_handedness_possible_tops': [3,4]},
}
(OUT/'results.json').write_text(json.dumps(results, indent=2)+'\n', encoding='utf-8')

# Scaled engineering cross sections, drawn from the calculated geometry.
image = Image.new('RGB', (1300,720), '#f8fafc')
draw = ImageDraw.Draw(image)
font_path = 'C:/Windows/Fonts/arial.ttf'
title = ImageFont.truetype(font_path, 28)
normal = ImageFont.truetype(font_path, 21)
small = ImageFont.truetype(font_path, 18)
draw.text((35,20), 'Tray-mounted cameras: lens height changes the view of the top', font=title, fill='#0f172a')
for row, (h, colour) in enumerate([(40,'#dc2626'),(150,'#047857')]):
    ybase = 320+row*325
    xbase = 110
    scale = 3.1 if row==0 else 1.6
    # Same horizontal/vertical scale within each panel; different panel scales.
    end = xbase+SPAN*scale
    draw.line((xbase,ybase,end,ybase),fill='#475569',width=4)
    draw.line((xbase,ybase,xbase,ybase-40*scale),fill='#64748b',width=5)
    if h>40:
        draw.line((xbase,ybase-40*scale,xbase,ybase-h*scale),fill=colour,width=3)
    left, right = xbase+(R-DIE/2)*scale, xbase+(R+DIE/2)*scale
    top = ybase-DIE*scale
    draw.rectangle((left,top,right,ybase), fill='#dbeafe',outline='#2563eb',width=2)
    cx, cy = xbase,ybase-h*scale
    draw.ellipse((cx-7,cy-7,cx+7,cy+7),fill=colour)
    draw.line((cx,cy,xbase+R*scale,top),fill=colour,width=3)
    draw.line((xbase+R*scale,top,xbase+R*scale+65,top),fill='#2563eb',width=1)
    labelx = 35 if row==0 else 680
    labely = 80 if row==0 else 415
    draw.text((labelx,labely),f'Lens {h} mm above floor',font=normal,fill=colour)
    draw.text((labelx,labely+30),f'Centre top-face angle: {elevation(h,R):.1f} degrees',font=normal,fill='#0f172a')
    draw.text((labelx,labely+60),f'Top depth after foreshortening: {DIE*math.sin(rad(elevation(h,R))):.1f} mm',font=small,fill='#475569')
    draw.text((left+30,top-30),'16 mm die',font=small,fill='#2563eb')
    draw.text((xbase+R*scale-55,ybase+12),'145 mm',font=small,fill='#475569')
draw.text((35,688),'Calculated cross sections; nominal 290 mm span. Not a focus, pip-resolution or recognition test.',font=small,fill='#475569')
image.save(OUT/'geometry.png')
print(json.dumps(results,indent=2))



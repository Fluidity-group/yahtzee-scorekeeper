from pathlib import Path
import base64, json

root = Path(__file__).resolve().parent
cad = root.parents[1] / 'hardware' / 'dice-vision-v1'
parts = json.loads((cad/'output/parts.json').read_text())
groups = [
    ('Base', ['01_']),
    ('Mast and yoke', ['05_', '06_']),
    ('Head shells and pivot', ['07_', '08_']),
    ('Tray support', ['04_']),
    ('Lid', ['02_']),
    ('Small mounts, caps and coupon', ['03_', '09_', '10_', '12_']),
]
bars = []
total = 0
for label, prefixes in groups:
    v = sum(p['volume_cm3'] for p in parts if any(p['name'].startswith(prefix) for prefix in prefixes))
    total += v
    bars.append(f'<div class="barrow"><div class="barlabel"><span>{label}</span><strong>{v:.1f} cm³</strong></div><div class="track"><div class="fill" style="width:{v/170*100:.3f}%"></div></div></div>')
assert abs(total - 498.627) < .001
image = base64.b64encode((cad/'output/previews/assembly.png').read_bytes()).decode()
html = (root/'print-report-template.html').read_text(encoding='utf-8').replace('__CAD_IMAGE__', 'data:image/png;base64,'+image).replace('__VOLUME_BARS__', '\n'.join(bars))
assert '__CAD_IMAGE__' not in html and '__VOLUME_BARS__' not in html
out = root/'prototype-printing-guide.html'
out.write_text(html, encoding='utf-8')
print(f'Created {out} ({out.stat().st_size:,} bytes); chart total {total:.3f} cm3')

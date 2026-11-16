"""Builds client/src/data/townMap.json for the 3D "Explore by town" map.

Source: github.com/faeldon/philippines-json-maps (MIT), boundaries by NAMRIA / PSA (CC BY-IGO).
Needs: pip install shapely. Usage:
  python client/scripts/build-town-map-data.py <folder with the medres provdists files> <output json>
The folder must hold municities-provdist-{806400000,803700000,701200000,702200000}.0.01.json
(Southern Leyte, Leyte, Bohol, Cebu). Output is small (about 100 kB), commit it; you only rerun this to change the data.
"""
import json, sys
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union

src, out = sys.argv[1], sys.argv[2]
load = lambda c: json.load(open(f'{src}/municities-provdist-{c}.0.01.json'))['features']
SL, LEYTE, BOHOL, CEBU = load('806400000'), load('803700000'), load('701200000'), load('702200000')
G = lambda f: shape(f['geometry']).buffer(0)

IDS = {'City of Maasin': ('maasin', 'Maasin City'), 'Padre Burgos': ('burgos', 'Padre Burgos'), 'Saint Bernard': ('saintbernard', 'Saint Bernard'),
       'San Francisco': ('sanfrancisco', 'San Francisco'), 'San Juan': ('sanjuan', 'San Juan'), 'San Ricardo': ('sanricardo', 'San Ricardo'),
       'Tomas Oppus': ('tomasoppus', 'Tomas Oppus')}
ident = lambda n: IDS.get(n) or (n.lower().replace(' ', ''), n)
NEIGHBOURS = ['Abuyog', 'Mahaplag', 'Matalom', 'Bato', 'Hilongos', 'Hindang', 'Inopacan']  # Leyte towns that touch or nearly touch the province

GAP = 0.0011   # inset (about 120 m) so neighbouring towns show a thin gap in 3D
TOL = 0.0005   # simplify tolerance (about 50 m)
r4 = lambda c: [round(x, 4) for x in c]
def round_geom(g):
    m = mapping(g)
    def walk(c):
        return r4(c) if isinstance(c[0], (int, float)) else [walk(x) for x in c]
    return {'type': m['type'], 'coordinates': walk(m['coordinates'])}

def town(f, sl, tone):
    tid, name = ident(f['properties']['adm3_en'])
    g = G(f)
    inset = g.buffer(-GAP).simplify(TOL, preserve_topology=True)
    if inset.is_empty: inset = g.simplify(TOL)
    p = inset.representative_point()
    b = g.bounds
    return {'type': 'Feature', 'id': tid, 'properties': {'id': tid, 'name': name, 'sl': sl, 'tone': tone, 'lx': round(p.x, 4), 'ly': round(p.y, 4), 'bbox': [round(x, 4) for x in b]}, 'geometry': round_geom(inset)}

towns = [town(f, True, i % 3) for i, f in enumerate(sorted(SL, key=lambda f: ident(f['properties']['adm3_en'])[1]))]
towns += [town(f, False, 0) for f in LEYTE if f['properties']['adm3_en'] in NEIGHBOURS]

sl_union = unary_union([G(f) for f in SL])
win = box(124.5, 9.62, 125.55, 10.85)
neigh_ids = {t['id'] for t in towns}
# Context land: the rest of Leyte, Bohol and Cebu inside the window (one flat shape each, no labels).
rest_leyte = unary_union([G(f) for f in LEYTE if ident(f['properties']['adm3_en'])[0] not in neigh_ids])
ctx = []
for nm, g in (('Leyte', rest_leyte), ('Bohol', unary_union([G(f) for f in BOHOL])), ('Cebu', unary_union([G(f) for f in CEBU]))):
    c = g.intersection(win).simplify(0.002, preserve_topology=True)
    if c.is_empty: continue
    big = max(c.geoms, key=lambda x: x.area) if hasattr(c, 'geoms') else c   # label the largest piece
    p = big.representative_point()
    ctx.append({'type': 'Feature', 'properties': {'name': nm, 'lx': round(p.x, 4), 'ly': round(p.y, 4)}, 'geometry': round_geom(c)})

# Depth-chart style rings around the coast, cut where other land is.
land = unary_union([sl_union, rest_leyte, unary_union([G(f) for f in BOHOL]), unary_union([G(f) for f in CEBU])])
rings = []
for i, d in enumerate([0.025, 0.06, 0.11, 0.17, 0.25]):
    ring = sl_union.buffer(d, resolution=6).boundary.difference(land.buffer(0.004)).intersection(win)
    ring = ring.simplify(0.002)
    if not ring.is_empty: rings.append({'type': 'Feature', 'properties': {'level': i}, 'geometry': round_geom(ring)})

data = {'towns': {'type': 'FeatureCollection', 'features': towns}, 'context': {'type': 'FeatureCollection', 'features': ctx}, 'rings': {'type': 'FeatureCollection', 'features': rings},
        'bounds': [round(x, 4) for x in sl_union.bounds]}
json.dump(data, open(out, 'w'), separators=(',', ':'))
print(len(towns), 'towns,', len(ctx), 'context,', len(rings), 'rings ->', out)

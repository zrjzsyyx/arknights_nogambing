"""Export verified historical client recruitment prefabs, including sprite canvases.

Requires Pillow, requests, UnityPy and the same LZ4AK decoder as
export_official_ui.py. Additional module directories can be supplied with
--tools. Only the four curated, checksum-pinned client bundles are downloaded.
"""
import argparse, base64, hashlib, io, json, pathlib, re, sys, types, zipfile
from PIL import Image
import requests

ROOT = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--tools', action='append', default=[])
args = parser.parse_args()
sys.path[:0] = args.tools + [str(ROOT / '.tools'), str(ROOT / 'research')]
sys.modules['fmod_toolkit'] = types.ModuleType('fmod_toolkit')
import aklz4, UnityPy

SOURCES = [
    ('wang', 'limited_70_0_1', '26-02-06-13-37-25_e45854', 'e805033c5b5b0a161022e600fa263e42'),
    ('promise', 'limited_73_0_1', '26-05-01-11-20-05_2f5b74', 'd4989dba5221434716e28b2cafcb3141'),
    ('summer', 'limited_76_0_1', '26-07-30-09-02-37_bf3049', '7c4bb53da5357a306e520e1286ed6886'),
    ('dungeon', 'linkage_54_0_1', '24-08-30-10-37-03-474f83', '2f2dad3b628645519ebba0efc24c7291'),
]
SHARED = {
    'wang': [('arts/[pack]cmgachapool.ab','5593c7a50e08c4055dce6ab6dae1bd23'),('arts/ui/[uc]fxcommon.ab','8d3825900b9b96fb9178cc817d47b78a')],
    'promise': [('arts/[pack]cmgachapool.ab','5593c7a50e08c4055dce6ab6dae1bd23'),('arts/ui/[uc]fxcommon.ab','5b0d7a70dbcce1d9f16903bc253a1e27')],
    'summer': [('arts/[pack]cmgachapool.ab','5593c7a50e08c4055dce6ab6dae1bd23'),('arts/ui/[uc]fxcommon.ab','ff8ce82a9f3efa11c6e6b983988caa34')],
    'dungeon': [('arts/[pack]cmgachapool.ab','e4a928adb5b50873826bf19f59913bc2')]
}

def download(slug, name, version, expected):
    dest = ROOT / 'research/native-ui' / slug / pathlib.PurePosixPath(name).name
    url = 'https://ak.hycdn.cn/assetbundle/official/Android/assets/' + version + '/' + name.replace('/', '_').replace('.ab', '.dat')
    if not dest.exists():
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        data = zipfile.ZipFile(io.BytesIO(response.content)).read(name)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
    assert hashlib.md5(dest.read_bytes()).hexdigest() == expected, name
    return dest, url

def export(slug, pid, version, expected):
    source, url = download(slug, 'ui/gacha/' + pid + '.ab', version, expected)
    bundles = [str(source)]
    for name, md5 in SHARED[slug]:
        common, _ = download(slug, name, version, md5)
        bundles.append(str(common))
    env = UnityPy.load(*bundles)
    objects = {str(o.path_id): o for o in env.objects}
    primary = UnityPy.load(str(source))
    records = {str(o.path_id): o.read_typetree() for o in primary.objects if o.type.name in
               ['RectTransform', 'GameObject', 'MonoBehaviour', 'CanvasGroup', 'Material', 'AnimationClip']}
    for key, obj in objects.items():
        if obj.type.name == 'Material' and key not in records:
            records[key] = obj.read_typetree()
    out = ROOT / 'dist/assets/official/pools' / pid
    out.mkdir(parents=True, exist_ok=True)
    sprites, sprite_info = {}, {}
    referenced = {str(v['m_Sprite']['m_PathID']) for v in records.values() if 'm_Sprite' in v}
    for key, obj in objects.items():
        if obj.type.name != 'Sprite' or key not in referenced:
            continue
        sprite = obj.read()
        raw = obj.read_typetree()
        pixels = sprite.image.convert('RGBA')
        rect, offset = raw['m_Rect'], raw['m_RD']['textureRectOffset']
        canvas = Image.new('RGBA', (round(rect['width']), round(rect['height'])))
        canvas.paste(pixels, (round(offset['x']), round(rect['height'] - offset['y'] - pixels.height)))
        name = re.sub(r'[^\w.-]', '_', sprite.m_Name)
        file = 'native_' + name + '_' + key + '.webp'
        canvas.save(out / file, 'WEBP', lossless=True, method=4)
        sprites[key] = file
        sprite_info[key] = dict(name=sprite.m_Name, file=file, canvas=list(canvas.size),
                                offset=offset, alphaBounds=canvas.getchannel('A').getbbox(),
                                sha256=hashlib.sha256((out / file).read_bytes()).hexdigest())
    nodes, root = {}, None
    for key, obj in {str(o.path_id): o for o in primary.objects}.items():
        if obj.type.name != 'RectTransform':
            continue
        t = records[key]
        go = records[str(t['m_GameObject']['m_PathID'])]
        n = dict(id=key, name=go['m_Name'], active=go['m_IsActive'],
                 children=[str(v['m_PathID']) for v in t['m_Children']], parent=str(t['m_Father']['m_PathID']),
                 anchorMin=t['m_AnchorMin'], anchorMax=t['m_AnchorMax'], position=t['m_AnchoredPosition'],
                 size=t['m_SizeDelta'], pivot=t['m_Pivot'], scale=t['m_LocalScale'], rotation=t['m_LocalRotation'],
                 images=[], texts=[])
        for c in go['m_Component']:
            v = records.get(str(c['component']['m_PathID']), {})
            if 'm_Sprite' in v:
                ref = str(v['m_Sprite']['m_PathID'])
                image = dict(file=sprites.get(ref), color=v.get('m_Color', dict(r=1,g=1,b=1,a=1)),
                             preserveAspect=v.get('m_PreserveAspect', False), sprite=ref,
                             imageType=v.get('m_Type', 0))
                mat = records.get(str(v.get('m_Material', {}).get('m_PathID')), {})
                if mat:
                    image['material'] = mat.get('m_Name')
                    props = dict(mat.get('m_SavedProperties', {}).get('m_Floats', []))
                    image['additive'] = props.get('_DstBlend') == 1 or props.get('_Dst') == 1
                    colors = dict(mat.get('m_SavedProperties', {}).get('m_Colors', []))
                    image['materialColor'] = colors.get('_Color', dict(r=1,g=1,b=1,a=1))
                    image['rgbControl'] = props.get('_RgbCtrl') == 1
                    if props.get('_Mask') == 1:
                        mask = next((entry for key, entry in mat['m_SavedProperties'].get('m_TexEnvs', []) if key == '_Mask_Tex'), None)
                        texture = objects.get(str(mask['m_Texture']['m_PathID'])) if mask else None
                        if texture and texture.type.name == 'Texture2D':
                            gray = texture.read().image.convert('RGBA').getchannel('R')
                            mask_image = Image.new('RGBA',gray.size,(255,255,255,255));mask_image.putalpha(gray)
                            encoded=io.BytesIO();mask_image.save(encoded,'WEBP',lossless=True)
                            image['maskData']='data:image/webp;base64,'+base64.b64encode(encoded.getvalue()).decode('ascii')
                # A null Sprite is Unity UI's solid white rectangle, not a missing texture.
                assert ref == '0' or image['file'], (pid, go['m_Name'], v['m_Sprite'])
                n['images'].append(image)
            if 'm_Alpha' in v:
                n['opacity'] = v['m_Alpha']
            if 'm_ShowMaskGraphic' in v:
                n['mask'] = True
                n['showMaskGraphic'] = bool(v['m_ShowMaskGraphic'])
            if 'm_Softness' in v:
                n['rectMask'] = True
            if 'm_Spacing' in v and 'm_ChildAlignment' in v:
                n['layout'] = dict(spacing=v['m_Spacing'], padding=v['m_Padding'], alignment=v['m_ChildAlignment'])
            if 'm_FontData' in v:
                n['textStyle'] = dict(fontSize=v['m_FontData'].get('m_FontSize',20), alignment=v['m_FontData'].get('m_Alignment',4), color=v.get('m_Color',dict(r=1,g=1,b=1,a=1)))
            elif 'm_fontSize' in v:
                n['textStyle'] = dict(fontSize=v['m_fontSize'], alignment=4, color=v.get('m_fontColor',dict(r=1,g=1,b=1,a=1)))
            if '_fontName' in v:
                n['fontName'] = v['_fontName']
            text = v.get('m_Text') or v.get('m_InputText') or v.get('m_text', '')
            if text:
                n['texts'].append(dict(text=text, fontSize=v.get('m_FontData', {}).get('m_FontSize', v.get('m_fontSize',20)), color=v.get('m_Color', dict(r=1,g=1,b=1,a=1))))
        nodes[key] = n
        if n['parent'] == '0':
            root = key
    assert root
    # The native entry clip owns positions, sizes, colors and alpha. Bake its
    # final state, then hide the temporary close-up montage as the client does.
    base = next((n['id'] for n in nodes.values() if n['name'] == 'anim_part(Clone)'), root)
    def resolve(path):
        current = nodes[base]
        for name in path.split('/') if path else []:
            current = next((nodes[c] for c in current['children'] if c in nodes and nodes[c]['name'] == name), None)
            if current is None:
                return None
        return current
    clips = []
    for v in records.values():
        if not v.get('m_Name','').endswith('_entry') or 'm_FloatCurves' not in v:
            continue
        applied = 0
        for curve in v['m_FloatCurves']:
            n, keys = resolve(curve['path']), curve['curve']['m_Curve']
            if n is None or not keys:
                continue
            value, prop = keys[-1]['value'], curve['attribute']
            if prop == 'm_Alpha': n['opacity'] = value
            elif prop == 'm_IsActive': n['active'] = bool(value)
            elif prop.startswith('m_Color.'):
                for image in n['images']: image['color'][prop[-1]] = value
            elif '.' in prop:
                field, axis = prop.split('.', 1)
                mapped = {'m_AnchoredPosition':'position','m_SizeDelta':'size','m_LocalScale':'scale','m_LocalRotation':'rotation'}.get(field)
                if mapped and axis in n[mapped]: n[mapped][axis] = value
            applied += 1
        for kind, field in [('m_ScaleCurves', 'scale'), ('m_RotationCurves', 'rotation'), ('m_PositionCurves', 'localPosition')]:
            for curve in v[kind]:
                n = resolve(curve['path'])
                if n is not None and curve['curve']['m_Curve']:
                    n[field] = curve['curve']['m_Curve'][-1]['value']
        clips.append(dict(name=v['m_Name'], appliedCurves=applied))
    if clips:
        for n in nodes.values():
            if n['name'] == 'group_entry_anim': n['active'] = False
    # The running client binds the two featured names, rather than using the
    # authoring prefab's placeholder order. Keep the source sprites and rects.
    if slug == 'summer':
        named={v['name']:key for key,v in sprite_info.items()}
        for n in nodes.values():
            parent=nodes.get(n['parent'],{})
            if n['name']=='name' and parent.get('name') in ['btn_view_char_01','btn_view_char_02']:
                n['runtimeSprite']=named['chara_name_right' if parent['name'].endswith('01') else 'chara_name_left']
    source_info = dict(url=url, resourceVersion=version, md5=expected, md5Scope='Unpacked ui/gacha/' + pid + '.ab',
                       conversion='Original RectTransform hierarchy and sibling order. Sprite trims restored to m_Rect with textureRectOffset. Final native entry keyframes applied; temporary entry montage hidden. Original image colors, alpha, masks and material blend metadata retained.', clips=clips)
    result = dict(root=root, nodes=nodes, sprites=sprite_info, source=source_info)
    (out / 'prefab.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
    keep = set(sprites.values())
    for unused in out.glob('native_*.webp'):
        assert unused.resolve().parent == out.resolve() and not unused.is_symlink()
        if unused.name not in keep:
            unused.unlink()
    print(pid, len(nodes), 'nodes,', len(sprites), 'sprites,', clips, flush=True)

for source in SOURCES:
    export(*source)

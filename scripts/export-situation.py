#!/usr/bin/env python3
"""Copy phase contracts and branch evidence from the demo's published revisions."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
DATASETS = {'unzip': 'WALLE/IMetaY1/2026-11-12_114008',
            'buckle': 'WALLE/IMetaY1/2026-10-26_142449',
            'coin': 'WALLE/arx_x5/robodojo_depth_deposit_coin'}


def read(path):
    return json.loads(path.read_text()) if path.is_file() else {}


def export(situations, datasets):
    source = "const fs=require('fs'),vm=require('vm');const c={window:{},document:{addEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.WALLE_TASKS));"
    tasks = json.loads(subprocess.check_output(['node', '-e', source], cwd=REPO))
    result, copied = {}, set()
    for task in tasks:
        root, = situations.glob('*/' + task['revision'])
        situation = read(root / 'situation.json')
        analysis = datasets / DATASETS[task['id']] / '.dataset-operations' / situation['learning']['analysis']
        conditions = {c['id']: c for c in situation.get('conditions', [])}

        def resolve(ids):
            return [conditions[i] for i in ids if i in conditions]

        def sheet(path):
            src = next((p for p in [root / path, root / 'learning' / path, analysis / path] if p.is_file()), None)
            if src is None:
                return None
            digest = hashlib.sha256(src.read_bytes()).hexdigest()[:16]
            dest = REPO / 'task-assets' / task['id'] / 'situation' / (digest + '.jpg')
            if dest not in copied:
                with Image.open(src) as original:
                    preview = original.convert('RGB')
                    preview.thumbnail((640, 640), Image.Resampling.LANCZOS)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    preview.save(dest, quality=85, optimize=True)
                copied.add(dest)
            return str(dest.relative_to(REPO))

        phases = {}
        for phase in task['phases']:
            contract = read(root / 'phase_contracts' / (phase['sourceId'] + '.json'))
            capability = contract.get('capability') or {}
            role_sets = {hand: set() for hand in ['left', 'right']}
            for assessment in capability.get('assessments', []):
                roles = (assessment.get('action_requirements') or {}).get('arm_roles') or {}
                for hand in role_sets:
                    if roles.get(hand) not in [None, '', 'unknown']:
                        role_sets[hand].add(roles[hand])
            roles = {h: next(iter(values)) if len(values) == 1 else 'varies'
                     for h, values in role_sets.items() if values}
            cooperative = capability.get('cooperative_route') or {}
            if cooperative.get('anchor_hand'):
                roles[cooperative['anchor_hand']] = 'hold'
            if cooperative.get('acquire_hand'):
                roles[cooperative['acquire_hand']] = 'operate'
            episodes = {f['episode_index'] for p in contract.get('provenance', []) for f in p.get('frames', [])}
            phases[str(phase['id'])] = {
                'source_id': phase['sourceId'], 'goal': contract.get('goal'),
                'requires': resolve(contract.get('requires', [])),
                'establishes': resolve(contract.get('establishes', [])),
                'handoff': resolve(contract.get('handoff', [])),
                'completion_evidence': contract.get('completion_evidence'),
                'question': contract.get('question'), 'arm_roles': roles,
                'episode_count': len(episodes), 'source_count': len(contract.get('provenance', [])),
                'objects': contract.get('objects', []),
            }
        classification = read(root / (situation.get('learning', {}).get('branch_classification') or {}).get('path', 'missing'))
        decisions = []
        for decision in classification.get('decisions', []):
            alternatives = []
            for alternative in decision.get('alternatives', []):
                saved = next((s for s in decision.get('sheets', []) if s.get('target_id') == alternative['target_id']), {})
                alternatives.append({k: alternative.get(k) for k in ['target_id', 'path_ids', 'condition', 'status']} | {
                    'image': sheet(saved['path']) if saved.get('path') else None,
                    'episodes': saved.get('episodes'),
                })
            decisions.append({'id': decision['id'], 'source_id': decision.get('source_id'),
                              'reason': decision.get('reason'), 'alternatives': alternatives})
        states, state_references = {}, {}
        event_graph = situation.get('phase_graph', {}).get('event_graph', {})
        source_states = {n['id']: n for n in event_graph.get('nodes', [])}
        for node in task['graph']['nodes']:
            if node['kind'] != 'state':
                continue
            source_state = source_states.get(node['id']) or source_states.get(node['id'].removeprefix('state_'))
            recorded = (source_state or node).get('conditions') or {}
            if isinstance(recorded, list):
                recorded = {cid: None for cid in recorded}
            if isinstance(recorded, dict):
                states[node['id']] = [{'condition': conditions[cid], 'value': value}
                                      for cid, value in recorded.items() if cid in conditions]
            reference = (node.get('media') or {}).get('reference')
            if not reference:
                next_ids = {e['target'] for e in task['graph']['edges'] if e['source'] == node['id']}
                next_phase = next((p for p in task['phases'] if p['sourceId'] in next_ids), None)
                if next_phase:
                    candidate = f"task-assets/{task['id']}/phase-{next_phase['id']}-start.jpg"
                    if (REPO / candidate).is_file():
                        reference = candidate
            if reference:
                state_references[node['id']] = reference
        result[task['id']] = {'revision': task['revision'], 'phases': phases,
                              'states': states, 'state_references': state_references, 'decisions': decisions}
    (REPO / 'situation-data.js').write_text('/* Published contracts; generated by scripts/export-situation.py. */\nwindow.WALLE_SITUATION_DETAILS = ' + json.dumps(result, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print(f'Exported {sum(len(t["phases"]) for t in result.values())} contracts and {len(copied)} branch sheets.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--situations-root', type=Path, default=Path('/data/eai/situations'))
    parser.add_argument('--datasets-root', type=Path, default=Path('/data/eai/datasets'))
    args = parser.parse_args()
    export(args.situations_root, args.datasets_root)

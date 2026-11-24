#!/usr/bin/env python3
"""Export saved Situation evidence for the static demo; never run inference."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
DATASETS = {
    'unzip': 'WALLE/IMetaY1/2026-11-12_114008',
    'buckle': 'WALLE/IMetaY1/2026-10-26_142449',
    'coin': 'WALLE/arx_x5/robodojo_depth_deposit_coin',
}


def read(path):
    return json.loads(path.read_text()) if path.is_file() else {}


def export(situations, datasets):
    source = "const fs=require('fs'),vm=require('vm');const c={window:{},document:{addEventListener(){}}};vm.createContext(c);vm.runInContext(fs.readFileSync('data.js','utf8'),c);process.stdout.write(JSON.stringify(c.window.WALLE_TASKS));"
    tasks = json.loads(subprocess.check_output(['node', '-e', source], cwd=REPO))
    exported, images = {}, {}

    def image(path, task, crop=None):
        if not path or not Path(path).is_file():
            return None
        path = Path(path)
        digest = hashlib.sha256(path.read_bytes() + str(crop).encode()).hexdigest()[:16]
        dest = REPO / 'task-assets' / task / 'localization' / (digest + '.jpg')
        if dest not in images:
            with Image.open(path) as original:
                preview = original.convert('RGB')
                if crop:
                    preview = preview.crop(crop)
                preview.thumbnail((640, 640), Image.Resampling.LANCZOS)
                dest.parent.mkdir(parents=True, exist_ok=True)
                preview.save(dest, quality=85, optimize=True)
            images[dest] = True
        return str(dest.relative_to(REPO))

    for task in tasks:
        root, = situations.glob('*/' + task['revision'])
        situation = read(root / 'situation.json')
        analysis = datasets / DATASETS[task['id']] / '.dataset-operations' / situation['learning']['analysis']
        targets = read(root / situation['learning']['localization']['path'])['targets']
        moves = read(root / 'learning/fixed_moves.json')
        phases = {}
        for phase in task['phases']:
            pid = phase['sourceId']
            contract = read(root / 'phase_contracts' / (pid + '.json'))
            capability = contract.get('capability') or {}
            target = targets.get(pid) or {}
            selection = target.get('rgb_selection') or {}
            comparison = target.get('rgb_comparison') or {}
            candidates = comparison.get('candidates') or {}
            selected = candidates.get(selection.get('id')) or {}
            attempts = (target.get('selection') or {}).get('attempts') or []
            attempt = next((a for a in attempts if a.get('baseline_id') == target.get('selected_baseline') and a.get('status') == 'accepted'), {})
            model = target.get('model') or target.get('training') or {}
            provenance = contract.get('provenance') or []
            episodes = {f['episode_index'] for p in provenance for f in p.get('frames', [])}
            route = capability.get('cooperative_route') or {}
            review = route.get('review') or {}
            row = {
                'source_id': pid, 'revision': task['revision'],
                'route': target.get('selected_route') or target.get('localization_route'),
                'method': target.get('selected_baseline'),
                'term': target.get('selected_sam_term') or selection.get('term'),
                'geometry_backend': target.get('geometry_backend') or task.get('geometry_backend') or 'stereo',
                'localization_status': target.get('localization_status'),
                'episode_count': len(episodes),
                'rgb_metrics': selected.get('metrics'),
                'geometry': {k: (target.get('geometry') or {}).get(k) for k in ['status', 'metrics', 'ir_mode']},
                'test': attempt.get('metrics') or (phase.get('localization') or {}).get('held_out_test'),
                'training': {'status': target.get('training_status'), 'runs': target.get('training_runs'),
                             'train_count': len(model['train_episodes']) if 'train_episodes' in model else None,
                             'val_count': len(model['val_episodes']) if 'val_episodes' in model else None, 'model_task': target.get('model_task')},
                'candidates': [{'id': c.get('id'), 'method': c.get('baseline_id'), 'term': c.get('term'),
                                'status': c.get('status'), 'selected': c.get('id') == selection.get('id'),
                                'text_only': c.get('text_only'), 'metrics': c.get('metrics')} for c in candidates.values()],
                'review_reason': attempt.get('final_review', {}).get('reason') or (selected.get('review') or {}).get('reason'),
                'samples': [],
            }
            # Use only the review saved for this exact canonical phase and stage.
            counts = {}
            for saved in target.get('reviews') or []:
                gate = saved.get('gate', '')
                if counts.get(gate, 0) >= 3:
                    continue
                relative = Path(saved['path'])
                source_path = root / relative
                if not source_path.is_file() and len(relative.parts) >= 5:
                    source_path = analysis / 'localization/reviews' / relative.parts[2] / gate / 'images' / relative.name
                full = image(source_path, task['id'])
                if not full:
                    continue
                with Image.open(source_path) as im:
                    compact = im.size == (640, 440)
                column = 320 if row['geometry_backend'] == 'rgbd' else 213
                sample = {'gate': gate, 'image': full,
                          'episode': saved.get('episode_index'), 'reason': (saved.get('assessment') or {}).get('reason'),
                          'point_status': (saved.get('assessment') or {}).get('point_in_region')}
                if compact:
                    sample['rgb'] = image(source_path, task['id'], (5, 54, column - 5, 209 if column == 320 else 194))
                    sample['detail'] = image(source_path, task['id'], (5, 222, 208, 425))
                row['samples'].append(sample)
                counts[gate] = counts.get(gate, 0) + 1
            if route:
                reviewed = route.get('reviewed_sample') or {}
                original = Path(reviewed.get('image') or '')
                sheet = original.parent.parent / 'wrist-grid.jpg'
                row['cooperative'] = {
                    'suitable': review.get('suitable'), 'reason': review.get('reason'),
                    'sample_count': len(review.get('usable_sample_ids') or []),
                    'image': image(sheet, task['id']), 'wrist': image(original, task['id']),
                    'acquire_hand': route.get('acquire_hand'), 'anchor_hand': route.get('anchor_hand'),
                    'relative_pose': capability.get('relative_pose'),
                    'motion_frames': len((capability.get('local_motion') or {}).get('joint_values') or []),
                    'material_status': capability.get('material_status'),
                }
            screen = (moves.get('phases') or {}).get(pid)
            if screen:
                row['move'] = {k: screen.get(k) for k in ['status', 'episode_count', 'sample_count', 'endpoint_bounds', 'relative_bounds']}
                row['move']['thresholds'] = moves.get('thresholds')
            if capability.get('home_target'):
                home = capability['home_target']
                row['home'] = {k: home.get(k) for k in ['arms', 'target_source', 'gripper_policy', 'joint_targets']}
            phases[str(phase['id'])] = row
        exported[task['id']] = {'revision': task['revision'], 'phases': phases}
    (REPO / 'localization-data.js').write_text('/* Saved Situation evidence; generated by scripts/export-localization.py. */\nwindow.WALLE_LOCALIZATION = ' + json.dumps(exported, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print(f'Exported {sum(len(t["phases"]) for t in exported.values())} phases and {len(images)} previews.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--situations-root', type=Path, default=Path('/data/eai/situations'))
    parser.add_argument('--datasets-root', type=Path, default=Path('/data/eai/datasets'))
    args = parser.parse_args()
    export(args.situations_root, args.datasets_root)

# WALLE demo

This static page presents three existing Situated Learning results as one switchable demo:

- `Unzip the bag.`
- `Grasp each backpack buckle and release the attached strap on both sides.`
- `Pick up the coin from the holder and insert it precisely into the coin bank.`

## Open

Serve the directory over HTTP so local videos and images load consistently:

```bash
cd /path/to/walle-demo
python3 -m http.server 8099
```

Open `http://127.0.0.1:8099/`.

## Data and presentation

`data.js` is a compact manifest generated from the three authoritative local Situation revisions. It keeps the canonical phase contracts, representative references, local stage videos, and state-graph paths. The page does not call an API or regenerate analysis.

`learning.js` owns the Robot demonstrations carousel, action-sequence selection, phase analysis, and Situation graph construction. Click a faded side window to switch tasks or select a sequence above the gripper timeline. The learning graph selects the phase shown in Learning Localization and Binding Skills. `app.js` renders the independent Situation graph below; its nodes open state or action details.

`localization.js` presents saved evidence using step tabs: segmentation, IR/depth and geometry, YOLO training, and validation with skill binding. Relative grasp, fixed move, Home and VLA show their own evidence instead. `localization-data.js` contains the results exported from the exact Situation revision named in `data.js`; `task-assets/*/localization/` contains its saved review images, limited to a 640-pixel longest side. Sample labels distinguish RGB, geometry and held-out test reviews. Image crops preserve saved overlays; no inference or training is performed by the page. RGB mask coverage, held-out localization metrics, and online execution readiness remain separate.

`situation-details.js` renders the selected action's goal, completion question, expected or recorded outcome, handoff conditions, hand roles, and demonstration evidence. A selected state has one reference image, its recorded condition values and links to adjacent actions. Branch evidence shows the saved alternative conditions and contact sheets. `situation-data.js` and `task-assets/*/situation/` preserve this material from the published revisions; empty fields are omitted and uncertain statements retain their source wording. Selecting a node or path updates the detail panel and highlighting without rebuilding the graph or resetting its horizontal scroll.

`agent.js` replays phase recordings for the selected task. At each saved decision point it briefly holds the video, keeps the paused video on the left and shows the saved multi-demonstration reference sheets in the right panel, shows scene matching for 0.8 seconds, highlights the recorded branch for 1.7 seconds, then automatically continues. The selected route comes from the recording’s Situation path ID and the conditions in `situation-data.js`. Clicking phase cards, lower markers, Scene Decision, or the scrubber preserves playback state: paused navigation only previews the selected position; Play continues from there. Scene Decision seeks to the start of the recording or the end of its source phase before showing the decision beat. Manual pause/resume also applies during this decision beat. Entry and exit use a 350 ms fade and slide (disabled for reduced-motion preferences). Contract-check animations take 2.5 seconds per phase. Timeline cards and their lower markers share equal-width columns, including decision nodes, in one horizontal viewport. The scrubber uses the same stage columns, advances within the current action or decision, and seeks to the selected step. During playback the scrubber reads the video position on each animation frame, keeping short clips smooth even at higher speeds. The separate Video readout reports recording seconds. This replays saved decisions, not live model inference. `agent-data.js` maps clip keys to published phase IDs and Situation path IDs; video filenames may retain older phase numbers. Nonzero seeks load only the selected short clip as a temporary Blob so seeking also works with plain static servers without HTTP Range support; these loads and object URLs are cancelled/released on phase changes.

Keep `task-assets/`, `dataset-assets/` and the JavaScript manifests beside `index.html` when copying the demo. These exported files are sufficient for development on another machine; the source datasets and model weights are not required.

To refresh saved localization evidence on the source machine (Node.js, Python and Pillow required):

```bash
python3 scripts/export-localization.py \
  --situations-root /data/eai/situations \
  --datasets-root /data/eai/datasets
```

The exporter reads the published revision and its corresponding analysis only, and writes demo-local previews and `localization-data.js`. It does not alter the published Situation.

Export the Situation contracts and branch evidence from the same sources:

```bash
python3 scripts/export-situation.py \
  --situations-root /data/eai/situations \
  --datasets-root /data/eai/datasets
```

## Validation

```bash
for f in data.js learning.js localization.js localization-data.js situation-details.js situation-data.js app.js agent.js; do node --check "$f"; done
git diff --check
```

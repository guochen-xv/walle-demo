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

`learning.js` owns the complete nine-stage Situated Learning walkthrough, the stacked Robot demonstrations carousel, phase media, and execution-method routing. Click the faded side window to switch tasks or click a workflow stage to inspect its output. `app.js` renders the selected Situation as a horizontal phase graph. Canonical phases appear once; normal transitions are solid and condition-dependent transitions are dashed. Clicking a graph node opens its representative reference and contract details.

`agent.js` follows the same selected task and currently shows an explicit empty video slot. No runtime execution recording is implied by the demo.

The `task-assets/` directory contains only curated local stage videos and representative reference frames. Keep it beside `index.html` when copying the demo.

## Validation

```bash
for f in data.js learning.js app.js agent.js; do node --check "$f"; done
git diff --check
```

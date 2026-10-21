# WALLE

An interactive website for Situated Learning, Situation and Situated Agent.

## Open

Extract the complete package and open `index.html` in Chrome or Edge. Keep the assets directory beside the page. For HTTP preview, run `python3 serve.py --port 8766`, then open http://127.0.0.1:8766.

## Structure

- `data.js`: task phases, contracts, boundaries, episode references and capability routing.
- `signals.js`: frame-aligned gripper tracks.
- `learning.js` / `episodes.js`: Learning animation and synchronized three-camera playback.
- `app.js`: phase inspection, shared motion controls and Situation slideshow.
- `agent.js` / `agent-data.js`: task playback and scenario-dependent contract checks.
- `control-demo.js`: normalized image-space annotations for grasp footage.
- `method-cards.*`: section layout and connecting paths.

## Playback

The center demonstration uses pre-encoded 3× Ep 0 videos at browser playbackRate 1. Background collection cards use JPEGs. Shared controls pause Learning and its selected video; offscreen playback pauses. Situation cycles every three seconds. Agent playback has separate controls.

Agent progress follows video time where a clip is configured and the presentation clock otherwise. Contract checks follow the selected scenario. Media references and playback durations are configured in `agent-data.js`; image-space overlay coordinates are configured in `control-demo.js`.

## Data

The Learning recording is 2,855 frames at 30 fps. The four displayed phases cover frames 0–2658. Phase boundaries, reference frames and contracts are defined in `data.js`; `situation.example.json` contains the same schema. Keep original frame indices when updating assets.

## Web video encoding

Main-camera recordings use H.264 at 640×480; wrist recordings use 480×360. Agent recordings retain their original frame counts and durations. Demonstration collection videos are encoded at 3× speed and 30 fps; their media time maps to source time by multiplying by three. Source frame indices in phase data remain unchanged. MP4 faststart places playback metadata before video data. Phase preview encodings remain unchanged.

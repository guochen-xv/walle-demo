/* Complete Situated Learning walkthrough for the static demo. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const store = window.WalleTaskStore;
  if (!store) return;

  const pipeline = [
    ['demonstrations', '01', 'Robot demonstrations', 'Recordings, camera views and robot state'],
    ['analysis', '02', 'Action sequences + analysis', 'Select a demonstrated path to inspect its phase evidence'],
    ['graph', '04', 'Situation graph construction', 'Timeline alignment · phase merging · branch generation'],
    ['localization', '04', 'Learning Localization and Binding Skills', 'Prepare executable phase materials']
  ];
  let selectedPhase = 0;
  let selectedPathIndex = 0;
  let selectedEventIndex = 0;
  let playing = true;
  let currentStage = 'demonstrations';
  let animationFrame;
  let syncDemoPlayback = () => {};
  let segmentationEvents = [];
  const taskRecordings = {
    unzip: {
      videos: {main: 'dataset-assets/unzip-2026-11-12_114008/main.mp4', left: 'dataset-assets/unzip-2026-11-12_114008/left.mp4', right: 'dataset-assets/unzip-2026-11-12_114008/right.mp4'},
      posters: {main: 'dataset-assets/unzip-2026-11-12_114008/main.jpg', left: 'dataset-assets/unzip-2026-11-12_114008/left.jpg', right: 'dataset-assets/unzip-2026-11-12_114008/right.jpg'}, pathAssets: {1: 'dataset-assets/unzip-2026-11-12_114008-ep1', 6: 'dataset-assets/unzip-2026-11-12_114008-ep6'}, dataset: '2026-11-12_114008', episodeId: 1, signalKey: 'unzip'
    },
    buckle: {
      videos: {main: 'dataset-assets/buckle-2026-10-26_142449/main.mp4', left: 'dataset-assets/buckle-2026-10-26_142449/left.mp4', right: 'dataset-assets/buckle-2026-10-26_142449/right.mp4'},
      posters: {main: 'dataset-assets/buckle-2026-10-26_142449/main.jpg', left: 'dataset-assets/buckle-2026-10-26_142449/left.jpg', right: 'dataset-assets/buckle-2026-10-26_142449/right.jpg'}, dataset: '2026-10-26_142449', episodeId: 27, signalKey: 'buckle'
    },
    coin: {
      videos: {main: 'dataset-assets/coin-robodojo-depth-deposit-coin/main.mp4', left: 'dataset-assets/coin-robodojo-depth-deposit-coin/left.mp4', right: 'dataset-assets/coin-robodojo-depth-deposit-coin/right.mp4'},
      posters: {main: 'dataset-assets/coin-robodojo-depth-deposit-coin/main.jpg', left: 'dataset-assets/coin-robodojo-depth-deposit-coin/left.jpg', right: 'dataset-assets/coin-robodojo-depth-deposit-coin/right.jpg'}, pathAssets: {2: 'dataset-assets/coin-robodojo-depth-deposit-coin-ep2', 18: 'dataset-assets/coin-robodojo-depth-deposit-coin-ep18', 28: 'dataset-assets/coin-robodojo-depth-deposit-coin-ep28', 78: 'dataset-assets/coin-robodojo-depth-deposit-coin-ep78'}, dataset: 'robodojo_depth_deposit_coin', episodeId: 78, signalKey: 'coin'
    }
  };

  const blackBagEventSpecs = [
    [0, 32, 'L_close', 'close', ['left']],
    [33, 411, 'L_move', 'move', ['left']],
    [412, 541, 'L_open', 'open', ['left']],
    [542, 562, 'R_close', 'close', ['right']],
    [563, 778, 'R_move', 'move', ['right']],
    [779, 906, 'R_open', 'open', ['right']],
    [907, 1374, 'L_move + R_move', 'move', ['left', 'right']],
    [1375, 1695, 'L_close + R_close', 'combined', ['left', 'right']],
    [1696, 2103, 'R_move', 'move', ['right']],
    [2104, 2658, 'L_move + R_move', 'move', ['left', 'right']],
    [2659, 2854, 'L_open + R_open', 'open', ['left', 'right']]
  ];

  const allPhases = task => task.situation && task.situation.phases || task.phases || [];
  const taskPaths = task => task && task.graph && Array.isArray(task.graph.paths) ? task.graph.paths : [];
  const selectedPath = task => taskPaths(task)[selectedPathIndex] || null;
  const pathLabel = (task, index = selectedPathIndex) => {
    const path = taskPaths(task)[index];
    if (!path) return 'All demonstrated sequences';
    return 'Path ' + (index + 1) + (path.episode != null ? ' · Ep. ' + path.episode : '');
  };
  const phases = task => {
    const all = allPhases(task);
    const path = selectedPath(task);
    if (!path || !task.graph || !Array.isArray(task.graph.nodes)) return all;
    const ids = new Set(task.graph.nodes.filter(node => node.kind !== 'state' && Array.isArray(node.paths) && node.paths.includes(path.id)).map(node => Number(node.phase)));
    return all.filter(phase => ids.has(Number(phase.id)) || phase.kind === 'home' && ids.has(Number(phase.id)));
  };
  const recordingForTask = task => {
    const recording = taskRecordings[task.id];
    const path = selectedPath(task);
    const episode = path && path.episode != null ? path.episode : recording && recording.episodeId;
    const base = recording && recording.pathAssets && recording.pathAssets[episode];
    if (!base) return recording;
    return {
      ...recording,
      videos: {main: base + '/main.mp4', left: base + '/left.mp4', right: base + '/right.mp4'},
      posters: {main: base + '/main.jpg', left: base + '/left.jpg', right: base + '/right.jpg'},
      episodeId: episode
    };
  };
  const datasetSignalForTask = task => {
    const recording = taskRecordings[task.id];
    const bundle = recording && window.WALLE_DATASET_SIGNALS && window.WALLE_DATASET_SIGNALS[recording.signalKey];
    if (!bundle) return null;
    const path = selectedPath(task);
    return path && Array.isArray(bundle.paths) ? bundle.paths.find(item => Number(item.episodeId) === Number(path.episode)) || bundle : bundle;
  };
  const phaseName = phase => phase.kind === 'home'
    ? 'Return home'
    : (phase.target ? (phase.operation || 'Operation') + ' · ' + phase.target : phase.operation || 'Prepared phase');
  const method = phase => phase.kind === 'home' ? 'Home' : phase.capability && (phase.capability.learning_skill || phase.capability.primary) || 'Control';
  const image = phase => phase.media && (phase.media.reference || phase.media.main || phase.media.poster) || '';
  const temporalMainFrames = phase => {
    const video = phase.media && phase.media.video;
    if (video && /\.mp4(?:\?|$)/i.test(video)) {
      const stem = video.replace(/\.mp4(?:\?.*)?$/i, '');
      return [
        {label: 'Start', src: stem + '-start.jpg'},
        {label: 'Process', src: stem + '-process.jpg'},
        {label: 'End', src: stem + '-end.jpg'}
      ];
    }
    const main = phase.media && (phase.media.main || phase.media.reference || phase.media.poster) || '';
    return [{label: 'Reference', src: main}, {label: 'Reference', src: main}, {label: 'Reference', src: main}];
  };
  const phaseAt = task => allPhases(task).find(phase => Number(phase.id) === Number(selectedPhase)) || phases(task)[0] || allPhases(task)[0];
  const stageTargets = { demonstrations: '#demo-module', analysis: '#parsing-module', graph: '#learning-graph-preview', localization: '#skills-module' };

  function stageRail(task) {
    document.querySelectorAll('#learning-stage-rail,#learning-graph-preview,#learning-graph-result').forEach(node => node.remove());
    renderGraphPreview(task);
    focusStage(currentStage);
  }

  function stageText(task, id) {
    const ps = phases(task);
    const objectNames = [...new Set(ps.map(p => [p.target, p.part].filter(Boolean).join(' · ')).filter(Boolean))];
    const methods = [...new Set(ps.map(method))];
    const pathCount = task.graph && task.graph.paths && task.graph.paths.length || task.summary && task.summary.pathCount || 1;
    const map = {
      demonstrations: 'The selected task contains ' + (task.demos && task.demos.length || pathCount) + ' representative demonstration views and ' + ps.length + ' accepted phase records.',
      analysis: 'Recorded gripper events and their phase evidence are shown together. Select a sequence to inspect the corresponding summary, images and detailed contract for ' + (objectNames.slice(0, 4).join(', ') || 'the demonstrated objects') + '.',
      graph: 'The graph stage aligns ' + pathCount + ' demonstrated path' + (pathCount === 1 ? '' : 's') + ', merges compatible phase contracts, and keeps the observed branch conditions explicit.',
      localization: 'Control material is selected per phase; ' + ps.filter(p => p.kind !== 'home').length + ' operation phases carry executable decisions.',
      validation: 'Accepted phase materials are routed to ' + (methods.filter(name => name !== 'Home').join(' / ') || 'the execution policy') + '; Home phases remain explicit.'
    };
    return map[id] || '';
  }

  function renderStageDetail(task) {
    const detail = $('#learning-stage-detail');
    if (!detail) return;
    const row = pipeline.find(item => item[0] === currentStage) || pipeline[0];
    detail.innerHTML = '<span class="learning-stage-detail-kicker">STAGE ' + row[1] + ' · ' + esc(row[2]) +
      '</span><p>' + esc(stageText(task, row[0])) + '</p><span class="learning-stage-detail-output">Output: ' +
      esc(row[3]) + '</span>';
  }

  function focusStage(stage) {
    Object.entries(stageTargets).forEach(([id, selector]) => {
      const node = $(selector);
      if (node) node.classList.toggle('learning-stage-focus', id === stage);
    });
  }

  function renderGraphPreview(task) {
    const board = $('#offline-view');
    if (!board) return;
    const graph = task.graph || {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const paths = Array.isArray(graph.paths) ? graph.paths : [];
    const states = nodes.filter(node => node.kind === 'state');
    const actions = nodes.filter(node => node.kind === 'action');
    const phases = allPhases(task);
    const phaseCount = phases.length;
    const branchCount = Array.isArray(graph.branches) ? graph.branches.length : 0;
    const phaseById = new Map(phases.map(phase => [Number(phase.id), phase]));
    const pathById = new Map(paths.map(path => [path.id, path]));
    const pathActions = path => actions.filter(node => Array.isArray(node.paths) && node.paths.includes(path.id)).sort((a, b) => Number(a.level ?? a.phase ?? 0) - Number(b.level ?? b.phase ?? 0) || Number(a.phase ?? 0) - Number(b.phase ?? 0));
    const pathStates = path => states.filter(node => Array.isArray(node.paths) && node.paths.includes(path.id)).sort((a, b) => Number(a.level ?? a.phase ?? 0) - Number(b.level ?? b.phase ?? 0));
    const maxLevel = Math.max(0, ...nodes.map(node => Number(node.level ?? node.phase ?? 0)));
    const pathTitle = (path, index) => 'Path ' + (index + 1) + (path.episode != null ? ' · Episode ' + path.episode : ' · Recorded path');
    const actionKind = phase => phase && phase.kind === 'home' ? 'home' : phase && phase.operation === 'placement' ? 'placement' : phase && phase.operation === 'acquisition' ? 'acquisition' : 'execution';
    const timelineRows = paths.map((path, index) => {
      const routeActions = pathActions(path);
      const routeStates = pathStates(path);
      const statesByPhase = new Map(routeStates.map(state => [Number(state.phase), state]));
      const events = routeActions.map((node, eventIndex) => {
        const phase = phaseById.get(Number(node.phase));
        const state = statesByPhase.get(Number(node.phase));
        const level = Number(node.level ?? node.phase ?? eventIndex);
        const frame = state && state.frame != null ? 'Frame ' + state.frame : 'T' + String(eventIndex + 1).padStart(2, '0');
        return '<article class="graph-timeline-event kind-' + actionKind(phase) + '" style="--timeline-column:' + (level + 1) + '" title="' + esc(node.label || phaseName(phase || {})) + '"><b>P' + String(node.phase ?? '').padStart(2, '0') + '</b><strong>' + esc(phase ? phaseName(phase) : node.label || 'Recorded action') + '</strong><small>' + esc(frame) + '</small></article>';
      }).join('');
      return '<article class="graph-timeline-row"><header><strong>' + esc(pathTitle(path, index)) + '</strong><small>' + esc(path.sequenceKey || routeActions.map(node => phaseName(phaseById.get(Number(node.phase)) || {})).join(' → ')) + '</small></header><div class="graph-timeline-track" style="--timeline-columns:' + (maxLevel + 1) + '"><span class="graph-timeline-start">start</span>' + events + '<span class="graph-timeline-end">end</span></div></article>';
    }).join('');
    const timelineAxis = Array.from({length: maxLevel + 1}, (_, tick) => '<span style="grid-column:' + (tick + 1) + '">T' + String(tick + 1).padStart(2, '0') + '</span>').join('');
    const mergeCards = phases.map(phase => {
      const sources = actions.filter(node => Number(node.phase) === Number(phase.id));
      const sourcePathIds = [...new Set(sources.flatMap(node => node.paths || []))];
      const sourcePaths = sourcePathIds.map(id => pathById.get(id)).filter(Boolean);
      const reason = sources.length > 1 ? 'Shared phase across ' + sourcePaths.length + ' demonstrated paths.' : 'Retained from one demonstrated phase.';
      const sourceLabels = sourcePaths.length ? sourcePaths.map(path => '<span>' + esc(pathTitle(path, paths.indexOf(path))) + '</span>').join('') : '<span>No action source</span>';
      return '<article class="graph-merge-card"><div class="graph-merge-card-head"><span>P' + String(phase.id).padStart(2, '0') + '</span><strong>' + esc(phaseName(phase)) + '</strong><em>' + esc(method(phase)) + '</em></div><p>' + esc(reason) + '</p><div class="graph-merge-sources"><b>Sources</b>' + sourceLabels + '</div></article>';
    }).join('');
    const branchCards = (graph.branches || []).map((branch, index) => {
      const target = phaseById.get(Number(branch.target));
      const branchPaths = (branch.path || []).map(id => pathById.get(id)).filter(Boolean).map(path => pathTitle(path, paths.indexOf(path))).join(' · ');
      return '<article class="graph-branch-card"><div class="graph-branch-card-head"><span>B' + String(index + 1).padStart(2, '0') + '</span><strong>' + esc(target ? 'Enters P' + String(target.id).padStart(2, '0') + ' · ' + phaseName(target) : 'Observed alternative') + '</strong></div><p>' + esc(branch.description || 'Observed alternative condition') + '</p><small>' + esc(branchPaths || 'Recorded route') + '</small></article>';
    }).join('');
    const empty = text => '<div class="graph-tab-empty">' + esc(text) + '</div>';
    const graphPanel = document.createElement('section');
    graphPanel.id = 'learning-graph-preview';
    graphPanel.className = 'learning-graph-preview';
    graphPanel.setAttribute('aria-label', 'Situation graph construction preview');
    graphPanel.innerHTML =
      '<div class="learning-graph-heading"><div><span class="module-kicker">03 / SITUATION GRAPH</span><h3>Situation graph construction</h3></div></div>' +
      '<div class="learning-graph-body">' +
      '<div class="graph-tabs" role="tablist" aria-label="Situation graph construction stages"><button type="button" role="tab" aria-selected="true" aria-controls="graph-tab-timeline" data-graph-tab="timeline"><b>01</b><span>Timeline alignment</span><small>Align demonstrated paths</small></button><button type="button" role="tab" aria-selected="false" aria-controls="graph-tab-merge" data-graph-tab="merge"><b>02</b><span>Phase merging</span><small>Build shared phases</small></button><button type="button" role="tab" aria-selected="false" aria-controls="graph-tab-branch" data-graph-tab="branch"><b>03</b><span>Branch generation</span><small>Keep alternatives explicit</small></button></div>' +
      '<div class="graph-tab-panels"><section id="graph-tab-timeline" class="graph-tab-panel" data-graph-panel="timeline" role="tabpanel"><div class="graph-tab-panel-heading"><div><span class="module-kicker">TIMELINE ALIGNMENT</span><h4>One shared time axis for every demonstrated path</h4><p>All action sequences share one axis; each row preserves its demonstrated order.</p></div></div><div class="graph-timeline-chart" style="--timeline-columns:' + (maxLevel + 1) + '"><div class="graph-timeline-axis" style="--timeline-columns:' + (maxLevel + 1) + '">' + timelineAxis + '</div>' + (timelineRows || empty('No demonstrated paths')) + '</div></section>' +
      '<section id="graph-tab-merge" class="graph-tab-panel" data-graph-panel="merge" role="tabpanel" hidden><div class="graph-tab-panel-heading"><div><span class="module-kicker">PHASE MERGING</span><h4>Shared phases and their demonstrated sources</h4><p>Each phase shows which paths contribute evidence and why it remains one phase.</p></div><span class="graph-tab-count">' + phaseCount + ' phases</span></div><div class="graph-merge-grid">' + (mergeCards || empty('No phase records')) + '</div></section>' +
      '<section id="graph-tab-branch" class="graph-tab-panel" data-graph-panel="branch" role="tabpanel" hidden><div class="graph-tab-panel-heading"><div><span class="module-kicker">BRANCH GENERATION</span><h4>Observed conditions select a demonstrated route</h4><p>Branches remain explicit so the agent can choose among valid paths from the current state.</p></div><span class="graph-tab-count">' + branchCount + ' conditions</span></div><div class="graph-branch-grid">' + (branchCards || empty('Single route · no branch condition recorded')) + '</div></section></div>' +
      '<div class="graph-processing-output"><div><span class="module-kicker">OUTPUT</span><strong>Situation graph</strong></div><div class="graph-processing-output-stats"><span><strong>' + phaseCount + '</strong><small>phases</small></span><span><strong>' + states.length + '</strong><small>states</small></span><span><strong>' + branchCount + '</strong><small>branches</small></span></div></div></div>';
    const skillsModule = $('#skills-module');
    if (skillsModule && skillsModule.parentElement === board) board.insertBefore(graphPanel, skillsModule);
    else board.appendChild(graphPanel);
    const resultPanel = document.createElement('section');
    resultPanel.id = 'learning-graph-result';
    resultPanel.className = 'learning-graph-result';
    resultPanel.setAttribute('aria-label', 'Clickable Situation graph result');
    resultPanel.innerHTML = '<div class="graph-result-heading"><div><span class="module-kicker">SITUATION GRAPH RESULT</span><h3>Click a phase to inspect its localization material</h3></div><div class="graph-result-legend"><span><i class="graph-legend-action"></i>operation / home</span><span><i class="graph-legend-branch"></i>branch</span></div></div><div class="graph-svg-scroll"><div class="graph-svg-host">' + situationGraphSvg(task, phaseById) + '</div></div>';
    if (skillsModule && skillsModule.parentElement === board) board.insertBefore(resultPanel, skillsModule);
    else board.appendChild(resultPanel);
    const tabs = graphPanel.querySelectorAll('[data-graph-tab]');
    const panels = graphPanel.querySelectorAll('[data-graph-panel]');
    const activateTab = key => {
      const changed = graphPanel.querySelector('[data-graph-tab][aria-selected=true]')?.dataset.graphTab !== key;
      tabs.forEach(tab => {
        const active = tab.dataset.graphTab === key;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.graphPanel !== key; });
      if (changed) window.WalleMotion.enter(graphPanel.querySelector('[data-graph-panel="' + key + '"]'), graphPanel);
    };
    tabs.forEach(tab => {
      tab.addEventListener('click', () => activateTab(tab.dataset.graphTab));
      tab.addEventListener('keydown', event => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const list = [...tabs], index = list.indexOf(tab), next = event.key === 'ArrowRight' ? (index + 1) % list.length : (index - 1 + list.length) % list.length;
        list[next].focus({preventScroll: true});
        activateTab(list[next].dataset.graphTab);
      });
    });
    activateTab('timeline');
    resultPanel.querySelectorAll('[data-graph-node]').forEach(node => node.addEventListener('click', () => selectGraphNode(task, node.dataset.graphNode)));
    updateGraphSelection();
  }

  function svgText(value, max = 31) {
    const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, Math.max(1, max - 1)) + '…' : text;
  }

  function situationGraphSvg(task, phaseById) {
    const graph = task.graph || {};
    const allNodes = Array.isArray(graph.nodes) ? graph.nodes.slice() : [];
    const nodes = allNodes.filter(node => node.kind === 'action');
    if (!nodes.length) return '<div class="graph-empty">No Situation graph available</div>';
    const visibleIds = new Set(nodes.map(node => node.id));
    const graphEdges = [];
    const edgeKeys = new Set();
    const placementNodes = nodes.filter(node => phaseById.get(Number(node.phase))?.operation === 'placement');
    const placementLevel = placementNodes.length > 1 ? Math.max(...placementNodes.map(node => Number(node.level ?? node.phase ?? 0))) : null;
    const addEdge = (source, target, branch = false) => {
      if (!visibleIds.has(source) || !visibleIds.has(target) || source === target) return;
      const key = source + '>' + target;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      graphEdges.push({source, target, branch});
    };
    (graph.edges || []).forEach(edge => addEdge(edge.source, edge.target, Boolean(edge.branch)));
    (graph.paths || []).forEach(path => {
      nodes.filter(node => Array.isArray(node.paths) && node.paths.includes(path.id))
        .sort((a, b) => Number(a.level ?? a.phase ?? 0) - Number(b.level ?? b.phase ?? 0))
        .forEach((node, index, sequence) => index && addEdge(sequence[index - 1].id, node.id));
    });
    const byLevel = new Map();
    nodes.forEach((node, index) => {
      const baseLevel = Number.isFinite(Number(node.level)) ? Number(node.level) : Number(node.phase || 0);
      const level = placementLevel != null && placementNodes.includes(node) ? placementLevel : baseLevel;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level).push({...node, _level: level, _order: index});
    });
    const levels = [...byLevel.keys()].sort((a, b) => a - b);
    const nodeWidth = 174, nodeHeight = 72, columnGap = 30, rowGap = 15, marginX = 21, marginY = 21;
    const positions = new Map();
    let maxRows = 1;
    levels.forEach((level, column) => {
      const list = byLevel.get(level).sort((a, b) => Number(a.phase ?? 0) - Number(b.phase ?? 0) || a._order - b._order);
      maxRows = Math.max(maxRows, list.length);
      list.forEach((node, row) => positions.set(node.id, {
        x: marginX + column * (nodeWidth + columnGap),
        y: marginY + row * (nodeHeight + rowGap),
        w: node.kind === 'state' ? 50 : nodeWidth,
        cx: marginX + column * (nodeWidth + columnGap) + nodeWidth / 2,
        cy: marginY + row * (nodeHeight + rowGap) + nodeHeight / 2
      }));
    });
    const width = marginX * 2 + levels.length * nodeWidth + Math.max(0, levels.length - 1) * columnGap;
    const height = marginY * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap;
    const edgeMarkup = graphEdges.map(edge => {
      const source = positions.get(edge.source), target = positions.get(edge.target);
      if (!source || !target) return '';
      const x1 = source.x + source.w, y1 = source.cy, x2 = target.x, y2 = target.cy;
      const bend = Math.max(x1 + 12, (x1 + x2) / 2);
      return '<path class="graph-svg-edge ' + (edge.branch ? 'branch' : '') + '" d="M' + x1 + ' ' + y1 + ' C' + bend + ' ' + y1 + ',' + bend + ' ' + y2 + ',' + (x2 - 4) + ' ' + y2 + '"/>';
    }).join('');
    const nodeMarkup = nodes.map(node => {
      const pos = positions.get(node.id);
      if (!pos) return '';
      const phase = phaseById.get(Number(node.phase));
      const isHome = phase && phase.kind === 'home';
      const title = svgText(phase ? phaseName(phase) : node.label || 'Phase', 18);
      const detail = svgText(phase && phase.prompt || node.label || '', 23);
      const phaseLabel = node.phase == null ? '' : 'P' + String(node.phase).padStart(2, '0');
      const cls = 'graph-svg-node action' + (isHome ? ' home' : '');
      return '<g class="' + cls + '" data-graph-node="' + esc(node.id) + '" tabindex="0" role="button" aria-label="' + esc(phaseLabel + ' ' + title) + '">' +
        '<rect x="' + pos.x + '" y="' + pos.y + '" width="' + nodeWidth + '" height="' + nodeHeight + '" rx="9"></rect>' +
        '<text class="graph-svg-phase" x="' + (pos.x + 14) + '" y="' + (pos.y + 24) + '">' + esc(phaseLabel || 'PHASE') + '</text>' +
        '<text class="graph-svg-title" x="' + (pos.x + 14) + '" y="' + (pos.y + 46) + '">' + esc(title) + '</text>' +
        '<text class="graph-svg-detail" x="' + (pos.x + 14) + '" y="' + (pos.y + 63) + '">' + esc(detail) + '</text></g>';
    }).join('');
    return '<svg class="situation-graph-svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="' + esc(task.name + ' Situation graph') + '"><defs><marker id="graph-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z"></path></marker></defs><g class="graph-svg-edges">' + edgeMarkup + '</g><g class="graph-svg-nodes">' + nodeMarkup + '</g></svg>';
  }

  function selectGraphNode(task, nodeId) {
    const node = task.graph && Array.isArray(task.graph.nodes) ? task.graph.nodes.find(item => item.id === nodeId) : null;
    if (!node || node.phase == null) return;
    selectedPhase = Number(node.phase);
    currentStage = 'localization';
    renderSkills(task);
    renderStageDetail(task);
    focusStage(currentStage);
    updateGraphSelection();
  }

  function updateGraphSelection() {
    document.querySelectorAll('#learning-graph-result [data-graph-node]').forEach(node => {
      const phase = Number((node.getAttribute('aria-label') || '').match(/P(\d+)/)?.[1]);
      node.classList.toggle('selected', Number.isFinite(phase) && phase === Number(selectedPhase));
    });
  }

  function renderDemonstrations(task) {
    const host = $('#mini-episodes');
    if (!host) return;
    const demos = task.demos || [];
    const selected = Math.max(0, store.list.findIndex(item => item.id === task.id));
    const mediaMarkup = (src, alt, active, poster) => {
      if (!src) return '<div class="demo-inline-video demo-media-empty" aria-hidden="true"></div>';
      const video = /\.(mp4|webm|mov)(\?|$)/i.test(src);
      const cacheSrc = video ? src + (src.includes('?') ? '&' : '?') + 'v=3x-20261124' : src;
      if (video && !active) return '<img class="demo-inline-video" src="' + esc(poster || '') + '" alt="' + esc(alt) + '" loading="lazy">';
      return video
        ? '<video class="demo-inline-video" src="' + esc(cacheSrc) + '" ' +
          (active ? 'data-demo-playing="true" autoplay loop ' : '') +
          'muted playsinline preload="' + (active ? 'auto' : 'none') + '" poster="' + esc(poster || '') + '" aria-label="' + esc(alt) + '"></video>'
        : '<img class="demo-inline-video" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">';
    };
    const syncPlayback = () => {
      host.querySelectorAll('.mini-episode').forEach(card => {
        const rect = card.getBoundingClientRect();
        const shouldPlay = playing && !document.body.classList.contains('motion-off') && card.classList.contains('focus') && !document.hidden && rect.bottom > 0 && rect.top < innerHeight;
        card.querySelectorAll('video[data-demo-playing]').forEach(video => {
          video.muted = true;
          video.loop = true;
          video.playbackRate = 1;
          if (shouldPlay) video.play().catch(() => {});
          else video.pause();
        });
      });
    };
    syncDemoPlayback = syncPlayback;
    const existing = [...host.querySelectorAll('.mini-episode[data-task-id]')];
    const sameCards = existing.length === store.list.length && existing.every(card => store.list.some(item => item.id === card.dataset.taskId));
    if (sameCards) {
      existing.forEach((card, index) => {
        const item = store.list.find(entry => entry.id === card.dataset.taskId);
        if (!item) return;
        const active = item.id === task.id;
        const relative = (index - selected + store.list.length) % store.list.length;
        const position = active ? 'center' : relative === 1 ? 'right' : 'left';
        const demo = (item.demos || [])[0] || {};
        const recording = item.id === task.id ? recordingForTask(task) : taskRecordings[item.id];
        const views = recording ? recording.videos : (demo.views || {});
        const posters = recording ? recording.posters : {};
        const poster = posters.main || demo.poster || '';
        card.dataset.position = position;
        card.classList.toggle('focus', active);
        card.setAttribute('aria-current', String(active));
        card.querySelector('.episode-views').innerHTML = [
          [views.left || poster, 'Left wrist demonstration', posters.left || poster],
          [views.main || demo.video || poster, 'Main camera demonstration', posters.main || poster],
          [views.right || poster, 'Right wrist demonstration', posters.right || poster]
        ].map(([src, alt, mediaPoster]) => '<figure>' + mediaMarkup(src, alt, active, mediaPoster) + '</figure>').join('');
        const meta = card.querySelector('.learning-demo-meta');
        if (meta) meta.textContent = (item.demos && item.demos.length || 0) + ' representative phase views · ' + allPhases(item).length + ' phases';
      });
      syncPlayback();
      return;
    }
    host.innerHTML = '<div class="learning-carousel-note">Select a demonstration to change the complete workflow.</div>' +
      store.list.map((item, index) => {
        const demo = (item.demos || [])[0] || {};
        const recording = item.id === task.id ? recordingForTask(task) : taskRecordings[item.id];
        const views = recording ? recording.videos : (demo.views || {});
        const posters = recording ? recording.posters : {};
        const poster = posters.main || demo.poster || '';
        const active = item.id === task.id;
        const relative = (index - selected + store.list.length) % store.list.length;
        const position = active ? 'center' : relative === 1 ? 'right' : 'left';
        const left = views.left || poster || '';
        const main = views.main || demo.video || poster || '';
        const right = views.right || poster || '';
        return '<article class="mini-episode ' + (position === 'center' ? 'focus' : '') +
          '" data-task-id="' + esc(item.id) + '" data-position="' + position +
          '" tabindex="0" role="button" aria-current="' + (position === 'center') + '">' +
          '<p class="demo-task">Task: <strong>' + esc(item.name.replace(/\.$/, '')) +
          '</strong></p><div class="episode-views"><figure>' + mediaMarkup(left, 'Left wrist demonstration', active, posters.left || poster) +
          '</figure><figure>' + mediaMarkup(main, 'Main camera demonstration', active, posters.main || poster) +
          '</figure><figure>' + mediaMarkup(right, 'Right wrist demonstration', active, posters.right || poster) + '</figure></div>' +
          '<small class="learning-demo-meta">' + (item.demos && item.demos.length || 0) +
          ' representative phase views · ' + allPhases(item).length + ' phases</small></article>';
      }).join('');
    host.querySelectorAll('[data-task-id]').forEach(card => {
      const select = () => store.select(card.dataset.taskId);
      card.addEventListener('click', select);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
      });
    });
    host.classList.toggle('empty', !demos.length);
    syncPlayback();
  }

  function phaseEventLabel(phase) {
    const arm = String(phase.arm || '').toLowerCase();
    const hands = arm === 'both' ? ['L', 'R'] : arm === 'left' ? ['L'] : arm === 'right' ? ['R'] : ['L', 'R'];
    const prompt = String(phase.prompt || '').toLowerCase();
    let kind = phase.kind === 'home' ? 'move' : phase.operation === 'acquisition' ? 'close' : 'move';
    if (/release|open|withdraw/.test(prompt)) kind = 'open';
    if (hands.length === 1) return {label: hands[0] + '_' + kind, kind, hands: arm ? [arm] : ['left']};
    if (kind === 'open') return {label: 'L_move + R_open', kind: 'combined', hands: ['left', 'right']};
    if (phase.operation === 'acquisition') return {label: 'L_close + R_close', kind: 'combined', hands: ['left', 'right']};
    return {label: 'L_move + R_move', kind: 'move', hands: ['left', 'right']};
  }

  function signalAction(start, end, hand, signal = window.WALLE_SIGNALS) {
    const values = signal && signal[hand] || [];
    if (!values.length) return {kind: 'move', label: (hand === 'left' ? 'L' : 'R') + '_move'};
    const span = Math.max(1, Math.min(8, Math.floor((end - start + 1) / 5)));
    const before = values.slice(start, start + span).reduce((sum, value) => sum + value, 0) / span;
    const after = values.slice(Math.max(start, end - span + 1), end + 1).reduce((sum, value) => sum + value, 0) / span;
    const delta = after - before;
    const kind = Math.abs(delta) > .12 ? (delta < 0 ? 'close' : 'open') : 'move';
    return {kind, label: (hand === 'left' ? 'L' : 'R') + '_' + kind};
  }

  function combineSignalActions(actions) {
    const label = actions.map(action => action.label).join(' + ');
    const kinds = new Set(actions.map(action => action.kind));
    return {label, kind: actions.length > 1 || kinds.size > 1 ? 'combined' : actions[0].kind};
  }

  function buildSequence(task) {
    const recording = recordingForTask(task);
    const datasetSignal = datasetSignalForTask(task);
    if (datasetSignal) {
      return datasetSignal.events.map((event, index) => ({
        id: index, start: event.start, end: event.end - 1, label: event.label, kind: event.kind, hands: event.hands,
        source: 'Recorded dataset signal', phase: null
      }));
    }
    if (task.id === 'unzip' && window.WALLE_SIGNALS) {
      return blackBagEventSpecs.map(([start, end, fallbackLabel, fallbackKind, hands], index) => {
        const actions = hands.map(hand => signalAction(start, end, hand));
        const combined = actions.length ? combineSignalActions(actions) : {label: fallbackLabel, kind: fallbackKind};
        return {
        id: index, start, end, label: combined.label || fallbackLabel, kind: combined.kind || fallbackKind, hands, source: 'Recorded gripper signal',
        phase: index < 7 ? phases(task)[Math.min(phaseIndexForFrame(start), phases(task).length - 1)] : phases(task)[3]
        };
      });
    }
    const length = 1000;
    const ps = phases(task);
    return ps.filter(phase => phase.kind !== 'home' || ps.length < 2).map((phase, index, visible) => {
      const event = phaseEventLabel(phase);
      const start = Math.round(index * length / Math.max(1, visible.length));
      const end = Math.round((index + 1) * length / Math.max(1, visible.length)) - 1;
      return {id: index, start, end, label: event.label, kind: event.kind, hands: event.hands,
        source: 'Recorded phase evidence', phase};
    });
  }

  function phaseIndexForFrame(frame) {
    const cuts = [0, 1374, 1695, 2103, 2658, 2854];
    return Math.max(0, cuts.findIndex((cut, index) => frame >= cut && frame < (cuts[index + 1] || Infinity)));
  }

  function phaseForSequenceEvent(task, event, index) {
    const eventPhase = event && event.phase;
    if (eventPhase && eventPhase.id != null) return Number(eventPhase.id);
    const candidates = phases(task).filter(phase => phase.kind !== 'home');
    if (!candidates.length) return 0;
    return Number(candidates[Math.min(index, candidates.length - 1)].id);
  }

  function selectSequenceEvent(task, index) {
    const event = segmentationEvents[index];
    if (!event) return;
    selectedEventIndex = index;
    selectedPhase = phaseForSequenceEvent(task, event, index);
    currentStage = 'analysis';
    updateSequenceSwitcher();
    document.querySelectorAll('#coarse-clips [data-coarse]').forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderSemantic(task);
    renderSkills(task);
    renderStageDetail(task);
    focusStage(currentStage);
  }

  function selectActionPath(task, index) {
    if (!taskPaths(task).length || index === selectedPathIndex) return;
    selectedPathIndex = index;
    selectedEventIndex = 0;
    selectedPhase = 0;
    currentStage = 'analysis';
    renderDemonstrations(task);
    renderSegmentation(task);
    renderSemantic(task);
    renderSkills(task);
    renderStageDetail(task);
    focusStage(currentStage);
  }

  function eventIndexForPhase(task, phaseId) {
    const index = segmentationEvents.findIndex((event, eventIndex) => phaseForSequenceEvent(task, event, eventIndex) === Number(phaseId));
    if (index >= 0) return index;
    const phase = phases(task).find(item => Number(item.id) === Number(phaseId));
    return phase && phase.kind === 'home' ? -1 : selectedEventIndex;
  }

  function renderSegmentation(task) {
    segmentationEvents = buildSequence(task);
    const length = segmentationEvents.length ? segmentationEvents[segmentationEvents.length - 1].end + 1 : 1;
    selectedEventIndex = 0;
    const recording = recordingForTask(task);
    const datasetSignal = datasetSignalForTask(task);
    const hasSignal = Boolean(datasetSignal || (task.id === 'unzip' && window.WALLE_SIGNALS));
    const count = $('#coarse-count');
    if (count) count.textContent = segmentationEvents.length + ' recorded events · ' + (hasSignal ? 'recorded gripper signal · ' + ((datasetSignal && datasetSignal.fps) || 30) + ' fps' : 'phase-aligned event view');
    const tracks = $('#coarse-tracks');
    const signal = datasetSignal || (task.id === 'unzip' && window.WALLE_SIGNALS) || null;
    const signalPath = side => {
      if (!signal) return 'M0 16 L' + segmentationEvents.map(event => event.start + ' ' + (event.hands.includes(side) ? 8 : 22)).join(' L') + ' L' + length + ' 16';
      const values = signal[side];
      const stride = Math.max(1, Math.ceil(values.length / 650));
      return values.filter((_, index) => index % stride === 0).map((value, index) => (index ? 'L' : 'M') + (index * stride) + ' ' + (24 - value * 20).toFixed(2)).join(' ');
    };
    if (tracks) tracks.innerHTML = ['left', 'right'].map(side =>
      '<div><span>' + (side === 'left' ? 'L' : 'R') + '</span><svg viewBox="0 0 ' + length + ' 28" preserveAspectRatio="none" aria-label="Recorded ' + side + ' gripper"><path d="' + signalPath(side) + '"/>' +
      segmentationEvents.slice(1).map(event => '<line x1="' + event.start + '" x2="' + event.start + '" y1="0" y2="28"/>').join('') + '</svg></div>').join('');
    const clips = $('#coarse-clips');
    if (clips) clips.innerHTML = segmentationEvents.map((event, index) =>
      '<button type="button" data-coarse="' + index + '" data-event-kind="' + event.kind + '" style="left:' + (event.start / length * 100) + '%;width:' + ((event.end - event.start + 1) / length * 100) + '%" title="' + esc(event.label + ' · frames ' + event.start + '–' + event.end) + '"><span>' + esc(event.label) + '</span></button>').join('');
    const axis = document.querySelector('.coarse-frame-axis');
    if (axis) axis.innerHTML = '<span>Frame 0</span><span>' + (hasSignal ? 'Frame ' + Math.max(0, length - 1) : 'Phase-aligned event view') + '</span>';
    const switcher = $('#sequence-switcher');
    if (switcher) switcher.innerHTML = taskPaths(task).map((path, index) =>
      '<button type="button" role="tab" data-path-index="' + index + '" aria-selected="' + (index === selectedPathIndex) + '" title="' + esc(path.sequenceKey || 'Sequence ' + (index + 1)) + '"><small>Sequence ' + (index + 1) + '</small><strong>' + esc((path.sequenceKey || 'Recorded actions').replace(/13_/g, 'R_').replace(/6_/g, 'L_').replace(/>/g, ' → ')) + '</strong></button>').join('');
    if (clips) clips.querySelectorAll('[data-coarse]').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === selectedEventIndex));
      button.addEventListener('click', () => selectSequenceEvent(task, index));
    });
    if (switcher) switcher.querySelectorAll('[data-path-index]').forEach((button, index) => {
      button.addEventListener('click', () => selectActionPath(task, index));
    });
  }

  function updateSequenceSwitcher() {
    document.querySelectorAll('#sequence-switcher [data-path-index]').forEach((button, index) => {
      const selected = index === selectedPathIndex;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-selected', String(selected));
    });
  }

  function routeChip(phase) {
    const target = [phase.target, phase.part].filter(Boolean).join(' · ') || phaseName(phase);
    return '<button type="button" data-phase="' + phase.id + '" class="routed-phase ' +
      String(method(phase)).toLowerCase() + '" aria-pressed="' + (Number(phase.id) === Number(selectedPhase)) +
      '"><img src="' + esc(image(phase)) + '" alt=""><span><small>P' +
      String(phase.id).padStart(2, '0') + '</small>' + esc(target) + '</span></button>';
  }

  function renderSemantic(task) {
    const ps = phases(task);
    if (ps.length && !ps.some(phase => Number(phase.id) === Number(selectedPhase))) selectedPhase = Number(ps[0].id);
    const buttons = $('#semantic-phases');
    if (buttons) buttons.innerHTML = ps.map(phase => {
      const eventIndex = segmentationEvents.findIndex((event, index) => phaseForSequenceEvent(task, event, index) === Number(phase.id));
      const event = eventIndex >= 0 ? segmentationEvents[eventIndex] : null;
      const eventLabel = event ? event.label : (phase.kind === 'home' ? 'home' : 'phase evidence');
      const eventKind = event ? event.kind : phase.kind === 'home' ? 'home' : 'move';
      const kindLabel = eventKind === 'combined' ? 'BIMANUAL' : String(eventKind || 'move').toUpperCase();
      const timelineLabel = event ? 'T' + String(eventIndex + 1).padStart(2, '0') : 'HOME';
      return '<button type="button" class="phase-map-card phase-map-' + esc(eventKind) + '" data-phase="' + phase.id + '" data-event-index="' + eventIndex + '" aria-pressed="' +
      (Number(phase.id) === Number(selectedPhase)) + '"><span class="phase-map-head"><small>P' +
      String(phase.id).padStart(2, '0') + '</small><span class="phase-map-kind">' + kindLabel + '</span></span><strong class="phase-map-title">' +
      esc(phaseName(phase)) + '</strong><span class="phase-map-action"><b>' + timelineLabel + '</b><span>' + esc(eventLabel) +
      '</span></span></button>';}).join('');
    const preview = $('#semantic-preview');
    if (preview) preview.innerHTML = ps.map(phase =>
      '<article class="semantic-video-card" data-preview-panel="' + phase.id + '" ' +
      (Number(phase.id) !== Number(selectedPhase) ? 'hidden' : '') +
      '><div class="phase-analysis-heading"><div><small>PHASE SUMMARY</small><h4>' + esc(phaseName(phase)) + '</h4></div><span>' + esc(method(phase)) + '</span></div><div class="phase-preview-prompt"><small>DETAILED ANALYSIS</small><p>' +
      esc(phase.prompt || phaseName(phase)) + '</p></div><div class="phase-evidence-heading"><small>MAIN CAMERA · TEMPORAL EVIDENCE</small><span>Start → Process → End</span></div><div class="phase-three-views phase-temporal-views">' +
      temporalMainFrames(phase).map(frame => '<figure><img class="phase-preview-video" src="' +
        esc(frame.src) + '" alt="' + esc(phaseName(phase) + ' · ' + frame.label) +
        '" loading="lazy"><figcaption>' + esc(frame.label) + '</figcaption></figure>').join('') +
      '</div><dl class="phase-analysis-facts"><div><dt>Target</dt><dd>' + esc([phase.target, phase.part].filter(Boolean).join(' · ') || 'Recorded task state') + '</dd></div><div><dt>Goal</dt><dd>' + esc(phase.goal || 'Completion evidence recorded in the phase contract') + '</dd></div><div><dt>Handoff</dt><dd>' + esc(Array.isArray(phase.handoff) ? phase.handoff.join(' · ') : phase.handoff || 'Next phase state') + '</dd></div></dl></article>').join('');
    document.querySelectorAll('#coarse-clips [data-coarse]').forEach(button => {
      const index = Number(button.dataset.coarse);
      button.classList.toggle('selected', index === selectedEventIndex);
      button.setAttribute('aria-pressed', String(index === selectedEventIndex));
    });
    updateSequenceSwitcher();
    document.querySelectorAll('#semantic-phases [data-phase]').forEach(button => button.addEventListener('click', () => {
      selectedPhase = Number(button.dataset.phase);
      selectedEventIndex = eventIndexForPhase(task, selectedPhase);
      currentStage = 'analysis';
      renderSemantic(task);
      renderSkills(task);
      renderStageDetail(task);
      focusStage(currentStage);
    }));
    updateGraphSelection();
  }

  function renderSkills(task) {
    window.WalleLocalization.render(task, phaseAt(task));
  }

  function updateLabels(task) {
    const header = $('#learning-card') && $('#learning-card').querySelector('.method-header p');
    if (header) header.textContent = 'Inspect the evidence produced at each learning stage · ' + task.name;
    const title = $('#demo-module .module-title');
    if (title) title.textContent = 'Robot demonstrations';
    const parsing = $('#parsing-module h3');
    if (parsing) parsing.textContent = 'Action sequence + phase analysis';
    const skills = $('#skills-module h3');
    if (skills) skills.textContent = 'Learning Localization and Binding Skills';
    const skillsKicker = $('#skills-module .module-kicker');
    if (skillsKicker) skillsKicker.textContent = '04 / CONTROL';
    const coarseKicker = $('#parsing-module .module-kicker');
    if (coarseKicker) coarseKicker.textContent = '02 / UNDERSTAND';
    const reasoning = $('#reasoning-module');
    if (reasoning) {
      reasoning.hidden = true;
      reasoning.previousElementSibling?.setAttribute('hidden', '');
      reasoning.nextElementSibling?.setAttribute('hidden', '');
    }
  }

  function connect() {
    window.WalleBridges && window.WalleBridges.connect && window.WalleBridges.connect();
  }

  function render(task) {
    task = task || store.current;
    if (!task) return;
    selectedPathIndex = 0;
    selectedEventIndex = 0;
    selectedPhase = Math.min(selectedPhase, Math.max(0, phases(task).length - 1));
    currentStage = 'demonstrations';
    updateLabels(task);
    stageRail(task);
    renderDemonstrations(task);
    renderSegmentation(task);
    renderSemantic(task);
    renderSkills(task);
    connect();
    updatePlaybackControls();
  }

  function animate(time) {
    if (!playing) return;
    document.body.classList.remove('learning-paused');
    document.querySelectorAll('.canvas-flow-energy').forEach(path =>
      path.style.strokeDashoffset = String(-time / 20));
    animationFrame = requestAnimationFrame(animate);
  }

  const play = $('#play');
  const motion = $('#motion');
  function updatePlaybackControls() {
    if (play) {
      play.textContent = playing ? '❚❚ Pause learning' : '▶ Play learning';
      play.setAttribute('aria-label', playing ? 'Pause learning' : 'Play learning');
      play.setAttribute('aria-pressed', String(playing));
    }
    const enabled = !document.body.classList.contains('motion-off');
    if (motion) {
      motion.setAttribute('aria-pressed', String(enabled));
      motion.textContent = enabled ? 'Motion on' : 'Motion off';
    }
    const status = $('#play-status');
    if (status) status.textContent = playing ? 'From demonstrations to Situation' : 'Paused · inspect any stage';
  }

  function setPlaying(value) {
    playing = Boolean(value);
    document.body.classList.toggle('learning-paused', !playing);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (playing) animationFrame = requestAnimationFrame(animate);
    updatePlaybackControls();
    syncDemoPlayback();
  }

  function replay() {
    selectedPhase = 0;
    document.body.classList.remove('motion-off');
    render(store.current);
    setPlaying(true);
  }

  if (play) play.onclick = () => setPlaying(!playing);
  if (motion) motion.onclick = () => {
    document.body.classList.toggle('motion-off');
    updatePlaybackControls();
    syncDemoPlayback();
  };
  $('#replay')?.addEventListener('click', replay);

  store.on(task => { selectedPhase = 0; render(task); });
  render(store.current);
  animationFrame = requestAnimationFrame(animate);
  window.addEventListener('resize', connect);
  document.addEventListener('visibilitychange', () => syncDemoPlayback());
  window.addEventListener('scroll', () => syncDemoPlayback(), {passive: true});
  window.WalleCanvas = { render, connect, replay, animate: () => {}, setPlaying };
})();

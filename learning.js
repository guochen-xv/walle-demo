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
    ['segmentation', '02', 'Action sequence segmentation', 'Gripper boundaries become candidate clips'],
    ['analysis', '03', 'Overview + detailed analysis', 'Short summaries and phase evidence'],
    ['graph', '04', 'Situation graph construction', 'Align phases, paths and observed states'],
    ['localization', '05', 'Localization learning', 'Prepare executable phase materials']
  ];
  let selectedPhase = 0;
  let playing = true;
  let currentStage = 'demonstrations';
  let animationFrame;
  let segmentationCuts = [];
  let segmentationStarted = 0;

  const phases = task => task.situation && task.situation.phases || task.phases || [];
  const phaseName = phase => phase.kind === 'home'
    ? 'Return home'
    : (phase.target ? (phase.operation || 'Operation') + ' · ' + phase.target : phase.operation || 'Prepared phase');
  const method = phase => phase.kind === 'home' ? 'Home' : phase.capability && phase.capability.primary || 'Control';
  const image = phase => phase.media && (phase.media.reference || phase.media.main || phase.media.poster) || '';
  const phaseAt = task => phases(task).find(phase => Number(phase.id) === Number(selectedPhase)) || phases(task)[0];
  const stageTargets = { demonstrations: '#demo-module', segmentation: '#coarse-module', analysis: '#refinement-module', graph: '#learning-graph-preview', localization: '#skills-module' };

  function stageRail(task) {
    document.querySelectorAll('#learning-stage-rail,#learning-graph-preview').forEach(node => node.remove());
    const rail = document.createElement('section');
    rail.id = 'learning-stage-rail';
    rail.className = 'learning-stage-rail';
    rail.setAttribute('aria-label', 'Situated Learning workflow');
    const items = pipeline.map(item =>
      '<li class="' + (item[0] === currentStage ? 'active' : '') + '" data-learning-stage="' + item[0] + '">' +
      '<button type="button" aria-pressed="' + (item[0] === currentStage) + '">' +
      '<span>' + item[1] + '</span><strong>' + item[2] + '</strong><small>' + item[3] + '</small></button></li>').join('');
    rail.innerHTML = '<ol>' + items + '</ol>' +
      '<div class="learning-stage-detail" id="learning-stage-detail"></div>';
    const board = $('#offline-view');
    const demoModule = $('#demo-module');
    if (board) {
      if (demoModule) demoModule.insertAdjacentElement('afterend', rail);
      else board.prepend(rail);
    }
    rail.querySelectorAll('[data-learning-stage]').forEach(item => item.addEventListener('click', () => {
      currentStage = item.dataset.learningStage;
      renderStageDetail(task);
      focusStage(currentStage);
      rail.querySelectorAll('[data-learning-stage]').forEach(other => {
        const active = other.dataset.learningStage === currentStage;
        other.classList.toggle('active', active);
        other.querySelector('button').setAttribute('aria-pressed', String(active));
      });
    }));
    renderStageDetail(task);
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
      segmentation: 'Gripper-event boundaries are retained as candidate clips before semantic merging (' + Math.max(ps.length + 2, 4) + ' clips shown).',
      analysis: 'Short summaries and detailed evidence keep the demonstrated order grounded in ' + (objectNames.slice(0, 4).join(', ') || 'the demonstrated objects') + '.',
      graph: 'The phase graph preserves ' + pathCount + ' demonstrated path' + (pathCount === 1 ? '' : 's') + ' and ' + (task.graph && task.graph.nodes ? task.graph.nodes.filter(n => n.kind === 'state').length : 0) + ' observed state boundaries.',
      localization: 'Localization is selected per phase; ' + ps.filter(p => p.kind !== 'home').length + ' operation phases carry localization or control material decisions.',
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
    const nodes = graph.nodes || [];
    const statesByPhase = new Map();
    nodes.filter(node => node.kind === 'state').forEach(node => statesByPhase.set(Number(node.phase), (statesByPhase.get(Number(node.phase)) || 0) + 1));
    const graphPanel = document.createElement('section');
    graphPanel.id = 'learning-graph-preview';
    graphPanel.className = 'learning-graph-preview';
    graphPanel.setAttribute('aria-label', 'Situation graph construction preview');
    const phaseCards = phases(task).map((phase, index) => '<button type="button" class="graph-preview-node" data-graph-phase="' + phase.id + '"><small>P' + String(phase.id ?? index).padStart(2, '0') + '</small><strong>' + esc(phaseName(phase)) + '</strong><span>' + (statesByPhase.get(Number(phase.id)) || 0) + ' observed state' + ((statesByPhase.get(Number(phase.id)) || 0) === 1 ? '' : 's') + '</span></button>').join('<i aria-hidden="true">→</i>');
    graphPanel.innerHTML = '<div class="learning-graph-heading"><div><span class="module-kicker">04 / SITUATION GRAPH</span><h3>Construct the phase graph</h3><p>Align compatible operations, retain observed states, and keep alternative paths available.</p></div><div class="learning-graph-stats"><span><strong>' + (graph.paths || []).length + '</strong> paths</span><span><strong>' + nodes.filter(node => node.kind === 'state').length + '</strong> states</span></div></div><div class="graph-preview-track">' + (phaseCards || '<span class="graph-empty">No phase graph available</span>') + '</div>';
    const skillsModule = $('#skills-module');
    if (skillsModule && skillsModule.parentElement === board) board.insertBefore(graphPanel, skillsModule);
    else board.appendChild(graphPanel);
    graphPanel.querySelectorAll('[data-graph-phase]').forEach(button => button.addEventListener('click', () => {
      selectedPhase = Number(button.dataset.graphPhase);
      currentStage = 'analysis';
      renderSemantic(task);
      renderSkills(task);
      renderStageDetail(task);
      focusStage(currentStage);
    }));
  }

  function renderDemonstrations(task) {
    const host = $('#mini-episodes');
    if (!host) return;
    const demos = task.demos || [];
    const selected = Math.max(0, store.list.findIndex(item => item.id === task.id));
    const mediaMarkup = (src, alt, active, poster) => {
      if (!src) return '<div class="demo-inline-video demo-media-empty" aria-hidden="true"></div>';
      const video = /\.(mp4|webm|mov)(\?|$)/i.test(src);
      if (video && !active) return '<img class="demo-inline-video" src="' + esc(poster || '') + '" alt="' + esc(alt) + '" loading="lazy">';
      return video
        ? '<video class="demo-inline-video" src="' + esc(src) + '" ' +
          (active ? 'data-demo-playing="true" autoplay loop ' : '') +
          'muted playsinline preload="' + (active ? 'auto' : 'none') + '" poster="' + esc(poster || '') + '" aria-label="' + esc(alt) + '"></video>'
        : '<img class="demo-inline-video" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy">';
    };
    const syncPlayback = () => {
      host.querySelectorAll('.mini-episode').forEach(card => {
        const rect = card.getBoundingClientRect();
        const shouldPlay = card.classList.contains('focus') && !document.hidden && rect.bottom > 0 && rect.top < innerHeight;
        card.querySelectorAll('video[data-demo-playing]').forEach(video => {
          video.muted = true;
          video.loop = true;
          video.playbackRate = 1;
          if (shouldPlay) video.play().catch(() => {});
          else video.pause();
        });
      });
    };
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
        const views = demo.views || {};
        const unzipVideos = item.id === 'unzip' ? {left: 'ep0-left-3x.mp4', main: 'ep0-main-3x.mp4', right: 'ep0-right-3x.mp4'} : {};
        card.dataset.position = position;
        card.classList.toggle('focus', active);
        card.setAttribute('aria-current', String(active));
        card.querySelector('.episode-views').innerHTML = [
          [unzipVideos.left || views.left || demo.poster || '', 'Left wrist demonstration'],
          [unzipVideos.main || demo.video || views.main || demo.poster || '', 'Main camera demonstration'],
          [unzipVideos.right || views.right || demo.poster || '', 'Right wrist demonstration']
        ].map(([src, alt]) => '<figure>' + mediaMarkup(src, alt, active, demo.poster) + '</figure>').join('');
        const meta = card.querySelector('.learning-demo-meta');
        if (meta) meta.textContent = (item.demos && item.demos.length || 0) + ' representative phase views · ' + phases(item).length + ' phases';
      });
      syncPlayback();
      return;
    }
    host.innerHTML = '<div class="learning-carousel-note">Select a demonstration to change the complete workflow.</div>' +
      store.list.map((item, index) => {
        const demo = (item.demos || [])[0] || {};
        const views = demo.views || {};
        const active = item.id === task.id;
        const relative = (index - selected + store.list.length) % store.list.length;
        const position = active ? 'center' : relative === 1 ? 'right' : 'left';
        const unzipVideos = item.id === 'unzip' ? {left: 'ep0-left-3x.mp4', main: 'ep0-main-3x.mp4', right: 'ep0-right-3x.mp4'} : {};
        const left = unzipVideos.left || views.left || demo.poster || '';
        const main = unzipVideos.main || demo.video || views.main || demo.poster || '';
        const right = unzipVideos.right || views.right || demo.poster || '';
        return '<article class="mini-episode ' + (position === 'center' ? 'focus' : '') +
          '" data-task-id="' + esc(item.id) + '" data-position="' + position +
          '" tabindex="0" role="button" aria-current="' + (position === 'center') + '">' +
          '<p class="demo-task">Task: <strong>' + esc(item.name.replace(/\.$/, '')) +
          '</strong></p><div class="episode-views"><figure>' + mediaMarkup(left, 'Left wrist demonstration', active, demo.poster) +
          '</figure><figure>' + mediaMarkup(main, 'Main camera demonstration', active, demo.poster) +
          '</figure><figure>' + mediaMarkup(right, 'Right wrist demonstration', active, demo.poster) + '</figure></div>' +
          '<small class="learning-demo-meta">' + (item.demos && item.demos.length || 0) +
          ' representative phase views · ' + phases(item).length + ' phases</small></article>';
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
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('scroll', syncPlayback, {passive: true});
  }

  function buildCuts(task) {
    const count = phases(task).length;
    return Array.from({ length: Math.max(4, count + 1) }, (_, index) =>
      Math.round((index * 2658) / Math.max(1, count)));
  }

  function renderSegmentation(task) {
    const cuts = buildCuts(task);
    segmentationCuts = cuts;
    segmentationStarted = 0;
    const count = $('#coarse-count');
    if (count) count.textContent = (cuts.length - 1) + ' candidate clips · gripper boundaries';
    const tracks = $('#coarse-tracks');
    if (tracks) tracks.innerHTML = ['left', 'right'].map(side =>
      '<div><span>' + (side === 'left' ? 'L' : 'R') +
      '</span><svg viewBox="0 0 2659 28" preserveAspectRatio="none" aria-label="' + side +
      ' gripper signal"><path d="M0 22 L' + cuts.map((cut, i) => cut + ' ' + (i % 2 ? 7 : 22)).join(' L') +
      ' L2659 10"/>' + cuts.slice(1, -1).map(cut =>
        '<line x1="' + cut + '" x2="' + cut + '" y1="0" y2="28"/>').join('') +
      '</svg></div>').join('');
    const clips = $('#coarse-clips');
    if (clips) clips.innerHTML = cuts.slice(0, -1).map((cut, index) =>
      '<button type="button" data-coarse="' + index + '" style="flex:' +
      Math.max(1, cuts[index + 1] - cut) + '" title="Candidate clip ' + (index + 1) + '"><span>' +
      (index + 1) + '</span></button>').join('');
    const axis = document.querySelector('.coarse-frame-axis');
    if (axis) axis.innerHTML = '<span>Frame 0</span><span>Frame 2658</span>';
    const panel = document.querySelector('.coarse-signal-panel');
    if (panel && !panel.querySelector('.segmentation-cursor')) panel.insertAdjacentHTML('beforeend', '<div class="segmentation-cursor" aria-hidden="true"><span></span></div>');
    updateSegmentationAnimation(0);
  }

  function updateSegmentationAnimation(time) {
    const cursor = document.querySelector('.segmentation-cursor');
    const clips = document.querySelectorAll('#coarse-clips [data-coarse]');
    if (!cursor || !segmentationCuts.length) return;
    if (!segmentationStarted) segmentationStarted = time || performance.now();
    const elapsed = Math.max(0, (time || performance.now()) - segmentationStarted);
    const progress = (elapsed % 5400) / 5400;
    const frame = Math.round(2658 * progress);
    const index = Math.min(segmentationCuts.length - 2, Math.max(0, segmentationCuts.findIndex((cut, i) => frame >= cut && frame < segmentationCuts[i + 1])));
    cursor.style.left = (progress * 100) + '%';
    cursor.querySelector('span').textContent = 'Frame ' + frame;
    clips.forEach((clip, clipIndex) => clip.classList.toggle('active', clipIndex === index));
    document.querySelector('#coarse-module')?.style.setProperty('--segmentation-progress', progress);
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
    const buttons = $('#semantic-phases');
    if (buttons) buttons.innerHTML = ps.map(phase =>
      '<button type="button" data-phase="' + phase.id + '" aria-pressed="' +
      (Number(phase.id) === Number(selectedPhase)) + '"><span class="phase-option-heading"><small>P' +
      String(phase.id).padStart(2, '0') + '</small><strong>' + esc(phaseName(phase)) +
      '</strong><em>' + esc(method(phase)) + '</em></span></button>').join('');
    const preview = $('#semantic-preview');
    if (preview) preview.innerHTML = ps.map(phase =>
      '<article class="semantic-video-card" data-preview-panel="' + phase.id + '" ' +
      (Number(phase.id) !== Number(selectedPhase) ? 'hidden' : '') +
      '><div class="phase-analysis-heading"><div><small>PHASE SUMMARY</small><h4>' + esc(phaseName(phase)) + '</h4></div><span>' + esc(method(phase)) + '</span></div><div class="phase-preview-prompt"><small>DETAILED ANALYSIS</small><p>' +
      esc(phase.prompt || phaseName(phase)) + '</p></div><div class="phase-three-views">' +
      ['left', 'main', 'right'].map(view => '<figure><img class="phase-preview-video" src="' +
        esc(phase.media && (phase.media[view] || image(phase))) + '" alt="' +
        esc(phaseName(phase) + ' · ' + view) + '" loading="lazy"></figure>').join('') +
      '</div><dl class="phase-analysis-facts"><div><dt>Target</dt><dd>' + esc([phase.target, phase.part].filter(Boolean).join(' · ') || 'Recorded task state') + '</dd></div><div><dt>Goal</dt><dd>' + esc(phase.goal || 'Completion evidence recorded in the phase contract') + '</dd></div><div><dt>Handoff</dt><dd>' + esc(Array.isArray(phase.handoff) ? phase.handoff.join(' · ') : phase.handoff || 'Next phase state') + '</dd></div></dl></article>').join('');
    document.querySelectorAll('#semantic-phases [data-phase]').forEach(button => button.addEventListener('click', () => {
      selectedPhase = Number(button.dataset.phase);
      currentStage = 'analysis';
      renderSemantic(task);
      renderSkills(task);
      renderStageDetail(task);
      focusStage(currentStage);
    }));
  }

  function renderSkills(task) {
    const ps = phases(task);
    const vla = ps.filter(phase => !['home', 'demonstration_grasp', 'control', 'grasp_tool'].includes(method(phase).toLowerCase()));
    const control = ps.filter(phase => ['control', 'grasp_tool', 'demonstration_grasp'].includes(method(phase).toLowerCase()));
    const vlaInput = $('#vla-inputs');
    if (vlaInput) vlaInput.innerHTML = (vla.length ? vla : ps.filter(phase => phase.kind !== 'home').slice(0, 3)).slice(0, 6).map(routeChip).join('');
    const controlInput = $('#control-inputs');
    if (controlInput) controlInput.innerHTML = (control.length ? control : ps.filter(phase => phase.kind !== 'home').slice(0, 1)).slice(0, 3).map(routeChip).join('');
    const selected = phaseAt(task) || ps[0];
    const video = $('#control-video');
    if (video && selected && selected.media && selected.media.video) {
      video.src = selected.media.video;
      video.poster = image(selected);
      video.load();
    }
    const records = $('#control-records');
    if (records) records.innerHTML = ['Approach target', 'Align with demonstrated point', 'Execute grasp or placement'].map((label, index) =>
      '<li class="recorded"><span class="control-step-icon"><b>' + (index + 1) +
      '</b>●</span><span><strong>' + label + '</strong><small>' +
      esc(selected && (selected.target || 'phase target')) + ' · ' +
      esc(method(selected || {})) + '</small></span></li>').join('');
    const routing = $('#compact-routing');
    if (routing) routing.innerHTML = '<span>' + (vla.length || 0) +
      ' phases → VLA / adaptive policy</span><span>' + (control.length || 0) +
      ' phases → geometric control</span>';
    document.querySelectorAll('#vla-inputs [data-phase], #control-inputs [data-phase]').forEach(button =>
      button.addEventListener('click', () => {
        selectedPhase = Number(button.dataset.phase);
        currentStage = 'localization';
        renderSkills(task);
        renderSemantic(task);
        renderStageDetail(task);
        focusStage(currentStage);
      }));
  }

  function updateLabels(task) {
    const header = $('#learning-card') && $('#learning-card').querySelector('.method-header p');
    if (header) header.textContent = 'Inspect the evidence produced at each learning stage · ' + task.name;
    const title = $('#demo-module .module-title');
    if (title) title.textContent = 'Robot demonstrations';
    const parsing = $('#parsing-module h3');
    if (parsing) parsing.textContent = 'Overview + detailed analysis';
    const skills = $('#skills-module h3');
    if (skills) skills.textContent = 'Localization learning';
    const skillsKicker = $('#skills-module .module-kicker');
    if (skillsKicker) skillsKicker.textContent = '05 / LOCALIZE';
    const coarseKicker = $('#parsing-module .module-kicker');
    if (coarseKicker) coarseKicker.textContent = '02 / SEGMENT · 03 / ANALYZE';
    const coarseTitle = $('#coarse-module .module-title');
    if (coarseTitle) coarseTitle.textContent = 'Action sequence segmentation';
    const refinementTitle = $('#refinement-module .refinement-title strong');
    if (refinementTitle) refinementTitle.textContent = 'Overview + detailed phase analysis';
    const reasoning = $('#reasoning-module');
    if (reasoning) {
      reasoning.hidden = true;
      reasoning.previousElementSibling?.setAttribute('hidden', '');
      reasoning.nextElementSibling?.setAttribute('hidden', '');
    }
  }

  function connect() {
    const board = $('#offline-view');
    const svg = $('#learning-connections');
    if (board && svg) {
      const root = board.getBoundingClientRect();
      const point = (selector, side) => {
        const node = $(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return side === 'bottom'
          ? [rect.left + rect.width / 2 - root.left, rect.bottom - root.top]
          : [rect.left - root.left, rect.top + rect.height / 2 - root.top];
      };
      const start = point('#demo-module', 'bottom');
      const parse = point('#parsing-module', 'left');
      const skills = point('#skills-module', 'left');
      if (start && parse && skills) {
        const width = Math.max(1, root.width), height = Math.max(1, root.height);
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        const mid = Math.max(start[1] + 18, parse[1] - 18);
        svg.innerHTML = '<defs><marker id="learning-flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#8066a5"/></marker></defs>' +
          '<path class="canvas-flow-path" d="M' + start[0] + ' ' + (start[1] + 2) + ' V' + mid + ' H' + parse[0] + ' V' + (parse[1] - 4) + '" stroke="#8066a5" marker-end="url(#learning-flow-arrow)"/>' +
          '<path class="canvas-flow-energy" d="M' + start[0] + ' ' + (start[1] + 2) + ' V' + mid + ' H' + parse[0] + ' V' + (parse[1] - 4) + '" stroke="#8066a5"/>' +
          '<path class="canvas-flow-path" d="M' + (parse[0] + 2) + ' ' + parse[1] + ' H' + (skills[0] - 6) + '" stroke="#39877d" marker-end="url(#learning-flow-arrow)"/>' +
          '<path class="canvas-flow-energy" d="M' + (parse[0] + 2) + ' ' + parse[1] + ' H' + (skills[0] - 6) + '" stroke="#39877d"/>';
      }
    }
    window.WalleBridges && window.WalleBridges.connect && window.WalleBridges.connect();
  }

  function render(task) {
    task = task || store.current;
    if (!task) return;
    selectedPhase = Math.min(selectedPhase, Math.max(0, phases(task).length - 1));
    currentStage = 'demonstrations';
    updateLabels(task);
    stageRail(task);
    renderDemonstrations(task);
    renderSegmentation(task);
    renderSemantic(task);
    renderSkills(task);
    connect();
  }

  function animate(time) {
    if (!playing) return;
    document.body.classList.remove('learning-paused');
    document.querySelectorAll('.canvas-flow-energy').forEach(path =>
      path.style.strokeDashoffset = String(-time / 20));
    updateSegmentationAnimation(time);
    animationFrame = requestAnimationFrame(animate);
  }

  const play = $('#play');
  const motion = $('#motion');
  if (play) play.onclick = () => {
    playing = !playing;
    play.textContent = playing ? '❚❚ Pause learning' : '▶ Play learning';
    document.body.classList.toggle('learning-paused', !playing);
    if (playing) animationFrame = requestAnimationFrame(animate);
  };
  if (motion) motion.onclick = () => {
    const enabled = motion.getAttribute('aria-pressed') !== 'true';
    motion.setAttribute('aria-pressed', String(enabled));
    motion.textContent = enabled ? 'Motion on' : 'Motion off';
    document.body.classList.toggle('motion-off', !enabled);
  };
  $('#replay') && $('#replay').addEventListener('click', () => {
    playing = true;
    document.body.classList.remove('learning-paused');
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(animate);
  });

  store.on(task => { selectedPhase = 0; render(task); });
  render(store.current);
  animationFrame = requestAnimationFrame(animate);
  window.addEventListener('resize', connect);
  window.WalleCanvas = { render, connect, animate: () => {}, setPlaying(value) { playing = Boolean(value); } };
})();

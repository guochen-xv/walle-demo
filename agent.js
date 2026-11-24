/* Situated Agent preview with Situation path-aware execution videos. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const store = window.WalleTaskStore;
  const agentData = window.WALLE_AGENT_DATA || {};
  if (!store) return;

  const loop = [
    ['observe', 'Observe conditions', 'Read the current state and entry conditions.'],
    ['select', 'Select demonstrated path', 'Choose the phase contract supported by the observation.'],
    ['execute', 'Execute assigned skill', 'Run the skill attached to the selected phase.'],
    ['verify', 'Verify outcome', 'Check the expected result and handoff evidence.'],
    ['advance', 'Advance / recover', 'Continue, retry, or restore the required state.']
  ];
  let activePathId = null;
  let activePhaseId = null;

  const phaseLabel = phase => phase.kind === 'home' || phase.operation === 'home'
    ? 'Return home'
    : phase.target || phase.operation || 'Prepared phase';
  const handoffText = phase => Array.isArray(phase.handoff)
    ? phase.handoff.join(', ')
    : phase.handoff || 'Pass the completed phase state to the next phase.';
  const pathsFor = task => agentData.situatedPaths?.[task.id] || [];
  const selectedPathFor = paths => paths.find(path => path.id === activePathId) || paths[0] || null;
  const phasesForPath = (task, path) => {
    const phases = task.phases || [];
    if (!path?.ranges) return phases;
    const byId = new Map(phases.map(phase => [phase.id, phase]));
    const order = path.order || Object.keys(path.ranges).map(Number);
    return order.map(id => byId.get(id)).filter(Boolean);
  };
  const firstAvailablePhase = (task, path) => phasesForPath(task, path)[0] || {};

  function render(task = store.current) {
    const root = document.querySelector('#agent-app');
    if (!root || !task) return;
    const phases = task.phases || [];
    const paths = pathsFor(task);
    const selectedPath = selectedPathFor(paths);
    const orderedPhases = phasesForPath(task, selectedPath);
    if (selectedPath && !selectedPath.ranges[activePhaseId]) activePhaseId = firstAvailablePhase(task, selectedPath).id;
    const selected = phases.find(phase => phase.id === activePhaseId) || firstAvailablePhase(task, selectedPath);

    root.innerHTML = `<div class="agent-preview-shell">
      <div class="agent-preview-top">
        <div class="agent-task-summary"><span class="eyebrow">SELECTED SITUATION</span><h3>${esc(task.name)}</h3><p>${esc(task.goal)}</p><div class="agent-contract-pills"><span>${esc(task.summary.phaseCount)} phase contracts</span><span>${esc(task.summary.pathCount)} execution paths</span><span>${paths.length ? 'path videos connected' : 'local materials ready'}</span></div></div>
        <div class="agent-loop-panel"><div class="agent-loop-heading"><span class="eyebrow">RUNTIME LOOP</span><small>phase-aware execution</small></div><div class="agent-loop" role="list" aria-label="Situated Agent runtime loop">${loop.map(([id, title, detail], index) => `<div class="agent-loop-step${index === 0 ? ' active' : ''}" data-loop-step="${id}" role="listitem"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`).join('')}</div></div>
      </div>
      ${paths.length ? `<div class="agent-path-panel"><div class="agent-path-heading"><span class="eyebrow">DEMONSTRATED PATHS</span><small>Situation alternatives</small></div><div class="agent-path-tabs" role="tablist" aria-label="Choose a demonstrated path">${paths.map(path => `<button type="button" role="tab" data-agent-path="${esc(path.id)}" aria-selected="${path.id === selectedPath.id}"><strong>${esc(path.label)}</strong><span>${esc(path.detail)}</span></button>`).join('')}</div></div>` : ''}
      <div class="agent-preview-grid"><div class="agent-video-panel">${paths.length ? `<div class="agent-video-frame"><video id="agent-path-video" controls playsinline preload="metadata" aria-label="${esc(selectedPath.label)} execution video"></video></div><div class="agent-video-caption" id="agent-video-caption">${esc(selectedPath.label)} · ${esc(selectedPath.detail)} · frames ${selectedPath.ranges[selected.id][0]}–${selectedPath.ranges[selected.id][1]}</div>` : `<div class="agent-empty-video"><div class="agent-empty-icon">◇</div><strong>Situated Agent video preview</strong><p>Execution video will be connected here after deployment. The selected Situation contract is ready for inspection.</p></div>`}</div><div class="agent-contract-preview" aria-live="polite"><span class="eyebrow">CURRENT PHASE CONTRACT</span><h3 id="agent-phase-title">P${String(selected.id ?? 0).padStart(2, '0')} · ${esc(phaseLabel(selected))}</h3><p id="agent-phase-goal">${esc(selected.goal || selected.prompt || 'Observe the demonstrated entry condition.')}</p><dl><dt>Assigned skill</dt><dd id="agent-phase-skill">${esc(selected.capability?.primary || 'Prepared skill')}</dd><dt>Handoff</dt><dd id="agent-phase-handoff">${esc(handoffText(selected))}</dd></dl></div></div>
      <div class="agent-phase-strip" role="list" aria-label="Select a phase contract">${orderedPhases.map(phase => { const available = !selectedPath || Boolean(selectedPath.ranges[phase.id]); const pathHint = available ? (phase.arm || 'Recorded execution') : `Only on ${paths.find(path => path.ranges[phase.id])?.label || 'other path'}`; return `<button type="button" role="listitem" data-agent-phase="${phase.id}"${phase.id === selected.id ? ' aria-current="true"' : ''}${available ? '' : ' disabled'}><small>P${String(phase.id ?? 0).padStart(2, '0')}</small><strong>${esc(phaseLabel(phase))}</strong><span>${esc(pathHint)}</span></button>`; }).join('')}</div>
    </div>`;

    const video = root.querySelector('#agent-path-video');
    const title = root.querySelector('#agent-phase-title');
    const goal = root.querySelector('#agent-phase-goal');
    const skill = root.querySelector('#agent-phase-skill');
    const handoff = root.querySelector('#agent-phase-handoff');
    const videoCaption = root.querySelector('#agent-video-caption');
    const setVideoPhase = (path, phase, autoplay = false) => {
      const clip = path?.clips?.[phase.id];
      if (!video || !clip) return;
      video.src = clip;
      video.load();
      if (autoplay) video.addEventListener('loadedmetadata', () => video.play().catch(() => {}), { once: true });
    };

    const updatePhase = phase => {
      activePhaseId = phase.id;
      root.querySelectorAll('[data-agent-phase]').forEach(node => node.removeAttribute('aria-current'));
      root.querySelector(`[data-agent-phase="${phase.id}"]`)?.setAttribute('aria-current', 'true');
      title.textContent = `P${String(phase.id ?? 0).padStart(2, '0')} · ${phaseLabel(phase)}`;
      goal.textContent = phase.goal || phase.prompt || 'Observe the demonstrated entry condition.';
      skill.textContent = phase.capability?.primary || 'Prepared skill';
      handoff.textContent = handoffText(phase);
      if (videoCaption && selectedPath?.ranges?.[phase.id]) {
        const [startFrame, endFrame] = selectedPath.ranges[phase.id];
        videoCaption.textContent = `${selectedPath.label} · ${selectedPath.detail} · frames ${startFrame}–${endFrame}`;
      }
      setVideoPhase(selectedPath, phase, true);
    };

    root.querySelectorAll('[data-agent-path]').forEach(button => button.addEventListener('click', () => {
      activePathId = button.dataset.agentPath;
      const nextPath = selectedPathFor(paths);
      activePhaseId = firstAvailablePhase(task, nextPath).id;
      render(task);
    }));
    root.querySelectorAll('[data-agent-phase]').forEach(button => button.addEventListener('click', () => {
      const phase = phases.find(candidate => candidate.id === Number(button.dataset.agentPhase));
      if (!button.disabled) updatePhase(phase);
    }));
    if (video && selectedPath) setVideoPhase(selectedPath, selected, false);
  }

  store.on(render);
  render();
})();

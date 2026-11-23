/* Situated Agent preview for the selected task. Runtime video is intentionally empty in this demo. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const store = window.WalleTaskStore;
  if (!store) return;
  const loop = [
    ['observe', 'Observe conditions', 'Read the current state and entry conditions.'],
    ['select', 'Select demonstrated path', 'Choose the phase contract supported by the observation.'],
    ['execute', 'Execute assigned skill', 'Run the skill attached to the selected phase.'],
    ['verify', 'Verify outcome', 'Check the expected result and handoff evidence.'],
    ['advance', 'Advance / recover', 'Continue, retry, or restore the required state.']
  ];
  const phaseLabel = phase => phase.kind === 'home' || phase.operation === 'home' ? 'Return home' : phase.target || phase.operation || 'Prepared phase';
  function render(task = store.current) {
    const root = document.querySelector('#agent-app');
    if (!root || !task) return;
    const phases = task.phases || [];
    const selected = phases[0] || {};
    const handoffText = phase => Array.isArray(phase.handoff) ? phase.handoff.join(', ') : phase.handoff || 'Pass the completed phase state to the next phase.';
    root.innerHTML = `<div class="agent-preview-shell">
      <div class="agent-preview-top">
        <div class="agent-task-summary"><span class="eyebrow">SELECTED SITUATION</span><h3>${esc(task.name)}</h3><p>${esc(task.goal)}</p><div class="agent-contract-pills"><span>${esc(task.summary.phaseCount)} phase contracts</span><span>${esc(task.summary.pathCount)} execution paths</span><span>local materials ready</span></div></div>
        <div class="agent-loop-panel"><div class="agent-loop-heading"><span class="eyebrow">RUNTIME LOOP</span><small>phase-aware execution</small></div><div class="agent-loop" role="list" aria-label="Situated Agent runtime loop">${loop.map(([id, title, detail], index) => `<div class="agent-loop-step${index === 0 ? ' active' : ''}" data-loop-step="${id}" role="listitem"><span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(title)}</strong><small>${esc(detail)}</small></div>`).join('')}</div></div>
      </div>
      <div class="agent-preview-grid"><div class="agent-empty-video"><div class="agent-empty-icon">◇</div><strong>Situated Agent video preview</strong><p>Execution video will be connected here after deployment. The selected Situation contract is ready for inspection.</p></div><div class="agent-contract-preview" aria-live="polite"><span class="eyebrow">CURRENT PHASE CONTRACT</span><h3 id="agent-phase-title">P${String(selected.id ?? 0).padStart(2, '0')} · ${esc(phaseLabel(selected))}</h3><p id="agent-phase-goal">${esc(selected.goal || selected.prompt || 'Observe the demonstrated entry condition.')}</p><dl><dt>Assigned skill</dt><dd id="agent-phase-skill">${esc(selected.capability?.primary || 'Prepared skill')}</dd><dt>Handoff</dt><dd id="agent-phase-handoff">${esc(handoffText(selected))}</dd></dl></div></div>
      <div class="agent-phase-strip" role="list" aria-label="Select a phase contract">${phases.map((phase, index) => `<button type="button" role="listitem" data-agent-phase="${index}"${index === 0 ? ' aria-current="true"' : ''}><small>P${String(phase.id ?? index).padStart(2, '0')}</small><strong>${esc(phaseLabel(phase))}</strong><span>${esc(phase.arm || 'Recorded execution')}</span></button>`).join('')}</div>
    </div>`;
    const title = root.querySelector('#agent-phase-title');
    const goal = root.querySelector('#agent-phase-goal');
    const skill = root.querySelector('#agent-phase-skill');
    const handoff = root.querySelector('#agent-phase-handoff');
    root.querySelectorAll('[data-agent-phase]').forEach(button => button.addEventListener('click', () => {
      const phase = phases[Number(button.dataset.agentPhase)] || selected;
      root.querySelectorAll('[data-agent-phase]').forEach(node => node.removeAttribute('aria-current'));
      button.setAttribute('aria-current', 'true');
      title.textContent = `P${String(phase.id ?? 0).padStart(2, '0')} · ${phaseLabel(phase)}`;
      goal.textContent = phase.goal || phase.prompt || 'Observe the demonstrated entry condition.';
      skill.textContent = phase.capability?.primary || 'Prepared skill';
      handoff.textContent = handoffText(phase);
    }));
  }
  store.on(render);
  render();
})();

/* Published action contracts, recorded states and the evidence for branch choices. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const code = phase => 'P' + String(phase.id).padStart(2, '0');
  const title = phase => phase.kind === 'home' ? 'Return home' : [phase.operation, phase.target].filter(Boolean).join(' · ');
  const question = value => String(value || '').replace(/\s*Just answer yes or no\.?$/i, '').trim();
  const dataFor = task => {
    const data = window.WALLE_SITUATION_DETAILS?.[task.id];
    return data?.revision === task.revision ? data : {phases: {}, states: {}, decisions: []};
  };
  function contractFor(task, phase) {
    const saved = dataFor(task).phases[phase.id] || {};
    const establishes = saved.establishes || [];
    return {...saved, goal: saved.goal || phase.goal || '', establishes,
      outcome: establishes.map(c => c.description || question(c.question)).filter(Boolean).join(' · ')};
  }
  const skillName = (task, phase) => window.WalleLocalization.skillName(task, phase);
  const skill = (task, phase) => '<span class="situation-skill-label">' + esc(skillName(task, phase)) + '</span>';

  function figure(src, label) {
    return src ? '<figure class="situation-evidence-image"><img src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy"><figcaption>' + esc(label) + '</figcaption></figure>' : '';
  }

  function section(label, text) {
    return text ? '<section class="situation-contract-section"><h4>' + esc(label) + '</h4><p>' + esc(text) + '</p></section>' : '';
  }

  function conditions(label, values) {
    if (!values?.length) return '';
    return '<section class="situation-contract-section">' + (label ? '<h4>' + esc(label) + '</h4>' : '') + '<ul class="situation-condition-list">' + values.map(c => '<li><span>' + esc(c.description || question(c.question)) + '</span>' + (c.basis ? '<small>' + esc(c.basis === 'candidate' ? 'Expected' : c.basis === 'demonstrated' ? 'Recorded' : c.basis) + '</small>' : '') + '</li>').join('') + '</ul></section>';
  }

  function memberships(task, ids) {
    return task.graph.paths.filter(p => ids.includes(p.id)).map(p => '<span>Path ' + (task.graph.paths.indexOf(p) + 1) + '</span>').join('');
  }

  function decisionsFor(task, node, data) {
    if (node.kind !== 'state') return [];
    const incoming = new Set(task.graph.edges.filter(e => e.target === node.id).map(e => e.source));
    const outgoing = new Set(task.graph.edges.filter(e => e.source === node.id).map(e => e.target));
    return data.decisions.filter(d => {
      if (d.alternatives.length < 2) return false;
      if (node.choice) return node.choice === d.id;
      if (d.source_id) return incoming.has(d.source_id);
      return !incoming.size && d.alternatives.some(a => outgoing.has(a.target_id));
    });
  }

  function branchPanel(task, decisions) {
    const readable = text => task.phases.reduce((value, phase) => value.replaceAll(phase.sourceId, code(phase)), String(text || ''));
    return decisions.map(d => '<section class="situation-branch-decision">' + (d.reason ? '<p class="situation-decision-reason">' + esc(readable(d.reason)) + '</p>' : '') + '<div class="situation-alternatives">' + d.alternatives.map(a => {
      const p = task.phases.find(p => p.sourceId === a.target_id);
      return '<article class="situation-alternative"><header><span>' + esc(p ? code(p) : 'PATH') + '</span><strong>' + esc(p ? title(p) : 'Demonstrated alternative') + '</strong></header><p>' + esc(a.condition) + '</p>' + figure(a.image, a.episodes ? a.episodes + ' demonstrations · saved branch evidence' : 'Saved branch evidence') + (p ? '<button type="button" class="situation-follow-branch" data-situation-branch="' + esc(p.sourceId) + '" data-branch-path="' + esc(a.path_ids?.[0] || '') + '">Follow this branch <span aria-hidden="true">↗</span></button>' : '') + '</article>';
    }).join('') + '</div></section>').join('');
  }

  function bindingSummary(task, phase, contract) {
    return '<div class="situation-binding-summary"><div class="situation-binding-title"><span class="situation-detail-kicker">BOUND SKILL</span><strong>' + esc(skillName(task, phase)) + '</strong></div>' +
      '<dl class="situation-target-facts">' + [['Target', phase.target], ['Contact region', phase.part?.toLowerCase() !== phase.target?.toLowerCase() ? phase.part : '']].filter(([, value]) => value).map(([name, value]) => '<div><dt>' + name + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>' +
      '<div class="situation-binding-meta">' + (contract.episode_count ? '<small>' + contract.episode_count + ' source demonstrations</small>' : '') +
      (phase.capability?.execution_status === 'offline_only' ? '<small>Offline materials</small>' : '') + '</div></div>';
  }

  function actionContract(task, phase, node, contract, decisions) {
    const entry = decisions.flatMap(d => d.alternatives).filter(a => a.target_id === node.id).map(a => ({description: a.condition}));
    return '<div class="situation-action-contract"><aside class="situation-action-info">' + bindingSummary(task, phase, contract) + '</aside>' +
      '<div class="situation-action-reference">' + figure(phase.media.reference || phase.media.main || phase.media.poster, 'Demonstration reference') + '</div><div class="situation-contract-content">' +
      section('Action instruction', phase.prompt) + section('Local goal', contract.goal) +
      conditions('Entry conditions', [...(contract.requires || []), ...entry]) +
      section('Completion check', question(contract.question)) + conditions('Outcome', contract.establishes) +
      conditions('Handoff condition', contract.handoff) + '</div></div>';
  }

  function actionEvidence(phase, contract) {
    const media = phase.media || {};
    return '<div class="situation-detail-grid"><div class="situation-demonstration-player">' +
      (media.video ? '<video controls playsinline muted preload="metadata" poster="' + esc(media.poster || media.main || '') + '" src="' + esc(media.video) + '" aria-label="Demonstrated action"></video>' : figure(media.main || media.reference || media.poster, 'Main camera')) +
      '<p>Recorded phase demonstration' + (contract.episode_count ? ' · ' + contract.episode_count + ' source demonstrations' : '') + '</p></div><div class="situation-wrist-evidence">' +
      figure(media.left, 'Left wrist reference') + figure(media.right, 'Right wrist reference') + '</div></div>';
  }

  function stateContract(task, node, data, label) {
    const values = data.states[node.id] || [];
    const conditionMarkup = values.length ? '<section class="situation-contract-section"><h4>Recorded conditions</h4><ul class="situation-recorded-conditions">' + values.map(row => '<li><span>' + esc(question(row.condition.question) || row.condition.description) + (row.condition.question && row.condition.description ? '<small class="situation-condition-description">' + esc(row.condition.description) + '</small>' : '') + '</span><b data-condition-value="' + esc(String(row.value)) + '">' + esc(row.value === true ? 'Yes' : row.value === false ? 'No' : 'Unknown') + '</b></li>').join('') + '</ul></section>' : '';
    const descriptions = values.filter(row => row.value === true).map(row => row.condition.description);
    const text = descriptions.includes(node.label) || /^(Before|After) P\d/.test(label) ? '' : label;
    const incoming = new Set(task.graph.edges.filter(e => e.target === node.id).map(e => e.source));
    const outgoing = new Set(task.graph.edges.filter(e => e.source === node.id).map(e => e.target));
    const previous = task.phases.filter(p => incoming.has(p.sourceId));
    const next = task.phases.filter(p => outgoing.has(p.sourceId));
    const context = (label, phases, render) => phases.length ? '<section class="situation-contract-section situation-state-context"><h4>' + label + '</h4>' + phases.map(p => '<div class="situation-state-phase"><span class="situation-state-phase-code">' + code(p) + '</span><div>' + render(contractFor(task, p)) + '</div></div>').join('') + '</section>' : '';
    const outcomes = context('Incoming phase outcome', previous.filter(p => contractFor(task, p).establishes.length), c => conditions('', c.establishes));
    const goals = context('Next local goal', next, c => '<p>' + esc(c.goal) + '</p>' + (c.requires?.length ? conditions('Entry requirements', c.requires) : ''));
    const reference = data.state_references?.[node.id] || node.media?.reference;
    return '<div class="situation-detail-grid"><aside>' + (figure(reference, 'Demonstrated state') || '<div class="situation-no-evidence">No saved state image.</div>') + '</aside><div class="situation-contract-content">' +
      section('State description', text) + conditionMarkup + outcomes + goals + '</div></div>';
  }

  function markup(task, node, activeTab, label) {
    const data = dataFor(task), isState = node.kind === 'state';
    const phase = task.phases.find(p => p.id === node.phase);
    const contract = phase ? contractFor(task, phase) : {};
    const decisions = decisionsFor(task, node, data);
    const tabs = isState ? [['contract', 'State & transitions']] : [['contract', 'Action contract'], ['evidence', 'Demonstration evidence']];
    if (decisions.length) tabs.push(['branches', 'Branch evidence']);
    if (!tabs.some(([id]) => id === activeTab)) activeTab = 'contract';
    const name = isState ? label : title(phase);
    let body = activeTab === 'branches' ? branchPanel(task, decisions) : isState ? stateContract(task, node, data, label) : activeTab === 'evidence' ? actionEvidence(phase, contract) : actionContract(task, phase, node, contract, data.decisions);
    return '<div class="situation-detail-panel' + (isState ? ' is-state' : '') + '" data-selected-node="' + esc(node.id) + '"><header class="situation-detail-heading"><div><span class="situation-detail-kicker">' + (isState ? 'STATE' : 'PHASE ' + code(phase)) + '</span><h3>' + esc(name) + '</h3></div>' + (isState ? '<span class="situation-state-label">State</span>' : skill(task, phase)) + '</header>' +
      '<div class="situation-node-paths">' + memberships(task, node.paths || []) + '</div>' +
      (tabs.length > 1 ? '<nav class="situation-detail-tabs" role="tablist" aria-label="Selected node details">' + tabs.map(([id, name]) => '<button type="button" role="tab" id="situation-detail-tab-' + id + '" data-situation-detail-tab="' + id + '" aria-selected="' + (id === activeTab) + '" aria-controls="situation-detail-content">' + name + '</button>').join('') + '</nav>' : '') +
      '<section id="situation-detail-content"' + (tabs.length > 1 ? ' role="tabpanel" aria-labelledby="situation-detail-tab-' + activeTab + '"' : '') + '>' + body + '</section></div>';
  }
  window.WalleSituationDetails = {markup, contractFor};
})();

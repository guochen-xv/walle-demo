/* Read-only localization evidence from the selected Situation revision. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const names = {pure_sam: 'Direct SAM', full_point: 'Full-image point', full_text: 'Full-image text', text_box_reference: 'Text box + point', local_text_small: 'Small crop + text', local_text_large: 'Large crop + text', local_text_reseed: 'Crop + reseed'};
  const statusName = value => ({validated: 'Passed', passed: 'Passed', completed: 'Completed', accepted: 'Accepted', skipped: 'Skipped', not_needed: 'Not needed', not_passed: 'Not passed', inputs_ready: 'Materials ready', not_applicable: 'Not applicable'})[value] || 'Not recorded';
  const percent = value => typeof value === 'number' ? (100 * value).toFixed(1).replace(/\.0$/, '') + '%' : '—';
  const hand = value => ({left: 'Left hand', right: 'Right hand', both: 'Both hands'})[value] || value || 'Recorded execution';
  const method = phase => phase.kind === 'home' ? 'home' : phase.capability?.learning_skill || phase.capability?.primary;
  const sourceLabel = gate => ({rgb: 'Saved RGB review', geometry: 'Saved geometry review', baseline_test: 'Saved test review', baseline_final: 'Saved representative review'})[gate] || 'Saved review';
  const reference = phase => phase.media?.reference || phase.media?.main || phase.media?.poster;
  let phaseKey = '', selectedStep = '', selectedSample = 0;

  function routeFor(phase, data) {
    const skill = method(phase);
    if (['vla', 'home', 'fixed_move'].includes(skill)) return skill;
    return data.route === 'fixed_relative_pose_v1' ? 'relative' : 'visual';
  }

  function skillName(phase, route) {
    if (route === 'relative') return 'Relative grasp';
    return ({vla: 'VLA policy', home: 'Return home', fixed_move: 'Fixed move', placement: 'Placement', demonstration_grasp: 'Visual grasp'})[method(phase)] || 'Recorded skill';
  }

  function stepsFor(route, data) {
    if (route === 'relative') return [['review', 'Suitability review', statusName(data.cooperative?.suitable === 'yes' ? 'passed' : null)], ['binding', 'Measured action', statusName(data.cooperative?.material_status)]];
    if (route === 'fixed_move') return [['reference', 'Move screening', statusName(data.move?.status)], ['binding', 'Skill binding', 'Fixed move']];
    if (route === 'home') return [['reference', 'Recorded target', 'Demonstration pose'], ['binding', 'Skill binding', 'Return home']];
    if (route === 'vla') return [['reference', 'Demonstration', 'Phase evidence'], ['binding', 'Skill binding', 'VLA policy']];
    return [['rgb', 'Segmentation', percent(data.rgb_metrics?.coverage)],
      ['geometry', data.geometry_backend === 'rgbd' ? 'Depth & geometry' : 'IR & geometry', data.geometry_backend === 'rgbd' ? 'Skipped' : statusName(data.geometry?.status)],
      ['training', 'YOLO training', statusName(data.training?.status)],
      ['validation', 'Validation & binding', statusName(data.localization_status)]];
  }

  function facts(rows) {
    return '<dl class="localization-facts">' + rows.filter(([, value]) => value != null && value !== '').map(([label, value]) => '<div><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>').join('') + '</dl>';
  }

  function metric(label, value) {
    if (!value) return '';
    const evaluation = value.evaluation || {};
    const rate = value.complete_rate ?? value.coverage ?? value.pass_rate;
    const successful = value.valid_masks ?? value.passed ?? evaluation.successful;
    const total = value.total ?? evaluation.total;
    return '<div class="localization-metric"><small>' + esc(label) + '</small><strong>' + percent(rate) + '</strong><span>' +
      esc(successful != null && total != null ? successful + ' / ' + total + ' Episodes' : '') +
      (typeof value.threshold === 'number' ? ' · required ' + percent(value.threshold) : '') + '</span></div>';
  }

  function figure(src, label, className = '') {
    return src ? '<figure class="localization-figure ' + className + '"><a href="' + esc(src) + '" target="_blank" rel="noopener" aria-label="Open ' + esc(label) + '"><img src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy"></a><figcaption>' + esc(label) + '</figcaption></figure>' : '';
  }

  function samplesFor(step, data) {
    const samples = data.samples || [];
    const preferred = step === 'rgb' ? ['rgb', 'geometry', 'baseline_test', 'baseline_final'] : step === 'geometry' ? ['geometry', 'baseline_test', 'baseline_final'] : ['baseline_test', 'baseline_final', 'rgb', 'geometry'];
    const gate = preferred.find(gate => samples.some(s => s.gate === gate));
    return samples.filter(s => s.gate === gate).slice(0, 3);
  }

  function gallery(step, data) {
    const samples = samplesFor(step, data);
    if (!samples.length) return '<div class="localization-empty">No saved preview for this step.</div>';
    selectedSample = Math.min(selectedSample, samples.length - 1);
    const sample = samples[selectedSample];
    const isRGB = step === 'rgb' && sample.rgb;
    return '<div class="localization-gallery">' +
      (isRGB ? '<div class="localization-image-pair">' + figure(sample.rgb, 'RGB overview') + figure(sample.detail, 'Mask detail') + '</div>' : figure(sample.image, sourceLabel(sample.gate), 'localization-sheet')) +
      '<div class="localization-samples" role="group" aria-label="Representative samples">' + samples.map((s, i) => '<button type="button" data-localization-sample="' + i + '" aria-pressed="' + (i === selectedSample) + '">Sample ' + (i + 1) + '</button>').join('') + '<span>' + esc(sourceLabel(sample.gate)) + '</span></div></div>';
  }

  function candidates(data) {
    if (!data.candidates?.length) return '';
    return '<details class="localization-more"><summary>Compare saved methods <span>' + data.candidates.length + ' candidates</span></summary><div class="localization-table-scroll"><table><thead><tr><th>Method / prompt</th><th>RGB coverage</th><th>Result</th></tr></thead><tbody>' + data.candidates.map(c => {
      const stopped = c.metrics?.evaluation?.stopped_early;
      const direct = c.text_only || /^entity_word_/.test(c.id);
      return '<tr' + (c.selected ? ' class="selected"' : '') + '><td>' + esc(direct ? 'Direct SAM' : names[c.method] || c.method) + (c.term ? '<small>' + esc(c.term) + '</small>' : '') + '</td><td>' + (stopped ? 'Stopped early' : percent(c.metrics?.coverage)) + '</td><td>' + (c.selected ? 'Selected' : statusName(c.status)) + '</td></tr>';
    }).join('') + '</tbody></table></div></details>';
  }

  function recordedFrames(phase) {
    const stem = phase.media?.video?.replace(/\.mp4$/, '');
    if (!stem) return figure(reference(phase), 'Demonstration reference');
    return '<div class="localization-temporal">' + ['start', 'process', 'end'].map(label => figure(stem + '-' + label + '.jpg', label[0].toUpperCase() + label.slice(1))).join('') + '</div>';
  }

  function visualPanel(phase, data, step) {
    const training = data.training || {};
    const rgbd = data.geometry_backend === 'rgbd';
    let title, visual, info, more = '';
    if (step === 'rgb') {
      title = 'Target segmentation';
      visual = gallery(step, data);
      info = metric('RGB mask coverage · all Episodes', data.rgb_metrics) + facts([
        ['Target', phase.target], ['SAM prompt', data.term], ['Selected method', data.route === 'sam' ? 'Direct SAM' : names[data.method] || data.method], ['Active arm', hand(phase.arm)]
      ]);
      more = candidates(data);
    } else if (step === 'geometry') {
      title = rgbd ? 'Depth & geometry skipped' : 'Cross-camera correspondence';
      visual = rgbd ? '<div class="localization-empty"><strong>RGB-D route</strong><p>This saved workflow skips the depth and geometry review and generates labels from the selected RGB masks.</p></div>' : gallery(step, data);
      info = (rgbd ? '' : metric('Geometry coverage', data.geometry?.metrics)) + facts([
        ['Geometry step', rgbd ? 'Skipped' : statusName(data.geometry?.status)],
        ['IR route', rgbd ? null : data.geometry?.ir_mode === 'fast' ? 'Fast mapping fallback' : data.geometry?.ir_mode === 'native' ? 'Native IR SAM' : 'Saved stereo correspondence'],
        ['Selected method', names[data.method] || data.method]
      ]);
    } else if (step === 'training') {
      title = training.status === 'skipped' ? 'Direct SAM · training skipped' : training.status === 'completed' ? 'Shared phase keypoint model' : 'YOLO training record';
      visual = training.status === 'completed' ? gallery(step, data) : training.status === 'skipped' ? '<div class="localization-empty"><strong>Direct SAM</strong><p>The accepted text segmentation is reused without training a YOLO model.</p></div>' : '<div class="localization-empty">No saved training record for this phase.</div>';
      info = facts([['Training', statusName(training.status)], ['Models trained', training.runs],
        ['Training Episodes', training.train_count], ['Validation Episodes', training.val_count],
        ['Model output', training.status === 'completed' ? 'Keypoint prediction' : null]]);
    } else {
      title = 'Validation & skill binding';
      visual = gallery(step, data);
      info = metric(data.test ? 'Held-out localization test' : 'Accepted RGB mask coverage', data.test || data.rgb_metrics) + facts([
        ['Localization', statusName(data.localization_status)], ['Selected method', data.route === 'sam' ? 'Direct SAM' : names[data.method] || data.method],
        ['Bound skill', skillName(phase, 'visual')], ['Execution', phase.capability?.execution_status === 'offline_only' ? 'Offline materials' : null]
      ]);
      if (data.review_reason) more = '<details class="localization-more"><summary>Saved review conclusion</summary><p>' + esc(data.review_reason) + '</p></details>';
    }
    return {title, visual, info, more};
  }

  function specialPanel(phase, data, step, route) {
    const binding = step === 'binding';
    let title = binding ? 'Skill binding' : 'Demonstration evidence';
    let visual = recordedFrames(phase), info = '', more = '';
    if (route === 'relative') {
      const cooperative = data.cooperative || {};
      title = binding ? 'Measured relative action' : 'Supporting-hand wrist review';
      visual = figure(binding ? cooperative.wrist : cooperative.image, binding ? 'Selected supporting-hand reference' : 'Saved nine-demonstration review') || '<div class="localization-empty">No saved wrist preview.</div>';
      info = facts([['Suitability', cooperative.suitable === 'yes' ? 'Suitable for relative grasp' : 'Not recorded'], ['Acquire', hand(cooperative.acquire_hand)], ['Support', hand(cooperative.anchor_hand)],
        [binding ? 'Measured motion frames' : 'Reviewed demonstrations', binding ? cooperative.motion_frames : cooperative.sample_count],
        ['Action materials', statusName(cooperative.material_status)]]);
      if (cooperative.reason) more = '<details class="localization-more"><summary>Saved suitability conclusion</summary><p>' + esc(cooperative.reason) + '</p></details>';
    } else if (route === 'fixed_move') {
      const screen = data.move || {}, bounds = Object.values(screen.endpoint_bounds || {});
      const thresholds = screen.thresholds || {};
      title = binding ? 'Fixed-move binding' : 'Measured endpoint consistency';
      info = facts([['Screening', statusName(screen.status)], ['Demonstrations', screen.episode_count || data.episode_count],
        ['Maximum endpoint spread', bounds.length ? (Math.max(...bounds.map(b => b.position_m)) * 1000).toFixed(1) + ' mm' : null],
        ['Position threshold', thresholds.position_m != null ? thresholds.position_m * 1000 + ' mm' : null],
        ['Active arm', hand(phase.arm)]]);
    } else if (route === 'home') {
      title = binding ? 'Return-home binding' : 'Recorded home target';
      info = facts([['Target', 'Demonstrated home pose'], ['Arms', data.home?.arms?.map(hand).join(' · ') || 'Recorded arms'], ['Gripper policy', data.home?.gripper_policy], ['Demonstrations', data.episode_count || null]]);
      if (data.home?.joint_targets) more = '<details class="localization-more"><summary>Recorded joint targets</summary>' + facts(Object.entries(data.home.joint_targets).map(([arm, values]) => [hand(arm) + ' · rad', values.map(v => Number(v).toFixed(3)).join(', ')])) + '</details>';
    } else {
      title = binding ? 'Phase-conditioned VLA binding' : 'Demonstrated action';
      info = facts([['Bound skill', 'VLA policy'], ['Phase instruction', phase.prompt], ['Active arm', hand(phase.arm)], ['Demonstrations', data.episode_count || null]]);
    }
    return {title, visual, info, more};
  }

  function render(task, phase) {
    const host = document.querySelector('#control-phase-detail');
    if (!host || !phase) return;
    const exported = window.WALLE_LOCALIZATION?.[task.id];
    const data = exported?.revision === task.revision ? exported.phases[phase.id] || {} : {};
    const route = routeFor(phase, data), steps = stepsFor(route, data);
    const key = task.id + ':' + phase.id;
    const changedPhase = phaseKey !== key;
    const hadContent = Boolean(host.firstElementChild);
    if (changedPhase) {phaseKey = key; selectedStep = steps[0][0]; selectedSample = 0;}
    if (!steps.some(([id]) => id === selectedStep)) selectedStep = steps[0][0];
    const panel = route === 'visual' ? visualPanel(phase, data, selectedStep) : specialPanel(phase, data, selectedStep, route);
    const code = 'P' + String(phase.id).padStart(2, '0');
    const heading = phase.kind === 'home' ? 'Return home' : [phase.operation, phase.target].filter(Boolean).join(' · ');
    const template = document.createElement('template');
    template.innerHTML = '<div class="localization-phase-heading"><div><span class="module-kicker">SELECTED PHASE · ' + code + '</span><h4>' + esc(heading) + '</h4></div><span class="localization-skill">' + esc(skillName(phase, route)) + '</span></div>' +
      '<nav class="localization-tabs" role="tablist" aria-label="Localization steps" style="--step-count:' + steps.length + '">' + steps.map(([id, label, status], i) => '<button type="button" role="tab" id="localization-tab-' + id + '" aria-controls="localization-result-panel" data-localization-step="' + id + '" aria-selected="' + (id === selectedStep) + '" tabindex="' + (id === selectedStep ? 0 : -1) + '"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + esc(label) + '</span><small>' + esc(status) + '</small></button>').join('') + '</nav>' +
      '<section class="localization-result-panel" id="localization-result-panel" role="tabpanel" aria-labelledby="localization-tab-' + selectedStep + '"><h4>' + esc(panel.title) + '</h4><div class="localization-result-body"><div>' + panel.visual + '</div><aside>' + panel.info + '</aside></div>' + panel.more + '</section>' +
      '<div class="localization-binding"><span>OUTPUT</span><strong>' + esc(skillName(phase, route)) + '</strong><small>' + esc(phase.capability?.execution_status === 'offline_only' ? 'Localization accepted · offline materials' : route === 'vla' ? 'Demonstrated phase instruction' : route === 'home' ? 'Recorded return target' : route === 'fixed_move' ? 'Measured move target' : route === 'relative' ? statusName(data.cooperative?.material_status) : statusName(data.localization_status)) + '</small></div>';
    const next = template.content;
    let animated = null;
    const currentStep = host.querySelector('[data-localization-step][aria-selected=true]')?.dataset.localizationStep;
    if (changedPhase || !hadContent) {
      host.replaceChildren(next);
      if (hadContent) animated = host;
    } else if (currentStep !== selectedStep) {
      const panel = next.querySelector('.localization-result-panel');
      host.querySelector('.localization-result-panel').replaceWith(panel);
      host.querySelectorAll('[data-localization-step]').forEach(button => {
        const active = button.dataset.localizationStep === selectedStep;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
      animated = panel;
    } else {
      const gallery = host.querySelector('.localization-gallery');
      const nextGallery = next.querySelector('.localization-gallery');
      const currentSample = gallery?.querySelector('[aria-pressed=true]')?.dataset.localizationSample;
      if (gallery && nextGallery && currentSample !== String(selectedSample)) {
        const visual = nextGallery.firstElementChild;
        gallery.firstElementChild.replaceWith(visual);
        gallery.querySelectorAll('[data-localization-sample]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.localizationSample) === selectedSample)));
        animated = visual;
      }
    }
    if (animated || changedPhase) window.WalleMotion.enter(animated, host);
    const tabBar = host.querySelector('.localization-tabs');
    const activeTab = tabBar.querySelector('[aria-selected=true]');
    tabBar.scrollLeft = activeTab.offsetLeft - (tabBar.clientWidth - activeTab.offsetWidth) / 2;
    const activate = id => {selectedStep = id; selectedSample = 0; render(task, phase);};
    host.onclick = event => {
      const step = event.target.closest('[data-localization-step]');
      if (step && host.contains(step)) activate(step.dataset.localizationStep);
      const sample = event.target.closest('[data-localization-sample]');
      if (sample && host.contains(sample)) {selectedSample = Number(sample.dataset.localizationSample); render(task, phase);}
    };
    host.onkeydown = event => {
      const button = event.target.closest('[data-localization-step]');
      if (!button || !host.contains(button)) return;
      const i = steps.findIndex(([id]) => id === button.dataset.localizationStep);
      const index = event.key === 'ArrowRight' ? (i + 1) % steps.length : event.key === 'ArrowLeft' ? (i + steps.length - 1) % steps.length : event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : -1;
      if (index < 0) return;
      event.preventDefault(); activate(steps[index][0]);
      host.querySelector('[data-localization-step="' + steps[index][0] + '"]').focus({preventScroll: true});
    };
    host.querySelectorAll('.localization-more').forEach(details => {
      details.ontoggle = () => {
        if (details.open) window.WalleMotion.enter(details.querySelector('.localization-table-scroll, .localization-facts, p'), host);
      };
    });

  }
  window.WalleLocalization = {render, skillName(task, phase) {
    const exported = window.WALLE_LOCALIZATION?.[task.id];
    const data = exported?.revision === task.revision ? exported.phases[phase.id] || {} : {};
    return skillName(phase, routeFor(phase, data));
  }};
})();

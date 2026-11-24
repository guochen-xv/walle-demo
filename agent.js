/* Replay the selected Situation using its independent phase recordings. */
(() => {
  'use strict';
  const store = window.WalleTaskStore;
  const root = document.querySelector('#agent-app');
  if (!store || !root) return;

  const agentData = window.WALLE_AGENT_DATA || {};
  const pathsByTask = agentData.situatedPaths || {};
  const selectedPaths = new Map();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const phaseId = phase => 'P' + String(phase.id).padStart(2, '0');
  const phaseTitle = phase => phase.kind === 'home' ? 'Return home'
    : [phase.operation, phase.target].filter(Boolean).join(' · ');
  const skill = phase => phase.capability?.primary || 'Prepared skill';
  const method = phase => ({vla: 'VLA', demonstration_grasp: 'Control', fixed_move: 'Control', home: 'Home'})[skill(phase)] || 'Prepared';
  const formatTime = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let speed = 3;
  let dispose = () => {};

  function render(task = store.current) {
    dispose();
    const paths = pathsByTask[task.id] || [];
    const path = paths.find(item => item.id === selectedPaths.get(task.id)) || paths[0];
    const byId = new Map(task.phases.map(phase => [phase.id, phase]));
    const bySource = new Map(task.phases.map(phase => [phase.sourceId, phase]));
    const decisions = (window.WALLE_SITUATION_DETAILS?.[task.id]?.decisions || []).map(decision => ({
      ...decision,
      source: bySource.get(decision.source_id),
      alternatives: decision.alternatives.map(alternative => ({
        ...alternative, target: bySource.get(alternative.target_id)
      })).filter(alternative => alternative.target).sort((a, b) => {
        const order = alternative => {
          const i = paths.findIndex(candidate => alternative.path_ids.includes(candidate.situationPath));
          return i < 0 ? paths.length : i;
        };
        return order(a) - order(b);
      })
    })).filter(decision => decision.alternatives.length > 1 &&
      (decision.source_id == null || decision.source && path?.order.includes(decision.source.id)));
    const decisionAt = id => decisions.find(decision => id == null ? decision.source_id == null : decision.source?.id === id);
    const decisionButton = decision => decision ? `<button type="button" class="ag-decision-marker" data-ag-decision="${esc(decision.id)}"><small>OBSERVE SCENE</small><strong>◇ Scene decision</strong><span>${decision.alternatives.length} scene conditions</span></button>` : '';
    // Load saved reference sheets before the short decision beat begins.
    decisions.forEach(decision => decision.alternatives.forEach(alternative => {
      if (alternative.image) { const image = new Image(); image.src = alternative.image; }
    }));
    const phases = path ? path.order.map(id => byId.get(id)) : task.phases;
    const timelineSteps = [];
    if (decisionAt(null)) timelineSteps.push({decision: decisionAt(null)});
    phases.forEach((phase, index) => {
      timelineSteps.push({phase, index});
      const decision = decisionAt(phase.id);
      if (decision) timelineSteps.push({decision});
    });
    let total = 0;
    const durations = phases.map(phase => {
      if (!path) return 0;
      const [start, end] = path.ranges[phase.id];
      return (end - start + 1) / path.fps;
    });
    const offsets = durations.map(duration => {
      const offset = total;
      total += duration;
      return offset;
    });

    root.innerHTML = `
      <div class="ag-toolbar">
        <div class="ag-buttons">
          <button type="button" id="ag-play" class="primary">▶ Play task</button>
          <button type="button" id="ag-reset" class="outline">↺ Replay</button>
          <label>Speed <select id="ag-speed" aria-label="Playback speed">
            ${[1, 2, 3, 4].map(rate => `<option value="${rate}">${rate}×</option>`).join('')}
          </select></label>
        </div>
        ${path ? `<label>Scenario walkthrough <select id="ag-scenario">
          ${paths.map(item => `<option value="${esc(item.id)}">${esc(item.label)}</option>`).join('')}
        </select></label>` : ''}
      </div>
      <div class="ag-context">
        <span>✳ SITUATION</span><span>${esc(task.name)}</span><span id="ag-stage" role="status"></span>
      </div>
      <div class="ag-layout">
        <div class="ag-observation">
          <div class="ag-camera-bar"><span>CURRENT OBSERVATION</span></div>
          <div class="ag-camera-stage">
            ${path ? '<div class="ag-screen"><video id="ag-video" muted playsinline preload="metadata" aria-label="Recorded phase execution"></video></div>'
              : '<div id="ag-placeholder"><h3>Situated Agent video preview</h3><p>Execution recording unavailable.</p></div>'}
            <div id="ag-media-status" role="status"></div>
          </div>
          <div id="ag-caption" class="ag-caption"></div>
          <div class="ag-loop" aria-label="Agent runtime loop">
            <span data-ag-loop="observe">Observe &amp; Identify</span>
            <span data-ag-loop="execute">Execute</span>
            <span data-ag-loop="verify">Verify</span>
          </div>
        </div>
        <aside class="ag-contract">
          <section id="ag-branch" class="ag-branch" aria-label="Recorded scene-based branch decision" hidden></section>
          <div id="ag-contract-header"></div>
          <div class="ag-panel-stack">
            <div id="ag-execute-view">
              <div id="ag-contract-content"></div>
              <div class="ag-execution" hidden>
                <div class="ag-progress-label"><span>Phase progress</span><b id="ag-percent"></b></div>
                <div class="ag-progress" role="progressbar" aria-label="Phase progress" aria-valuemin="0" aria-valuemax="100"><i></i></div>
              </div>
            </div>
            <section id="ag-verify-view" aria-label="Recorded phase verification" aria-hidden="true"></section>
          </div>
        </aside>
      </div>
      <div class="ag-task">
        <div class="ag-time-heading"><strong>Task timeline</strong><span id="ag-time"></span></div>
        <div class="ag-timeline-scroll"><div class="ag-timeline-content" style="--ag-step-count:${timelineSteps.length}">
        <div class="ag-phase-track" role="group" aria-label="Choose a phase or scene decision">
          ${timelineSteps.map(({phase, index: i, decision}) => decision ? decisionButton(decision) : `<button type="button" data-ag-phase="${i}" data-method="${method(phase)}">
            <small>${phaseId(phase)} · ${method(phase)}</small><strong>${esc(phaseTitle(phase))}</strong>
            ${path ? `<span>${formatTime(durations[i])}</span>` : ''}<em></em>
          </button>`).join('')}
        </div>
        <div class="ag-duration-track" aria-label="Aligned phase and scene decision markers">
          ${timelineSteps.map(({phase, index: i, decision}) => decision
            ? `<button type="button" data-ag-decision-ref="${esc(decision.id)}">◇ Scene decision</button>`
            : `<button type="button" data-ag-phase-ref="${i}" data-method="${method(phase)}">${phaseId(phase)}</button>`).join('')}
        </div>
        ${path ? `<label class="ag-scrubber">Timeline position<input id="ag-seek" type="range" min="0" max="${timelineSteps.length}" step="any" value="0"></label>` : ''}
        </div></div>
      </div>`;

    const $ = selector => root.querySelector(selector);
    const video = $('#ag-video');
    if (path?.aspectRatio) $('.ag-screen').style.aspectRatio = path.aspectRatio;
    const play = $('#ag-play');
    const replay = $('#ag-reset');
    const speedSelect = $('#ag-speed');
    const scenario = $('#ag-scenario');
    const seek = $('#ag-seek');
    const contract = $('.ag-contract');
    const execution = $('#ag-execute-view');
    const verification = $('#ag-verify-view');
    const status = $('#ag-media-status');
    const branchPanel = $('#ag-branch');
    const phaseButtons = [...root.querySelectorAll('[data-ag-phase]')];
    const loopSteps = [...root.querySelectorAll('[data-ag-loop]')];
    const phaseProgress = $('.ag-execution');
    const progress = $('.ag-progress');
    const progressFill = progress.querySelector('i');
    const mediaEvents = new AbortController();
    const completed = new Set();
    let index = 0;
    let playing = false;
    let walkthrough = false;
    let mode = 'preview';
    let pendingTime = 0;
    let stageTimer;
    let checkRows = [];
    let verificationStep = 0;
    let playRequest = 0;
    let transitionAnimations = [];
    let activeDecision = null;
    let branchStep = 0;
    let afterDecision = () => {};
    let clipRequest = null;
    let clipObjectUrl = null;
    let onPositioned = null;
    let progressFrame = 0;
    let decisionStartedAt = 0;
    let decisionRemaining = 800;

    function animateProgress() {
      cancelAnimationFrame(progressFrame);
      const tick = () => {
        if (!playing || (mode !== 'execute' && mode !== 'branch')) return;
        updateProgress();
        progressFrame = requestAnimationFrame(tick);
      };
      progressFrame = requestAnimationFrame(tick);
    }

    function updateProgress() {
      if (!video) return;
      const finished = mode === 'verify' || mode === 'complete' || mode === 'branch' && Boolean(activeDecision?.source);
      const elapsed = finished ? durations[index] : Math.min(pendingTime ?? video.currentTime, durations[index]);
      const percent = Math.round(100 * elapsed / durations[index]);
      $('#ag-percent').textContent = percent + '%';
      progressFill.style.width = percent + '%';
      progress.setAttribute('aria-valuenow', percent);
      const timelineIndex = timelineSteps.findIndex(step => mode === 'branch'
        ? step.decision?.id === activeDecision?.id : step.index === index);
      const decisionElapsed = (branchStep ? 2500 : 800) - decisionRemaining +
        (playing ? performance.now() - decisionStartedAt : 0);
      const fraction = mode === 'branch' ? decisionElapsed / 2500 : elapsed / durations[index];
      const card = $('.ag-phase-track').children[Math.max(0, timelineIndex)].getBoundingClientRect();
      const track = seek.getBoundingClientRect();
      const targetX = card.left + card.width * Math.min(1, Math.max(0, fraction));
      // Native range thumbs travel inside the input, while cards have gaps.
      // Map their actual bounds so the thumb stays under the active card.
      seek.value = Math.max(0, Math.min(1, (targetX - track.left - 8) / Math.max(1, track.width - 16))) * timelineSteps.length;
      $('#ag-time').textContent = 'Video ' + formatTime(offsets[index] + elapsed) + ' / ' + formatTime(total) + ' · ' + speed + '×';
    }

    function updateStatus() {
      const phase = phases[index];
      const inProgress = mode !== 'preview' && mode !== 'complete';
      play.textContent = playing ? 'Ⅱ Pause' : inProgress ? '▶ Continue' : '▶ Play task';
      play.disabled = !path;
      const stage = {
        preview: 'Ready', observe: 'Observe & Identify', execute: 'Executing',
        verify: 'Checking conditions', branch: branchStep ? 'Branch selected' : 'Matching scene', complete: walkthrough ? 'Walkthrough complete' : 'Phase complete'
      };
      $('#ag-stage').textContent = phaseId(phase) + ' · ' + stage[mode] + (inProgress && !playing ? ' · Paused' : '');
      const reviewing = phase.kind !== 'home' && (mode === 'verify' || mode === 'complete');
      contract.classList.toggle('ag-show-verification', reviewing);
      verification.setAttribute('aria-hidden', String(!reviewing));
      execution.setAttribute('aria-hidden', String(reviewing));
      phaseProgress.hidden = !video || mode !== 'execute' || method(phase) !== 'VLA';
      const activeStep = reviewing ? 'verify' : mode === 'execute' || mode === 'complete' ? 'execute' : 'observe';
      loopSteps.forEach(step => step.classList.toggle('active', step.dataset.agLoop === activeStep));
      phaseButtons.forEach((button, i) => {
        const current = i === index && mode !== 'branch';
        button.classList.toggle('executing', current);
        button.setAttribute('aria-pressed', String(current));
        button.querySelector('em').textContent = completed.has(i) ? '✓ Played' : current ? '● Current phase' : '';
      });
      root.querySelectorAll('[data-ag-decision]').forEach(button => button.setAttribute('aria-pressed', String(mode === 'branch' && button.dataset.agDecision === activeDecision?.id)));
      root.querySelectorAll('.ag-duration-track > button').forEach(marker => {
        const current = mode === 'branch' ? marker.dataset.agDecisionRef === activeDecision?.id
          : marker.dataset.agPhaseRef != null && Number(marker.dataset.agPhaseRef) === index;
        marker.classList.toggle('active', current);
        if (current) marker.setAttribute('aria-current', 'step');
        else marker.removeAttribute('aria-current');
      });
      updateProgress();
      animateProgress();
    }

    function transitionPanels(elements) {
      transitionAnimations.forEach(animation => animation.cancel());
      transitionAnimations = reducedMotion.matches ? [] : elements.map(element => element.animate(
        [{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}],
        {duration: 350, easing: 'ease-out'}));
    }

    function showDecision(decision, matchedVisible = true) {
      const sameDecision = !branchPanel.hidden && activeDecision?.id === decision?.id;
      const changedView = branchPanel.hidden === Boolean(decision);
      activeDecision = decision;
      branchPanel.hidden = !decision;
      $('#ag-contract-header').hidden = Boolean(decision);
      $('.ag-panel-stack').hidden = Boolean(decision);
      if (changedView) transitionPanels([contract]);
      if (!decision) return;
      const matched = decision.alternatives.findIndex(alternative => alternative.path_ids.includes(path?.situationPath));
      const selected = decision.alternatives[matched];
      // Keep the reference cards mounted when the match arrives so their
      // selection styles can transition instead of replacing them instantly.
      if (!sameDecision) branchPanel.innerHTML = `
        <div class="ag-branch-heading"><div><span class="eyebrow">${decision.source ? 'AFTER ' + phaseId(decision.source) : 'BEFORE THE FIRST ACTION'} · SCENE DECISION</span>
          <h3></h3></div></div>
        <div class="ag-branch-options">${decision.alternatives.map((alternative, i) => `
          <article class="ag-branch-option" data-selected="false">
            ${alternative.image ? `<img class="ag-branch-sheet" src="${esc(alternative.image)}" alt="Branch ${i + 1} · ${alternative.episodes || ''} demonstration reference images">` : ''}
            <div class="ag-branch-copy"><small></small>
            <strong>${phaseId(alternative.target)} · ${esc(phaseTitle(alternative.target))}</strong></div>
          </article>`).join('')}</div>
        <p class="ag-branch-reason" role="status"></p>`;
      branchPanel.querySelector('h3').textContent = matchedVisible && selected
        ? path.label + ' → Branch ' + (matched + 1) : 'Matching the current scene…';
      branchPanel.querySelectorAll('.ag-branch-option').forEach((card, i) => {
        const chosen = matchedVisible && i === matched;
        card.dataset.selected = String(chosen);
        card.querySelector('small').textContent = 'BRANCH ' + (i + 1) + (chosen ? ' · ✓ SELECTED' : '');
      });
      branchPanel.querySelector('.ag-branch-reason').textContent = matchedVisible && selected
        ? selected.condition : 'Comparing the scene with the recorded Situation conditions.';
    }

    function advanceDecision() {
      decisionStartedAt = performance.now();
      animateProgress();
      stageTimer = setTimeout(() => {
        if (branchStep === 0) {
          branchStep = 1;
          decisionRemaining = 1700;
          decisionStartedAt = performance.now();
          showDecision(activeDecision);
          updateStatus();
          advanceDecision();
        } else {
          showDecision(null);
          afterDecision();
        }
      }, decisionRemaining);
    }

    function beginDecision(decision, next, autoplay = true, fraction = 0) {
      clearTimeout(stageTimer);
      ++playRequest;
      video?.pause();
      const elapsed = Math.min(1, Math.max(0, fraction)) * 2500;
      branchStep = elapsed >= 800 ? 1 : 0;
      decisionRemaining = (branchStep ? 2500 : 800) - elapsed;
      decisionStartedAt = performance.now();
      afterDecision = next;
      mode = 'branch';
      playing = autoplay;
      showDecision(decision, Boolean(branchStep));
      updateStatus();
      if (playing) advanceDecision();
    }

    function pausePlayback() {
      clearTimeout(stageTimer);
      cancelAnimationFrame(progressFrame);
      if (mode === 'branch' && playing) decisionRemaining = Math.max(0, decisionRemaining - (performance.now() - decisionStartedAt));
      ++playRequest;
      playing = false;
      video?.pause();
      updateStatus();
    }

    function observe() {
      stageTimer = setTimeout(() => {
        mode = 'execute';
        updateStatus();
        playClip();
      }, 300);
    }

    async function playClip() {
      const request = ++playRequest;
      try {
        await video.play();
      } catch (error) {
        if (request !== playRequest || error.name === 'AbortError') return;
        status.textContent = 'Playback unavailable. Press Play to retry.';
        pausePlayback();
      }
    }

    function selectPhase(nextIndex, {autoplay = false, time = 0, positioned = null, preview = false} = {}) {
      clearTimeout(stageTimer);
      cancelAnimationFrame(progressFrame);
      ++playRequest;
      clipRequest?.abort();
      if (clipObjectUrl) URL.revokeObjectURL(clipObjectUrl);
      clipObjectUrl = null;
      onPositioned = positioned;
      video?.pause();
      const changedPhase = nextIndex !== index;
      index = nextIndex;
      showDecision(null);
      if (changedPhase) transitionPanels([$('.ag-camera-stage'), contract]);
      const phase = phases[index];
      const home = phase.kind === 'home';
      const phaseContract = window.WalleSituationDetails.contractFor(task, phase);
      const reference = phase.media?.reference || phase.media?.poster;
      playing = autoplay;
      mode = preview ? 'preview' : autoplay && !home && !positioned ? 'observe' : 'execute';
      status.textContent = '';

      $('#ag-contract-header').innerHTML = `
        <div class="eyebrow">CURRENT · PHASE ${phaseId(phase)}</div>
        <h3>${esc(phaseTitle(phase))}</h3>
        <span class="route ${method(phase) === 'Control' ? 'teal' : 'blue'}">${esc(skill(phase))}</span>
        <small>${esc(phase.arm)}</small>`;
      $('#ag-contract-content').innerHTML = `
        <p class="ag-prompt">${esc(phase.prompt)}</p>
        <dl><dt>Local goal</dt><dd>${esc(phaseContract.goal)}</dd>
          <dt>Outcome</dt><dd>${esc(phaseContract.outcome)}</dd>
        </dl>`;
      verification.innerHTML = home ? '' : `
        ${reference ? `<figure class="ag-reference"><img src="${esc(reference)}" alt="Situation reference" loading="lazy"><figcaption>Situation reference</figcaption></figure>` : ''}
        <div class="ag-check-group"><strong>Recorded contract checks</strong>
          ${[['Local goal', phaseContract.goal], ['Outcome', phaseContract.outcome]].map(([label, check]) => `<div class="ag-check-row" data-state="pending">
            <span class="ag-check-icon" aria-hidden="true">○</span><span><strong>${label}</strong> ${esc(check)}</span>
          </div>`).join('')}
        </div>
        <div id="ag-verdict" class="ag-success" role="status"></div>`;
      checkRows = [...verification.querySelectorAll('.ag-check-row')];
      verificationStep = 0;
      if (path) {
        const [start, end] = path.ranges[phase.id];
        $('#ag-caption').textContent = path.label + ' · ' + path.detail + ' · frames ' + start + '–' + end;
        progress.style.setProperty('--method-color', '#4c78a8');
        const source = path.clips[phase.id];
        video.dataset.clip = source;
        pendingTime = time;
        video.preload = time > 0 ? 'auto' : 'metadata';
        if (time > 0) {
          // Plain static servers may not support Range requests. A short local
          // clip loaded as a Blob remains seekable on those servers as well.
          const request = new AbortController();
          clipRequest = request;
          video.removeAttribute('src');
          video.load();
          fetch(source, {signal: request.signal}).then(response => {
            if (!response.ok) throw new Error('Clip request failed');
            return response.blob();
          }).then(blob => {
            if (request.signal.aborted) return;
            clipObjectUrl = URL.createObjectURL(blob);
            video.src = clipObjectUrl;
            video.load();
            if (autoplay && playing && !positioned) {
              if (home) playClip();
              else observe();
            }
          }).catch(error => {
            if (request.signal.aborted) return;
            status.textContent = 'Could not load the phase recording.';
            pausePlayback();
          });
        } else if (video.getAttribute('src') !== source || video.error) {
          video.src = source;
          video.load();
        }
        if (video.readyState >= 1) applySeek();
        video.playbackRate = speed;
        if (autoplay && time === 0 && !positioned) {
          if (home) playClip();
          else observe();
        }
      }
      updateStatus();
    }

    function applySeek() {
      if (pendingTime === null) return;
      if (!Number.isFinite(video.duration)) return;
      const target = Math.min(pendingTime, Math.max(0, video.duration - 1 / path.fps));
      if (target > 0 && !Array.from({length: video.seekable.length}, (_, i) =>
        target >= video.seekable.start(i) && target <= video.seekable.end(i)).some(Boolean)) return;
      video.currentTime = target;
      pendingTime = null;
      updateProgress();
    }

    function continueAfterPhase() {
      if (walkthrough && index + 1 < phases.length) {
        selectPhase(index + 1, {autoplay: true});
      } else {
        mode = 'complete';
        playing = false;
        updateStatus();
      }
    }

    function finishPhase() {
      completed.add(index);
      const decision = decisionAt(phases[index].id);
      if (decision) beginDecision(decision, continueAfterPhase);
      else continueAfterPhase();
    }

    function passCheck(row) {
      row.dataset.state = 'passed';
      row.querySelector('.ag-check-icon').textContent = '✓';
    }

    function advanceVerification() {
      // A 2.5-second check sequence, including its result hold.
      const [goal, outcome] = checkRows;
      const steps = [
        [200, () => goal.classList.add('ag-check-visible')],
        [400, () => outcome.classList.add('ag-check-visible')],
        [350, () => passCheck(goal)],
        [350, () => passCheck(outcome)],
        [400, () => {
          const verdict = $('#ag-verdict');
          verdict.textContent = '✓ Contract checks passed';
          verdict.classList.add('ag-verdict-visible');
        }],
        [800, finishPhase]
      ];
      const [delay, action] = steps[verificationStep];
      stageTimer = setTimeout(() => {
        verificationStep++;
        action();
        if (mode === 'verify') advanceVerification();
      }, delay);
    }

    dispose = () => {
      ++playRequest;
      clearTimeout(stageTimer);
      cancelAnimationFrame(progressFrame);
      mediaEvents.abort();
      clipRequest?.abort();
      if (clipObjectUrl) URL.revokeObjectURL(clipObjectUrl);
      video?.pause();
      transitionAnimations.forEach(animation => animation.cancel());
    };
    play.disabled = replay.disabled = speedSelect.disabled = !path;
    speedSelect.value = speed;
    if (scenario) {
      scenario.value = path.id;
      scenario.disabled = paths.length === 1;
      scenario.onchange = () => {
        selectedPaths.set(task.id, scenario.value);
        render(task);
        root.querySelector('#ag-scenario').focus({preventScroll: true});
      };
    }
    function startTask() {
      completed.clear();
      walkthrough = true;
      const decision = decisionAt(null);
      selectPhase(0, {autoplay: !decision});
      if (decision) beginDecision(decision, () => selectPhase(0, {autoplay: true}));
    }
    if (video) {
      play.onclick = () => {
        if (playing) {
          pausePlayback();
        } else if (mode === 'preview' || mode === 'complete') {
          startTask();
        } else if (video.error) {
          selectPhase(index, {autoplay: true, time: pendingTime ?? video.currentTime});
        } else {
          playing = true;
          status.textContent = '';
          // Navigation may still be loading its requested frame.
          if (!onPositioned && (mode === 'branch' || pendingTime === null)) {
            if (mode === 'observe') observe();
            else if (mode === 'verify') advanceVerification();
            else if (mode === 'branch') advanceDecision();
            else playClip();
          }
          updateStatus();
        }
      };
      replay.onclick = startTask;
      speedSelect.onchange = () => {
        speed = Number(speedSelect.value);
        video.playbackRate = speed;
        updateProgress();
      };
      const listenerOptions = {signal: mediaEvents.signal};
      video.addEventListener('loadedmetadata', applySeek, listenerOptions);
      video.addEventListener('progress', applySeek, listenerOptions);
      video.addEventListener('canplay', applySeek, listenerOptions);
      video.addEventListener('seeked', () => {
        if (pendingTime !== null) return;
        if (onPositioned) {
          const ready = onPositioned;
          onPositioned = null;
          ready();
        } else if (playing) {
          if (mode === 'observe') {
            clearTimeout(stageTimer);
            observe();
          } else if (mode === 'execute' && video.paused) playClip();
        }
      }, listenerOptions);
      video.addEventListener('timeupdate', updateProgress, listenerOptions);
      window.addEventListener('resize', updateProgress, listenerOptions);
      video.addEventListener('error', () => {
        status.textContent = 'Could not load the phase recording.';
        pausePlayback();
      }, listenerOptions);
      video.addEventListener('ended', () => {
        if (!playing || mode !== 'execute') return;
        if (phases[index].kind === 'home') {
          finishPhase();
          return;
        }
        mode = 'verify';
        updateStatus();
        advanceVerification();
      }, listenerOptions);
      seek.oninput = () => {
        const track = seek.getBoundingClientRect();
        const x = track.left + 8 + Number(seek.value) / timelineSteps.length * (track.width - 16);
        const cards = [...$('.ag-phase-track').children].map(card => card.getBoundingClientRect());
        const column = cards.findIndex(card => x <= card.right);
        const stepIndex = column < 0 ? timelineSteps.length - 1 : column;
        const step = timelineSteps[stepIndex];
        const fraction = Math.max(0, Math.min(1, (x - cards[stepIndex].left) / cards[stepIndex].width));
        if (step.decision) jumpToDecision(step.decision, fraction);
        else selectPhase(step.index, {autoplay: playing, time: fraction * durations[step.index]});
      };
    }
    root.querySelectorAll('[data-ag-phase], [data-ag-phase-ref]').forEach(button => {
      button.onclick = () => {
        walkthrough = false;
        selectPhase(Number(button.dataset.agPhase ?? button.dataset.agPhaseRef), {autoplay: playing});
      };
    });
    function jumpToDecision(decision, fraction = 0) {
      const sourceIndex = decision.source ? phases.findIndex(phase => phase.id === decision.source.id) : 0;
      walkthrough = true;
      for (const played of completed) {
        if (!decision.source || played > sourceIndex) completed.delete(played);
      }
      selectPhase(sourceIndex, {
        autoplay: playing,
        time: decision.source ? durations[sourceIndex] : 0,
        positioned: () => beginDecision(decision, decision.source
          ? continueAfterPhase
          : () => selectPhase(0, {autoplay: true}), playing, fraction)
      });
    }
    root.querySelectorAll('[data-ag-decision], [data-ag-decision-ref]').forEach(button => {
      button.onclick = () => jumpToDecision(decisions.find(item => item.id === (button.dataset.agDecision ?? button.dataset.agDecisionRef)));
    });
    selectPhase(0, {preview: true});
  }

  store.on(render);
  render();
})();

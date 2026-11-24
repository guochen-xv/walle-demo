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
    const phases = path ? path.order.map(id => byId.get(id)) : task.phases;
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
        <div class="ag-phase-track" role="group" aria-label="Choose a phase">
          ${phases.map((phase, i) => `<button type="button" data-ag-phase="${i}" data-method="${method(phase)}">
            <small>${phaseId(phase)} · ${method(phase)}</small><strong>${esc(phaseTitle(phase))}</strong>
            ${path ? `<span>${formatTime(durations[i])}</span>` : ''}<em></em>
          </button>`).join('')}
        </div>
        ${path ? `<div class="ag-duration-track" aria-label="Phase durations to scale">
          ${phases.map((phase, i) => `<span data-method="${method(phase)}" style="flex:${durations[i]}">${phaseId(phase)}</span>`).join('')}
        </div><label class="ag-scrubber">Playback position<input id="ag-seek" type="range" min="0" max="${total}" step="any" value="0"></label>` : ''}
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

    function updateProgress() {
      if (!video) return;
      const finished = mode === 'verify' || mode === 'complete';
      const elapsed = finished ? durations[index] : Math.min(pendingTime ?? video.currentTime, durations[index]);
      const percent = Math.round(100 * elapsed / durations[index]);
      $('#ag-percent').textContent = percent + '%';
      progressFill.style.width = percent + '%';
      progress.setAttribute('aria-valuenow', percent);
      seek.value = offsets[index] + elapsed;
      $('#ag-time').textContent = formatTime(offsets[index] + elapsed) + ' / ' + formatTime(total) + ' · ' + speed + '×';
    }

    function updateStatus() {
      const phase = phases[index];
      const inProgress = mode !== 'preview' && mode !== 'complete';
      play.textContent = playing ? 'Ⅱ Pause' : inProgress ? '▶ Continue' : '▶ Play task';
      const stage = {
        preview: 'Ready', observe: 'Observe & Identify', execute: 'Executing',
        verify: 'Checking conditions', complete: walkthrough ? 'Walkthrough complete' : 'Phase complete'
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
        button.classList.toggle('executing', i === index);
        button.setAttribute('aria-pressed', String(i === index));
        button.querySelector('em').textContent = completed.has(i) ? '✓ Played' : i === index ? '● Current phase' : '';
      });
      updateProgress();
    }

    function pausePlayback() {
      clearTimeout(stageTimer);
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

    function selectPhase(nextIndex, {autoplay = false, time = 0} = {}) {
      clearTimeout(stageTimer);
      ++playRequest;
      video?.pause();
      transitionAnimations.forEach(animation => animation.cancel());
      if (nextIndex !== index && !reducedMotion.matches) {
        transitionAnimations = [$('.ag-camera-stage'), contract].map(element =>
          element.animate([{opacity: 0}, {opacity: 1}], {duration: 400, easing: 'ease'}));
      }
      index = nextIndex;
      const phase = phases[index];
      const home = phase.kind === 'home';
      const evidence = agentData.completionEvidence?.[task.id]?.[phase.id] || phase.evidence?.join(' · ');
      const reference = phase.media?.reference || phase.media?.poster;
      playing = autoplay;
      mode = autoplay && !home ? 'observe' : autoplay || time > 0 ? 'execute' : 'preview';
      status.textContent = '';

      $('#ag-contract-header').innerHTML = `
        <div class="eyebrow">CURRENT · PHASE ${phaseId(phase)}</div>
        <h3>${esc(phaseTitle(phase))}</h3>
        <span class="route ${method(phase) === 'Control' ? 'teal' : 'blue'}">${esc(skill(phase))}</span>
        <small>${esc(phase.arm)}</small>`;
      $('#ag-contract-content').innerHTML = `
        <p class="ag-prompt">${esc(phase.prompt)}</p>
        <dl><dt>Local goal</dt><dd>${esc(phase.goal)}</dd>
          <dt>Completion evidence</dt><dd>${esc(evidence)}</dd>
        </dl>`;
      verification.innerHTML = home ? '' : `
        ${reference ? `<figure class="ag-reference"><img src="${esc(reference)}" alt="Situation reference" loading="lazy"><figcaption>Situation reference</figcaption></figure>` : ''}
        <div class="ag-check-group"><strong>Recorded contract checks</strong>
          ${[['Local goal', phase.goal], ['Completion evidence', evidence]].map(([label, check]) => `<div class="ag-check-row" data-state="pending">
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
        pendingTime = time;
        if (video.getAttribute('src') !== source || video.error) {
          video.src = source;
          video.load();
        }
        if (video.readyState >= 1) applySeek();
        video.playbackRate = speed;
        if (autoplay) {
          if (home) playClip();
          else observe();
        }
      }
      updateStatus();
    }

    function applySeek() {
      if (pendingTime === null) return;
      video.currentTime = Math.min(pendingTime, Math.max(0, video.duration - 1 / path.fps));
      pendingTime = null;
      updateProgress();
    }

    function finishPhase() {
      completed.add(index);
      if (walkthrough && index + 1 < phases.length) {
        selectPhase(index + 1, {autoplay: true});
      } else {
        mode = 'complete';
        playing = false;
        updateStatus();
      }
    }

    function passCheck(row) {
      row.dataset.state = 'passed';
      row.querySelector('.ag-check-icon').textContent = '✓';
    }

    function advanceVerification() {
      // Match the original walkthrough's three-second review and result hold.
      const [goal, evidence] = checkRows;
      const steps = [
        [300, () => goal.classList.add('ag-check-visible')],
        [1050, () => evidence.classList.add('ag-check-visible')],
        [450, () => passCheck(goal)],
        [750, () => passCheck(evidence)],
        [450, () => {
          const verdict = $('#ag-verdict');
          verdict.textContent = '✓ Contract checks passed';
          verdict.classList.add('ag-verdict-visible');
        }],
        [1500, finishPhase]
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
      mediaEvents.abort();
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
      selectPhase(0, {autoplay: true});
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
          if (mode === 'observe') observe();
          else if (mode === 'verify') advanceVerification();
          else playClip();
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
      video.addEventListener('timeupdate', updateProgress, listenerOptions);
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
        const position = Number(seek.value);
        const nextIndex = offsets.findLastIndex(offset => offset <= position);
        selectPhase(nextIndex, {autoplay: playing, time: position - offsets[nextIndex]});
      };
    }
    phaseButtons.forEach((button, i) => {
      button.onclick = () => {
        walkthrough = false;
        selectPhase(i, {autoplay: Boolean(video)});
      };
    });
    selectPhase(0);
  }

  store.on(render);
  render();
})();

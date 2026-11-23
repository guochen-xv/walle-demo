/* Task media is local and intentionally lazy. The demo does not call an API. */
(() => {
  const source = path => Promise.resolve(path);
  const range = id => ({start: 0, end: 1, rate: 1, framesPerSecond: 30});
  window.WalleLearningMedia = {source, range, ready: Promise.resolve(), preloadAgent: () => Promise.resolve(), agentSource: source};
})();

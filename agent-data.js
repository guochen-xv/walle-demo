window.WALLE_AGENT_DATA = {
  clips: [],
  verificationSeconds: 0,
  situatedPaths: {
    unzip: [
      {
        id: 'path1',
        label: 'Path 1',
        detail: 'Right-arm home before zipper-pull acquisition',
        video: 'phases-demo/black-bag-path1.mp4',
        clips: {
          0: 'phases-demo/clips/path1-P00.mp4',
          1: 'phases-demo/clips/path1-P01.mp4',
          2: 'phases-demo/clips/path1-P02.mp4',
          6: 'phases-demo/clips/path1-P06.mp4',
          7: 'phases-demo/clips/path1-P07.mp4',
          3: 'phases-demo/clips/path1-P03.mp4',
          8: 'phases-demo/clips/path1-P08.mp4'
        },
        order: [0, 1, 2, 6, 7, 3, 8],
        fps: 30,
        ranges: {
          0: [0, 201],
          1: [202, 353],
          2: [354, 458],
          6: [459, 693],
          7: [694, 1013],
          3: [1014, 1356],
          8: [1357, 1511]
        }
      },
      {
        id: 'path2',
        label: 'Path 2',
        detail: 'Lower-right rim adjustment before zipper-pull acquisition',
        video: 'phases-demo/black-bag-path2.mp4',
        clips: {
          0: 'phases-demo/clips/path2-P00.mp4',
          1: 'phases-demo/clips/path2-P01.mp4',
          2: 'phases-demo/clips/path2-P02.mp4',
          4: 'phases-demo/clips/path2-P04.mp4',
          5: 'phases-demo/clips/path2-P05.mp4',
          3: 'phases-demo/clips/path2-P03.mp4',
          8: 'phases-demo/clips/path2-P08.mp4'
        },
        order: [0, 1, 2, 4, 5, 3, 8],
        fps: 30,
        ranges: {
          0: [0, 199],
          1: [200, 326],
          2: [327, 417],
          4: [418, 966],
          5: [967, 1234],
          3: [1235, 1515],
          8: [1516, 1715]
        }
      }
    ]
  }
};

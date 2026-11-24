window.WALLE_AGENT_DATA = {
  clips: [],
  situatedPaths: {
    unzip: [
      {
        id: 'path1',
        label: 'Path 1',
        detail: 'Right-arm home before zipper-pull acquisition',
        situationPath: 'seq_190986955ce8',
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
        situationPath: 'seq_24e8d9dca376',
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
    ],
    buckle: [
      {
        id: 'path1',
        label: 'Buckle release',
        detail: 'Left-side release followed by right-side release',
        video: 'phases-demo/buckle.mp4',
        clips: {
          0: 'phases-demo/clips/buckle-P00.mp4',
          1: 'phases-demo/clips/buckle-P01.mp4',
          5: 'phases-demo/clips/buckle-P02.mp4',
          2: 'phases-demo/clips/buckle-P03.mp4',
          3: 'phases-demo/clips/buckle-P04.mp4',
          4: 'phases-demo/clips/buckle-P05.mp4'
        },
        order: [0, 1, 5, 2, 3, 4],
        fps: 30,
        ranges: {
          0: [0, 280],
          1: [281, 512],
          5: [513, 708],
          2: [709, 943],
          3: [944, 1163],
          4: [1164, 1328]
        }
      }
    ],
    coin: [
      {
        id: 'path1',
        label: 'Path 1',
        detail: 'Simulation · Left-hand grasp, right-hand placement',
        situationPath: 'seq_a032420f174c',
        aspectRatio: '24 / 13',
        fps: 25,
        order: [1, 6, 7, 11, 8, 12],
        clips: {
          1: 'phases-demo/clips/coin-path1-P01.mp4',
          6: 'phases-demo/clips/coin-path1-P06.mp4',
          7: 'phases-demo/clips/coin-path1-P07.mp4',
          11: 'phases-demo/clips/coin-path1-P10.mp4',
          8: 'phases-demo/clips/coin-path1-P08.mp4',
          12: 'phases-demo/clips/coin-path1-P11.mp4'
        },
        ranges: {
          1: [26, 82],
          6: [83, 107],
          7: [108, 155],
          11: [156, 166],
          8: [167, 219],
          12: [220, 237]
        }
      },
      {
        id: 'path2',
        label: 'Path 2',
        detail: 'Simulation · Right-hand grasp, left-hand placement',
        situationPath: 'seq_26c814ec0008',
        aspectRatio: '24 / 13',
        fps: 25,
        order: [0, 3, 4, 5, 12],
        clips: {
          0: 'phases-demo/clips/coin-path2-P00.mp4',
          3: 'phases-demo/clips/coin-path2-P02.mp4',
          4: 'phases-demo/clips/coin-path2-P03.mp4',
          5: 'phases-demo/clips/coin-path2-P04.mp4',
          12: 'phases-demo/clips/coin-path2-P11.mp4'
        },
        ranges: {
          0: [26, 92],
          3: [93, 118],
          4: [119, 168],
          5: [169, 206],
          12: [207, 223]
        }
      }
    ]
  }
};

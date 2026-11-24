window.WALLE_AGENT_DATA = {
  clips: [],
  completionEvidence: {
    unzip: {
      0: "The bag's lower-left fabric rim stays pinched between the left fingertip pads.",
      1: "The right fingertips hold the lower-right rim while the left gripper retains the opposite rim.",
      2: "Both grippers retain their holds, and the folded lower rim is taut between them.",
      3: "The zipper slider has moved toward the upper end and the zipper edges are visibly separated behind it.",
      4: "The lower-right rim remains pushed inward after the right gripper withdraws, while the left gripper holds the opposite rim.",
      5: "The zipper pull sits securely between the right fingertip pads while the left gripper holds the lower-left rim.",
      6: "The right arm is back at its recorded home pose while the left gripper still braces the bag.",
      7: "The right fingertip pads close around the lower-center zipper-pull loop while the left gripper continues to brace the bag.",
      8: "Both arms are at their recorded rest poses."
    },
    buckle: {
      0: "The buckle on the left shoulder strap stays enclosed between the left fingertip pads.",
      1: "The left gripper still holds the buckle, and the released shoulder strap is visibly lifted clear of its resting position.",
      2: "The buckle on the right shoulder strap stays enclosed between the right fingertip pads.",
      3: "The right gripper still holds the buckle, and the released right shoulder strap is visibly clear of its resting position.",
      4: "Both arms are back at their recorded rest poses after the right-side release.",
      5: "Both arms are back at their recorded rest poses after the left-side release."
    },
    coin: {
      0: "The coin is securely enclosed between the right fingertip pads at the holder.",
      1: "The left fingertips securely enclose the rim of the upright coin.",
      2: "The right gripper retains the coin with its exposed rim facing the left fingertips.",
      3: "The left fingertip pads retain the exposed coin edge as the right gripper releases.",
      4: "The left gripper holds the coin edge in line with the slot while the right gripper has released and withdrawn.",
      5: "The right-held coin edge is positioned in the top slot of the piggy bank.",
      6: "The coin has cleared the holder and remains held by the left gripper.",
      7: "The right fingertips retain the coin rim as the left gripper releases.",
      8: "The coin edge has entered the top slot and is still held by the right gripper.",
      9: "The left-held coin edge is positioned in the piggy bank's receiving slot.",
      10: "The left arm is at its recorded rest pose with the grippers in their previous states.",
      11: "Both arms are at their recorded rest poses with the grippers in their previous states."
    }
  },
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
        aspectRatio: '24 / 13',
        fps: 25,
        order: [1, 6, 7, 10, 8, 11],
        clips: {
          1: 'phases-demo/clips/coin-path1-P01.mp4',
          6: 'phases-demo/clips/coin-path1-P06.mp4',
          7: 'phases-demo/clips/coin-path1-P07.mp4',
          10: 'phases-demo/clips/coin-path1-P10.mp4',
          8: 'phases-demo/clips/coin-path1-P08.mp4',
          11: 'phases-demo/clips/coin-path1-P11.mp4'
        },
        ranges: {
          1: [26, 82],
          6: [83, 107],
          7: [108, 155],
          10: [156, 166],
          8: [167, 219],
          11: [220, 237]
        }
      },
      {
        id: 'path2',
        label: 'Path 2',
        detail: 'Simulation · Right-hand grasp, left-hand placement',
        aspectRatio: '24 / 13',
        fps: 25,
        order: [0, 2, 3, 4, 11],
        clips: {
          0: 'phases-demo/clips/coin-path2-P00.mp4',
          2: 'phases-demo/clips/coin-path2-P02.mp4',
          3: 'phases-demo/clips/coin-path2-P03.mp4',
          4: 'phases-demo/clips/coin-path2-P04.mp4',
          11: 'phases-demo/clips/coin-path2-P11.mp4'
        },
        ranges: {
          0: [26, 92],
          2: [93, 118],
          3: [119, 168],
          4: [169, 206],
          11: [207, 223]
        }
      }
    ]
  }
};

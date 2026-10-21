window.WALLE_DATA = {
  "media": {
    "mainVideo": "",
    "wristVideo": "",
    "synchronized": true,
    "episodeId": 0,
    "videos": {
      "main": "ep0-main-3x.mp4",
      "left": "ep0-left-3x.mp4",
      "right": "ep0-right-3x.mp4"
    },
    "encodedSpeed": 3
  },
  "situation": {
    "id": "unzip-flexible-bag",
    "title": "Unzip bag",
    "goal": "Open the zipper while maintaining stable support.",
    "relations": [
      "Left hand supports bag edge",
      "Right hand engages zipper tab",
      "Zipper moves relative to supported bag"
    ],
    "dependencies": [
      "Expose before grasp",
      "Support before zipper contact",
      "Stable grasp before pulling"
    ],
    "preparedSkills": [
      "VLA phase segments + prompts · training required",
      "Grasp control requirements · waypoints required"
    ],
    "phases": [
      {
        "id": 0,
        "name": "Adjust bag",
        "method": "VLA",
        "hand": "Bimanual",
        "prompt": "Adjust the bag to expose the zipper tab.",
        "goal": "Make the zipper accessible.",
        "object": "Flexible bag",
        "part": "Zipper region",
        "frames": [
          0,
          1374
        ],
        "image": "ep0-main-frame1374.png",
        "imageLabel": "Ep 0 · Main camera · Frame 1374 · Recorded reference",
        "reason": "Deformable geometry requires adaptive visual manipulation.",
        "preconditions": [
          "Bag manipulable"
        ],
        "evidence": [
          "Zipper tab exposed",
          "Target reachable with approach clearance"
        ],
        "recovery": "Continue adjusting while the zipper tab is occluded.",
        "action": "Reposition fabric and expose the tab.",
        "episodeId": 0,
        "referenceFrame": 1374,
        "views": {
          "main": "ep0-main-frame1374.png",
          "left": "ep0-left-frame1374.png",
          "right": "ep0-right-frame1374.png"
        },
        "annotationSource": "User-provided contract · English adaptation",
        "tools": [
          {
            "name": "Phase-Conditioned VLA",
            "purpose": "Execute the phase prompt using visual observations.",
            "icon": "policy"
          }
        ]
      },
      {
        "id": 1,
        "name": "Grasp edge",
        "method": "VLA",
        "hand": "Left hand",
        "prompt": "Hold the bag edge with the left gripper.",
        "goal": "Establish stable support.",
        "object": "Flexible bag",
        "part": "Bag edge",
        "frames": [
          1375,
          1695
        ],
        "image": "ep0-main-frame1695.png",
        "imageLabel": "Ep 0 · Main camera · Frame 1695 · Recorded reference",
        "reason": "The flexible edge varies with the current bag configuration.",
        "preconditions": [
          "Bag edge visible and reachable"
        ],
        "evidence": [
          "Left gripper holds the bag edge",
          "Bag support stable"
        ],
        "recovery": "Regrasp the bag edge if support becomes unstable.",
        "action": "Align the left gripper and secure the edge.",
        "episodeId": 0,
        "referenceFrame": 1695,
        "views": {
          "main": "ep0-main-frame1695.png",
          "left": "ep0-left-frame1695.png",
          "right": "ep0-right-frame1695.png"
        },
        "annotationSource": "User-provided contract · English adaptation",
        "tools": [
          {
            "name": "Phase-Conditioned VLA",
            "purpose": "Execute the phase prompt using visual observations.",
            "icon": "policy"
          }
        ]
      },
      {
        "id": 2,
        "name": "Grasp zipper",
        "method": "Control",
        "hand": "Right hand",
        "prompt": "Approach and grasp the zipper tab with the right gripper.",
        "goal": "Establish a stable zipper grasp.",
        "object": "Zipper",
        "part": "Zipper tab",
        "frames": [
          1696,
          2103
        ],
        "image": "ep0-main-frame2103.png",
        "imageLabel": "Ep 0 · Main camera · Frame 2103 · Recorded reference",
        "reason": "A small contact target benefits from explicit approach and grasp waypoints.",
        "preconditions": [
          "Zipper tab visible and reachable",
          "Bag-edge support stable"
        ],
        "evidence": [
          "Right gripper holds the zipper tab stably"
        ],
        "recovery": "Retry the grasp; return to Adjust bag if occluded, or Grasp edge if support is lost.",
        "action": "Follow pre-grasp → approach → contact waypoints.",
        "episodeId": 0,
        "referenceFrame": 2103,
        "views": {
          "main": "ep0-main-frame2103.png",
          "left": "ep0-left-frame2103.png",
          "right": "ep0-right-frame2103.png"
        },
        "annotationSource": "User-provided contract · English adaptation",
        "tools": [
          {
            "name": "SAM",
            "purpose": "Segment the target part.",
            "icon": "mask"
          },
          {
            "name": "Stereo",
            "purpose": "Localize the target in 3D.",
            "icon": "stereo"
          },
          {
            "name": "Waypoints",
            "purpose": "Define approach, alignment and grasp.",
            "icon": "path"
          },
          {
            "name": "cuRobo",
            "purpose": "Plan collision-aware motion.",
            "icon": "path"
          }
        ]
      },
      {
        "id": 3,
        "name": "Unzip bag",
        "method": "VLA",
        "hand": "Bimanual",
        "prompt": "Pull the zipper open while maintaining left-hand support.",
        "goal": "Open the zipper.",
        "object": "Flexible bag",
        "part": "Zipper track",
        "frames": [
          2104,
          2658
        ],
        "image": "ep0-main-frame2658.png",
        "imageLabel": "Ep 0 · Main camera · Frame 2658 · Recorded reference",
        "reason": "Pulling must adapt to changing fabric tension and contact.",
        "preconditions": [
          "Zipper grasp stable",
          "Bag support stable"
        ],
        "evidence": [
          "Zipper opened",
          "Task opening goal reached"
        ],
        "recovery": "Return to Grasp zipper after slip; return to Grasp edge after support loss.",
        "action": "Pull along the zipper while adapting to fabric tension.",
        "episodeId": 0,
        "referenceFrame": 2658,
        "views": {
          "main": "ep0-main-frame2658.png",
          "left": "ep0-left-frame2658.png",
          "right": "ep0-right-frame2658.png"
        },
        "annotationSource": "User-provided contract · English adaptation",
        "tools": [
          {
            "name": "Phase-Conditioned VLA",
            "purpose": "Execute the phase prompt using visual observations.",
            "icon": "policy"
          }
        ]
      }
    ]
  },
  "episodes": [
    {
      "id": "Ep 0",
      "episodeId": 0,
      "fps": 30,
      "length": 2855,
      "label": "Main case",
      "video": "ep0-main-3x.mp4",
      "poster": "ep0-main-frame1374.png",
      "annotated": true,
      "videos": {
        "main": "ep0-main-3x.mp4",
        "left": "ep0-left-3x.mp4",
        "right": "ep0-right-3x.mp4"
      },
      "encodedSpeed": 3,
      "playbackRate": 1
    },
    {
      "id": "Ep 2",
      "episodeId": 2,
      "fps": 30,
      "length": 990,
      "label": "Collection preview",
      "poster": "ep2-main-frame0.png",
      "annotated": false,
      "images": {
        "left": "ep2-left-poster.jpg",
        "main": "ep2-main-poster.jpg",
        "right": "ep2-right-poster.jpg"
      }
    },
    {
      "id": "Ep 3",
      "episodeId": 3,
      "fps": 30,
      "length": 2009,
      "label": "Collection preview",
      "poster": "ep3-main-frame0.png",
      "annotated": false,
      "images": {
        "left": "ep3-left-poster.jpg",
        "main": "ep3-main-poster.jpg",
        "right": "ep3-right-poster.jpg"
      }
    }
  ],
  "gripperEvents": {
    "source": "signals.js",
    "note": "Raw observation.state values; not inferred grasp success"
  },
  "offline": [
    [
      "Robot Demonstrations",
      "Three real demonstrations",
      "Ep 0, 2 and 3 · three camera views for Ep 0",
      "Recorded images, actions and robot states",
      "Ep 0 provides the phase sequence. Ep 2 and Ep 3 appear as collection preview images."
    ],
    [
      "Dataset / Episode",
      "Ep 0 · 2,855 frames · 30 fps",
      "Head camera, left wrist, right wrist and robot state",
      "Frame-aligned observations and 14-dimensional state",
      "Ep 0 contains 95.17 seconds of recorded interaction. State includes six joints and one gripper per arm; end-effector poses are also recorded."
    ],
    [
      "Coarse Segmentation",
      "10 gripper-event clips",
      "Recorded Ep 0 gripper values",
      "10 clips · 9 confirmed cuts",
      "User-confirmed gripper-event boundaries. A cut belongs to the preceding clip; raw values do not imply grasp success."
    ],
    [
      "Visual Semantic Analysis",
      "Action → observable change",
      "Four phase-end references in three views",
      "Action descriptions and expected end states",
      "Phase descriptions connect each interaction to its local goal and expected end state."
    ],
    [
      "Object / Part / Goal",
      "Ground each local objective",
      "Bag, bag edge, zipper tab and zipper track",
      "Phase-specific object, part and goal",
      "Adjust to expose the tab, hold the edge for support, acquire the tab, pull the zipper open."
    ],
    [
      "Execution Method Selection",
      "VLA / VLA / Control / VLA",
      "Local goals, geometry and contact requirements",
      "Capability route with an explicit rationale",
      "VLA handles deformable interactions. Zipper acquisition follows the right-arm control route."
    ],
    [
      "Skill Preparation",
      "Phase demonstrations and skill inputs",
      "Phase segments, prompts and control requirements",
      "VLA training materials and control preparation requirements",
      "Organize phase demonstrations and prompts for VLA, and geometric references for grasp control."
    ],
    [
      "Phase Cards / Control Materials",
      "Contracts + three-view references",
      "Four phase contracts and 12 reference images",
      "Phase cards and control materials",
      "Package local goals, prerequisites, completion conditions and recovery rules alongside frame references."
    ],
    [
      "Situation",
      "Task knowledge and skill references",
      "Task context, dependencies, contracts and material references",
      "One reusable Situation",
      "Situation organizes task context, phase dependencies, contracts and execution capabilities."
    ]
  ],
  "provenance": {
    "dataset": "LeRobot · IMetaY1",
    "selectedEpisodes": [
      0,
      2,
      3
    ],
    "excludedEpisodes": [
      1
    ],
    "boundaries": "User-annotated",
    "contracts": "Manually curated"
  },
  "coarse": {
    "cuts": [
      32,
      411,
      541,
      562,
      778,
      906,
      1374,
      1695,
      2103
    ],
    "source": "User-confirmed gripper-event cuts",
    "clips": [
      {
        "id": 0,
        "frames": [
          0,
          32
        ],
        "phaseId": 0
      },
      {
        "id": 1,
        "frames": [
          33,
          411
        ],
        "phaseId": 0
      },
      {
        "id": 2,
        "frames": [
          412,
          541
        ],
        "phaseId": 0
      },
      {
        "id": 3,
        "frames": [
          542,
          562
        ],
        "phaseId": 0
      },
      {
        "id": 4,
        "frames": [
          563,
          778
        ],
        "phaseId": 0
      },
      {
        "id": 5,
        "frames": [
          779,
          906
        ],
        "phaseId": 0
      },
      {
        "id": 6,
        "frames": [
          907,
          1374
        ],
        "phaseId": 0
      },
      {
        "id": 7,
        "frames": [
          1375,
          1695
        ],
        "phaseId": 1
      },
      {
        "id": 8,
        "frames": [
          1696,
          2103
        ],
        "phaseId": 2
      },
      {
        "id": 9,
        "frames": [
          2104,
          2658
        ],
        "phaseId": 3
      }
    ]
  },
  "analysisFrames": [
    0,
    2658
  ]
};

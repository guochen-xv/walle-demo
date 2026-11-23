(()=>{
  const tabsRoot=document.querySelector('#results-tabs');
  const panel=document.querySelector('#results-panel');
  const highlights=document.querySelector('#results-highlights');
  const viewNote=document.querySelector('#results-view-note');
  if(!tabsRoot||!panel||!highlights)return;

  const simulationMethods=[
    {key:'pi',label:'π0.5',group:'vla'},
    {key:'g',label:'G0.5',group:'vla'},
    {key:'dm',label:'DM0.5',group:'vla'},
    {key:'xr',label:'XR-1',group:'vla'},
    {key:'hy',label:'Hy-VLA',group:'vla'},
    {key:'cap',label:'CaP-X',group:'agent'},
    {key:'harness',label:'Harness VLA',group:'agent'},
    {key:'spotter',label:'Spotter',group:'agent'},
    {key:'pyrua',label:'PyRUA-Lean',group:'agent'},
    {key:'sl',label:'SL (ours)',group:'agent',ours:true}
  ];
  const simulationRows=[
    {task:'Deposit coin',values:{pi:[0,4.4],g:[0,.4],dm:[0,1.2],xr:[0,4.8],hy:[0,0],cap:[0,3.6],harness:[0,3.6],spotter:[2,6.8],pyrua:[10,16.4],sl:[32,45.6]}},
    {task:'Fold clothes',values:{pi:[44,51.2],g:[12,19.2],dm:[20,32.8],xr:[16,24],hy:[4,14.4],cap:[0,10.4],harness:[36,44.8],spotter:[48,53.6],pyrua:[36,40.8],sl:[64,70.83]}},
    {task:'Fold clothes · random',values:{pi:[24,32],g:[0,0],dm:[36,45.6],xr:[0,4],hy:[0,1.6],cap:[0,12.8],harness:[8,20],spotter:[28,35.2],pyrua:[36,40.8],sl:[36,44]}},
    {task:'Insert key',values:{pi:[0,7.2],g:[0,7.5],dm:[0,7.8],xr:[0,14.7],hy:[0,0],cap:[0,6.6],harness:[0,1.5],spotter:[0,5.4],pyrua:[0,12.9],sl:[10,22]}},
    {task:'Plug in charger',values:{pi:[4,4],g:[0,0],dm:[0,0],xr:[0,0],hy:[2,2],cap:[0,0],harness:[0,0],spotter:[2,2],pyrua:[10,10],sl:[22,22]}},
    {task:'Sweep blocks',values:{pi:[0,0],g:[0,0],dm:[4,4],xr:[4,4],hy:[0,0],cap:[0,0],harness:[0,0],spotter:[0,0],pyrua:[0,0],sl:[0,0]}}
  ];
  const realMethods=[
    {key:'pi',label:'π0.5',group:'vla'},
    {key:'g',label:'G0.5',group:'vla'},
    {key:'dm',label:'DM0.5',group:'vla'},
    {key:'harness',label:'Harness VLA',group:'agent'},
    {key:'spotter',label:'Spotter',group:'agent'},
    {key:'pyrua',label:'PyRUA-Lean',group:'agent'},
    {key:'sl',label:'SL (ours)',group:'agent',ours:true}
  ];
  const realRows=[
    {task:'Backpack zipper',values:{pi:46,g:0,dm:46,harness:0,spotter:0,pyrua:0,sl:52}},
    {task:'Wallet zipper',values:{pi:10,g:0,dm:2,harness:0,spotter:0,pyrua:0,sl:24}},
    {task:'Dishcloth hanging',values:{pi:62,g:0,dm:12,harness:0,spotter:0,pyrua:0,sl:76}},
    {task:'Buckle release',values:{pi:0,g:0,dm:0,harness:0,spotter:0,pyrua:0,sl:14}},
    {task:'Drawstring slider',values:{pi:26,g:0,dm:6,harness:0,spotter:0,pyrua:0,sl:46}},
    {task:'Handbag zipper',values:{pi:24,g:0,dm:0,harness:0,spotter:0,pyrua:0,sl:64}}
  ];
  const efficiencyRows=[
    {task:'Wallet zipper',pyrua:23.75,harness:3.87,spotter:3.06,sl:1.58},
    {task:'Backpack zipper',pyrua:14.87,harness:2.95,spotter:3.32,sl:1.29},
    {task:'Buckle release',pyrua:24.71,harness:3.12,spotter:3.97,sl:1.28},
    {task:'Dishcloth hanging',pyrua:19.95,harness:3.04,spotter:3.49,sl:1},
    {task:'Drawstring slider',pyrua:16.35,harness:2.87,spotter:4.22,sl:1.18},
    {task:'Handbag zipper',pyrua:18.88,harness:4.05,spotter:3.64,sl:1.82}
  ];

  const views=[
    {id:'real',label:'Real robot',context:'Six tasks · 50 VLA episodes per task',note:'Bars show task success rate. Agent baselines use 10 episodes per task.'},
    {id:'simulation',label:'Simulation',context:'Six RoboDojo tasks · one evaluation seed',note:'Cells show success rate (%) / official RoboDojo score.'},
    {id:'efficiency',label:'Execution efficiency',context:'Six real-robot tasks · lower is better',note:'Ratio of total duration to physical action duration.'}
  ];

  const mean=(rows,key)=>rows.reduce((sum,row)=>sum+row.values[key],0)/rows.length;
  const fmt=(value,decimals=1)=>Number(value).toFixed(decimals).replace(/\.0$/,'');
  const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const classNames=(...names)=>names.filter(Boolean).join(' ');

  function renderTabs(active){
    tabsRoot.innerHTML=views.map(view=>`<button type="button" role="tab" aria-selected="${view.id===active}" aria-controls="results-panel" data-results-view="${view.id}">${view.label}</button>`).join('');
    tabsRoot.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>render(button.dataset.resultsView)));
  }

  function renderHighlights(view){
    const content={
      simulation:[
        ['SIMULATION MACRO-AVERAGE','27.3%','Situated Learning success across six selected RoboDojo tasks.','accent'],
        ['STRONGEST BASELINE','15.3%','PyRUA-Lean is the strongest evaluated baseline by macro-average success.',''],
        ['TASK LEADS','4 / 6','Highest observed success on four tasks.','']
      ],
      real:[
        ['REAL-ROBOT MACRO-AVERAGE','46%','Situated Learning success across six fine-manipulation tasks.','accent'],
        ['BEST VLA BASELINE','28%','π0.5 is the strongest evaluated VLA baseline by task average.',''],
        ['TASK LEADS','6 / 6','Situated Learning has the highest observed success rate on every real-robot task.','']
      ],
      efficiency:[
        ['SL MEAN RATIO','1.36×','Mean total-to-action time ratio across six real-robot tasks.','accent'],
        ['HARNESS VLA MEAN','3.32×','Mean ratio for the fastest comparison agent.','']
      ]
    }[view];
    highlights.innerHTML=content.map(([eyebrow,value,description,accent])=>`<article class="results-highlight"><span class="eyebrow">${eyebrow}</span><strong class="${accent}">${value}</strong><p>${description}</p></article>`).join('');
  }

  function simulationTable(){
    const averageRate=key=>simulationRows.reduce((sum,row)=>sum+row.values[key][0],0)/simulationRows.length;
    const averageScore=key=>simulationRows.reduce((sum,row)=>sum+row.values[key][1],0)/simulationRows.length;
    const rows=simulationRows.map(row=>{
      const best=Math.max(...simulationMethods.map(method=>row.values[method.key][0]));
      return `<tr><td>${esc(row.task)}</td>${simulationMethods.map(method=>{const [rate,score]=row.values[method.key];const winner=rate===best&&rate>0;return `<td class="${classNames(method.ours?'ours':'',winner?'winner':'',rate===0?'muted-cell':'')}">${fmt(rate)}%<span class="score">${score.toFixed(2)}</span></td>`}).join('')}</tr>`;
    }).join('');
    const bestAverage=Math.max(...simulationMethods.map(method=>averageRate(method.key)));
    const summary=`<tr class="summary-row"><td>Macro-average</td>${simulationMethods.map(method=>`<td class="${classNames(method.ours?'ours':'',averageRate(method.key)===bestAverage?'winner':'')}">${fmt(averageRate(method.key))}%<span class="score">${averageScore(method.key).toFixed(2)}</span></td>`).join('')}</tr>`;
    return `<div class="results-panel-head"><div><span class="results-kicker">ROBO DOJO · END-TO-END EXECUTION</span><h3>Situated Learning leads the selected task set.</h3></div><p>Cells report success rate and evaluator score. Bold cells mark each task's highest observed success.</p></div><div class="results-table-wrap"><table class="results-table results-simulation-table"><thead><tr><th rowspan="2">Task</th><th colspan="5" class="group-vla">VLA</th><th colspan="5" class="group-agent">Agent</th></tr><tr>${simulationMethods.map(method=>`<th class="${method.ours?'ours':''}">${method.label}</th>`).join('')}</tr></thead><tbody>${rows}${summary}</tbody></table></div><div class="results-legend"><span><i></i> success rate</span><span><i class="score-dot"></i> evaluator score</span><span>Evaluation budget: 225 episodes per method across six tasks</span></div>`;
  }

  function realTable(){
    const average=key=>realRows.reduce((sum,row)=>sum+row.values[key],0)/realRows.length;
    const rows=realRows.map(row=>{const best=Math.max(...realMethods.map(method=>row.values[method.key]));return `<tr><td>${esc(row.task)}</td>${realMethods.map(method=>`<td class="results-bar-cell ${classNames(method.ours?'ours':'',row.values[method.key]===best&&best>0?'winner':'')}">${row.values[method.key]}%<div class="results-bar"><i style="width:${row.values[method.key]}%"></i></div></td>`).join('')}</tr>`;}).join('');
    const bestAverage=Math.max(...realMethods.map(method=>average(method.key)));
    const summary=`<tr class="summary-row"><td>Mean</td>${realMethods.map(method=>`<td class="${classNames(method.ours?'ours':'',average(method.key)===bestAverage?'winner':'')}">${fmt(average(method.key))}%<div class="results-bar"><i style="width:${average(method.key)}%"></i></div></td>`).join('')}</tr>`;
    return `<div class="results-panel-head"><div><span class="results-kicker">IMETAY1 · REAL-ROBOT BENCHMARK</span><h3>Situation-guided execution lifts every task.</h3></div><p>Success uses each task's physical criterion. Rollouts receive no human intervention.</p></div><div class="results-table-wrap"><table class="results-table results-real-table"><thead><tr><th rowspan="2">Task</th><th colspan="3" class="group-vla">VLA</th><th colspan="4" class="group-agent">Agent</th></tr><tr>${realMethods.map(method=>`<th class="${method.ours?'ours':''}">${method.label}</th>`).join('')}</tr></thead><tbody>${rows}${summary}</tbody></table></div><p class="results-caption">VLA and Situated Learning use 50 episodes per task. Agent baselines use 10 episodes per task with at most 20 API calls per episode.</p>`;
  }

  function efficiencyTable(){
    const methods=[['pyrua','PyRUA-Lean'],['harness','Harness VLA'],['spotter','Spotter'],['sl','SL (ours)']];
    const average=key=>efficiencyRows.reduce((sum,row)=>sum+row[key],0)/efficiencyRows.length;
    const rows=efficiencyRows.map(row=>{const best=Math.min(...methods.map(([key])=>row[key]));return `<tr><td>${row.task}</td>${methods.map(([key])=>`<td class="${classNames(key==='sl'?'ours':'',row[key]===best?'best':'')}">${row[key].toFixed(2)}×</td>`).join('')}</tr>`;}).join('');
    const bestAverage=Math.min(...methods.map(([key])=>average(key)));
    const summary=`<tr class="summary-row"><td>Mean ratio</td>${methods.map(([key])=>`<td class="${classNames(key==='sl'?'ours':'',average(key)===bestAverage?'best':'')}">${average(key).toFixed(2)}×</td>`).join('')}</tr>`;
    return `<div class="results-panel-head"><div><span class="results-kicker">REAL-ROBOT RUNTIME</span><h3>Phase-local execution keeps overhead close to action time.</h3></div><p>Lower values indicate greater efficiency. Total duration includes inference and execution overhead.</p></div><div class="results-table-wrap"><table class="results-table results-efficiency-table"><thead><tr><th>Task</th>${methods.map(([key,label])=>`<th class="${key==='sl'?'ours':''}">${label}</th>`).join('')}</tr></thead><tbody>${rows}${summary}</tbody></table></div><div class="results-legend"><span><i></i> lowest ratio on the task</span><span>R = total duration / physical action duration</span></div>`;
  }

  function render(view='real'){
    const selected=views.find(item=>item.id===view)||views[0];
    renderTabs(selected.id);
    renderHighlights(selected.id);
    viewNote.textContent=selected.note;
    panel.innerHTML={simulation:simulationTable,real:realTable,efficiency:efficiencyTable}[selected.id]();
  }

  render();
})();

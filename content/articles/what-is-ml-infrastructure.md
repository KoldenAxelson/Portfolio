---
title: 'What Is ML Infrastructure?'
description: "The AI model is the tiny genius in the box. ML infrastructure is everything around it: the plumbing that turns one clever model into a product a million people can use. A ground-up explainer, with things you can poke at."
pubDate: 2026-07-15
tags: ['ml', 'infrastructure', 'mlops', 'explainer']
thoughts:
  - "Wrote the version I wish someone had handed me when 'MLOps' still sounded like a spell."
  - "The model is the recipe. Everything I actually get paid for is the restaurant."
---

<style>
  .mli-demo{border:1px solid rgb(var(--c-border));border-radius:.75rem;background:rgb(var(--c-border) / .12);padding:1.1rem 1.15rem;margin:1.9rem 0;}
  .mli-demo-label{font-family:var(--font-mono);font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:rgb(var(--c-muted));margin-bottom:.85rem;}
  .mli-caption{font-size:.8rem;color:rgb(var(--c-muted));margin-top:.85rem;line-height:1.5;}
  .mli-input{width:100%;box-sizing:border-box;font:inherit;font-size:.95rem;padding:.5rem .65rem;border:1px solid rgb(var(--c-border));border-radius:.45rem;background:rgb(var(--c-bg));color:rgb(var(--c-fg));}
  .mli-input:focus-visible{outline:2px solid rgb(var(--c-accent));outline-offset:1px;}
  .mli-nn-wrap{display:flex;flex-wrap:wrap;gap:1.15rem;align-items:center;margin-top:.4rem;}
  .mli-nn-pad{width:196px;height:196px;flex:none;border:1px solid rgb(var(--c-border));border-radius:.5rem;background:rgb(var(--c-bg));touch-action:none;cursor:crosshair;display:block;}
  .mli-nn-out{flex:1;min-width:190px;}
  .mli-nn-guess{font-size:.95rem;color:rgb(var(--c-muted));margin-bottom:.65rem;}
  .mli-nn-pred{font-family:var(--font-mono);font-size:1.55rem;font-weight:700;color:rgb(var(--c-fg));}
  .mli-nn-bars{display:flex;flex-direction:column;gap:.22rem;}
  .mli-nn-bar{display:flex;align-items:center;gap:.5rem;font-family:var(--font-mono);font-size:.68rem;}
  .mli-nn-bar b{width:.9rem;text-align:right;color:rgb(var(--c-muted));font-weight:400;}
  .mli-nn-track{flex:1;height:.5rem;border-radius:999px;background:rgb(var(--c-border) / .5);overflow:hidden;}
  .mli-nn-val{height:100%;width:0;background:rgb(var(--c-accent) / .5);transition:width .12s ease;}
  .mli-nn-bar.mli-top .mli-nn-val{background:rgb(var(--c-accent));}
  .mli-nn-bar.mli-top b{color:rgb(var(--c-fg));font-weight:600;}
  .mli-btn-ghost{background:transparent;border-color:rgb(var(--c-border));}
  .mli-btn-ghost:hover{background:rgb(var(--c-border) / .3);}
  .mli-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;margin-top:1rem;}
  .mli-btn{font:inherit;font-size:.85rem;font-weight:500;padding:.42rem .9rem;border-radius:.5rem;border:1px solid rgb(var(--c-accent) / .5);background:rgb(var(--c-accent) / .12);color:rgb(var(--c-fg));cursor:pointer;transition:transform .12s ease,background-color .15s ease;}
  .mli-btn:hover{background:rgb(var(--c-accent) / .2);}
  .mli-btn:active{transform:scale(.97);}
  .mli-btn:disabled{opacity:.5;cursor:default;}
  .mli-toggle{display:inline-flex;align-items:center;gap:.45rem;font-size:.82rem;color:rgb(var(--c-muted));cursor:pointer;}
  .mli-toggle input{accent-color:rgb(var(--c-accent));}
  .mli-mo-view{overflow:hidden;border:1px solid rgb(var(--c-border));border-radius:.6rem;background:rgb(var(--c-bg));}
  .mli-mo-track{display:flex;transition:transform .45s cubic-bezier(.16,1,.3,1);}
  .mli-mo-slide{flex:0 0 100%;min-width:100%;box-sizing:border-box;padding:1.1rem 1.2rem 1.25rem;}
  .mli-mo-stage{height:132px;display:flex;align-items:center;justify-content:center;border-radius:.5rem;background:rgb(var(--c-border) / .14);overflow:hidden;position:relative;}
  .mli-mo-h{margin:.9rem 0 .35rem;font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:rgb(var(--c-accent));}
  .mli-mo-p{margin:0;font-size:.9rem;color:rgb(var(--c-muted));line-height:1.55;}
  .mli-mo-nav{display:flex;align-items:center;justify-content:center;gap:.9rem;margin-top:.85rem;}
  .mli-mo-btn{font:inherit;font-size:1.05rem;line-height:1;width:1.9rem;height:1.9rem;border-radius:999px;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-fg));cursor:pointer;transition:background-color .15s ease,transform .12s ease;}
  .mli-mo-btn:hover{background:rgb(var(--c-border) / .35);}
  .mli-mo-btn:active{transform:scale(.92);}
  .mli-mo-dots{display:flex;gap:.4rem;}
  .mli-mo-dot{width:.5rem;height:.5rem;border-radius:999px;background:rgb(var(--c-border));border:none;padding:0;cursor:pointer;transition:background-color .2s ease,transform .2s ease;}
  .mli-mo-dot.is-on{background:rgb(var(--c-accent));transform:scale(1.25);}
  .mli-mo-num{font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:rgb(var(--c-fg));font-variant-numeric:tabular-nums;}
  /* step 1 · ingest: data tiles flow into the model box */
  .mo-ingest{position:relative;width:280px;height:104px;}
  .mo-lab{position:absolute;font-family:var(--font-mono);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:rgb(var(--c-muted));}
  .mo-lab-data{left:-50px;top:-4px;}
  .mo-tile{position:absolute;width:20px;height:20px;border-radius:.25rem;background:rgb(var(--c-accent) / .3);border:1px solid rgb(var(--c-accent) / .6);}
  .mo-model{position:absolute;right:0;top:50%;transform:translateY(-50%);width:76px;height:76px;border-radius:.5rem;border:1.5px solid rgb(var(--c-accent) / .7);background:rgb(var(--c-accent) / .12);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.72rem;color:rgb(var(--c-fg));transition:transform .14s ease,border-color .14s ease,background-color .14s ease;}
  .mo-model.mo-eat{transform:translateY(-50%) scale(1.14);border-color:rgb(var(--c-accent));background:rgb(var(--c-accent) / .22);}
  /* step 2 · train: a live neural net */
  .mo-net{width:250px;height:104px;}
  .mo-net line{stroke:rgb(var(--c-accent) / .4);stroke-width:1.4;stroke-dasharray:4 6;}
  .mo-net circle{fill:rgb(var(--c-accent) / .3);stroke:rgb(var(--c-accent) / .85);stroke-width:1.4;opacity:.7;}
  .mo-eff{position:absolute;right:6px;top:5px;text-align:right;}
  .mo-eff .mli-mo-num{font-size:1.05rem;}
  .mo-eff small{display:block;font-family:var(--font-mono);font-size:.52rem;letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--c-muted));}
  /* step 3 · evaluate: v1 vs v2 */
  .mo-cmp{display:flex;flex-direction:column;gap:.8rem;width:84%;}
  .mo-cmp-row{display:flex;align-items:center;gap:.55rem;}
  .mo-cmp-chip{flex:0 0 auto;font-family:var(--font-mono);font-size:.64rem;padding:.16rem .4rem;border-radius:.3rem;background:rgb(var(--c-accent) / .14);border:1px solid rgb(var(--c-accent) / .45);color:rgb(var(--c-fg));min-width:3.7rem;text-align:center;}
  .mo-cmp-row.is-win .mo-cmp-chip{background:rgb(var(--c-accent) / .3);font-weight:600;}
  .mo-cmp-track{flex:1;display:block;height:.6rem;border-radius:999px;background:rgb(var(--c-border) / .5);border:1px solid rgb(var(--c-border));overflow:hidden;}
  .mo-cmp-fill{display:block;height:100%;width:0;background:rgb(var(--c-accent) / .6);border-radius:999px;}
  .mo-cmp-row.is-win .mo-cmp-fill{background:rgb(var(--c-accent));}
  .mo-cmp-pct{flex:0 0 auto;font-family:var(--font-mono);font-size:.78rem;font-variant-numeric:tabular-nums;color:rgb(var(--c-fg));min-width:3rem;text-align:right;}
  /* step 4 · gate: tests passing one by one */
  .mo-tests{display:grid;grid-template-columns:1fr 1fr;gap:.45rem 1.1rem;width:92%;}
  .mo-test{display:flex;align-items:center;gap:.5rem;font-family:var(--font-mono);font-size:.68rem;color:rgb(var(--c-fg));}
  .mo-tick{flex:0 0 auto;width:1.15rem;height:1.15rem;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:.7rem;border:1.5px solid rgb(var(--c-accent));background:rgb(var(--c-accent));color:rgb(var(--c-bg));}
  /* step 5 · serve */
  .mli-mo-deploy{display:flex;align-items:center;gap:.7rem;}
  .mli-mo-chip{font-family:var(--font-mono);font-size:.72rem;padding:.22rem .5rem;border-radius:.35rem;background:rgb(var(--c-accent) / .18);border:1px solid rgb(var(--c-accent) / .5);color:rgb(var(--c-fg));}
  .mli-mo-server{width:2.7rem;height:2.9rem;border-radius:.35rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));position:relative;overflow:hidden;}
  .mli-mo-server::after{content:"";position:absolute;left:.4rem;bottom:.34rem;width:.42rem;height:.42rem;border-radius:999px;background:rgb(var(--c-accent));z-index:2;}
  .mo-slot{position:absolute;left:0;right:0;top:0;bottom:.55rem;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:.68rem;font-weight:600;color:rgb(var(--c-fg));}
  .mo-slot-old{opacity:0;}
  .mo-slot-new{opacity:1;}
  @media (prefers-reduced-motion:no-preference){
    .mli-mo-slide.is-active [data-anim=net] .mo-net circle{animation:moNode 1.8s ease-in-out infinite;}
    .mli-mo-slide.is-active [data-anim=net] .mo-net line{animation:moFlow 1.1s linear infinite;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-tick{animation:moTick .5s cubic-bezier(.16,1,.3,1) both;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(1) .mo-tick{animation-delay:.15s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(3) .mo-tick{animation-delay:.35s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(5) .mo-tick{animation-delay:.55s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(7) .mo-tick{animation-delay:.75s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(2) .mo-tick{animation-delay:1.35s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(4) .mo-tick{animation-delay:1.55s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(6) .mo-tick{animation-delay:1.75s;}
    .mli-mo-slide.is-active [data-anim=gate] .mo-test:nth-child(8) .mo-tick{animation-delay:1.95s;}
    .mli-mo-slide.is-active [data-anim=serve] .mli-mo-chip{animation:moSlide 1.7s ease-in-out infinite;}
    .mli-mo-slide.is-active [data-anim=serve] .mli-mo-server::after{animation:moGreen 1.7s ease-in-out infinite;}
    .mli-mo-slide.is-active [data-anim=serve] .mo-slot-old{animation:moOldOut 1.7s ease-in-out infinite;}
    .mli-mo-slide.is-active [data-anim=serve] .mo-slot-new{animation:moNewIn 1.7s ease-in-out infinite;}
  }
  @keyframes moNode{0%,100%{opacity:.55;}50%{opacity:1;}}
  @keyframes moFlow{to{stroke-dashoffset:-20;}}
  @keyframes moTick{0%{transform:scale(.2);border-color:rgb(var(--c-border));background:transparent;color:transparent;}60%{transform:scale(1.18);}100%{transform:scale(1);border-color:rgb(var(--c-accent));background:rgb(var(--c-accent));color:rgb(var(--c-bg));}}
  @keyframes moSlide{0%{transform:translateX(-10px);opacity:.2;}42%,100%{transform:translateX(0);opacity:1;}}
  @keyframes moGreen{0%,42%{background:rgb(var(--c-border));}62%,100%{background:rgb(var(--c-accent));}}
  @keyframes moOldOut{0%,40%{transform:translateY(0);opacity:1;}55%,100%{transform:translateY(-130%);opacity:0;}}
  @keyframes moNewIn{0%,45%{transform:translateY(130%);opacity:0;}60%,100%{transform:translateY(0);opacity:1;}}
  .mli-row{display:flex;align-items:center;gap:.75rem;margin-top:.75rem;font-size:.82rem;color:rgb(var(--c-muted));}
  .mli-row label{min-width:9.5rem;}
  .mli-range{flex:1;accent-color:rgb(var(--c-accent));}
  .mli-val{font-family:var(--font-mono);color:rgb(var(--c-fg));}
  .mli-servers{display:flex;gap:.3rem;margin-top:.85rem;min-height:1.65rem;flex-wrap:wrap;}
  .mli-server{width:1.5rem;height:1.5rem;border-radius:.3rem;background:rgb(var(--c-accent) / .18);border:1px solid rgb(var(--c-accent) / .5);display:flex;align-items:center;justify-content:center;font-size:.7rem;color:rgb(var(--c-fg));}
  .mli-bar{height:.6rem;border-radius:999px;background:rgb(var(--c-border) / .55);overflow:hidden;margin-top:.75rem;}
  .mli-bar-fill{height:100%;width:20%;background:rgb(var(--c-accent));transition:width .2s ease,background-color .2s ease;}
  .mli-bar-fill.mli-bad{background:#d9534f;}
  .mli-cost{font-family:var(--font-mono);font-size:1.7rem;font-weight:600;color:rgb(var(--c-fg));margin-top:.9rem;font-variant-numeric:tabular-nums;}
  .mli-cost small{font-size:.8rem;color:rgb(var(--c-muted));font-weight:400;}
  .mli-gi-sub{font-family:var(--font-mono);font-size:.66rem;letter-spacing:.07em;text-transform:uppercase;color:rgb(var(--c-muted));margin-top:-.2rem;}
  .mli-gi-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:.5rem .3rem;margin-top:.95rem;justify-items:center;}
  @media (max-width:520px){.mli-gi-grid{grid-template-columns:repeat(5,1fr);}}
  .mli-drift-cvs{display:block;width:100%;max-width:560px;height:170px;margin-top:.5rem;}
  .mli-tok-in{width:100%;box-sizing:border-box;min-height:4.4rem;resize:vertical;font:inherit;font-size:.92rem;line-height:1.5;padding:.6rem .7rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-fg));margin-top:.3rem;}
  .mli-tok-chips{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.85rem;}
  .mli-tok-chip{font-family:var(--font-mono);font-size:.8rem;padding:.12rem .32rem;border-radius:.3rem;border:1px solid transparent;white-space:pre;color:rgb(var(--c-fg));}
  .mli-tok-ws{background:rgb(var(--c-border) / .35);border-color:rgb(var(--c-border));color:rgb(var(--c-muted));}
  .mli-tok-lead{color:rgb(var(--c-muted));opacity:.55;margin-right:.03rem;}
  .mli-tok-stat{margin-top:.8rem;font-size:.85rem;color:rgb(var(--c-muted));line-height:1.5;}
  .mli-tok-stat b{color:rgb(var(--c-fg));font-variant-numeric:tabular-nums;}
  .mli-rag-qs{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.3rem;}
  .mli-rag-q{font:inherit;font-size:.8rem;text-align:left;padding:.35rem .6rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));background:rgb(var(--c-bg));color:rgb(var(--c-fg));cursor:pointer;transition:background-color .15s ease,border-color .15s ease;}
  .mli-rag-q:hover{background:rgb(var(--c-border) / .3);}
  .mli-rag-q.is-on{background:rgb(var(--c-accent) / .16);border-color:rgb(var(--c-accent) / .6);font-weight:600;}
  .mli-rag-kb{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:.9rem;}
  @media (max-width:520px){.mli-rag-kb{grid-template-columns:repeat(2,1fr);}}
  .mli-rag-card{padding:.5rem .55rem .4rem;border-radius:.5rem;border:1.5px solid rgb(var(--c-border));background:rgb(var(--c-bg));transition:border-color .2s ease,opacity .2s ease,transform .2s ease;}
  .mli-rag-card.is-hit{border-color:rgb(var(--c-accent));transform:translateY(-2px);}
  .mli-rag-card.is-dim{opacity:.5;}
  .mli-rag-t{font-family:var(--font-mono);font-size:.72rem;font-weight:700;color:rgb(var(--c-fg));}
  .mli-rag-x{font-size:.74rem;color:rgb(var(--c-muted));line-height:1.4;margin-top:.2rem;}
  .mli-rag-bar{height:.28rem;border-radius:999px;background:rgb(var(--c-border) / .5);overflow:hidden;margin-top:.4rem;}
  .mli-rag-bar span{display:block;height:100%;width:0;background:rgb(var(--c-accent));border-radius:999px;transition:width .35s cubic-bezier(.16,1,.3,1);}
  .mli-rag-ans{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.9rem;}
  @media (max-width:560px){.mli-rag-ans{grid-template-columns:1fr;}}
  .mli-rag-panel{padding:.6rem .7rem;border-radius:.5rem;border:1px solid rgb(var(--c-border));}
  .mli-rag-panel p{margin:.4rem 0 0;font-size:.85rem;line-height:1.5;color:rgb(var(--c-fg));}
  .mli-rag-panel.is-no{border-color:rgba(217,83,79,.55);background:rgba(217,83,79,.06);}
  .mli-rag-panel.is-yes{border-color:rgb(var(--c-accent) / .6);background:rgb(var(--c-accent) / .07);}
  .mli-rag-h{font-family:var(--font-mono);font-size:.72rem;font-weight:700;color:rgb(var(--c-fg));display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;}
  .mli-rag-tag{font-weight:400;font-size:.62rem;letter-spacing:.04em;text-transform:uppercase;color:rgb(var(--c-muted));}
  .mli-rag-ctx{margin-top:.4rem;font-size:.72rem;font-style:italic;color:rgb(var(--c-muted));line-height:1.45;}
  .mli-rag-src{display:inline-block;font-family:var(--font-mono);font-size:.62rem;padding:.06rem .32rem;border-radius:.3rem;background:rgb(var(--c-accent) / .16);border:1px solid rgb(var(--c-accent) / .5);color:rgb(var(--c-fg));vertical-align:middle;}
  .mli-ag-phases{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem;margin-top:.3rem;font-family:var(--font-mono);font-size:.68rem;}
  .mli-ag-pill{padding:.16rem .5rem;border-radius:999px;border:1px solid rgb(var(--c-border));color:rgb(var(--c-muted));letter-spacing:.04em;text-transform:uppercase;transition:background-color .2s ease,color .2s ease,border-color .2s ease;}
  .mli-ag-pill.is-active{background:rgb(var(--c-accent) / .18);border-color:rgb(var(--c-accent));color:rgb(var(--c-fg));}
  .mli-ag-arrow{color:rgb(var(--c-muted));}
  .mli-ag-loop{color:rgb(var(--c-muted));font-size:.9rem;}
  .mli-ag-done{margin-left:.2rem;padding:.16rem .5rem;border-radius:999px;background:rgb(var(--c-accent));color:rgb(var(--c-bg));letter-spacing:.04em;text-transform:uppercase;opacity:0;transform:scale(.8);transition:opacity .25s ease,transform .25s ease;}
  .mli-ag-done.is-on{opacity:1;transform:scale(1);}
  .mli-ag-log{margin-top:.85rem;display:flex;flex-direction:column;gap:.4rem;}
  .mli-ag-step{display:flex;gap:.6rem;align-items:flex-start;}
  .mli-ag-lab{flex:0 0 auto;width:4.4rem;font-family:var(--font-mono);font-size:.6rem;font-weight:700;letter-spacing:.06em;padding:.2rem .3rem;border-radius:.3rem;text-align:center;color:rgb(var(--c-muted));background:rgb(var(--c-border) / .3);}
  .mli-ag-body{font-size:.85rem;line-height:1.5;color:rgb(var(--c-fg));padding-top:.05rem;}
  .t-thought .mli-ag-body{font-style:italic;color:rgb(var(--c-muted));}
  .t-thought .mli-ag-lab{color:rgb(var(--c-fg));}
  .t-action .mli-ag-lab{background:rgb(var(--c-accent) / .2);color:rgb(var(--c-fg));}
  .t-action .mli-ag-body{font-family:var(--font-mono);font-size:.8rem;background:rgb(var(--c-accent) / .1);border:1px solid rgb(var(--c-accent) / .35);border-radius:.35rem;padding:.2rem .45rem;}
  .t-obs .mli-ag-body{font-family:var(--font-mono);font-size:.78rem;white-space:pre-wrap;color:rgb(var(--c-muted));border-left:2px solid rgb(var(--c-border));padding-left:.5rem;}
  .t-answer .mli-ag-lab{background:rgb(var(--c-accent));color:rgb(var(--c-bg));}
  .t-answer .mli-ag-body{font-weight:600;background:rgb(var(--c-accent) / .1);border:1px solid rgb(var(--c-accent) / .4);border-radius:.35rem;padding:.35rem .5rem;}
  @media (prefers-reduced-motion:no-preference){
    .mli-ag-step{opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s cubic-bezier(.16,1,.3,1);}
    .mli-ag-step.is-shown{opacity:1;transform:none;}
  }
  .mli-cite{margin:1.1rem 0 .4rem;}
  .mli-cite-view{overflow:hidden;border:1px solid rgb(var(--c-border));border-radius:.6rem;background:rgb(var(--c-bg));}
  .mli-cite-track{display:flex;}
  @media (prefers-reduced-motion:no-preference){.mli-cite-track{transition:transform .45s cubic-bezier(.16,1,.3,1);}}
  .mli-cite-card{flex:0 0 100%;min-width:100%;box-sizing:border-box;padding:1.15rem 1.25rem 1.25rem;min-height:9.5rem;display:flex;flex-direction:column;}
  .mli-cite-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem;}
  .mli-cite-tag{font-family:var(--font-mono);font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-accent));border:1px solid rgb(var(--c-accent) / .4);background:rgb(var(--c-accent) / .1);padding:.16rem .5rem;border-radius:999px;}
  .mli-cite-num{font-family:var(--font-mono);font-size:.72rem;color:rgb(var(--c-muted));font-variant-numeric:tabular-nums;}
  .mli-cite-title{margin:.1rem 0 .35rem;font-size:1.02rem;line-height:1.32;font-weight:600;}
  .mli-cite-title a{color:rgb(var(--c-fg));text-decoration:none;border-bottom:1px solid rgb(var(--c-accent) / .5);transition:color .15s ease;}
  .mli-cite-title a:hover{color:rgb(var(--c-accent));}
  .mli-cite-meta{font-family:var(--font-mono);font-size:.72rem;color:rgb(var(--c-muted));margin-bottom:.55rem;}
  .mli-cite-note{margin:0;font-size:.88rem;line-height:1.55;color:rgb(var(--c-muted));}
  .mli-cite-nav{display:flex;align-items:center;justify-content:center;gap:.9rem;margin-top:.85rem;}
  .mli-cite-dots{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;max-width:72%;}
  .mli-gi-cell{display:flex;flex-direction:column;align-items:center;gap:.15rem;padding:.28rem .28rem .2rem;border-radius:.4rem;border:1.5px solid rgb(var(--c-border));transition:border-color .25s ease;}
  .mli-gi-cell.is-right{border-color:rgb(var(--c-accent) / .8);}
  .mli-gi-cell.is-wrong{border-color:#d9534f;}
  .mli-gi-thumb{display:block;width:34px;height:34px;image-rendering:pixelated;}
  .mli-gi-plab{font-family:var(--font-mono);font-size:.72rem;font-weight:600;color:rgb(var(--c-fg));line-height:1;}
  .mli-gi-cell.is-wrong .mli-gi-plab{color:#d9534f;}
  @media (prefers-reduced-motion:no-preference){
    .mli-anim .prose > *:not(header){opacity:0;transform:translateY(14px);transition:opacity .55s ease,transform .55s cubic-bezier(.16,1,.3,1);}
    .mli-anim .prose > .mli-in{opacity:1;transform:none;}
  }
</style>

<script>
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)").matches) {
    document.documentElement.classList.add("mli-anim");
  }
</script>

When you type a question into an AI app and an answer appears, it feels like there's a tiny genius living in the box. There sort of is. But the genius, the *model*, turns out to be a surprisingly small part of the story. Almost all of the work, and almost all of the engineering jobs, live in the plumbing around it.

That plumbing is called **ML infrastructure**. Once you can see it, you can't unsee it. Let me build it up one piece at a time, with a few toys you can poke at along the way.

## First: what even is a "model"?

Forget the sci-fi for a second. A machine-learning model is just a *function*: something goes in, something comes out. While it was being trained, it looked at a mountain of examples and slowly tuned itself to notice patterns. After that, it doesn't "think." It maps inputs to outputs. That's the whole trick.

Here's a real one, running entirely on your machine. Draw a digit from 0 to 9 in the box and a small neural network guesses what you drew. This isn't a lookup or a trick. It's about nineteen thousand numbers that were *trained* on tens of thousands of handwritten digits until they learned the shapes of numerals. No server, no internet, just a little math in your browser.

<div class="not-prose mli-demo" id="mli-nn">
<div class="mli-demo-label">Live · a real neural net, running in your browser</div>
<div class="mli-nn-wrap"><canvas class="mli-nn-pad" id="mli-nn-pad" width="280" height="280" aria-label="Draw a digit here"></canvas><div class="mli-nn-out"><div class="mli-nn-guess">it thinks you drew a <span class="mli-nn-pred" id="mli-nn-pred">?</span></div><div class="mli-nn-bars" id="mli-nn-bars"></div></div></div>
<div class="mli-controls"><button class="mli-btn" id="mli-nn-sample" type="button">Load a real sample</button><button class="mli-btn mli-btn-ghost" id="mli-nn-clear" type="button">Clear</button></div>
<div class="mli-caption" id="mli-nn-cap">Draw a digit (0-9) with your mouse or finger, or load a real one. About 19,000 trained numbers, quantized to shrink them, decide the answer.</div>
</div>

That's the whole model: pixels go in, a prediction comes out. It learned its rules from examples instead of being handed any, and it's still tiny (about nineteen thousand numbers, squeezed down with the same quantization trick we meet later). The model behind a chatbot is millions of times bigger, but the shape is identical. Everything else in this article is the stuff around that box.

A useful picture: the model is a **recipe**. Infrastructure is the **restaurant**: the kitchen, the walk-in fridges, the supply trucks, the waiters, the dish pit. Everything that turns one good recipe into a thousand hot meals a night without giving anyone food poisoning.

## The model is the easy part

Getting a model that works *once*, on your laptop, is the easy 10%. The hard 90% is everything needed to get fresh data into it, retrain it safely, and put the result in front of real users, again and again, automatically. A well-known paper drew this literally: in a real ML system, the box holding the actual machine-learning code is a tiny speck, ringed by a sprawl of data, serving, and monitoring infrastructure that dwarfs it ([Sculley et al., "Hidden Technical Debt in Machine Learning Systems"](https://proceedings.neurips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html)). That loop of retraining and shipping has a name: **MLOps** (machine-learning operations), and the thing that makes it its own discipline is *continuous retraining* — a model, unlike ordinary software, has to keep relearning to stay correct.

Step through the loop below. Each stage is a whole category of tooling and engineering, and the entire thing runs on repeat every time fresh data shows up.

<div class="not-prose mli-demo" id="mli-mo">
<div class="mli-demo-label">Live · the MLOps loop, step by step</div>
<div class="mli-mo-view"><div class="mli-mo-track" id="mli-mo-track"><div class="mli-mo-slide"><div class="mli-mo-stage" data-anim="ingest"><div class="mo-ingest"><span class="mo-lab mo-lab-data">data</span><span class="mo-tile" style="left:-50px;top:42px"></span><span class="mo-tile" style="left:-14px;top:42px"></span><span class="mo-tile" style="left:22px;top:42px"></span><span class="mo-tile" style="left:58px;top:42px"></span><span class="mo-model">Model</span></div></div><div class="mli-mo-h">Step 1 · Ingest data</div><p class="mli-mo-p">Fresh labeled examples land in the pipeline, then feed one by one into the model to learn from: new handwriting, new edge cases, the messy stuff from the real world.</p></div><div class="mli-mo-slide"><div class="mli-mo-stage" data-anim="net"><svg class="mo-net" id="mli-mo-net" viewBox="0 0 250 104" xmlns="http://www.w3.org/2000/svg"></svg><div class="mo-eff"><div class="mli-mo-num" id="mli-mo-eff">0.0%</div><small>efficiency</small></div></div><div class="mli-mo-h">Step 2 · Train</div><p class="mli-mo-p">Data flashes across the layers while the model tunes its weights and biases, chasing a lower error with every pass.</p></div><div class="mli-mo-slide"><div class="mli-mo-stage" data-anim="cmp"><div class="mo-cmp"><div class="mo-cmp-row"><span class="mo-cmp-chip">model v1</span><span class="mo-cmp-track"><span class="mo-cmp-fill" id="mli-mo-f1"></span></span><span class="mo-cmp-pct" id="mli-mo-v1">96.4%</span></div><div class="mo-cmp-row is-win"><span class="mo-cmp-chip">model v2</span><span class="mo-cmp-track"><span class="mo-cmp-fill" id="mli-mo-f2"></span></span><span class="mo-cmp-pct" id="mli-mo-v2">97.1%</span></div></div></div><div class="mli-mo-h">Step 3 · Evaluate</div><p class="mli-mo-p">The new candidate is scored on a held-out test set and lined up against the model already in production. A number only means something next to a baseline.</p></div><div class="mli-mo-slide"><div class="mli-mo-stage" data-anim="gate"><div class="mo-tests"><div class="mo-test"><span class="mo-tick">✓</span>beats live accuracy</div><div class="mo-test"><span class="mo-tick">✓</span>schema check</div><div class="mo-test"><span class="mo-tick">✓</span>latency in budget</div><div class="mo-test"><span class="mo-tick">✓</span>fairness check</div><div class="mo-test"><span class="mo-tick">✓</span>no slice regression</div><div class="mo-test"><span class="mo-tick">✓</span>canary healthy</div><div class="mo-test"><span class="mo-tick">✓</span>memory in budget</div><div class="mo-test"><span class="mo-tick">✓</span>approved to ship</div></div></div><div class="mli-mo-h">Step 4 · Eval gate</div><p class="mli-mo-p">The candidate has to clear every check before it ships: beat the live model, stay fast, break nothing. Pass them all and it's promoted; fail one and it's held back.</p></div><div class="mli-mo-slide"><div class="mli-mo-stage" data-anim="serve"><div class="mli-mo-deploy"><span class="mli-mo-chip">model v2</span><span style="color:rgb(var(--c-muted))">&rarr;</span><span class="mli-mo-server"><span class="mo-slot mo-slot-old">v1</span><span class="mo-slot mo-slot-new">v2</span></span></div></div><div class="mli-mo-h">Step 5 · Deploy &amp; serve</div><p class="mli-mo-p">The new version rolls in and replaces the one already in production, taking over live traffic with monitoring watching. Then fresh data arrives, and the loop starts again.</p></div></div></div>
<div class="mli-mo-nav"><button class="mli-mo-btn" id="mli-mo-prev" type="button" aria-label="Previous step">&lsaquo;</button><div class="mli-mo-dots" id="mli-mo-dots"></div><button class="mli-mo-btn" id="mli-mo-next" type="button" aria-label="Next step">&rsaquo;</button></div>
</div>

The **eval gate**, step four, is the quiet star of that loop. It's a simple, ruthless rule: if the new model isn't actually better than the one you're already running, don't ship it. Shipping a worse model is worse than shipping nothing at all. A big chunk of ML infrastructure exists to enforce that automatically, so a bad model never quietly slips out to your users at 2am while everyone's asleep. Google's in-house [*Rules of Machine Learning*](https://developers.google.com/machine-learning/guides/rules-of-ml) makes the same case from the other direction: design your metrics first and get the infrastructure right, *then* get clever with the model.

## What the model actually eats

Go back to step one of that loop, *ingest data*, the tile that slides into the model box in half a second. That half second is hiding most of the job. A model is only ever as good as the examples it learned from, and those examples don't fall from the sky. Somebody has to gather them, clean them, label them, and park them somewhere the training run can actually reach. That whole apparatus is the **data layer**, and on most real ML teams it's where the majority of the effort goes.

Start with **labels**. Our little digit net learned from tens of thousands of images that each came stamped with the right answer: this is a 7, this is a 2. Someone, or something, had to produce those stamps. Get them wrong and the model learns your mistakes faithfully. Feed it enough 7s labeled "1" and it will confidently call sevens ones. Garbage in, garbage out isn't a slogan here, it's a mechanism.

<div class="not-prose mli-demo" id="mli-gi">
<div class="mli-demo-label">Live · a classifier trained on labeled data</div>
<div class="mli-row"><label>Corrupted training labels: <span class="mli-val" id="mli-gi-corrv">0%</span></label><input class="mli-range" id="mli-gi-corr" type="range" min="0" max="90" step="10" value="0" aria-label="Percent of training labels corrupted" /></div>
<div class="mli-controls"><button class="mli-btn" id="mli-gi-train" type="button">Retrain</button></div>
<div class="mli-cost" id="mli-gi-acc">—</div>
<div class="mli-gi-sub">test-set accuracy</div>
<div class="mli-bar"><div class="mli-bar-fill" id="mli-gi-fill"></div></div>
<div class="mli-gi-grid" id="mli-gi-grid"></div>
<div class="mli-caption" id="mli-gi-cap">A real classifier, trained live in your browser on noisy copies of ten handwritten digits. Drag the slider to scramble some of its training labels, then retrain.</div>
</div>

Then there's the problem of serving the same data twice. The features you compute while training, a user's average order size, say, have to be computed the exact same way when a real request comes in, or the model sees a subtly different world in production than the one it trained on. Teams stand up **feature stores** and data pipelines largely to kill that train/serve skew, and to make sure last week's numbers still mean the same thing as this week's. This isn't hypothetical: the Uber team that built [Michelangelo](https://www.uber.com/us/en/blog/michelangelo-machine-learning-platform/), one of the first company-wide ML platforms, ran a feature store precisely so the same transformation logic executes offline in training and online in serving, closing that gap by construction.

And because you'll eventually want to reproduce, audit, or roll back a model, the data itself gets **versioned**, just like code. "Which exact snapshot did this model train on?" is a question you have to be able to answer. When people say data is the real moat, this is what they mean: the model architecture is often public, but nobody else has your data, gathered and cleaned and labeled and versioned the way you have it.

## Watching it rot

The strange thing about that loop: nothing about the model changes on its own. The weights freeze the moment you ship. And yet a model that scored 97% on launch day will quietly get worse, week after week, with nobody touching it. Not because it broke, but because the world moved and it didn't.

This is **drift**. Handwriting styles change, fraud patterns evolve, slang turns over, and the frozen model keeps answering as if it were still launch day. The gap between the world the model learned and the world it's serving widens, and accuracy leaks out through it. And it's quiet: the service is up, latency is fine, nothing red in the logs. The answers are just slowly getting worse.

<div class="not-prose mli-demo" id="mli-drift">
<div class="mli-demo-label">Live · a model drifting in production</div>
<canvas id="mli-drift-cvs" class="mli-drift-cvs" aria-label="Model accuracy over time: it drifts downward, and with monitoring on it retrains when it crosses the threshold"></canvas>
<div class="mli-controls"><label class="mli-toggle"><input type="checkbox" id="mli-drift-mon" checked /> Monitoring &amp; auto-retrain</label></div>
<div class="mli-caption" id="mli-drift-cap"></div>
</div>

So you watch it. **Monitoring** for ML isn't the usual CPU-and-error-rate dashboard; it's watching the *predictions* — the kind of quiet distribution shift Chip Huyen's [*Designing Machine Learning Systems*](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) devotes whole chapters to. Are they still distributed the way they used to be? Is confidence sliding? When real answers eventually come back, is the model still right as often? Cross a threshold and an alarm fires, and that alarm is exactly what kicks the loop back to step one: ingest fresh data, retrain, re-evaluate, ship. The cycle you stepped through earlier finally has a motor. Drift is what makes it turn.

## Now do it a million times

A model answering one request is a demo. A model answering a million requests an hour, every hour, without ever falling over, is a product. The gap between those two is where a lot of infrastructure lives. This layer is called **serving**, or **inference**.

Drag the traffic up and watch one server struggle. Then switch on autoscaling and try again.

<div class="not-prose mli-demo" id="mli-load">
<div class="mli-demo-label">Live · serving under load</div>
<div class="mli-row"><label>Traffic: <span class="mli-val" id="mli-load-rpsv">20</span> req/s</label><input class="mli-range" id="mli-load-rps" type="range" min="1" max="120" value="20" aria-label="Requests per second" /></div>
<div class="mli-controls"><label class="mli-toggle"><input type="checkbox" id="mli-load-auto" /> Autoscaling</label></div>
<div class="mli-servers" id="mli-load-servers"></div>
<div class="mli-bar"><div class="mli-bar-fill" id="mli-load-bar"></div></div>
<div class="mli-caption" id="mli-load-cap"></div>
</div>

With one fixed server, traffic eventually overwhelms it: answers get slow, then requests start getting dropped: the dreaded endless spinner. **Autoscaling** notices the crowd and adds servers so response time stays flat. Bolt on health checks, automatic retries, and monitoring, and you get something that stays up at 3am on launch day. None of that reliability is the model's job. It's infrastructure's job.

## And do it cheaply

There's one last force: money. Every single answer a model gives burns a little bit of compute, and "a little bit" times "a million" is a real invoice. This is why "make the model cheaper to run" is an entire specialty, not an afterthought.

Play with the dials to size up a workload. Then flip on the optimizations, things like **quantization** (running the model in lower precision) and **batching** (answering many requests in one go), and watch the monthly bill drop. These aren't free lunches on paper, but the results are striking: one landmark method, [LLM.int8()](https://arxiv.org/abs/2208.07339), ran a 175-billion-parameter model in 8-bit instead of 16, roughly halving its memory, with no measurable loss in accuracy.

<div class="not-prose mli-demo" id="mli-cost">
<div class="mli-demo-label">Live · what an answer costs</div>
<div class="mli-row"><label>Requests / day: <span class="mli-val" id="mli-cost-reqv"></span></label><input class="mli-range" id="mli-cost-req" type="range" min="1000" max="2000000" step="1000" value="200000" aria-label="Requests per day" /></div>
<div class="mli-row"><label>Tokens / request: <span class="mli-val" id="mli-cost-tokv"></span></label><input class="mli-range" id="mli-cost-tok" type="range" min="50" max="2000" step="50" value="500" aria-label="Tokens per request" /></div>
<div class="mli-controls"><label class="mli-toggle"><input type="checkbox" id="mli-cost-opt" /> Optimized (quantize + batch)</label></div>
<div class="mli-cost" id="mli-cost-out"></div>
<div class="mli-caption" id="mli-cost-cap"></div>
</div>

Same model, same answers, a fraction of the cost. Multiply that gap across a growing company and you'll understand why inference optimization is one of the most valued skills in ML infrastructure right now: it converts, almost directly, into margin.

## When it breaks, it lies

Regular software mostly fails loudly. A bug throws an exception, a stack trace lands in the logs, a page goes red, somebody gets paged. The failure announces itself.

A model doesn't do you that favor. Ask it something it can't handle and it won't throw, it'll hand you a confident, well-formatted, completely wrong answer, in exactly the same shape as a correct one. There's no exception, because from the model's point of view nothing went wrong: it mapped an input to an output, same as always. Your instincts are tuned for loud failure, and machine learning fails silently.

So a whole layer of infrastructure exists to catch the model being confidently wrong; a team at Google even turned it into a scorecard, [*The ML Test Score*](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/), a 28-point rubric for the tests and monitoring that keep a silently-broken model out of production. **Guardrails** check outputs before they reach a user: is this a valid answer at all, is it in range, does it pass a schema, does a cheaper second model agree? When something looks off, you **fall back**, to a simpler model, a cached answer, a safe default, a human. None of this makes the model smarter. It just refuses to let a quiet mistake walk straight out the door. And, as we're about to see, a lot of it lives in the layer wrapped around the model rather than in the model itself.

## The twist for language models

Everything so far applies to any model, from our little digit net to the giant behind a chatbot. But once the model *is* one of those giants, a large language model, a few new pieces of infrastructure show up — and they're where a lot of today's work happens.

The shape is still the same: text goes in as **tokens** (the cost demo's dial, remember), text comes out. But the model is frozen and knows nothing about your world past its training cut-off, so you feed the knowledge in at question time. That's [**retrieval-augmented generation**](https://arxiv.org/abs/2005.11401): when a question arrives, you look up the relevant documents and paste them into the prompt so the model can answer from them. The paper that coined the term paired a frozen language model with a searchable index of Wikipedia and found the combination produced more specific, more factual answers than the model alone. Doing that lookup fast means storing text as **embeddings** in a **vector database**, a store built to answer "what's most similar to this?" in milliseconds. A surprising amount of LLM infrastructure is just this retrieval plumbing.

Tokens aren't quite words and aren't quite characters. Type into the box and watch the split happen — the token count, not the word count, is the number you're billed for.

<div class="not-prose mli-demo" id="mli-tok">
<div class="mli-demo-label">Live · how text becomes tokens</div>
<textarea id="mli-tok-in" class="mli-tok-in" aria-label="Type text to see it tokenized" spellcheck="false">Tokenization turns text into the pieces a model actually reads.</textarea>
<div class="mli-tok-chips" id="mli-tok-chips"></div>
<div class="mli-tok-stat" id="mli-tok-stat"></div>
<div class="mli-caption">A simplified tokenizer — real ones, like GPT's or Claude's, learn their splits from data with byte-pair encoding — but the behavior is the same: common words cost one token, rare or long ones break into several, and spaces and punctuation count too.</div>
</div>

And here's retrieval itself, made concrete. Pick a question about a company whose private docs the model never saw in training, and watch it either guess from memory or answer straight from the retrieved document.

<div class="not-prose mli-demo" id="mli-rag">
<div class="mli-demo-label">Live · retrieval-augmented generation</div>
<div class="mli-rag-qs" id="mli-rag-qs"></div>
<div class="mli-rag-kb" id="mli-rag-kb"></div>
<div class="mli-rag-ans" id="mli-rag-ans"></div>
<div class="mli-caption">The retrieval is real: every document is ranked by how well it matches your question (watch the relevance bars), and the top one is handed to the model. The answers are illustrative, but the contrast is exact — with no retrieval the model guesses; with it, it answers from the document.</div>
</div>

Two more terms you'll keep hearing. **Fine-tuning vs. prompting** is the build-versus-configure decision of the LLM world: do you adjust the model's weights on your own data (expensive, powerful) or just write a sharper prompt and retrieve better context (cheap, usually enough)? And the **KV cache** is the quiet reason serving LLMs is its own discipline: it's a per-conversation scratchpad that saves the model from re-reading the entire conversation on every new token, and managing it well is half the battle in making chat fast and affordable. The [vLLM project](https://arxiv.org/abs/2309.06180) made the point vividly by borrowing a trick from operating systems, managing that cache the way an OS manages virtual memory, and lifting serving throughput two-to-four-fold at the same latency.

## The harness on top

Come back to the very first idea in this piece: a model is just a function. Input in, prediction out, no memory, no initiative. On its own it can't open a file, look something up, run a command, or take two steps in a row. So how does a bare next-token predictor become something that writes code, works a support queue, or grinds through a multi-step task?

You wrap it in a **harness**. The harness is the loop around the model: the code that feeds it context, reads its output, hands it tools it can call, catches its mistakes, and lets it take one step, see the result, and decide the next. That reason-act-observe cycle got its name in the [ReAct](https://arxiv.org/abs/2210.03629) work, which showed a model interleaving its thinking with real actions against outside tools instead of guessing in one shot. The model supplies the judgment; the harness supplies the hands, the memory, and the guardrails. Claude Code is a clear example: the underlying model can't actually touch your filesystem, but wrapped in a harness that gives it file access, a shell, and a feedback loop, it becomes something that can read a codebase, make edits, run the tests, and react to what broke. Anthropic's own [guide to building effective agents](https://www.anthropic.com/engineering/building-effective-agents) draws the useful line here, between fixed workflows that script the model's steps and true agents that let it direct its own tools.

Watch one run of that loop — think, call a tool, read what comes back, decide the next move, over and over until the job is done.

<div class="not-prose mli-demo" id="mli-ag">
<div class="mli-demo-label">Live · an agent's reason–act–observe loop</div>
<div class="mli-ag-phases" id="mli-ag-phases"></div>
<div class="mli-ag-log" id="mli-ag-log"></div>
<div class="mli-controls"><button class="mli-btn" id="mli-ag-replay" type="button">Replay</button><button class="mli-btn mli-btn-ghost" id="mli-ag-step" type="button">Step &rsaquo;</button></div>
<div class="mli-caption">An illustrative trace of a coding agent fixing a failing test — the same read, edit, run, react loop a harness like Claude Code runs. The model supplies each decision; the harness supplies the tools and the loop.</div>
</div>

This is where the earlier ideas come home to roost. The retries and validation and fallbacks from the silent-failure section mostly live here, in the harness, not in the model. So do the evals, except now you're not scoring a single prediction, you're scoring whether the whole agent actually finished the job. And it's the layer most people actually touch: when someone says they "use an AI tool," they nearly always mean they use a harness with a model inside it. Back to the kitchen: if the model is the recipe, the harness is the line cook, the one that actually reads it, works the stations, tastes as it goes, and plates the dish.

## So, what is ML infrastructure?

Put the pieces together: everything that turns a clever model into a product a lot of people can actually use.

It's the data plumbing that feeds the model, gathered and labeled and versioned. It's the [pipeline that retrains and safely ships it](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning), with an eval gate standing guard, and the monitoring that watches for drift and decides when to pull the trigger. It's the serving layer that answers real requests fast and reliably, no matter how many people show up at once. It's the cost-and-performance engineering that keeps the whole thing affordable enough to stay in business. It's the guardrails that catch the model being confidently wrong, because it fails quietly instead of loudly. And increasingly it's the harness wrapped around the model that turns a bare function into something that can actually get work done.

The model is the recipe. ML infrastructure is the restaurant. And if you've ever run anything at scale (servers, deploys, uptime, budgets), you already speak most of the language. The models are the new part. The plumbing is the same discipline it has always been.

## References & further reading

Every claim above traces back to one of these, in roughly the order the article reaches them. Start here if you want past the toy demos.

<div class="not-prose mli-cite" id="mli-cite">
<div class="mli-cite-view"><div class="mli-cite-track" id="mli-cite-track">
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Foundations</span><span class="mli-cite-num">01 / 11</span></div><h3 class="mli-cite-title"><a href="https://proceedings.neurips.cc/paper_files/paper/2015/hash/86df7dcfd896fcaf2674f757a2463eba-Abstract.html">Hidden Technical Debt in Machine Learning Systems</a></h3><div class="mli-cite-meta">Sculley et al. · NeurIPS 2015</div><p class="mli-cite-note">The paper that put a diagram to "the model is the small part": in a real system the ML code is a tiny box surrounded by data, serving, and monitoring infrastructure that dwarfs it.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Practice</span><span class="mli-cite-num">02 / 11</span></div><h3 class="mli-cite-title"><a href="https://developers.google.com/machine-learning/guides/rules-of-ml">Rules of Machine Learning: Best Practices for ML Engineering</a></h3><div class="mli-cite-meta">Martin Zinkevich · Google</div><p class="mli-cite-note">Forty-three hard-won rules from Google's practice; the through-line is that infrastructure and metrics matter more than the model early on.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">The loop</span><span class="mli-cite-num">03 / 11</span></div><h3 class="mli-cite-title"><a href="https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning">MLOps: Continuous Delivery and Automation Pipelines in Machine Learning</a></h3><div class="mli-cite-meta">Google Cloud</div><p class="mli-cite-note">The canonical write-up of the retrain-and-ship loop, including continuous training as the property unique to ML systems.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Testing</span><span class="mli-cite-num">04 / 11</span></div><h3 class="mli-cite-title"><a href="https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/">The ML Test Score: A Rubric for ML Production Readiness</a></h3><div class="mli-cite-meta">Breck et al. · Google, 2017</div><p class="mli-cite-note">A 28-point checklist for the testing and monitoring that keep a silently-broken model from reaching users — the backbone of the "when it breaks, it lies" section.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Data layer</span><span class="mli-cite-num">05 / 11</span></div><h3 class="mli-cite-title"><a href="https://www.uber.com/us/en/blog/michelangelo-machine-learning-platform/">Meet Michelangelo: Uber's Machine Learning Platform</a></h3><div class="mli-cite-meta">Uber Engineering</div><p class="mli-cite-note">A real, company-wide ML platform, and a clear look at feature stores and the train/serve skew problem from the data-layer section.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Monitoring</span><span class="mli-cite-num">06 / 11</span></div><h3 class="mli-cite-title"><a href="https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/">Designing Machine Learning Systems</a></h3><div class="mli-cite-meta">Chip Huyen · O'Reilly, 2022</div><p class="mli-cite-note">The best single book on the whole picture; especially good on data distribution shifts, drift, and what to actually monitor.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">LLMs</span><span class="mli-cite-num">07 / 11</span></div><h3 class="mli-cite-title"><a href="https://arxiv.org/abs/2005.11401">Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks</a></h3><div class="mli-cite-meta">Lewis et al. · NeurIPS 2020</div><p class="mli-cite-note">The paper that coined RAG: pair a frozen model with a searchable index of Wikipedia and it answers more specifically and factually.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Serving</span><span class="mli-cite-num">08 / 11</span></div><h3 class="mli-cite-title"><a href="https://arxiv.org/abs/2309.06180">Efficient Memory Management for LLM Serving with PagedAttention</a></h3><div class="mli-cite-meta">Kwon et al. · SOSP 2023</div><p class="mli-cite-note">The vLLM paper; the clearest explanation of why the KV cache makes LLM serving its own discipline — 2–4× throughput by paging it like OS memory.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Cost</span><span class="mli-cite-num">09 / 11</span></div><h3 class="mli-cite-title"><a href="https://arxiv.org/abs/2208.07339">LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale</a></h3><div class="mli-cite-meta">Dettmers et al. · NeurIPS 2022</div><p class="mli-cite-note">Quantization made concrete: run a 175-billion-parameter model in 8-bit, roughly half the memory, with no measurable loss in accuracy.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Agents</span><span class="mli-cite-num">10 / 11</span></div><h3 class="mli-cite-title"><a href="https://arxiv.org/abs/2210.03629">ReAct: Synergizing Reasoning and Acting in Language Models</a></h3><div class="mli-cite-meta">Yao et al. · 2022</div><p class="mli-cite-note">An early, readable version of the reason-act-observe loop that sits at the heart of every agent harness.</p></article>
<article class="mli-cite-card"><div class="mli-cite-top"><span class="mli-cite-tag">Agents</span><span class="mli-cite-num">11 / 11</span></div><h3 class="mli-cite-title"><a href="https://www.anthropic.com/engineering/building-effective-agents">Building Effective Agents</a></h3><div class="mli-cite-meta">Anthropic · 2024</div><p class="mli-cite-note">Practical patterns for the harness layer, and a useful line between fixed workflows and genuinely agentic systems.</p></article>
</div></div>
<div class="mli-cite-nav"><button class="mli-mo-btn" id="mli-cite-prev" type="button" aria-label="Previous reference">&lsaquo;</button><div class="mli-cite-dots" id="mli-cite-dots"></div><button class="mli-mo-btn" id="mli-cite-next" type="button" aria-label="Next reference">&rsaquo;</button></div>
</div>

<script>
  (function () {
    try {
      if (document.documentElement.classList.contains("mli-anim")) {
        var _t = document.querySelectorAll(".prose > *:not(header)");
        if ("IntersectionObserver" in window) {
          var _io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("mli-in"); _io.unobserve(e.target); } });
          }, { rootMargin: "0px 0px -8% 0px", threshold: 0.04 });
          for (var _i = 0; _i < _t.length; _i++) _io.observe(_t[_i]);
        } else {
          for (var _k = 0; _k < _t.length; _k++) _t[_k].classList.add("mli-in");
        }
      }
    } catch (e) {
      var _a = document.querySelectorAll(".prose > *:not(header)");
      for (var _j = 0; _j < _a.length; _j++) _a[_j].classList.add("mli-in");
    }

    // --- lazy-load helpers: heavy modules load only when scrolled near ---
    var _loaded = {};
    function loadScript(src, cb) {
      if (_loaded[src] === true) { cb(); return; }
      if (_loaded[src]) { _loaded[src].push(cb); return; }
      _loaded[src] = [cb];
      var el = document.createElement("script");
      el.src = src; el.async = true;
      el.onload = function () { var q = _loaded[src]; _loaded[src] = true; for (var i = 0; i < q.length; i++) q[i](); };
      el.onerror = function () { _loaded[src] = null; };
      document.head.appendChild(el);
    }
    function whenVisible(el, cb) {
      if (!el) return;
      if (!("IntersectionObserver" in window)) { cb(); return; }
      var io = new IntersectionObserver(function (es) {
        for (var i = 0; i < es.length; i++) if (es[i].isIntersecting) { io.disconnect(); cb(); return; }
      }, { rootMargin: "250px 0px" });
      io.observe(el);
    }

    var padEl = document.getElementById("mli-nn-pad");
    if (padEl && padEl.getContext) whenVisible(padEl, function () {
      loadScript("/js/tiny-digits.js", function () { if (window.TinyDigits) initDigits(padEl, window.TinyDigits); });
    });

    whenVisible(document.getElementById("mli-gi"), function () {
      var giRoot = document.getElementById("mli-gi");
      if (!giRoot) return;
      loadScript("/js/tiny-digits.js", function () {
        loadScript("/js/mli-garbagein.js", function () {
          if (window.TinyDigits && window.MliGarbageIn) window.MliGarbageIn.init(giRoot, window.TinyDigits);
        });
      });
    });

    whenVisible(document.getElementById("mli-drift"), function () {
      var drRoot = document.getElementById("mli-drift");
      if (!drRoot) return;
      loadScript("/js/mli-drift.js", function () {
        if (window.MliDrift) window.MliDrift.init(drRoot);
      });
    });

    whenVisible(document.getElementById("mli-tok"), function () {
      var tkRoot = document.getElementById("mli-tok");
      if (!tkRoot) return;
      loadScript("/js/mli-tok.js", function () {
        if (window.MliTok) window.MliTok.init(tkRoot);
      });
    });

    whenVisible(document.getElementById("mli-rag"), function () {
      var rgRoot = document.getElementById("mli-rag");
      if (!rgRoot) return;
      loadScript("/js/mli-rag.js", function () {
        if (window.MliRag) window.MliRag.init(rgRoot);
      });
    });

    whenVisible(document.getElementById("mli-ag"), function () {
      var agRoot = document.getElementById("mli-ag");
      if (!agRoot) return;
      loadScript("/js/mli-agent.js", function () {
        if (window.MliAgent) window.MliAgent.init(agRoot);
      });
    });

    whenVisible(document.getElementById("mli-cite"), function () {
      var ctRoot = document.getElementById("mli-cite");
      if (!ctRoot) return;
      loadScript("/js/mli-cite.js", function () {
        if (window.MliCite) window.MliCite.init(ctRoot);
      });
    });
    function initDigits(pad, TD) {
      var ctx = pad.getContext("2d");
      var SZ = pad.width, S = 28, BLK = SZ / S;
      var vals = [], sampleIdx = 0, drawing = false, lastX = 0, lastY = 0, lastArg = -1, lastConf = 0;
      var fgc = "0,0,0";
      try { var cv = getComputedStyle(document.documentElement).getPropertyValue("--c-fg").trim(); if (cv) fgc = cv.replace(/\s+/g, ","); } catch (e) {}
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = SZ / 14; ctx.strokeStyle = "rgb(" + fgc + ")";
      var pred = document.getElementById("mli-nn-pred");
      var cap = document.getElementById("mli-nn-cap");
      var bars = document.getElementById("mli-nn-bars");
      var CAP0 = "Draw a digit (0-9) with your mouse or finger, or load a real one. About 19,000 trained numbers, quantized to shrink them, decide the answer.";
      for (var d2 = 0; d2 < 10; d2++) {
        var row = document.createElement("div"); row.className = "mli-nn-bar";
        var lab = document.createElement("b"); lab.textContent = d2;
        var track = document.createElement("div"); track.className = "mli-nn-track";
        var val = document.createElement("div"); val.className = "mli-nn-val";
        track.appendChild(val); row.appendChild(lab); row.appendChild(track); bars.appendChild(row); vals.push({ row: row, val: val });
      }
      var toInput = function () {
        var img = ctx.getImageData(0, 0, SZ, SZ).data;
        var g = new Float64Array(S * S);
        for (var y = 0; y < SZ; y++) { var gy = (y / BLK) | 0; for (var x = 0; x < SZ; x++) { var a = img[(y * SZ + x) * 4 + 3]; if (a) g[gy * S + ((x / BLK) | 0)] += a; } }
        for (var i = 0; i < S * S; i++) g[i] = g[i] / (BLK * BLK) / 255;
        var minr = S, minc = S, maxr = -1, maxc = -1, tot = 0;
        for (var r = 0; r < S; r++) for (var c = 0; c < S; c++) { var v = g[r * S + c]; tot += v; if (v > 0.05) { if (r < minr) minr = r; if (r > maxr) maxr = r; if (c < minc) minc = c; if (c > maxc) maxc = c; } }
        if (maxr < 0) return { g: null, sum: 0 };
        var ch = maxr - minr + 1, cw = maxc - minc + 1, sc = 20 / Math.max(ch, cw);
        var nh = Math.max(1, Math.round(ch * sc)), nw = Math.max(1, Math.round(cw * sc));
        var tmp = new Float64Array(nw * nh);
        for (var oy = 0; oy < nh; oy++) { var sy = minr + Math.min(ch - 1, oy / sc); for (var ox = 0; ox < nw; ox++) { var sx = minc + Math.min(cw - 1, ox / sc); tmp[oy * nw + ox] = g[(sy | 0) * S + (sx | 0)]; } }
        var s2 = 0, cx = 0, cy = 0;
        for (var a1 = 0; a1 < nh; a1++) for (var a2 = 0; a2 < nw; a2++) { var vv = tmp[a1 * nw + a2]; s2 += vv; cx += a2 * vv; cy += a1 * vv; }
        var out = new Float64Array(S * S);
        if (s2 > 0) { cx /= s2; cy /= s2; var offx = Math.round(S / 2 - cx), offy = Math.round(S / 2 - cy);
          for (var b1 = 0; b1 < nh; b1++) for (var b2b = 0; b2b < nw; b2b++) { var ny = b1 + offy, nx = b2b + offx; if (ny >= 0 && ny < S && nx >= 0 && nx < S) out[ny * S + nx] = tmp[b1 * nw + b2b]; } }
        return { g: Array.prototype.slice.call(out), sum: tot };
      };
      var run = function () {
        var r = toInput();
        if (!r.g || r.sum < 0.0005) { pred.textContent = "?"; lastArg = -1; for (var k = 0; k < 10; k++) { vals[k].val.style.width = "0%"; vals[k].row.classList.remove("mli-top"); } return; }
        var probs = TD.predict(r.g), arg = 0;
        for (var k2 = 1; k2 < 10; k2++) if (probs[k2] > probs[arg]) arg = k2;
        lastArg = arg; lastConf = probs[arg]; pred.textContent = arg;
        for (var d3 = 0; d3 < 10; d3++) { vals[d3].val.style.width = Math.round(probs[d3] * 100) + "%"; if (d3 === arg) vals[d3].row.classList.add("mli-top"); else vals[d3].row.classList.remove("mli-top"); }
      };
      var pos = function (e) { var rect = pad.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return [(p.clientX - rect.left) / rect.width * SZ, (p.clientY - rect.top) / rect.height * SZ]; };
      pad.addEventListener("pointerdown", function (e) { drawing = true; var q = pos(e); lastX = q[0]; lastY = q[1]; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(lastX + 0.1, lastY + 0.1); ctx.stroke(); run(); e.preventDefault(); });
      pad.addEventListener("pointermove", function (e) { if (!drawing) return; var q = pos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(q[0], q[1]); ctx.stroke(); lastX = q[0]; lastY = q[1]; run(); e.preventDefault(); });
      window.addEventListener("pointerup", function () { if (drawing) { drawing = false; run(); } });
      document.getElementById("mli-nn-clear").addEventListener("click", function () { ctx.clearRect(0, 0, SZ, SZ); run(); cap.textContent = CAP0; });
      var loadSample = function () {
        var i = sampleIdx % TD.samples.length, img = TD.sampleImg(i), lab = TD.samples[i].y; sampleIdx++;
        ctx.clearRect(0, 0, SZ, SZ);
        for (var yy = 0; yy < S; yy++) for (var xx = 0; xx < S; xx++) { var v = img[yy * S + xx]; if (v > 8) { ctx.fillStyle = "rgba(" + fgc + "," + (v / 255) + ")"; ctx.fillRect(xx * BLK, yy * BLK, BLK, BLK); } }
        run();
        cap.textContent = "A real handwritten " + lab + " the model never trained on. It reads it as " + (lastArg < 0 ? "?" : lastArg) + " at " + Math.round(lastConf * 100) + "% confidence.";
      };
      document.getElementById("mli-nn-sample").addEventListener("click", loadSample);
      loadSample();
    }

    whenVisible(document.getElementById("mli-mo"), function () {
      var root = document.getElementById("mli-mo");
      var track = document.getElementById("mli-mo-track");
      if (!root || !track) return;
      var slides = track.children, n = slides.length;
      if (!n) return;
      var dotsWrap = document.getElementById("mli-mo-dots");
      var idx = 0, reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var moTok = 0;
      var dots = [];
      for (var i = 0; i < n; i++) {
        (function (j) {
          var b = document.createElement("button");
          b.className = "mli-mo-dot"; b.type = "button";
          b.setAttribute("aria-label", "Step " + (j + 1));
          b.addEventListener("click", function () { go(j); });
          dotsWrap.appendChild(b); dots.push(b);
        })(i);
      }
      // build the neural-net scene for step 2
      (function () {
        var svg = document.getElementById("mli-mo-net");
        if (!svg) return;
        var NS = "http://www.w3.org/2000/svg";
        var mk = function (ys, x) { return ys.map(function (y) { return { x: x, y: y }; }); };
        var layers = [mk([16, 40, 64, 88], 24), mk([10, 31, 52, 73, 94], 108), mk([28, 52, 76], 184)];
        for (var l = 0; l < layers.length - 1; l++) {
          layers[l].forEach(function (a) {
            layers[l + 1].forEach(function (b) {
              var ln = document.createElementNS(NS, "line");
              ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y);
              ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y);
              ln.style.animationDelay = (Math.random() * 1.1).toFixed(2) + "s";
              svg.appendChild(ln);
            });
          });
        }
        layers.forEach(function (col) {
          col.forEach(function (nd) {
            var c = document.createElementNS(NS, "circle");
            c.setAttribute("cx", nd.x); c.setAttribute("cy", nd.y); c.setAttribute("r", 5);
            c.style.animationDelay = (Math.random() * 1.8).toFixed(2) + "s";
            svg.appendChild(c);
          });
        });
      })();
      function countUp(el, target) {
        if (reduce) { el.textContent = target.toFixed(1) + "%"; return; }
        var t0 = null;
        function s(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1100); el.textContent = (target * p).toFixed(1) + "%"; if (p < 1) requestAnimationFrame(s); }
        requestAnimationFrame(s);
      }
      function growBar(el, target) {
        if (reduce) { el.style.width = target + "%"; return; }
        el.style.width = "0%";
        var t0 = null;
        function s(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1000); el.style.width = (target * p).toFixed(1) + "%"; if (p < 1) requestAnimationFrame(s); }
        requestAnimationFrame(s);
      }
      // step 1: feed data tiles into the model box, one at a time
      var moModel = root.querySelector(".mo-model");
      var moTiles = root.querySelectorAll(".mo-ingest .mo-tile");
      function startIngest(tok) {
        if (!moModel || !moTiles.length) return;
        for (var r = 0; r < moTiles.length; r++) { var t = moTiles[r]; t.style.transition = "none"; t.style.transform = "none"; t.style.opacity = "1"; }
        if (reduce) return;
        var order = [3, 2, 1, 0]; // nearest the box goes first
        var k = 0;
        function bump() { moModel.classList.add("mo-eat"); setTimeout(function () { moModel.classList.remove("mo-eat"); }, 150); }
        function feed() {
          if (tok !== moTok) return;
          var t = moTiles[order[k]];
          var mb = moModel.getBoundingClientRect(), tb = t.getBoundingClientRect();
          var dx = (mb.left + mb.width / 2) - (tb.left + tb.width / 2);
          var dy = (mb.top + mb.height / 2) - (tb.top + tb.height / 2);
          t.style.transition = "transform .5s cubic-bezier(.4,0,.6,1), opacity .5s ease-in";
          t.style.transform = "translate(" + dx + "px," + dy + "px) scale(.28)";
          t.style.opacity = "0";
          setTimeout(function () { if (tok === moTok) bump(); }, 430);
          k++;
          if (k < order.length) { setTimeout(feed, 800); }
          else { setTimeout(function () { if (tok === moTok) reset(); }, 950); }
        }
        function reset() {
          if (tok !== moTok) return;
          for (var r = 0; r < moTiles.length; r++) { moTiles[r].style.transition = "none"; moTiles[r].style.transform = "none"; }
          void moModel.offsetWidth;
          for (var q = 0; q < moTiles.length; q++) { moTiles[q].style.transition = "opacity .35s ease"; moTiles[q].style.opacity = "1"; }
          k = 0;
          setTimeout(feed, 600);
        }
        feed();
      }
      function go(i) {
        idx = (i + n) % n;
        track.style.transform = "translateX(" + (-idx * 100) + "%)";
        for (var k = 0; k < n; k++) { slides[k].classList.toggle("is-active", k === idx); dots[k].classList.toggle("is-on", k === idx); }
        moTok++;
        var stage = slides[idx].querySelector(".mli-mo-stage");
        var mode = stage ? stage.getAttribute("data-anim") : "";
        if (mode === "ingest") {
          startIngest(moTok);
        } else if (mode === "net") {
          var eff = document.getElementById("mli-mo-eff");
          if (eff) { eff.textContent = "0.0%"; countUp(eff, 97.1); }
        } else if (mode === "cmp") {
          var v1 = document.getElementById("mli-mo-v1"), v2 = document.getElementById("mli-mo-v2");
          if (v1) { v1.textContent = "0.0%"; countUp(v1, 96.4); }
          if (v2) { v2.textContent = "0.0%"; countUp(v2, 97.1); }
          var f1 = document.getElementById("mli-mo-f1"), f2 = document.getElementById("mli-mo-f2");
          if (f1) growBar(f1, 74);
          if (f2) growBar(f2, 92);
        }
      }
      document.getElementById("mli-mo-prev").addEventListener("click", function () { go(idx - 1); });
      document.getElementById("mli-mo-next").addEventListener("click", function () { go(idx + 1); });
      go(0);
    });

    whenVisible(document.getElementById("mli-load"), function () {
      var rps = document.getElementById("mli-load-rps");
      if (!rps) return;
      var auto = document.getElementById("mli-load-auto");
      var rpsv = document.getElementById("mli-load-rpsv");
      var srv = document.getElementById("mli-load-servers");
      var bar = document.getElementById("mli-load-bar");
      var lcap = document.getElementById("mli-load-cap");
      var lrender = function () {
        var r = +rps.value, a = auto.checked, per = 20;
        var servers = a ? Math.min(6, Math.max(1, Math.ceil(r / per))) : 1;
        var load = r / (servers * per), lat, bad;
        if (load <= 1) { lat = Math.round(45 + load * 45); bad = false; }
        else { lat = Math.round(90 + (load - 1) * 380); bad = true; }
        rpsv.textContent = r;
        srv.innerHTML = "";
        for (var i = 0; i < servers; i++) { var s = document.createElement("div"); s.className = "mli-server"; s.textContent = "▤"; srv.appendChild(s); }
        bar.style.width = Math.min(100, lat / 6) + "%";
        if (bad) bar.classList.add("mli-bad"); else bar.classList.remove("mli-bad");
        lcap.textContent = bad
          ? ("At " + r + " req/s, one server is drowning (~" + lat + "ms and climbing) and requests start getting dropped. Turn on autoscaling.")
          : ("At " + r + " req/s across " + servers + " server" + (servers > 1 ? "s" : "") + ", responses stay snappy (~" + lat + "ms).");
      };
      rps.addEventListener("input", lrender);
      auto.addEventListener("change", lrender);
      lrender();
    });

    whenVisible(document.getElementById("mli-cost"), function () {
      var req = document.getElementById("mli-cost-req");
      if (!req) return;
      var tok = document.getElementById("mli-cost-tok");
      var opt = document.getElementById("mli-cost-opt");
      var reqv = document.getElementById("mli-cost-reqv");
      var tokv = document.getElementById("mli-cost-tokv");
      var out = document.getElementById("mli-cost-out");
      var ccap = document.getElementById("mli-cost-cap");
      var crender = function () {
        var r = +req.value, t = +tok.value, o = opt.checked;
        var ppk = o ? 0.0006 : 0.002;
        var monthly = r * t / 1000 * ppk * 30;
        reqv.textContent = r.toLocaleString();
        tokv.textContent = t;
        out.innerHTML = "$" + Math.round(monthly).toLocaleString() + " <small>/ month</small>";
        ccap.textContent = o
          ? "Same answers, about a third of the cost. That gap is pure margin."
          : "Flip on optimizations (quantize + batch) to see the same workload get cheaper.";
      };
      req.addEventListener("input", crender);
      tok.addEventListener("input", crender);
      opt.addEventListener("change", crender);
      crender();
    });
  })();
</script>

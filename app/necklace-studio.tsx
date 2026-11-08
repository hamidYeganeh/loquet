"use client";

import { useEffect, useRef } from "react";
import { mountStudio } from "./studio";

export function NecklaceStudio() {
  const studio = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studio.current) return mountStudio(studio.current);
  }, []);

  return (
    <div ref={studio}>
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 40 40" width="35" height="35" fill="none" stroke="currentColor" strokeWidth="1.05" aria-hidden="true"><path d="M20 2.5c2.1 9.4 5.5 14 17.5 17.5C25.5 23.5 22.1 28.1 20 37.5 17.9 28.1 14.5 23.5 2.5 20 14.5 16.5 17.9 11.9 20 2.5Z" /><path d="M20 10c2 5.4 4.6 8 10 10-5.4 2-8 4.6-10 10-2-5.4-4.6-8-10-10 5.4-2 8-4.6 10-10Z" /><circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" /></svg>
          <span className="brand-text">AUREL<small>JEWELRY STUDIO</small></span>
        </div>
        <span className="kicker">Necklace builder</span>
        <div className="header-actions">
          <button type="button" className="icon-button" id="help" title="How to use the builder" aria-label="Help"></button>
          <button type="button" className="text-button" id="open-saved"><span data-icon="bookmark"></span> Saved <span className="badge" id="saved-count">0</span></button>
        </div>
      </header>
      <main className="workspace">
        <section className="viewer" aria-label="Interactive necklace preview">
          <div className="stage" id="stage">
            <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>
            <div className="stage-top"><span className="live kicker" id="preview-label">Live 3D preview</span><span className="stage-note" id="preview-material">Yellow gold · 18 in</span></div>
            <canvas className="shadow" id="shadow" aria-hidden="true"></canvas>
            <canvas className="scene" id="scene" tabIndex={0} aria-label="3D necklace. Use arrow keys to rotate, plus or minus to zoom, and Space to spin or tug." aria-describedby="stage-tip"></canvas>
            <div className="fallback" id="fallback" hidden><p>3D preview needs a browser with WebGL 2 enabled.</p></div>
            <div className="stage-controls">
              <div className="mode-switch" role="group" aria-label="Drag mode">
                <button type="button" data-mode="rotate" aria-pressed="true"><span data-icon="rotate"></span>Rotate</button>
                <button type="button" data-mode="pull" aria-pressed="false"><span data-icon="hand"></span>Pull</button>
              </div>
              <div className="tools" role="group" aria-label="View controls">
                <button type="button" id="spin" title="Spin 360°" aria-label="Spin 360°"><span data-icon="spin"></span></button>
                <button type="button" id="zoom-out" title="Zoom out" aria-label="Zoom out"><span data-icon="minus"></span></button>
                <button type="button" id="zoom-in" title="Zoom in" aria-label="Zoom in"><span data-icon="plus"></span></button>
                <button type="button" id="reset-view" title="Reset view" aria-label="Reset view"><span data-icon="reset"></span></button>
              </div>
            </div>
          </div>
          <div className="stage-caption"><span id="stage-tip">Drag to rotate · Scroll or pinch to zoom</span><span>Interactive model</span></div>
        </section>
        <section className="builder" aria-labelledby="builder-title">
          <p className="kicker">Made personal</p>
          <h1 id="builder-title">Design your<br />necklace</h1>
          <p className="intro">Start with a chain. Add a locket and the charms you love.</p>
          <div className="steps" role="tablist" aria-label="Necklace parts">
            <button type="button" id="tab-chain" role="tab" data-tab="chain" aria-selected="true" aria-controls="options"><span className="step-num">01</span> Chain</button>
            <button type="button" id="tab-locket" role="tab" data-tab="locket" aria-selected="false" aria-controls="options" tabIndex={-1}><span className="step-num">02</span> Locket</button>
            <button type="button" id="tab-charms" role="tab" data-tab="charms" aria-selected="false" aria-controls="options" tabIndex={-1}><span className="step-num">03</span> Charms</button>
          </div>
          <section className="pane" id="options" role="tabpanel" aria-labelledby="tab-chain"></section>
          <section className="summary" aria-labelledby="summary-title">
            <div className="summary-row"><div><h2 id="summary-title">Your necklace</h2><p id="summary-text" aria-live="polite"></p></div></div>
            <div className="summary-actions">
              <button type="button" className="primary" id="save"><span data-icon="bookmark"></span>Save design</button>
              <button type="button" className="secondary" id="next">Choose locket <span data-icon="arrow"></span></button>
            </div>
            <p className="save-note" id="save-note" role="status">Designs are saved in this browser.</p>
          </section>
        </section>
      </main>
      <dialog id="help-dialog" aria-labelledby="help-title">
        <div className="dialog-top"><h2 id="help-title">Try the 3D preview</h2><form method="dialog"><button className="icon-button" aria-label="Close" data-icon="close"></button></form></div>
        <ul className="help-list">
          <li><strong>Rotate.</strong> Drag or use the arrow keys while the preview has focus. Use the spin button for a full turn.</li>
          <li><strong>Pull.</strong> Select Pull, then grab and release any link. Press Space with the preview focused to tug from the bottom.</li>
          <li><strong>Zoom.</strong> Scroll, pinch, or use the + and − controls. Reset brings the necklace back to its starting view.</li>
        </ul>
      </dialog>
      <dialog id="saved-dialog" aria-labelledby="saved-title">
        <div className="dialog-top"><h2 id="saved-title">Saved designs</h2><form method="dialog"><button className="icon-button" aria-label="Close" data-icon="close"></button></form></div>
        <div id="saved-content"></div>
      </dialog>
    </div>
  );
}

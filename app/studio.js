import { TAU, clamp, add, sub, scale, lerp, dot, cross, mag, normal, wrap, zAxis, identity, referencePath, makeModels } from "./jewelry-geometry";

export function mountStudio(root) {
  const events = new AbortController();
  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, { ...options, signal: events.signal });
  }

  const $ = (selector, container = root) => container.querySelector(selector);
  const $$ = (selector, container = root) => [...container.querySelectorAll(selector)];
  const icons = {
    bookmark: '<path d="M6 4h12v16l-6-4-6 4z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-1 .6-1.2 1.1-1.2 2.3m0 3h.01"/>',
    rotate: '<ellipse cx="12" cy="12" rx="9" ry="5" transform="rotate(-23 12 12)"/><path d="M17.6 4.8 20 7.7l-3.6.6M6.6 19.1 4 16.3l3.6-.7"/>',
    hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v4-2a1.5 1.5 0 0 1 3 0v5c0 4.2-2.4 7-6.3 7h-.6c-2.3 0-3.8-.8-5.1-2.6l-3.4-4.5a1.5 1.5 0 0 1 2.2-2l1.2 1.1Z"/>',
    spin: '<path d="M3 12c0-2.7 4-5 9-5s9 2.3 9 5-4 5-9 5h-1m3-3-3 3 3 3M12 4v3"/>',
    reset: '<path d="M4 12a8 8 0 1 1 2.1 5.4M4 12V6m0 6h6"/>',
    plus: '<path d="M12 5v14m-7-7h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  function icon(name, size = 17) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
  }
  for (const el of $$('[data-icon]')) el.innerHTML = icon(el.dataset.icon);
  $('#help').innerHTML = icon('help', 19);

  const finishes = {
    yellow: { label: 'Yellow gold', swatch: 'linear-gradient(135deg,#f9e7b4,#c28e3f 53%,#e6bb6a)', color: [1, .73, .34] },
    white: { label: 'White gold', swatch: 'linear-gradient(135deg,#fff,#a7a7a3 55%,#e5e5e1)', color: [.88, .90, .92] },
    rose: { label: 'Rose gold', swatch: 'linear-gradient(135deg,#ffdfd4,#c0846b 55%,#e8b59e)', color: [1, .60, .47] },
  };
  const lengths = { 16: '40.6 cm', 18: '45.7 cm', 20: '50.8 cm', 22: '55.9 cm' };
  const lockets = {
    none: { label: 'Chain only', detail: 'No locket' },
    round: { label: 'Round', detail: 'Glass locket' },
    heart: { label: 'Heart', detail: 'Glass locket' },
    oval: { label: 'Oval', detail: 'Glass locket' },
  };
  const charms = {
    star: { label: 'North star', detail: 'Gold', color: [1,.74,.36] },
    moon: { label: 'Crescent moon', detail: 'Gold', color: [1,.77,.40] },
    ruby: { label: 'Rose quartz', detail: 'Pink stone', color: [.92,.39,.51] },
    emerald: { label: 'Green tourmaline', detail: 'Green stone', color: [.27,.68,.49] },
  };
  const steps = ['chain', 'locket', 'charms'];
  const initial = { finish: 'yellow', length: 18, locket: 'none', charms: [] };
  let state = { ...initial };
  let currentStep = 'chain';
  let viewer = null;
  const storageKey = 'aurel-necklace-studio-v1';
  let saved = readSaved();
  const pane = $('#options');

  function readSaved() {
    try {
      const entries = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.id === 'string' && entry.state
        && Object.hasOwn(finishes, entry.state.finish) && Object.hasOwn(lengths, entry.state.length)
        && Object.hasOwn(lockets, entry.state.locket) && Array.isArray(entry.state.charms)
        && entry.state.charms.length <= 3 && entry.state.charms.every(key => Object.hasOwn(charms, key))) : [];
    } catch {
      return [];
    }
  }
  function persist(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      saved = next;
      $('#saved-count').textContent = saved.length;
      return true;
    } catch {
      $('#save-note').textContent = 'Browser storage is unavailable.';
      return false;
    }
  }
  function describe(design) {
    const parts = [finishes[design.finish].label, design.length + ' in'];
    if (design.locket !== 'none') parts.push(lockets[design.locket].label + ' locket');
    if (design.charms.length) parts.push(design.charms.length + (design.charms.length === 1 ? ' charm' : ' charms'));
    return parts.join(' · ');
  }

  function thumb(kind) {
    const definitions = '<defs><linearGradient id="metal-' + kind + '" x1="0" y1="0" x2=".88" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#896026"/><stop offset=".24" stop-color="#e9ce85"/><stop offset=".43" stop-color="#fff2bd"/><stop offset=".67" stop-color="#bb8842"/><stop offset=".87" stop-color="#f2d18b"/><stop offset="1" stop-color="#987039"/></linearGradient><linearGradient id="glass-' + kind + '" x2="1" y2="1"><stop stop-color="#fdf9ee"/><stop offset="1" stop-color="#dcd5c4"/></linearGradient></defs>';
    const gold = 'url(#metal-' + kind + ')';
    const glass = 'url(#glass-' + kind + ')';
    const outlines = {
      round: '<circle cx="26" cy="29" r="13.4"/>',
      heart: '<path d="M26 42C22 38 12 31 12 24c0-8 9-11 14-4 5-7 14-4 14 4 0 7-10 14-14 18Z"/>',
      oval: '<ellipse cx="26" cy="29" rx="11.8" ry="15"/>',
    };
    let art;
    if (kind === 'chain') {
      art = Array.from({ length: 13 }, (_, i) => {
        const x = 9 + i * 2.8;
        const y = 11 + 24 * Math.sin(Math.PI * i / 12);
        const angle = Math.atan2(24 * Math.PI / 12 * Math.cos(Math.PI * i / 12), 2.8) * 180 / Math.PI;
        return '<ellipse cx="' + x + '" cy="' + y + '" rx="3.9" ry="' + (i % 2 ? '1.35' : '2.8') + '" transform="rotate(' + angle + ' ' + x + ' ' + y + ')" stroke="' + gold + '" stroke-width="1.8" fill="none"/>';
      }).join('');
    } else if (Object.hasOwn(outlines, kind)) {
      art = '<ellipse cx="26" cy="12" rx="2.8" ry="4.3" fill="none" stroke="' + gold + '" stroke-width="2.3"/><g fill="' + glass + '" stroke="' + gold + '" stroke-width="3.2">' + outlines[kind] + '</g><path d="m20 27 5-5m-3 9 7-7" stroke="#fffdf5" stroke-linecap="round" opacity=".75"/>';
    } else if (kind === 'star') {
      art = '<path d="M26 9c2.5 11 5 14 15 17-10 3-12.5 6-15 17-2.5-11-5-14-15-17 10-3 12.5-6 15-17Z" fill="' + gold + '" stroke="#97733b" stroke-width=".65"/>';
    } else if (kind === 'moon') {
      art = '<path d="M32 10a17 17 0 1 0 7 26C25 39 19 19 32 10Z" fill="' + gold + '" stroke="#97733b" stroke-width=".65"/>';
    } else if (kind === 'ruby' || kind === 'emerald') {
      const colors = kind === 'ruby' ? ['#c3697b','#e9a5ae','#a4475b'] : ['#48886b','#8dbba0','#2e604a'];
      art = '<path d="m26 10 12 11v13L26 43 14 34V21Z" fill="' + gold + '"/><path d="m26 12 10 10v11L26 41 16 33V22Z" fill="' + colors[0] + '"/><path d="m26 12 5 11-5 5-10-6Z" fill="' + colors[1] + '"/><path d="m26 28 10-6v11L26 41Z" fill="' + colors[2] + '"/><path d="m16 33 10-5v13Z" fill="' + colors[1] + '" opacity=".62"/>';
    } else {
      art = '<circle cx="26" cy="26" r="12" fill="none" stroke="#8b8575" stroke-width="1.2"/><path d="m18 34 16-16" stroke="#8b8575" stroke-width="1.2"/>';
    }
    return '<span class="thumb"><svg viewBox="0 0 52 52" width="100%" height="100%" aria-hidden="true">' + definitions + art + '</svg></span>';
  }
  function renderOptions(focusOption) {
    if (currentStep === 'chain') {
      pane.innerHTML = '<h2>Choose your chain</h2><p class="description">The signature cable chain, with individually modeled links.</p>'
        + '<div class="chain-card">' + thumb('chain') + '<div><strong>Signature Cable</strong><p>Oval links and a lobster clasp</p></div><span class="check">' + icon('check', 19) + '</span></div>'
        + '<div class="field"><span class="label" id="finish-label">Metal finish</span><div class="swatches" role="group" aria-labelledby="finish-label">'
        + Object.entries(finishes).map(([key, finish]) => '<button class="swatch" type="button" data-finish="' + key + '" aria-pressed="' + (state.finish === key) + '"><span class="chip" style="background:' + finish.swatch + '"></span>' + finish.label + '</button>').join('')
        + '</div></div><div class="field"><span class="label" id="length-label">Chain length</span><div class="sizes" role="group" aria-labelledby="length-label">'
        + Object.entries(lengths).map(([key, cm]) => '<button type="button" class="size" data-length="' + key + '" aria-label="' + key + ' inches (' + cm + ')" aria-pressed="' + (state.length === +key) + '">' + key + ' in</button>').join('') + '</div></div>';
    } else {
      const isLocket = currentStep === 'locket';
      const choices = isLocket ? lockets : charms;
      pane.innerHTML = '<h2>' + (isLocket ? 'Choose a locket' : 'Pick your charms') + '</h2><p class="description">'
        + (isLocket ? 'Try a glass locket or keep the chain on its own.' : 'Add up to three charms. Select one again to remove it.') + '</p><div class="choice-grid">'
        + Object.entries(choices).map(([key, item]) => {
          const selected = isLocket ? state.locket === key : state.charms.includes(key);
          const atLimit = !isLocket && !selected && state.charms.length >= 3;
          return '<button type="button" class="choice" data-' + (isLocket ? 'locket' : 'charm') + '="' + key + '" aria-pressed="' + selected + '"' + (atLimit ? ' disabled' : '') + '>' + thumb(key) + '<span><strong>' + item.label + '</strong><small>' + item.detail + '</small></span></button>';
        }).join('') + '</div>'
        + (isLocket ? '' : '<p class="selection-note" aria-live="polite">' + state.charms.length + ' of 3 selected · ' + (state.locket === 'none' ? 'Hang directly from the chain' : 'Sit inside the locket') + '</p>');
    }
    if (focusOption) $(focusOption, pane)?.focus({ preventScroll: true });
  }
  function updateSummary() {
    $('#summary-text').textContent = describe(state);
    $('#preview-material').textContent = finishes[state.finish].label + ' · ' + state.length + ' in';
  }
  function setStep(step, focusTab = false) {
    currentStep = step;
    for (const button of $$('[data-tab]')) {
      const selected = button.dataset.tab === step;
      button.setAttribute('aria-selected', selected);
      button.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) button.focus({ preventScroll: true });
    }
    pane.setAttribute('aria-labelledby', 'tab-' + step);
    renderOptions();
    const next = $('#next');
    next.hidden = step === 'charms';
    next.style.display = next.hidden ? 'none' : '';
    next.innerHTML = (step === 'chain' ? 'Choose locket' : 'Choose charms') + icon('arrow', 15);
  }
  listen($('.steps'), 'click', event => {
    const button = event.target.closest('[data-tab]');
    if (button) setStep(button.dataset.tab);
  });
  listen($('.steps'), 'keydown', event => {
    const index = steps.indexOf(currentStep);
    const targets = { ArrowLeft: (index + 2) % 3, ArrowRight: (index + 1) % 3, Home: 0, End: 2 };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    setStep(steps[targets[event.key]], true);
  });
  listen(pane, 'click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const [key, value] = Object.entries(button.dataset)[0];
    if (key === 'charm') {
      state.charms = state.charms.includes(value) ? state.charms.filter(item => item !== value) : [...state.charms, value];
    } else {
      state[key] = key === 'length' ? +value : value;
    }
    $('#save-note').textContent = 'Designs are saved in this browser.';
    renderOptions('[data-' + key + '="' + value + '"]');
    updateSummary();
    viewer?.update();
  });
  listen($('#next'), 'click', () => setStep(steps[steps.indexOf(currentStep) + 1], true));
  listen($('#help'), 'click', () => $('#help-dialog').showModal());
  listen($('#save'), 'click', () => {
    const signature = JSON.stringify(state);
    if (saved.some(entry => JSON.stringify(entry.state) === signature)) {
      $('#save-note').textContent = 'This design is already saved.';
      return;
    }
    const next = [{ id: Date.now().toString(36), state: { ...state, charms: [...state.charms] } }, ...saved];
    if (persist(next)) $('#save-note').textContent = 'Design saved.';
  });
  function renderSaved() {
    const content = $('#saved-content');
    content.replaceChildren();
    if (!saved.length) {
      const message = document.createElement('p');
      message.className = 'empty';
      message.textContent = 'Your saved necklaces will appear here.';
      content.append(message);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'saved-list';
    for (const item of saved) {
      const row = document.createElement('li');
      row.className = 'saved-item';
      row.innerHTML = '<div><strong>Signature Cable</strong><small></small></div><button class="secondary" type="button">Load</button><button class="icon-button" type="button" aria-label="Remove saved design">' + icon('close', 15) + '</button>';
      $('small', row).textContent = describe(item.state);
      $('.secondary', row).addEventListener('click', () => {
        state = { ...item.state, charms: [...item.state.charms] };
        setStep('chain');
        updateSummary();
        viewer?.reset();
        $('#saved-dialog').close();
        $('#save-note').textContent = 'Saved design loaded.';
      });
      $('.icon-button', row).addEventListener('click', () => {
        if (persist(saved.filter(entry => entry.id !== item.id))) {
          renderSaved();
          ($('.secondary', content) || $('#saved-dialog .icon-button')).focus();
        }
      });
      list.append(row);
    }
    content.append(list);
  }
  listen($('#open-saved'), 'click', () => {
    renderSaved();
    $('#saved-dialog').showModal();
  });
  $('#saved-count').textContent = saved.length;
  setStep('chain');
  updateSummary();

  function createViewer() {
    const canvas = $('#scene');
    const shadowCanvas = $('#shadow');
    const shade = shadowCanvas.getContext('2d');
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) throw new Error('WebGL 2 unavailable');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    function shader(type, code) {
      const result = gl.createShader(type);
      gl.shaderSource(result, code);
      gl.compileShader(result);
      if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
      return result;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, `#version 300 es
      precision highp float;
      layout(location=0) in vec3 aPoint;
      layout(location=1) in vec3 aNormal;
      layout(location=2) in vec3 aX;
      layout(location=3) in vec3 aY;
      layout(location=4) in vec3 aZ;
      layout(location=5) in vec3 aOrigin;
      uniform mat3 uView;
      uniform vec3 uProjection;
      out vec3 vNormal;
      out vec3 vPoint;
      void main() {
        mat3 basis = mat3(aX, aY, aZ);
        vPoint = uView * (basis * aPoint + aOrigin);
        vNormal = uView * basis * aNormal;
        gl_Position = vec4(vPoint.xy * uProjection.xy + vec2(0.0, uProjection.z), -vPoint.z / 16.0, 1.0);
      }
    `));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `#version 300 es
      precision highp float;
      uniform vec3 uColor;
      uniform int uStyle;
      in vec3 vNormal;
      in vec3 vPoint;
      out vec4 outputColor;
      float softbox(vec3 ray, vec3 light, float power) {
        return pow(max(dot(ray, normalize(light)), 0.0), power);
      }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 eye = normalize(vec3(-vPoint.x * 0.032, -vPoint.y * 0.032, 1.0));
        vec3 ray = reflect(-eye, n);
        float mainBox = softbox(ray, vec3(-0.5, 0.65, 0.70), 9.0);
        float rimBox = softbox(ray, vec3(0.87, 0.22, 0.29), 14.0);
        float lowBox = softbox(ray, vec3(-0.17, -0.78, 0.61), 6.0);
        float stripe = exp(-pow((ray.x + 0.31) * 10.0, 2.0)) * smoothstep(-0.15, 0.8, ray.y);
        float diffuse = 0.20 * max(dot(n, normalize(vec3(-0.36, 0.72, 0.61))), 0.0);
        float rim = pow(1.0 - max(dot(n, eye), 0.0), 3.0);
        if (uStyle == 1) {
          float glaze = 0.55 * mainBox + 0.34 * rimBox + 0.26 * stripe + 0.28 * rim;
          outputColor = vec4(vec3(0.96, 0.93, 0.84) + 0.045 * glaze, 0.13 + glaze * 0.70);
          return;
        }
        if (uStyle == 2) {
          vec3 stoneColor = uColor * (0.42 + diffuse * 1.7 + 0.34 * lowBox + 0.33 * rim);
          outputColor = vec4(mix(stoneColor, vec3(1.0, 0.97, 0.91), 0.72 * mainBox + 0.32 * rimBox), 1.0);
          return;
        }
        vec3 metal = uColor * (0.37 + diffuse + 0.43 * mainBox + 0.58 * lowBox + 0.38 * rimBox + 0.16 * rim);
        float gloss = min(0.86, 0.62 * mainBox + 0.38 * rimBox + 0.39 * stripe + 0.15 * lowBox);
        outputColor = vec4(mix(metal, vec3(1.0, 0.978, 0.92), gloss), 1.0);
      }
    `));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    for (const shader of gl.getAttachedShaders(program)) gl.deleteShader(shader);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0,0,0,0);
    const uView = gl.getUniformLocation(program, 'uView');
    const uProjection = gl.getUniformLocation(program, 'uProjection');
    const uColor = gl.getUniformLocation(program, 'uColor');
    const uStyle = gl.getUniformLocation(program, 'uStyle');

    const instanceBuffer = gl.createBuffer();
    const instanceData = new Float32Array(300 * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData.byteLength, gl.DYNAMIC_DRAW);
    const meshes = {};
    for (const [key, mesh] of Object.entries(makeModels())) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.vertices), gl.STATIC_DRAW);
      for (let i = 0; i < 2; i++) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, i * 12);
      }
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      for (let i = 0; i < 4; i++) {
        gl.enableVertexAttribArray(i + 2);
        gl.vertexAttribPointer(i + 2, 3, gl.FLOAT, false, 48, i * 12);
        gl.vertexAttribDivisor(i + 2, 1);
      }
      meshes[key] = { vao, vertexBuffer, indexBuffer, count: mesh.indices.length };
    }
    function instance(index, basis, position) {
      const start = index * 12;
      instanceData.set(basis[0], start);
      instanceData.set(basis[1], start + 3);
      instanceData.set(basis[2], start + 6);
      instanceData.set(position, start + 9);
    }
    function drawMesh(key, count = 1, color = finishes[state.finish].color, style = 0) {
      gl.uniform3fv(uColor, color);
      gl.uniform1i(uStyle, style);
      gl.bindVertexArray(meshes[key].vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, instanceData, 0, count * 12);
      gl.drawElementsInstanced(gl.TRIANGLES, meshes[key].count, gl.UNSIGNED_SHORT, 0, count);
    }
    function object(key, position, basis = identity, color, style) {
      instance(0, basis, position);
      drawMesh(key, 1, color, style);
    }

    const nodeCount = 64;
    let path;
    let nodes;
    let restLengths;
    let chainLength;
    let ringLocations;
    let mode = 'rotate';
    let width = 1;
    let height = 1;
    let dpr = 1;
    let unit = 1;
    let centerY = 1;
    let yaw = -.14;
    let pitch = .055;
    let yawVelocity = 0;
    let pitchVelocity = 0;
    let basis = identity;
    let zoom = 1;
    let targetZoom = 1;
    let stageWidth = 1;
    let stageHeight = 1;
    let frame = 0;
    let last = 0;
    let until = 0;
    let accumulator = 0;
    let spin = null;
    let drag = null;
    let pinch = null;
    let contextLost = false;
    const pointers = new Map();
    const baseYaw = -.14;
    const basePitch = .055;

    function buildPath() {
      chainLength = state.length;
      path = referencePath(chainLength);
      nodes = Array.from({ length: nodeCount }, (_, i) => {
        const home = path.at(i / nodeCount);
        return { home, at: home, prev: home, pinned: i === 0 || i === 1 || i === nodeCount - 1 };
      });
      restLengths = nodes.map((node, i) => mag(sub(nodes[(i + 1) % nodeCount].home, node.home)));
      const half = Math.round((path.distance / 2 - .42) / .103);
      ringLocations = Array.from({ length: half * 2 + 1 }, (_, i) => {
        const start = .42 / path.distance;
        const u = start + i / (half * 2) * (1 - 2 * start);
        return { u, home: path.at(u), tilt: (i % 2 ? 1.31 : -.23) + Math.sin(i * 1.7) * .105 };
      });
    }
    function offset(u) {
      const x = wrap(u) * nodeCount;
      const i = Math.floor(x);
      const a = nodes[i];
      const b = nodes[(i + 1) % nodeCount];
      return lerp(sub(a.at, a.home), sub(b.at, b.home), x - i);
    }
    const point = (u, home = path.at(u)) => add(home, offset(u));
    function resize() {
      const rect = canvas.getBoundingClientRect();
      stageWidth = rect.width;
      stageHeight = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, stageWidth);
      height = Math.max(1, stageHeight);
      for (const surface of [canvas, shadowCanvas]) {
        surface.width = Math.round(width * dpr);
        surface.height = Math.round(height * dpr);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      request();
    }
    function setView() {
      const sx = Math.sin(pitch), cx = Math.cos(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
      basis = [[cy, sx * sy, -cx * sy], [0, cx, sx], [sy, -sx * cy, cx * cy]];
      const fittedWidth = width - (width < 440 ? 63 : 98);
      const size = Math.max(1, 1 + (state.length - 18) * .035);
      const drop = Math.max(1, size * (1 + (state.length - 18) * .009));
      const fittedHeight = height - (height < 540 ? 96 : 125);
      const pendant = state.locket !== 'none' ? 1.32 : state.charms.length ? .56 : 0;
      unit = Math.min(fittedWidth / (5.82 * size), fittedHeight / (7.55 * drop + pendant)) * zoom;
      centerY = height * .484 - pendant * unit * .47;
      gl.uniformMatrix3fv(uView, false, basis.flat());
      gl.uniform3f(uProjection, 2 * unit / width, 2 * unit / height, 1 - 2 * centerY / height);
    }
    function project(p) {
      const [x,y] = add(add(scale(basis[0],p[0]),scale(basis[1],p[1])),scale(basis[2],p[2]));
      return [width / 2 + x * unit, centerY - y * unit];
    }
    function drawShadow(pendant) {
      shade.setTransform(dpr,0,0,dpr,0,0);
      shade.clearRect(0,0,width,height);
      shade.save();
      shade.translate(3, 5);
      shade.filter = 'blur(3px)';
      shade.lineWidth = Math.max(1.4, unit * .11);
      shade.strokeStyle = '#6047192b';
      shade.fillStyle = '#6047191b';
      shade.beginPath();
      for (let i = 0; i <= 120; i++) {
        const [x,y] = project(point(i / 120));
        if (i === 0) shade.moveTo(x,y);
        else shade.lineTo(x,y);
      }
      shade.stroke();
      if (pendant) {
        const [x,y] = project(pendant);
        shade.beginPath();
        shade.ellipse(x,y,Math.max(.11, Math.abs(Math.cos(yaw)) * .42) * unit,.47 * unit,0,0,TAU);
        shade.fill();
      }
      shade.restore();
    }
    function render() {
      setView();
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const hasLocket = state.locket !== 'none';
      const bottom = point(.5);
      const angle = clamp((bottom[0] - nodes[nodeCount / 2].home[0]) * .52, -.57, .57);
      const frameX = [Math.cos(angle), Math.sin(angle), 0];
      const frameY = [-Math.sin(angle), Math.cos(angle), 0];
      const pendantBasis = [frameX, frameY, zAxis];
      const attach = (x,y,z = 0) => add(bottom, add(add(scale(frameX,x),scale(frameY,y)),[0,0,z]));
      const locketCenter = attach(0,-.72);
      drawShadow(hasLocket ? locketCenter : null);
      const delta = .33 / path.distance;
      const top = point(0);
      for (const [i, link] of ringLocations.entries()) {
        const at = point(link.u, link.home);
        const tangent = normal(sub(point(link.u + .0018), point(link.u - .0018)));
        const sideways = normal(cross(zAxis, tangent));
        const up = cross(tangent, sideways);
        const rolled = add(scale(sideways, Math.cos(link.tilt)), scale(up, Math.sin(link.tilt)));
        instance(i, [tangent, rolled, cross(tangent, rolled)], at);
      }
      drawMesh('link', ringLocations.length);
      object('jump',point(delta));
      object('jump',point(-delta));
      object('clasp',add(top,[.02,.012,0]));
      object('lever',add(top,[-.039,.12,.021]));
      if (hasLocket) {
        object('bail',attach(0,-.126,.013),pendantBasis);
        object(state.locket + 'Rim',attach(0,-.72,.056),pendantBasis);
        object(state.locket + 'Rim',attach(0,-.72,-.056),pendantBasis);
      }
      const charmCount = state.charms.length;
      const charmBasis = hasLocket ? pendantBasis.map(axis => scale(axis,.78)) : pendantBasis;
      for (const [i, name] of state.charms.entries()) {
        const relative = i - (charmCount - 1) / 2;
        let center;
        if (hasLocket) {
          const height = charmCount === 3 ? (i === 1 ? -.105 : .105) : .035;
          center = attach(relative * (charmCount === 3 ? .151 : .255), -.72 + height, .011);
        } else {
          const anchor = point(.5 + relative * .018);
          object('bail',add(anchor,[0,-.073,.016]),pendantBasis);
          center = add(anchor,scale(frameY,-.291 - (i % 2) * .055));
        }
        const isStone = name === 'ruby' || name === 'emerald';
        if (isStone) object(name + 'Mount',center,charmBasis);
        object(name,add(center,[0,0,isStone ? .014 : 0]),charmBasis,charms[name].color,isStone ? 2 : 0);
      }
      if (hasLocket) {
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        object(state.locket + 'Glass',locketCenter,pendantBasis,[1,1,1],1);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    }

    function stepChain(dt) {
      const grabbing = drag?.type === 'pull' ? drag : null;
      for (const [i, node] of nodes.entries()) {
        if (node.pinned) continue;
        const previous = node.at;
        if (grabbing?.index === i) {
          node.at = lerp(node.at, grabbing.target, .45);
        } else {
          const velocity = scale(sub(node.at,node.prev), .974);
          const spring = scale(sub(node.home,node.at), 49 * dt * dt);
          node.at = add(add(node.at,velocity),spring);
        }
        node.prev = previous;
      }
      for (let pass = 0; pass < 6; pass++) {
        for (const [i, rest] of restLengths.entries()) {
          const j = (i + 1) % nodeCount;
          const a = nodes[i], b = nodes[j];
          const aWeight = a.pinned ? 0 : grabbing?.index === i ? .07 : 1;
          const bWeight = b.pinned ? 0 : grabbing?.index === j ? .07 : 1;
          if (!aWeight && !bWeight) continue;
          const direction = sub(b.at,a.at);
          const length = mag(direction) || 1e-6;
          const correction = scale(direction, (length - rest) * .76 / (length * (aWeight + bWeight)));
          if (aWeight) a.at = add(a.at,scale(correction,aWeight));
          if (bWeight) b.at = sub(b.at,scale(correction,bWeight));
        }
      }
    }
    function restoreChain() {
      for (const node of nodes) node.at = node.prev = node.home;
      until = 0;
      accumulator = 0;
    }
    function request() {
      if (!frame && !contextLost) frame = requestAnimationFrame(tick);
    }
    function tick(time) {
      frame = 0;
      const dt = last ? clamp((time - last) / 1000, 0, .033) : 1 / 60;
      last = time;
      if (spin) {
        const t = clamp((time - spin.start) / 1450,0,1);
        yaw = spin.yaw + TAU * (.5 - Math.cos(Math.PI * t) / 2);
        if (t === 1) spin = null;
      } else if (drag?.type !== 'rotate' && !pinch) {
        yaw += yawVelocity * dt;
        pitch = clamp(pitch + pitchVelocity * dt,-1.44,1.44);
        const decay = Math.exp(-6.2 * dt);
        yawVelocity *= decay;
        pitchVelocity *= decay;
      }
      zoom += (targetZoom - zoom) * (reduced.matches ? 1 : 1 - Math.exp(-19 * dt));
      if (Math.abs(targetZoom - zoom) < .001) zoom = targetZoom;
      const pulling = drag?.type === 'pull' || time < until;
      if (pulling) {
        accumulator += dt;
        while (accumulator >= 1 / 120) {
          stepChain(1 / 120);
          accumulator -= 1 / 120;
        }
      } else if (until) {
        restoreChain();
      }
      render();
      if (spin || pulling || targetZoom !== zoom || Math.abs(yawVelocity) + Math.abs(pitchVelocity) > .014) request();
      else last = 0;
    }
    function changeZoom(next) {
      targetZoom = clamp(next, .65, 2.45);
      request();
    }
    function stopOrbit() {
      yawVelocity = pitchVelocity = 0;
      spin = null;
    }
    function reset() {
      drag = null;
      pinch = null;
      stopOrbit();
      restoreChain();
      yaw = baseYaw;
      pitch = basePitch;
      zoom = targetZoom = 1;
      update();
    }
    function update() {
      if (chainLength !== state.length) {
        drag = null;
        buildPath();
        restoreChain();
      }
      request();
    }
    function rotateOnce() {
      stopOrbit();
      if (reduced.matches) yaw += Math.PI;
      else spin = { yaw, start: performance.now() };
      request();
    }
    function keyboardPull() {
      if (reduced.matches) return;
      const node = nodes[nodeCount / 2];
      node.prev = sub(node.at,[.052,-.032,.017]);
      until = performance.now() + 2200;
      request();
    }
    function coordinates(event) {
      const bounds = canvas.getBoundingClientRect();
      return [event.clientX - bounds.left,event.clientY - bounds.top];
    }
    function pinchSpan() {
      const [a,b] = [...pointers.values()];
      return Math.hypot(a[0] - b[0],a[1] - b[1]);
    }
    function releasePull() {
      if (reduced.matches) restoreChain();
      else until = performance.now() + 2400;
    }
    function down(event) {
      if (event.button !== 0 || pointers.size >= 2) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      const xy = coordinates(event);
      pointers.set(event.pointerId,xy);
      canvas.setPointerCapture(event.pointerId);
      stopOrbit();
      if (pointers.size === 2) {
        if (drag?.type === 'pull') releasePull();
        drag = null;
        pinch = { initial: Math.max(1,pinchSpan()), zoom: targetZoom };
      } else if (mode === 'pull') {
        let nearest = 2;
        let minimum = Infinity;
        for (let i = 2; i < nodeCount - 1; i++) {
          const [x,y] = project(nodes[i].at);
          const distance = Math.hypot(x - xy[0],y - xy[1]);
          if (distance < minimum) {
            minimum = distance;
            nearest = i;
          }
        }
        const start = nodes[nearest].at;
        drag = { type: 'pull', id: event.pointerId, index: nearest, start, xy, target: start };
      } else {
        drag = { type: 'rotate', id: event.pointerId, xy, time: performance.now() };
      }
      request();
    }
    function move(event) {
      if (!pointers.has(event.pointerId)) return;
      const xy = coordinates(event);
      pointers.set(event.pointerId,xy);
      if (pinch && pointers.size === 2) {
        changeZoom(pinch.zoom * pinchSpan() / pinch.initial);
        return;
      }
      if (drag?.id !== event.pointerId) return;
      const dx = xy[0] - drag.xy[0], dy = xy[1] - drag.xy[1];
      if (drag.type === 'pull') {
        const delta = [dx / unit,-dy / unit,.16 * Math.hypot(dx,dy) / unit];
        const worldDelta = basis.map(axis => dot(axis,delta));
        const limit = Math.min(1, 1.15 / (mag(worldDelta) || 1));
        drag.target = add(drag.start,scale(worldDelta,limit));
      } else {
        const now = performance.now();
        const dt = Math.max(.012,(now - drag.time) / 1000);
        const turn = dx * .009;
        const tilt = dy * .008;
        yaw += turn;
        pitch = clamp(pitch + tilt,-1.44,1.44);
        yawVelocity = reduced.matches ? 0 : clamp(turn / dt,-4.2,4.2);
        pitchVelocity = reduced.matches ? 0 : clamp(tilt / dt,-3.6,3.6);
        drag.xy = xy;
        drag.time = now;
      }
      request();
    }
    function up(event) {
      if (!pointers.delete(event.pointerId)) return;
      if (pointers.size < 2) pinch = null;
      if (drag?.id === event.pointerId) {
        if (drag.type === 'pull') releasePull();
        else if (performance.now() - drag.time > 80 || event.type === 'pointercancel') stopOrbit();
        drag = null;
      }
      request();
    }

    listen(canvas, 'pointerdown',down);
    listen(canvas, 'pointermove',move);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(canvas, type,up);
    listen(canvas, 'wheel', event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      changeZoom(targetZoom * Math.exp(-delta * .0017));
    }, { passive: false });
    listen(canvas, 'keydown', event => {
      const moves = { ArrowLeft: [-.15,0], ArrowRight: [.15,0], ArrowUp: [0,-.13], ArrowDown: [0,.13] };
      if (Object.hasOwn(moves,event.key)) {
        stopOrbit();
        yaw += moves[event.key][0];
        pitch = clamp(pitch + moves[event.key][1],-1.44,1.44);
      } else if (event.key === '+' || event.key === '=') {
        changeZoom(targetZoom * 1.16);
      } else if (event.key === '-') {
        changeZoom(targetZoom / 1.16);
      } else if (event.key === ' ' || event.key === 'Enter') {
        if (mode === 'pull') keyboardPull();
        else rotateOnce();
      } else if (event.key === 'Home') {
        reset();
      } else {
        return;
      }
      event.preventDefault();
      request();
    });
    const controls = $$('.stage-controls button');
    function showUnavailable(message) {
      $('#preview-label').textContent = 'Preview unavailable';
      $('#fallback p').textContent = message;
      $('#fallback').hidden = false;
      $('#stage-tip').textContent = 'You can still customize and save your design.';
      canvas.tabIndex = -1;
      for (const control of controls) control.disabled = true;
    }
    listen(canvas, 'webglcontextlost', () => {
      contextLost = true;
      cancelAnimationFrame(frame);
      showUnavailable('The 3D preview stopped. Reload this page to reopen it.');
    });
    for (const button of $$('button[data-mode]')) {
      listen(button, 'click', () => {
        mode = button.dataset.mode;
        canvas.dataset.mode = mode;
        stopOrbit();
        for (const option of $$('button[data-mode]')) option.setAttribute('aria-pressed', option === button);
        $('#stage-tip').textContent = mode === 'pull' ? 'Grab a link, drag it, then let go' : 'Drag to rotate · Scroll or pinch to zoom';
        request();
      });
    }
    listen($('#spin'), 'click',rotateOnce);
    listen($('#zoom-in'), 'click',() => changeZoom(targetZoom * 1.21));
    listen($('#zoom-out'), 'click',() => changeZoom(targetZoom / 1.21));
    listen($('#reset-view'), 'click',reset);
    buildPath();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return {
      update,
      reset,
      dispose() {
        observer.disconnect();
        cancelAnimationFrame(frame);
        for (const { vao, vertexBuffer, indexBuffer } of Object.values(meshes)) {
          gl.deleteVertexArray(vao);
          gl.deleteBuffer(vertexBuffer);
          gl.deleteBuffer(indexBuffer);
        }
        gl.deleteBuffer(instanceBuffer);
        gl.deleteProgram(program);
      },
    };
  }
  try {
    viewer = createViewer();
  } catch (error) {
    console.warn(error);
    $('#preview-label').textContent = 'Preview unavailable';
    $('#fallback').hidden = false;
    $('#stage-tip').textContent = 'You can still customize and save your design.';
    $('#scene').tabIndex = -1;
    for (const control of $$('.stage-controls button')) control.disabled = true;
  }

  return () => {
    events.abort();
    viewer?.dispose();
  };
}

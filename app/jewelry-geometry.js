const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mag = a => Math.hypot(...a);
const normal = a => scale(a, 1 / (mag(a) || 1));
const wrap = t => ((t % 1) + 1) % 1;
const zAxis = [0, 0, 1];
const identity = [[1, 0, 0], [0, 1, 0], zAxis];
const polar = (count, fn) => Array.from({ length: count }, (_, i) => fn(i * TAU / count, i));
const ellipse = (x, y, count = 28) => polar(count, angle => [x * Math.cos(angle), y * Math.sin(angle), 0]);

function spline(points, t) {
  const fraction = wrap(t) * points.length;
  const i = Math.floor(fraction);
  const at = index => points[(index + points.length) % points.length];
  const [a, b, c, d] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
  const f = fraction - i;
  return b.map((value, j) => .5 * (2 * value + (c[j] - a[j]) * f
    + (2 * a[j] - 5 * value + 4 * c[j] - d[j]) * f * f
    + (-a[j] + 3 * value - 3 * c[j] + d[j]) * f * f * f));
}
function referencePath(length) {
  // Trace the clasp, broad shoulders and pointed drop of the reference photo.
  const right = [[.98,3.24,0],[1.91,2.76,.015],[2.50,2.02,.045],[2.70,1.25,.065],
    [2.62,.48,.05],[2.29,-.36,.025],[1.77,-1.22,.015],[1.19,-2.08,.01],[.60,-2.88,0],[.29,-3.26,0]];
  const points = [[0,3.40,0], ...right, [0,-3.39,0], ...right.toReversed().map(([x,y,z]) => [-x,y,z])];
  const size = 1 + (length - 18) * .035;
  const drop = size * (1 + (length - 18) * .009);
  const samples = Array.from({ length: 721 }, (_, i) => {
    const [x,y,z] = spline(points, i / 720);
    return [x * size, y * drop, z];
  });
  const distances = [0];
  for (let i = 1; i < samples.length; i++) distances.push(distances[i - 1] + mag(sub(samples[i], samples[i - 1])));
  const distance = distances.at(-1);
  function at(u) {
    const goal = wrap(u) * distance;
    let lo = 0;
    let hi = distances.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (distances[mid] <= goal) lo = mid;
      else hi = mid;
    }
    return lerp(samples[lo], samples[hi], (goal - distances[lo]) / (distances[hi] - distances[lo]));
  }
  return { at, distance };
}

function tube(path, radius, sides = 12) {
  const vertices = [];
  const indices = [];
  for (let i = 0; i < path.length; i++) {
    const next = (i + 1) % path.length;
    const prev = (i + path.length - 1) % path.length;
    const tangent = normal(sub(path[next], path[prev]));
    const side = normal(cross(tangent, zAxis));
    for (let j = 0; j < sides; j++) {
      const angle = j * TAU / sides;
      const n = add(scale(side, Math.cos(angle)), scale(zAxis, Math.sin(angle)));
      vertices.push(...add(path[i], scale(n, typeof radius === 'number' ? radius : radius(i))), ...n);
      const k = (j + 1) % sides;
      indices.push(i * sides + j, i * sides + k, next * sides + j, i * sides + k, next * sides + k, next * sides + j);
    }
  }
  return { vertices, indices };
}
function polygonArea(points) {
  return points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0);
}
function triangulate(points) {
  const remaining = points.map((_, i) => i);
  if (polygonArea(points) < 0) remaining.reverse();
  const indices = [];
  const turn = (a, b, c) => cross(sub(b, a), sub(c, a))[2];
  while (remaining.length > 3) {
    const ear = remaining.findIndex((b, i) => {
      const a = remaining.at(i - 1);
      const c = remaining[(i + 1) % remaining.length];
      if (turn(points[a], points[b], points[c]) <= 1e-8) return false;
      return remaining.every(n => n === a || n === b || n === c
        || turn(points[a], points[b], points[n]) < 0
        || turn(points[b], points[c], points[n]) < 0
        || turn(points[c], points[a], points[n]) < 0);
    });
    if (ear < 0) break;
    indices.push(remaining.at(ear - 1), remaining[ear], remaining[(ear + 1) % remaining.length]);
    remaining.splice(ear, 1);
  }
  if (remaining.length === 3) indices.push(...remaining);
  return indices;
}
function plate(path, depth, bevel, faceted = false) {
  const vertices = [];
  const indices = [];
  const points = polygonArea(path) < 0 ? [...path].reverse() : path;
  const layers = [[1 - bevel, depth], [1, depth * .48], [1, -depth * .48], [1 - bevel, -depth]];
  function triangle(a,b,c, forceNormal) {
    const start = vertices.length / 6;
    const n = forceNormal || normal(cross(sub(b,a),sub(c,a)));
    vertices.push(...a,...n,...b,...n,...c,...n);
    indices.push(start,start + 1,start + 2);
  }
  const rings = layers.map(([size,z]) => points.map(([x,y]) => [x * size, y * size, z]));
  for (let level = 0; level < rings.length - 1; level++) {
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      triangle(rings[level][i],rings[level + 1][i],rings[level][j]);
      triangle(rings[level][j],rings[level + 1][i],rings[level + 1][j]);
    }
  }
  if (faceted) {
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      triangle(rings[0][i],rings[0][j],[0,0,depth * 1.6]);
      triangle(rings[3][j],rings[3][i],[0,0,-depth * 1.6]);
    }
  } else {
    const face = triangulate(points);
    for (let i = 0; i < face.length; i += 3) {
      const [a,b,c] = face.slice(i, i + 3);
      triangle(rings[0][a],rings[0][b],rings[0][c],zAxis);
      triangle(rings[3][c],rings[3][b],rings[3][a],[0,0,-1]);
    }
  }
  return { vertices, indices };
}
function makeModels() {
  const locket = {
    round: ellipse(.43,.43,64),
    heart: polar(64, angle => [.026 * Math.sin(angle) ** 3 * 16, .025 * (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) + .08, 0]),
    oval: ellipse(.34,.48,64),
  };
  const star = polar(8, (a, i) => [.152 * Math.sin(a) * (i % 2 ? .39 : 1), .180 * Math.cos(a) * (i % 2 ? .39 : 1), 0]);
  const moon = [
    ...Array.from({ length: 19 }, (_, i) => {
      const a = (62 + 236 * i / 18) * Math.PI / 180;
      return [.15 * Math.cos(a), .15 * Math.sin(a), 0];
    }),
    ...Array.from({ length: 17 }, (_, i) => {
      const a = (298 - 236 * (i + 1) / 18) * Math.PI / 180;
      return [.15 * Math.cos(a) + .103 * Math.sin(Math.PI * (i + 1) / 18), .15 * Math.sin(a), 0];
    }),
  ];
  const stone = (width, height) => [[0,height,0],[width,height * .44,0],[width,-height * .44,0],[0,-height,0],[-width,-height * .44,0],[-width,height * .44,0]];
  const claw = [[-.245,.01,0],[-.18,.102,0],[-.047,.11,0],[.079,.051,0],[.161,.008,0],[.142,-.035,0],[.005,-.083,0],[-.129,-.080,0],[-.208,-.046,0]];
  const models = {
    link: tube(ellipse(.077,.057),.0175),
    jump: tube(ellipse(.073,.073),.022),
    clasp: tube(polar(46, (angle, i) => spline(claw, i / 46)), i => .025 + .028 * Math.exp(-((i - 20) ** 2) / 100)),
    lever: plate([[-.05,-.035,0],[.031,-.055,0],[.059,-.027,0],[.021,.038,0],[-.035,.026,0]],.028,.18),
    bail: tube(ellipse(.046,.086),.024),
    star: plate(star,.032,.22,true),
    moon: plate(moon,.033,.14),
    ruby: plate(stone(.107,.153),.05,.25,true),
    emerald: plate(stone(.10,.15),.05,.25,true),
    rubyMount: plate(stone(.122,.165),.031,.20),
    emeraldMount: plate(stone(.114,.162),.031,.20),
  };
  for (const [key, points] of Object.entries(locket)) {
    models[key + 'Rim'] = tube(points,.045,16);
    models[key + 'Glass'] = plate(points.map(point => scale(point,.95)),.059,.12);
  }
  return models;
}

export { TAU, clamp, add, sub, scale, lerp, dot, cross, mag, normal, wrap, zAxis, identity, referencePath, makeModels };

(() => {
  const STORAGE_KEY = "steel-truss-course-design-2026-v3";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const nf = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "-";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const ids = [
    "schemeNo", "manualOverride", "studentPreset", "studentName", "studentId", "className", "teacherName", "academicYear", "designWeek",
    "spanInput", "bayInput", "panelInput", "slopeInput", "endHeightInput", "weldLegInput",
    "waterproofInput", "levelTopInput", "insulationInput", "vaporInput", "levelBaseInput",
    "roofPanelInput", "trussSelfInput", "pipeInput", "liveInput", "snowInput", "ashInput",
    "factorInput", "steelInput", "weldRodInput", "steelStrengthInput", "weldStrengthInput"
  ];

  const studentRoster = [
    { scheme: 1, id: "2210908128", name: "郭毅成" },
    { scheme: 2, id: "2310908102", name: "张景琦" },
    { scheme: 3, id: "2310908103", name: "严琴彩" },
    { scheme: 4, id: "2310908108", name: "蔡建航" },
    { scheme: 5, id: "2310908111", name: "林加炜" },
    { scheme: 6, id: "2310908115", name: "庞健" },
    { scheme: 7, id: "2310908117", name: "纪居奇" },
    { scheme: 8, id: "2310908118", name: "卢燚" },
    { scheme: 9, id: "2310908120", name: "郑德臻" },
    { scheme: 10, id: "2310908121", name: "刘凯涵" },
    { scheme: 11, id: "2310908127", name: "王若文" },
    { scheme: 12, id: "2310908128", name: "段夏飞" },
    { scheme: 13, id: "2310908130", name: "陈建翔" },
    { scheme: 14, id: "2310908132", name: "雷长昕" },
    { scheme: 15, id: "2310908201", name: "黄鑫" },
    { scheme: 16, id: "2310908203", name: "白水明" },
    { scheme: 17, id: "2310908206", name: "艾佳亿" },
    { scheme: 18, id: "2310908207", name: "洛桑土登" },
    { scheme: 19, id: "2310908210", name: "陈佳闪" },
    { scheme: 20, id: "2310908214", name: "金师宇" },
    { scheme: 21, id: "2310908216", name: "陈林鹏" }
  ];

  const sections = [
    { name: "2L50x5", area: 960, i: 15.2 },
    { name: "2L56x5", area: 1084, i: 17.1 },
    { name: "2L63x5", area: 1228, i: 19.2 },
    { name: "2L70x6", area: 1618, i: 21.4 },
    { name: "2L75x6", area: 1740, i: 23.0 },
    { name: "2L80x6", area: 1860, i: 24.5 },
    { name: "2L90x8", area: 2784, i: 27.5 },
    { name: "2L100x8", area: 3100, i: 30.5 },
    { name: "2L110x10", area: 4260, i: 33.5 },
    { name: "2L125x10", area: 4860, i: 38.0 },
    { name: "2L140x12", area: 6480, i: 42.5 },
    { name: "2L160x14", area: 8580, i: 49.0 }
  ];

  const state = {
    model: null,
    loads: null,
    cases: [],
    members: [],
    sectionRows: [],
    nodes: [],
    report: "",
    selectedDiagram: null
  };

  function val(id) {
    const el = $(`#${id}`);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }

  function num(id, fallback = 0) {
    const parsed = Number.parseFloat(val(id));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function setVal(id, value) {
    const el = $(`#${id}`);
    if (!el) return;
    if (el.type === "checkbox") {
      el.checked = Boolean(value);
    } else {
      el.value = value ?? "";
    }
  }

  function getThermalAsh(schemeNo) {
    const pairs = [
      [[1, 36], 0.55, 0.7], [[2, 37], 0.60, 0.8], [[3, 38], 0.65, 0.9],
      [[4, 39], 0.70, 1.0], [[5, 40], 0.40, 1.1], [[6, 41], 0.45, 1.2],
      [[7, 42], 0.50, 1.3], [[8, 43], 0.60, 0.7], [[9, 44], 0.65, 0.8],
      [[10, 45], 0.70, 0.9], [[11, 46], 0.55, 1.0], [[12, 47], 0.50, 1.1],
      [[13, 48], 0.40, 1.2], [[14, 49], 0.45, 1.3], [[15, 50], 0.65, 0.7],
      [[16, 51], 0.70, 0.8], [[17, 52], 0.55, 0.9], [[18, 53], 0.40, 1.0],
      [[19, 54], 0.45, 1.1], [[20, 55], 0.50, 1.2], [[21, 56], 0.60, 1.3],
      [[22, 57], 0.70, 0.7], [[23, 58], 0.45, 0.8], [[24, 59], 0.50, 0.9],
      [[25, 60], 0.60, 1.0], [[26, 61], 0.45, 1.1], [[27, 62], 0.50, 1.2],
      [[28, 63], 0.60, 1.3], [[29, 64], 0.75, 0.7], [[30, 65], 0.50, 0.8],
      [[31, 66], 0.55, 0.9], [[32, 67], 0.65, 1.0], [[33, 68], 0.70, 1.1],
      [[34, 69], 0.60, 1.2], [[35, 70], 0.50, 1.3]
    ];
    const row = pairs.find(([keys]) => keys.includes(schemeNo));
    return row ? { insulation: row[1], ash: row[2] } : { insulation: 0.55, ash: 0.9 };
  }

  function getSchemeDefaults(schemeNo) {
    let span = 18;
    if (schemeNo >= 8 && schemeNo <= 14) span = 21;
    if (schemeNo >= 15 && schemeNo <= 21) span = 24;
    const snow = schemeNo <= 7 ? 0.65 : schemeNo <= 14 ? 0.55 : 0.45;
    const material = schemeNo % 2 === 1
      ? { steel: "Q235", weldRod: "E43", f: 215, fwf: 160 }
      : { steel: "Q345", weldRod: "E50", f: 310, fwf: 200 };
    const thermalAsh = getThermalAsh(schemeNo);
    return {
      span,
      panel: 1.5,
      bay: 6,
      slope: 0.1,
      endHeight: 1.99,
      roofSelf: 0.12 + 0.011 * span,
      snow,
      insulation: thermalAsh.insulation,
      ash: thermalAsh.ash,
      ...material
    };
  }

  function parseFactors(raw) {
    const parts = String(raw).match(/[0-9]+(?:\.[0-9]+)?/g) || [];
    return {
      gammaG: Number(parts[0]) || 1.3,
      gammaQ: Number(parts[1]) || 1.5
    };
  }

  function collectInputs() {
    const factors = parseFactors(val("factorInput"));
    return {
      schemeNo: clamp(Math.round(num("schemeNo", 1)), 1, 21),
      manualOverride: val("manualOverride"),
      studentName: val("studentName").trim(),
      studentId: val("studentId").trim(),
      className: val("className").trim(),
      teacherName: val("teacherName").trim(),
      academicYear: val("academicYear").trim(),
      designWeek: val("designWeek").trim(),
      span: num("spanInput", 18),
      bay: num("bayInput", 6),
      panel: num("panelInput", 1.5),
      slope: num("slopeInput", 0.1),
      endHeight: num("endHeightInput", 1.8),
      weldLeg: num("weldLegInput", 6),
      loads: {
        waterproof: num("waterproofInput", 0.4),
        levelTop: num("levelTopInput", 0.4),
        insulation: num("insulationInput", 0.55),
        vapor: num("vaporInput", 0.05),
        levelBase: num("levelBaseInput", 0.3),
        roofPanel: num("roofPanelInput", 1.4),
        trussSelf: num("trussSelfInput", 0.318),
        pipe: num("pipeInput", 0.15),
        live: num("liveInput", 0.6),
        snow: num("snowInput", 0.65),
        ash: num("ashInput", 0.7)
      },
      gammaG: factors.gammaG,
      gammaQ: factors.gammaQ,
      steel: val("steelInput").trim(),
      weldRod: val("weldRodInput").trim(),
      f: num("steelStrengthInput", 215),
      fwf: num("weldStrengthInput", 160)
    };
  }

  function applySchemeDefaults(force = false) {
    if (val("manualOverride") && !force) return;
    const schemeNo = clamp(Math.round(num("schemeNo", 1)), 1, 21);
    const defaults = getSchemeDefaults(schemeNo);
    setVal("spanInput", defaults.span);
    setVal("bayInput", defaults.bay);
    setVal("panelInput", defaults.panel);
    setVal("slopeInput", defaults.slope);
    setVal("endHeightInput", defaults.endHeight);
    setVal("trussSelfInput", defaults.roofSelf.toFixed(3));
    setVal("snowInput", defaults.snow.toFixed(2));
    setVal("insulationInput", defaults.insulation.toFixed(2));
    setVal("ashInput", defaults.ash.toFixed(2));
    setVal("steelInput", defaults.steel);
    setVal("weldRodInput", defaults.weldRod);
    setVal("steelStrengthInput", defaults.f);
    setVal("weldStrengthInput", defaults.fwf);
  }

  function populateStudentPreset() {
    const select = $("#studentPreset");
    select.innerHTML = `<option value="">手动填写</option>${studentRoster.map((student) =>
      `<option value="${student.id}">${student.scheme}号 · ${escapeHtml(student.name)} · ${student.id}</option>`
    ).join("")}`;
  }

  function applyStudentPreset() {
    const student = studentRoster.find((item) => item.id === val("studentPreset"));
    if (!student) return;
    setVal("studentName", student.name);
    setVal("studentId", student.id);
    setVal("schemeNo", student.scheme);
    applySchemeDefaults(true);
    calculate();
  }

  function buildLoads(input) {
    const l = input.loads;
    const permanentItems = [
      ["三毡四油防水层", l.waterproof],
      ["水泥砂浆找平层", l.levelTop],
      ["保温层", l.insulation],
      ["一毡二油隔气层", l.vapor],
      ["水泥砂浆找平层", l.levelBase],
      ["预应力混凝土大型屋面板", l.roofPanel],
      ["屋架及支撑自重", l.trussSelf],
      ["悬挂管道", l.pipe]
    ];
    const gk = permanentItems.reduce((sum, [, value]) => sum + value, 0);
    const roofVariable = Math.max(l.live, l.snow);
    const qk = roofVariable + l.ash;
    const gd = input.gammaG * gk;
    const qd = input.gammaQ * qk;
    const pg = gd * input.panel * input.bay;
    const pq = qd * input.panel * input.bay;
    const pFull = pg + pq;
    const constructionSelf = input.gammaG * l.trussSelf;
    const constructionHalf = input.gammaG * l.roofPanel + input.gammaQ * roofVariable;

    return {
      permanentItems,
      gk,
      roofVariable,
      variableItems: [
        ["屋面活荷载", l.live],
        ["雪荷载", l.snow],
        ["控制屋面活/雪荷载", roofVariable],
        ["积灰荷载", l.ash]
      ],
      qk,
      gd,
      qd,
      pg,
      pq,
      pFull,
      constructionSelf,
      constructionHalf,
      constructionFullNode: constructionSelf * input.panel * input.bay,
      constructionHalfNode: constructionHalf * input.panel * input.bay
    };
  }

  function buildGeometry(input) {
    const n = Math.max(4, Math.round(input.span / input.panel));
    const panel = input.span / n;
    const nodes = [];
    const bottom = [];
    const top = [];
    const bottomPanelIndices = [];
    for (let i = 0; i <= n; i += 2) bottomPanelIndices.push(i);
    const middleIndex = Math.floor(n / 2);
    if (!bottomPanelIndices.includes(middleIndex)) bottomPanelIndices.push(middleIndex);
    bottomPanelIndices.sort((a, b) => a - b);

    for (const panelIndex of bottomPanelIndices) {
      const x = panelIndex * panel;
      bottom.push(nodes.length);
      nodes.push({ id: bottomNodeLabel(panelIndex, n), kind: "bottom", panelIndex, x, y: 0 });
    }
    for (let i = 0; i <= n; i += 1) {
      const x = i * panel;
      const rise = Math.min(x, input.span - x) * input.slope;
      top.push(nodes.length);
      nodes.push({ id: topNodeLabel(i, n), kind: "top", panelIndex: i, x, y: input.endHeight + rise });
    }

    const members = [];
    const add = (a, b, group) => {
      const na = nodes[a];
      const nb = nodes[b];
      const length = Math.hypot(nb.x - na.x, nb.y - na.y);
      members.push({ id: `${na.id}${nb.id}`, a, b, group, length });
    };
    for (let i = 0; i < n; i += 1) add(top[i], top[i + 1], "上弦");
    for (let i = 0; i < bottom.length - 1; i += 1) add(bottom[i], bottom[i + 1], "下弦");
    bottomPanelIndices.forEach((panelIndex, i) => add(bottom[i], top[panelIndex], "竖杆"));
    for (let i = 0; i < bottom.length - 1; i += 1) {
      const leftPanel = bottomPanelIndices[i];
      const rightPanel = bottomPanelIndices[i + 1];
      if (rightPanel - leftPanel === 1) {
        if (rightPanel <= middleIndex) add(bottom[i], top[rightPanel], "斜腹杆");
        else add(top[leftPanel], bottom[i + 1], "斜腹杆");
      } else {
        const topMiddle = top[leftPanel + 1];
        add(bottom[i], topMiddle, "斜腹杆");
        add(topMiddle, bottom[i + 1], "斜腹杆");
      }
    }

    return { n, panel, nodes, bottom, top, members, bottomPanelIndices };
  }

  function topNodeLabel(index, panelCount) {
    const middle = Math.floor(panelCount / 2);
    const letterIndex = index <= middle ? index : panelCount - index;
    const letter = String.fromCharCode(65 + letterIndex);
    return index > middle ? `${letter}′` : letter;
  }

  function bottomNodeLabel(index, panelCount) {
    return topNodeLabel(index, panelCount).toLowerCase();
  }

  function solveLinear(A, b) {
    const n = b.length;
    const M = A.map((row, i) => row.concat(b[i]));
    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let r = col + 1; r < n; r += 1) {
        if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
      }
      if (Math.abs(M[pivot][col]) < 1e-10) throw new Error("屋架模型刚度矩阵奇异，请检查几何或支座。");
      [M[col], M[pivot]] = [M[pivot], M[col]];
      const div = M[col][col];
      for (let c = col; c <= n; c += 1) M[col][c] /= div;
      for (let r = 0; r < n; r += 1) {
        if (r === col) continue;
        const factor = M[r][col];
        if (Math.abs(factor) < 1e-14) continue;
        for (let c = col; c <= n; c += 1) M[r][c] -= factor * M[col][c];
      }
    }
    return M.map((row) => row[n]);
  }

  function solveTruss(model, loads, input, caseDef) {
    const dof = model.nodes.length * 2;
    const K = Array.from({ length: dof }, () => Array(dof).fill(0));
    const F = Array(dof).fill(0);
    const EA = 1;

    for (const m of model.members) {
      const a = model.nodes[m.a];
      const b = model.nodes[m.b];
      const L = m.length;
      const c = (b.x - a.x) / L;
      const s = (b.y - a.y) / L;
      const k = EA / L;
      const indices = [m.a * 2, m.a * 2 + 1, m.b * 2, m.b * 2 + 1];
      const local = [
        [c * c, c * s, -c * c, -c * s],
        [c * s, s * s, -c * s, -s * s],
        [-c * c, -c * s, c * c, c * s],
        [-c * s, -s * s, c * s, s * s]
      ];
      for (let r = 0; r < 4; r += 1) {
        for (let col = 0; col < 4; col += 1) K[indices[r]][indices[col]] += k * local[r][col];
      }
    }

    const mid = input.span / 2;
    const loadForTopNode = (i, mode) => {
      const x = i * model.panel;
      const endFactor = (i === 0 || i === model.n) ? 0.5 : 1;
      if (mode === "full") return (loads.pg + loads.pq) * endFactor;
      if (mode === "left" || mode === "right") {
        const sideFactor = halfSpanNodeFactor(x, mid, mode) * endFactor;
        return loads.pg * endFactor + loads.pq * sideFactor;
      }
      if (mode === "constructionLeft" || mode === "constructionRight") {
        const side = mode === "constructionLeft" ? "left" : "right";
        const sideFactor = halfSpanNodeFactor(x, mid, side) * endFactor;
        return loads.constructionFullNode * endFactor + loads.constructionHalfNode * sideFactor;
      }
      return 0;
    };

    for (let i = 0; i <= model.n; i += 1) {
      const node = model.top[i];
      F[node * 2 + 1] -= loadForTopNode(i, caseDef.mode);
    }

    const fixed = new Set([
      model.bottom[0] * 2,
      model.bottom[0] * 2 + 1,
      model.bottom[model.bottom.length - 1] * 2 + 1
    ]);
    const free = [];
    for (let i = 0; i < dof; i += 1) {
      if (!fixed.has(i)) free.push(i);
    }
    const Kr = free.map((r) => free.map((c) => K[r][c]));
    const Fr = free.map((r) => F[r]);
    const dr = solveLinear(Kr, Fr);
    const d = Array(dof).fill(0);
    free.forEach((dofIndex, i) => { d[dofIndex] = dr[i]; });

    const memberForces = model.members.map((m) => {
      const a = model.nodes[m.a];
      const b = model.nodes[m.b];
      const L = m.length;
      const c = (b.x - a.x) / L;
      const s = (b.y - a.y) / L;
      const extension = -c * d[m.a * 2] - s * d[m.a * 2 + 1] + c * d[m.b * 2] + s * d[m.b * 2 + 1];
      return (EA / L) * extension;
    });

    const reactions = K.map((row) => row.reduce((sum, kij, i) => sum + kij * d[i], 0))
      .map((value, i) => value - F[i]);

    return { ...caseDef, memberForces, reactions };
  }

  function halfSpanNodeFactor(x, mid, side) {
    const eps = 1e-7;
    if (Math.abs(x - mid) < eps) return 0.5;
    if (side === "left") return x < mid ? 1 : 0;
    return x > mid ? 1 : 0;
  }

  function analyzeMembers(model, cases, input) {
    return model.members.map((member, index) => {
      const forces = Object.fromEntries(cases.map((c) => [c.key, c.memberForces[index]]));
      const values = Object.values(forces);
      const tension = Math.max(0, ...values);
      const compression = Math.min(0, ...values);
      const hasCompression = compression < -0.1;
      const absControl = Math.max(...values.map((v) => Math.abs(v)));
      const controlCase = cases.reduce((best, c) => {
        const v = Math.abs(c.memberForces[index]);
        return v > best.value ? { key: c.key, name: c.name, value: v } : best;
      }, { key: "", name: "", value: -Infinity });
      let slenderLimit = hasCompression ? 150 : 350;
      if (member.group === "下弦") slenderLimit = hasCompression ? 150 : 250;
      return {
        ...member,
        forces,
        tension,
        compression,
        absControl,
        controlKey: controlCase.key,
        controlForce: forces[controlCase.key],
        controlCase: controlCase.name,
        slenderLimit,
        effectiveLength: effectiveLength(member, input)
      };
    });
  }

  function effectiveLength(member) {
    if (member.group === "上弦" || member.group === "下弦") return member.length * 0.8;
    return member.length;
  }

  function gbPhi(lambda) {
    if (lambda <= 40) return 0.92;
    if (lambda <= 80) return 0.92 - (lambda - 40) * 0.0032;
    if (lambda <= 120) return 0.792 - (lambda - 80) * 0.0046;
    if (lambda <= 180) return 0.608 - (lambda - 120) * 0.0041;
    return Math.max(0.16, 0.362 - (lambda - 180) * 0.0015);
  }

  function selectSections(memberRows, input) {
    return memberRows.map((m) => {
      const compression = Math.abs(Math.min(0, m.compression));
      const tension = Math.max(0, m.tension);
      const requiredAreaT = tension > 0 ? tension * 1000 / input.f : 0;
      const selected = sections.find((sec) => {
        const lambda = (m.effectiveLength * 1000) / sec.i;
        const phi = gbPhi(lambda);
        const compressionOk = compression === 0 || (phi * sec.area * input.f / 1000 >= compression && lambda <= m.slenderLimit);
        const tensionOk = tension === 0 || sec.area >= requiredAreaT;
        return compressionOk && tensionOk;
      }) || sections[sections.length - 1];
      const lambda = (m.effectiveLength * 1000) / selected.i;
      const phi = gbPhi(lambda);
      const nDesign = phi * selected.area * input.f / 1000;
      const stress = selected.area > 0 ? m.absControl * 1000 / selected.area : 0;
      return {
        id: m.id,
        group: m.group,
        force: m.absControl,
        selected: selected.name,
        area: selected.area,
        i: selected.i,
        lambda,
        slenderLimit: m.slenderLimit,
        phi,
        stress,
        nDesign,
        status: lambda <= m.slenderLimit && nDesign >= compression && selected.area >= requiredAreaT ? "满足初选" : "需加大或复核"
      };
    });
  }

  function buildNodeCards(model, memberRows, input) {
    const lowerQuarterIndex = model.bottom[Math.max(1, Math.floor((model.bottom.length - 1) / 4))];
    const upperQuarterIndex = model.top[Math.max(1, Math.floor(model.n / 4))];
    const ridgeIndex = model.top[Math.floor(model.n / 2)];
    const lowerCenterIndex = model.bottom.reduce((best, nodeIndex) =>
      Math.abs(model.nodes[nodeIndex].x - input.span / 2) < Math.abs(model.nodes[best].x - input.span / 2) ? nodeIndex : best,
    model.bottom[0]);
    const pick = [
      { title: "下弦一般节点", nodeId: model.nodes[lowerQuarterIndex].id },
      { title: "上弦一般节点", nodeId: model.nodes[upperQuarterIndex].id },
      { title: "下弦支座节点", nodeId: model.nodes[model.bottom[0]].id },
      { title: "屋脊节点", nodeId: model.nodes[ridgeIndex].id },
      { title: "下弦中央节点", nodeId: model.nodes[lowerCenterIndex].id }
    ];
    const memberMap = new Map(memberRows.map((m) => [m.id, m]));
    const connected = (nodeIndex) => model.members
      .filter((m) => m.a === nodeIndex || m.b === nodeIndex)
      .map((m) => memberMap.get(m.id))
      .filter(Boolean);
    const maxWebForce = Math.max(0, ...memberRows
      .filter((m) => m.group.includes("腹") || m.group === "竖杆")
      .map((m) => m.absControl));
    const supportPlate = gussetPlateThickness(maxWebForce);
    const commonPlate = Math.max(8, supportPlate - 2);

    return pick.map((item) => {
      const nodeIndex = model.nodes.findIndex((n) => n.id === item.nodeId);
      const list = connected(nodeIndex);
      const maxWeb = Math.max(0, ...list.filter((m) => m.group.includes("腹") || m.group === "竖杆").map((m) => m.absControl));
      const maxChord = Math.max(0, ...list.filter((m) => m.group.includes("弦")).map((m) => m.absControl));
      const control = Math.max(maxWeb, maxChord);
      const weldLength = Math.max(60, control * 1000 / (2 * 0.7 * input.weldLeg * input.fwf) + 2 * input.weldLeg);
      const isSupport = nodeIndex === model.bottom[0] || nodeIndex === model.bottom[model.bottom.length - 1];
      const plate = isSupport ? supportPlate : commonPlate;
      return {
        ...item,
        members: list.map((m) => `${m.id} ${m.group} ${nf(m.absControl, 1)} kN`).join("；"),
        maxWeb,
        maxChord,
        control,
        weldLength,
        plate,
        isSupport,
        maxWebForce,
        plateBasis: `按全榀腹杆最大内力 ${nf(maxWebForce, 1)} kN 取支座节点板 ${supportPlate} mm，中间节点通常减小 2 mm。`
      };
    });
  }

  function gussetPlateThickness(force) {
    if (force <= 200) return 8;
    if (force <= 320) return 10;
    if (force <= 520) return 12;
    if (force <= 780) return 14;
    return 16;
  }

  function calculate() {
    const input = collectInputs();
    const loads = buildLoads(input);
    const model = buildGeometry(input);
    const caseDefs = [
      { key: "combo1", name: "组合一：全跨永久 + 全跨可变", mode: "full" },
      { key: "combo2L", name: "组合二：全跨永久 + 左半跨可变", mode: "left" },
      { key: "combo2R", name: "组合二：全跨永久 + 右半跨可变", mode: "right" },
      { key: "combo3L", name: "组合三：屋架自重全跨 + 左半跨屋面板/活载", mode: "constructionLeft" },
      { key: "combo3R", name: "组合三：屋架自重全跨 + 右半跨屋面板/活载", mode: "constructionRight" }
    ];
    const cases = caseDefs.map((def) => solveTruss(model, loads, input, def));
    const members = analyzeMembers(model, cases, input);
    const sectionRows = selectSections(members, input);
    const nodes = buildNodeCards(model, members, input);
    const report = generateReport(input, loads, model, members, sectionRows, nodes);
    const selected = state.selectedDiagram && resolveDiagramSelection(state.selectedDiagram, model, members)
      ? state.selectedDiagram
      : { type: "member", id: members.reduce((best, m) => m.absControl > best.absControl ? m : best, members[0]).id };

    Object.assign(state, { input, loads, model, cases, members, sectionRows, nodes, report, selectedDiagram: selected });
    render();
  }

  function render() {
    renderSchemeBadge(state.input);
    renderSummary();
    renderNotices();
    renderLoads();
    renderModel();
    renderMembers();
    renderSections();
    renderNodes();
    $("#reportText").value = state.report;
  }

  function renderSchemeBadge(input) {
    const defaults = getSchemeDefaults(input.schemeNo);
    $("#schemeBadge").innerHTML = `
      <strong>${input.schemeNo} 号方案</strong><br>
      跨度 ${nf(defaults.span, 0)} m，${defaults.steel} + ${defaults.weldRod}<br>
      雪 ${nf(defaults.snow, 2)}，保温 ${nf(defaults.insulation, 2)}，积灰 ${nf(defaults.ash, 2)} kN/m²
    `;
  }

  function renderSummary() {
    const input = state.input;
    const loads = state.loads;
    const maxMember = state.members.reduce((best, m) => m.absControl > best.absControl ? m : best, state.members[0]);
    const metrics = [
      ["跨度", `${nf(input.span, 1)} m`, `${state.model.n} 个节间，节间 ${nf(state.model.panel, 2)} m`],
      ["材料", `${input.steel} / ${input.weldRod}`, `f=${nf(input.f, 0)} N/mm²，fwf=${nf(input.fwf, 0)} N/mm²`],
      ["标准荷载", `${nf(loads.gk, 2)} + ${nf(loads.qk, 2)}`, "永久 + 可变，kN/m²"],
      ["组合一节点荷载", `${nf(loads.pFull, 2)} kN`, `P=(${nf(loads.gd, 2)}+${nf(loads.qd, 2)})×${nf(input.panel, 2)}×${nf(input.bay, 1)}`],
      ["控制杆件", maxMember ? `${maxMember.id} ${nf(maxMember.absControl, 1)} kN` : "-", maxMember ? `${maxMember.group}，${maxMember.controlCase}` : ""],
      ["屋脊高度", `${nf(input.endHeight + input.span * input.slope / 2, 2)} m`, `端部高度 ${nf(input.endHeight, 2)} m，坡度 ${nf(input.slope, 3)}`],
      ["屋架自重", `${nf(input.loads.trussSelf, 3)} kN/m²`, `0.12 + 0.011L = ${nf(0.12 + 0.011 * input.span, 3)}`],
      ["起拱参考", input.span >= 24 ? `${nf(input.span * 1000 / 500, 0)} mm` : "可不设置", input.span >= 24 ? "教材建议梯形屋架 L≥24m 时 f=L/500" : "跨度小于 24m，按教材适用阈值处理"]
    ];
    $("#summaryGrid").innerHTML = metrics.map(([label, value, note]) => `
      <article class="metric"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>
    `).join("");
  }

  function renderNotices() {
    const input = state.input;
    const notices = [
      ["2026年任务书方案表：1-7 号为 18m、8-14 号为 21m、15-21 号为 24m。参数需要调整时可勾选手动覆盖。", "warn"],
      ["教材做法：屋面荷载按水平投影面积折算为节点荷载，先求全跨和半跨作用下内力，再列表取各杆最不利内力。", ""],
      ["杆件内力来自平面桁架刚度法和内置梯形屋架简图，可等效生成内力系数。提交前应对照正式指导书附图及内力系数图复核。", "warn"],
      ["默认分项系数按教材例题设为 γG=1.3、γQ=1.5；采用其他荷载组合规定时可在左侧修改。", "warn"],
      ["2026年成果要求：计算书采用 A4 Word 文档，工程图用 AutoCAD 绘制 1 号图。DXF 导出仅是屋架轴线与杆件编号底图。", ""],
      [`当前模型：${input.span}m 跨，${state.model.n} 个节间，屋面板节点间距约 ${nf(state.model.panel, 2)}m。`, ""]
    ];
    $("#noticeList").innerHTML = notices.map(([text, tone]) => `<div class="notice ${tone}">${text}</div>`).join("");
  }

  function renderLoads() {
    const { input, loads } = state;
    const permanentRows = loads.permanentItems.map(([name, value]) => [name, nf(value, 3)]);
    permanentRows.push(["永久荷载标准值合计 Gk", nf(loads.gk, 3)]);
    const variableRows = loads.variableItems.map(([name, value]) => [name, nf(value, 3)]);
    variableRows.push(["可变荷载标准值合计 Qk", nf(loads.qk, 3)]);
    const comboRows = [
      ["组合一", "全跨永久荷载 + 全跨可变荷载", nf(loads.gd + loads.qd, 3), nf(loads.pFull, 2)],
      ["组合二", "全跨永久荷载 + 半跨可变荷载", `${nf(loads.gd, 3)} / ${nf(loads.qd, 3)}`, `${nf(loads.pg, 2)} / ${nf(loads.pq, 2)}`],
      ["组合三", "全跨屋架自重 + 半跨屋面板及屋面活/雪荷载", `${nf(loads.constructionSelf, 3)} / ${nf(loads.constructionHalf, 3)}`, `${nf(loads.constructionFullNode, 2)} / ${nf(loads.constructionHalfNode, 2)}`]
    ];
    $("#loadTables").innerHTML = `
      ${table(["永久荷载项目", "标准值 kN/m²"], permanentRows)}
      ${table(["可变荷载项目", "标准值 kN/m²"], variableRows)}
      ${table(["组合", "内容", "面荷载设计值 kN/m²", `节点荷载 kN（×${nf(input.panel, 2)}m×${nf(input.bay, 1)}m）`], comboRows)}
      <p class="muted">屋面活荷载与雪荷载按不同时出现处理，取二者较大值后与积灰荷载组合。</p>
    `;
  }

  function renderModel() {
    $("#trussSvgWrap").innerHTML = makeTrussSvg();
    wireDiagramInteractions();
    renderDiagramDetail();
    const rows = state.model.nodes.map((node) => [node.id, node.kind === "top" ? "上弦节点" : "下弦节点", nf(node.x, 3), nf(node.y, 3)]);
    $("#geometryTable").innerHTML = table(["节点", "类型", "x m", "y m"], rows);
  }

  function makeTrussSvg() {
    const { model, members, input, loads } = state;
    const width = 1280;
    const height = 620;
    const padX = 86;
    const plotTop = 150;
    const baseY = 455;
    const scaleX = (width - padX * 2) / input.span;
    const maxY = input.endHeight + input.span * input.slope / 2;
    const scaleY = (baseY - plotTop) / Math.max(1, maxY);
    const maxForce = Math.max(1, ...members.map((m) => m.absControl));
    const pt = (node) => ({ x: padX + node.x * scaleX, y: baseY - node.y * scaleY });
    const selected = state.selectedDiagram || {};
    const memberLines = members.map((m) => {
      const a = pt(model.nodes[m.a]);
      const b = pt(model.nodes[m.b]);
      const force = m.absControl;
      const color = m.compression < 0 && Math.abs(m.compression) >= m.tension ? "#2f7d6b" : "#bd5a3d";
      const widthLine = 1.2 + 3.8 * Math.sqrt(force / maxForce);
      const isSelected = selected.type === "member" && selected.id === m.id;
      return `<g class="svg-member ${isSelected ? "is-selected" : ""}" data-member-id="${m.id}" tabindex="0" role="button">
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${nf(widthLine, 2)}" stroke-linecap="round" />
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="svg-hitline" />
        <title>${m.id} ${m.group}，控制内力 ${signed(nf(m.controlForce, 1))} kN，长度 ${nf(m.length, 3)} m</title>
      </g>`;
    }).join("");
    const nodeDots = model.nodes.map((node) => {
      const p = pt(node);
      const isSelected = selected.type === "node" && selected.id === node.id;
      return `<g class="svg-node ${isSelected ? "is-selected" : ""}" data-node-id="${node.id}" tabindex="0" role="button">
        <circle cx="${p.x}" cy="${p.y}" r="4.4" />
        <circle cx="${p.x}" cy="${p.y}" r="10" class="svg-node-hit" />
        <title>${node.id} (${nf(node.x, 2)}, ${nf(node.y, 2)})</title>
      </g>`;
    }).join("");
    const labels = model.nodes.map((node) => {
      const p = pt(node);
      const dy = node.kind === "top" ? -15 : 25;
      return `<text x="${p.x}" y="${p.y + dy}" text-anchor="middle" class="svg-node-label">${node.id}</text>`;
    }).join("");
    const memberLabels = buildDiagramMemberLabels(model, members, pt, input.span, width, plotTop, baseY)
      .map((label) => `<g class="svg-tag" data-member-id="${label.id}">
        <rect x="${label.x - label.w / 2}" y="${label.y - 13}" width="${label.w}" height="18" rx="4" />
        <text x="${label.x}" y="${label.y}" text-anchor="middle">${escapeHtml(label.text)}</text>
      </g>`).join("");
    const loadsSvg = model.top.map((nodeIndex, i) => {
      const node = model.nodes[nodeIndex];
      const p = pt(node);
      const load = loads.pFull * ((i === 0 || i === model.n) ? 0.5 : 1);
      const arrowTop = Math.max(92, p.y - 58);
      const showLabel = i === 0 || i === model.n || i === Math.floor(model.n / 2) || i % 2 === 0;
      return `<g>
        <line x1="${p.x}" y1="${arrowTop}" x2="${p.x}" y2="${p.y - 12}" stroke="#6750a4" stroke-width="1.4" marker-end="url(#arrow)" />
        ${showLabel ? `<text x="${p.x}" y="${arrowTop - 8}" text-anchor="middle" class="svg-load-label">${nf(load, 1)}</text>` : ""}
      </g>`;
    }).join("");
    const dimensionY = baseY + 46;
    const camber = input.span >= 24 ? input.span * 1000 / 500 : 0;
    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="梯形钢屋架计算简图">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L8,4 L0,8 Z" fill="#6750a4"></path>
          </marker>
        </defs>
        <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfcf8" />
        <text x="${width / 2}" y="36" text-anchor="middle" class="svg-title">${input.span}m 梯形钢屋架计算简图</text>
        <text x="${width / 2}" y="62" text-anchor="middle" class="svg-note">左半跨：杆件编号与几何长度（mm）；右半跨：杆件编号与最不利内力（kN）</text>
        ${loadsSvg}
        ${memberLines}
        ${nodeDots}
        ${memberLabels}
        ${labels}
        <line x1="${padX}" y1="${dimensionY}" x2="${width - padX}" y2="${dimensionY}" stroke="#20292b" />
        <line x1="${padX}" y1="${dimensionY - 6}" x2="${padX}" y2="${dimensionY + 6}" stroke="#20292b" />
        <line x1="${width - padX}" y1="${dimensionY - 6}" x2="${width - padX}" y2="${dimensionY + 6}" stroke="#20292b" />
        <text x="${width / 2}" y="${dimensionY + 24}" text-anchor="middle" class="svg-label">计算跨度 L = ${nf(input.span, 2)} m，柱距 ${nf(input.bay, 1)} m，节间 ${nf(state.model.panel, 2)} m</text>
        ${camber > 0 ? `<path d="M${padX} ${dimensionY + 50} Q${width / 2} ${dimensionY + 50 - 24} ${width - padX} ${dimensionY + 50}" fill="none" stroke="#b0842c" stroke-width="1.4" stroke-dasharray="6 5" />
        <text x="${width / 2}" y="${dimensionY + 79}" text-anchor="middle" class="svg-label">施工图起拱参考：f = L/500 = ${nf(camber, 0)} mm</text>` : ""}
        <style>
          .svg-title{font:700 20px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;fill:#20292b}
          .svg-note,.svg-label,.svg-node-label,.svg-load-label{font:12px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;fill:#46534f}
          .svg-load-label{fill:#6750a4}
          .svg-node circle:first-child{fill:#20292b}
          .svg-node-hit,.svg-hitline{fill:transparent;stroke:transparent;stroke-width:18px;cursor:pointer}
          .svg-member,.svg-node,.svg-tag{cursor:pointer}
          .svg-member:hover line:first-child,.svg-member.is-selected line:first-child{stroke:#111827;stroke-width:6px}
          .svg-node:hover circle:first-child,.svg-node.is-selected circle:first-child{fill:#b0842c}
          .svg-tag rect{fill:rgba(255,255,255,.88);stroke:#cfd8d5}
          .svg-tag text{font:11px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;fill:#20292b}
        </style>
      </svg>
    `;
  }

  function buildDiagramMemberLabels(model, members, pt, span, width, plotTop, baseY) {
    const placed = [];
    const priority = { "上弦": 0, "下弦": 1, "斜腹杆": 2, "竖杆": 3 };
    const ordered = [...members].sort((a, b) => (priority[a.group] ?? 9) - (priority[b.group] ?? 9));
    const labels = [];
    for (const m of ordered) {
      const a = pt(model.nodes[m.a]);
      const b = pt(model.nodes[m.b]);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const midX = (model.nodes[m.a].x + model.nodes[m.b].x) / 2;
      const text = midX <= span / 2
        ? `${m.id} ${Math.round(m.length * 1000)}`
        : `${m.id} ${signed(nf(m.controlForce, 0))}`;
      const w = Math.max(38, text.length * 7 + 12);
      const candidates = labelCandidates(a, b, mx, my, m.group);
      const box = placeLabel(candidates, w, 18, placed, width, plotTop, baseY + 18);
      if (!box) continue;
      placed.push(box);
      labels.push({ id: m.id, text, x: box.x, y: box.y, w });
    }
    return labels;
  }

  function labelCandidates(a, b, mx, my, group) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const base = group === "下弦" ? [[0, 22], [0, 36], [24, 22], [-24, 22]]
      : group === "上弦" ? [[0, -20], [0, -34], [26, -20], [-26, -20]]
      : [[nx * 22, ny * 22], [-nx * 22, -ny * 22], [nx * 34, ny * 34], [-nx * 34, -ny * 34], [22, 0], [-22, 0]];
    return base.map(([ox, oy]) => ({ x: mx + ox, y: my + oy }));
  }

  function placeLabel(candidates, w, h, placed, width, minY, maxY) {
    for (const point of candidates) {
      const box = { x: point.x, y: point.y, left: point.x - w / 2, right: point.x + w / 2, top: point.y - h, bottom: point.y + 4 };
      const inside = box.left > 10 && box.right < width - 10 && box.top > minY && box.bottom < maxY;
      if (!inside) continue;
      const overlaps = placed.some((old) => !(box.right < old.left - 4 || box.left > old.right + 4 || box.bottom < old.top - 4 || box.top > old.bottom + 4));
      if (!overlaps) return box;
    }
    return null;
  }

  function wireDiagramInteractions() {
    const wrap = $("#trussSvgWrap");
    wrap.querySelectorAll("[data-member-id], [data-node-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const memberId = el.dataset.memberId;
        const nodeId = el.dataset.nodeId;
        selectDiagramItem(memberId ? "member" : "node", memberId || nodeId);
      });
      el.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const memberId = el.dataset.memberId;
        const nodeId = el.dataset.nodeId;
        selectDiagramItem(memberId ? "member" : "node", memberId || nodeId);
      });
    });
  }

  function selectDiagramItem(type, id) {
    state.selectedDiagram = { type, id };
    renderModel();
  }

  function resolveDiagramSelection(selection, model, members) {
    if (!selection) return null;
    if (selection.type === "member") return members.find((m) => m.id === selection.id) || null;
    if (selection.type === "node") return model.nodes.find((n) => n.id === selection.id) || null;
    return null;
  }

  function renderDiagramDetail() {
    const selection = state.selectedDiagram;
    const box = $("#diagramDetail");
    if (!selection) {
      box.innerHTML = `<p class="muted">点击图中的杆件或节点查看编号、内力和连接信息。</p>`;
      return;
    }
    if (selection.type === "member") {
      const member = state.members.find((m) => m.id === selection.id);
      if (!member) return;
      const sec = state.sectionRows.find((row) => row.id === member.id);
      const a = state.model.nodes[member.a];
      const b = state.model.nodes[member.b];
      box.innerHTML = `
        <div>
          <h3>${member.id} ${member.group}</h3>
          <p>端点：${a.id} - ${b.id}，长度 ${nf(member.length, 3)} m，计算长度 ${nf(member.effectiveLength, 3)} m。</p>
        </div>
        <div class="detail-grid">
          <span>组合一</span><strong>${signed(nf(member.forces.combo1, 1))} kN</strong>
          <span>组合二左 / 右</span><strong>${signed(nf(member.forces.combo2L, 1))} / ${signed(nf(member.forces.combo2R, 1))} kN</strong>
          <span>组合三左 / 右</span><strong>${signed(nf(member.forces.combo3L, 1))} / ${signed(nf(member.forces.combo3R, 1))} kN</strong>
          <span>控制内力</span><strong>${signed(nf(member.controlForce, 1))} kN，${member.controlCase}</strong>
          <span>初选截面</span><strong>${sec ? `${sec.selected}，λ=${nf(sec.lambda, 0)} / [λ]=${member.slenderLimit}` : "-"}</strong>
        </div>
      `;
      return;
    }
    const node = state.model.nodes.find((n) => n.id === selection.id);
    if (!node) return;
    const nodeIndex = state.model.nodes.indexOf(node);
    const connected = state.members.filter((m) => m.a === nodeIndex || m.b === nodeIndex);
    box.innerHTML = `
      <div>
        <h3>${node.id} ${node.kind === "top" ? "上弦节点" : "下弦节点"}</h3>
        <p>坐标：x=${nf(node.x, 3)} m，y=${nf(node.y, 3)} m。点击相连杆件可继续查看截面和控制组合。</p>
      </div>
      <div class="detail-grid">
        ${connected.map((m) => `<span>${m.id} ${m.group}</span><strong>${signed(nf(m.controlForce, 1))} kN，L=${nf(m.length, 2)} m</strong>`).join("")}
      </div>
    `;
  }

  function signed(value) {
    const numeric = Number.parseFloat(value);
    if (!Number.isFinite(numeric)) return value;
    return numeric > 0 ? `+${value}` : value;
  }

  function renderMembers() {
    const rows = state.members.map((m) => [
      m.id,
      m.group,
      nf(m.length, 3),
      nf(m.forces.combo1, 1),
      nf(m.forces.combo2L, 1),
      nf(m.forces.combo2R, 1),
      nf(m.forces.combo3L, 1),
      nf(m.forces.combo3R, 1),
      nf(m.tension, 1),
      nf(m.compression, 1),
      m.controlCase
    ]);
    $("#memberTable").innerHTML = table(["杆件", "类别", "长度 m", "组一", "组二左", "组二右", "组三左", "组三右", "最大拉力", "最大压力", "控制组合"], rows);
  }

  function renderSections() {
    const rows = state.sectionRows.map((r) => [
      r.id,
      r.group,
      nf(r.force, 1),
      r.selected,
      nf(r.area, 0),
      nf(r.i, 1),
      nf(r.lambda, 0),
      nf(r.slenderLimit, 0),
      nf(r.phi, 3),
      nf(r.stress, 1),
      r.status.includes("满足") ? `<span class="pill">${r.status}</span>` : `<span class="pill bad">${r.status}</span>`
    ]);
    $("#sectionTable").innerHTML = table(["杆件", "类别", "控制内力 kN", "建议截面", "A mm²", "imin mm", "λ", "[λ]", "φ", "N/A N/mm²", "状态"], rows, true);
  }

  function renderNodes() {
    $("#nodeCards").innerHTML = state.nodes.map((n) => `
      <article class="node-card">
        <h3>${n.title} <span class="pill warn">${n.nodeId}</span></h3>
        <p>相连杆件：${n.members || "无"}</p>
        <p>控制内力：腹杆 ${nf(n.maxWeb, 1)} kN，弦杆 ${nf(n.maxChord, 1)} kN，取 ${nf(n.control, 1)} kN。</p>
        <p class="formula">lw = N / (2 × 0.7 × hf × fwf) + 2hf = ${nf(n.weldLength, 0)} mm</p>
        <p>建议焊缝计算长度不小于 <strong>${nf(n.weldLength, 0)} mm</strong>，节点板厚度初取 <strong>${n.plate} mm</strong>。</p>
        <p class="muted">${n.plateBasis}</p>
      </article>
    `).join("");
  }

  function table(headers, rows, allowHtml = false) {
    return `<div class="table-wrap"><table>
      <thead><tr>${headers.map((h, i) => `<th class="${i === 0 ? "text" : ""}">${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell, i) => `<td class="${i === 0 ? "text" : ""}">${allowHtml ? cell : escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
    }[ch]));
  }

  function generateReport(input, loads, model, members, sectionRows, nodes) {
    const maxMember = members.reduce((best, m) => m.absControl > best.absControl ? m : best, members[0]);
    const selectedGroups = summarizeSections(sectionRows);
    return `# 钢结构课程设计计算书草稿

## 1 设计资料

姓名：${input.studentName || "________"}  
学号：${input.studentId || "________"}  
班级：${input.className || "________"}  
指导教师：${input.teacherName || "________"}  
学年学期：${input.academicYear || "________"}

设计时间：${input.designWeek || "________"}

设计方案号：${input.schemeNo}

本设计为某工业厂房梯形钢屋架设计。厂房柱距 ${nf(input.bay, 1)} m，屋架跨度 ${nf(input.span, 1)} m，屋面采用 1.5 m × 6.0 m 预应力混凝土大型屋面板，屋面坡度 i=${nf(input.slope, 3)}，屋架铰支于钢筋混凝土柱上。

钢材采用 ${input.steel}，焊条采用 ${input.weldRod}。钢材强度设计值 f=${nf(input.f, 0)} N/mm²，角焊缝强度设计值 fwf=${nf(input.fwf, 0)} N/mm²。

本计算按教材 2.3 节钢屋架设计做法整理：屋面荷载按水平投影面积折算为节点荷载，屋架按节点荷载作用下的铰接平面桁架计算，分别考虑全跨和半跨荷载以取得各杆最不利内力。

## 2 屋架形式与几何参数

屋架采用梯形钢屋架。计算模型按 ${model.n} 个节间布置，节间长度 a=L/n=${nf(input.span, 2)}/${model.n}=${nf(model.panel, 3)} m。端部高度取 ${nf(input.endHeight, 2)} m，跨中屋脊高度为：

h = h0 + L/2 × i = ${nf(input.endHeight, 2)} + ${nf(input.span, 2)}/2 × ${nf(input.slope, 3)} = ${nf(input.endHeight + input.span * input.slope / 2, 3)} m

${input.span >= 24 ? `跨度 L≥24m，施工图按教材建议取起拱 f=L/500=${nf(input.span * 1000 / 500, 0)} mm。` : `本跨度小于 24m，按教材给出的适用阈值可不设置起拱。`}

## 3 荷载计算

### 3.1 永久荷载标准值

${loads.permanentItems.map(([name, value]) => `- ${name}：${nf(value, 3)} kN/m²`).join("\n")}

Gk = ${loads.permanentItems.map(([, value]) => nf(value, 3)).join(" + ")} = ${nf(loads.gk, 3)} kN/m²

其中屋架及支撑自重按经验公式：

g = 0.12 + 0.011L = 0.12 + 0.011 × ${nf(input.span, 1)} = ${nf(0.12 + 0.011 * input.span, 3)} kN/m²

### 3.2 可变荷载标准值

屋面活荷载 ${nf(input.loads.live, 2)} kN/m²，雪荷载 ${nf(input.loads.snow, 2)} kN/m²，二者不同时考虑，取较大值 ${nf(loads.roofVariable, 2)} kN/m²。积灰荷载 ${nf(input.loads.ash, 2)} kN/m²。

Qk = max(${nf(input.loads.live, 2)}, ${nf(input.loads.snow, 2)}) + ${nf(input.loads.ash, 2)} = ${nf(loads.qk, 3)} kN/m²

### 3.3 荷载组合

采用分项系数 γG=${nf(input.gammaG, 2)}，γQ=${nf(input.gammaQ, 2)}。

永久荷载设计值：Gd = γG × Gk = ${nf(input.gammaG, 2)} × ${nf(loads.gk, 3)} = ${nf(loads.gd, 3)} kN/m²  
可变荷载设计值：Qd = γQ × Qk = ${nf(input.gammaQ, 2)} × ${nf(loads.qk, 3)} = ${nf(loads.qd, 3)} kN/m²

组合一，全跨永久荷载 + 全跨可变荷载：

P = (Gd + Qd) × a × B = (${nf(loads.gd, 3)} + ${nf(loads.qd, 3)}) × ${nf(input.panel, 2)} × ${nf(input.bay, 1)} = ${nf(loads.pFull, 2)} kN

组合二，全跨永久荷载 + 半跨可变荷载：

PG = Gd × a × B = ${nf(loads.gd, 3)} × ${nf(input.panel, 2)} × ${nf(input.bay, 1)} = ${nf(loads.pg, 2)} kN  
PQ = Qd × a × B = ${nf(loads.qd, 3)} × ${nf(input.panel, 2)} × ${nf(input.bay, 1)} = ${nf(loads.pq, 2)} kN

组合三，全跨屋架及支撑自重 + 半跨屋面板及屋面活/雪荷载：

P1 = γG × g屋架 × a × B = ${nf(loads.constructionFullNode, 2)} kN  
P2 = (γG × g屋面板 + γQ × q屋面) × a × B = ${nf(loads.constructionHalfNode, 2)} kN

## 4 内力计算

教材例题通常先求单位节点荷载作用下的内力系数，再乘以各类节点荷载并列表组合。本设计采用平面桁架刚度法直接求各组合内力；将单位节点荷载代入同一模型可得到等效内力系数。杆件轴向刚度矩阵为：

k = EA/l × [ c²  cs -c² -cs; cs s² -cs -s²; -c² -cs c² cs; -cs -s² cs s² ]

整体方程为 Kd = F。支座条件为左支座 ux=0、uy=0，右支座 uy=0。拉力取正，压力取负。

控制杆件为 ${maxMember.id}（${maxMember.group}），最不利内力 ${nf(maxMember.absControl, 1)} kN，控制组合为 ${maxMember.controlCase}。

## 5 杆件截面初选

截面初选按双角钢截面表进行。拉杆按 N/A ≤ f 控制，压杆按 N/(φA) ≤ f 并验算长细比。教材规定桁架压杆容许长细比一般取 150，受静力荷载的拉杆可取 350；受拉下弦还承担受压腹杆下端的平面外支承作用，平面外长细比通常宜控制在 250 左右。截面选择为初选结果，最终应查教材型钢表复核。

${selectedGroups.map((row) => `- ${row.group}：建议采用 ${row.section}，控制内力约 ${nf(row.force, 1)} kN。`).join("\n")}

## 6 节点设计

角焊缝计算长度按下式估算：

lw = N / (2 × 0.7 × hf × fwf) + 2hf

其中 hf=${nf(input.weldLeg, 0)} mm，fwf=${nf(input.fwf, 0)} N/mm²。

${nodes.map((n) => `### ${n.title}（${n.nodeId}）

相连杆件：${n.members || "无"}。  
控制内力取 N=${nf(n.control, 1)} kN。  
lw=${nf(n.control, 1)}×1000/(2×0.7×${nf(input.weldLeg, 0)}×${nf(input.fwf, 0)})+2×${nf(input.weldLeg, 0)}=${nf(n.weldLength, 0)} mm。  
节点板厚度初取 ${n.plate} mm。${n.plateBasis}节点板外形按焊缝长度、20 mm 杆端间隙及不小于 15° 的构造要求绘图确定。`).join("\n\n")}

## 7 施工图整理提示

施工图采用 AutoCAD 绘制 1 号图，并完成节点板、双角钢、焊缝、尺寸和材料表。

施工图应包括屋架简图、半榀屋架正面图、上下弦平面图、侧面图、剖面图、必要零件详图、材料表、焊缝和螺栓说明、标题栏。按教材做法，屋架索引简图宜放在图纸上部；对称屋架可左半跨标杆件几何长度，右半跨标杆件最不利内力，并在 L≥24m 时注明起拱度。节点大样比例宜大于轴线图比例，图中应标明零件编号、加工尺寸、定位尺寸、孔洞位置、焊缝尺寸及工厂焊缝/安装焊缝区别。

## 8 参考文献

1. 宋高丽. 钢结构设计. 中国建筑工业出版社, 2019.  
2. GB 50017-2017, 钢结构设计标准.  
3. GB/T 50001-2001, 房屋建筑制图统一标准.  
4. GB/T 50105-2001, 建筑结构制图标准.
`;
  }

  function summarizeSections(sectionRows) {
    const groups = ["上弦", "下弦", "斜腹杆", "竖杆"];
    return groups.map((group) => {
      const rows = sectionRows.filter((r) => r.group === group);
      const worst = rows.reduce((best, row) => row.force > best.force ? row : best, rows[0]);
      const largest = rows.reduce((best, row) => sections.findIndex((s) => s.name === row.selected) > sections.findIndex((s) => s.name === best.selected) ? row : best, rows[0]);
      return { group, section: largest?.selected || "-", force: worst?.force || 0 };
    });
  }

  function exportCsv(filename, headers, rows) {
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(filename, `\ufeff${csv}`, "text/csv;charset=utf-8");
  }

  function exportLoadsCsv() {
    const rows = [
      ["类型", "项目", "数值"],
      ...state.loads.permanentItems.map(([name, value]) => ["永久荷载", name, value]),
      ["永久荷载", "Gk 合计", state.loads.gk],
      ...state.loads.variableItems.map(([name, value]) => ["可变荷载", name, value]),
      ["可变荷载", "Qk 合计", state.loads.qk],
      ["组合", "组合一节点荷载 P", state.loads.pFull],
      ["组合", "组合二永久节点荷载 PG", state.loads.pg],
      ["组合", "组合二可变节点荷载 PQ", state.loads.pq]
    ];
    exportCsv("钢屋架荷载计算.csv", rows[0], rows.slice(1));
  }

  function exportMembersCsv() {
    const rows = state.members.map((m) => [
      m.id, m.group, nf(m.length, 3), nf(m.forces.combo1, 3), nf(m.forces.combo2L, 3),
      nf(m.forces.combo2R, 3), nf(m.forces.combo3L, 3), nf(m.forces.combo3R, 3),
      nf(m.tension, 3), nf(m.compression, 3), m.controlCase
    ]);
    exportCsv("钢屋架杆件内力.csv", ["杆件", "类别", "长度m", "组一", "组二左", "组二右", "组三左", "组三右", "最大拉力", "最大压力", "控制组合"], rows);
  }

  function exportDxf() {
    const groupLayers = { "上弦": "TOP_CHORD", "下弦": "BOTTOM_CHORD", "竖杆": "VERTICAL", "斜腹杆": "DIAGONAL" };
    const dxf = ["0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
    const push = (...parts) => dxf.push(...parts.map(String));
    for (const member of state.members) {
      const a = state.model.nodes[member.a];
      const b = state.model.nodes[member.b];
      const layer = groupLayers[member.group] || "TRUSS";
      push("0", "LINE", "8", layer, "10", a.x * 1000, "20", a.y * 1000, "30", 0, "11", b.x * 1000, "21", b.y * 1000, "31", 0);
      const mx = (a.x + b.x) * 500;
      const my = (a.y + b.y) * 500;
      push("0", "TEXT", "8", "MEMBER_ID", "10", mx, "20", my + 120, "30", 0, "40", 160, "1", `${member.id} ${signed(nf(member.controlForce, 0))}`);
    }
    for (const node of state.model.nodes) {
      push("0", "CIRCLE", "8", "NODE", "10", node.x * 1000, "20", node.y * 1000, "30", 0, "40", 45);
    }
    const titleY = (state.input.endHeight + state.input.span * state.input.slope / 2) * 1000 + 700;
    push("0", "TEXT", "8", "TEXT", "10", state.input.span * 500, "20", titleY, "30", 0, "40", 260, "72", 1, "11", state.input.span * 500, "21", titleY, "31", 0, "1", `${state.input.span}m STEEL TRUSS AXIS REFERENCE`);
    push("0", "ENDSEC", "0", "EOF");
    download("钢屋架轴线参考图.dxf", dxf.join("\r\n"), "application/dxf");
  }

  async function exportWordReport() {
    if (!window.fflate) {
      alert("DOCX 组件未加载，请刷新页面后重试。");
      return;
    }
    const button = $("#exportWordBtn");
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = "正在生成";
    try {
      const image = await svgToPngBytes($("#trussSvgWrap svg"), 1600, 775);
      const files = buildDocxPackage(image);
      const zipped = window.fflate.zipSync(files, { level: 6 });
      download("钢结构课程设计计算书.docx", zipped, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (error) {
      alert(`DOCX 导出失败：${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  function buildDocxPackage(imageBytes) {
    const { strToU8 } = window.fflate;
    const input = state.input;
    const reportLines = $("#reportText").value.split("\n");
    const firstBodyHeading = reportLines.findIndex((line) => line.startsWith("## "));
    const contentLines = reportLines
      .slice(firstBodyHeading < 0 ? 0 : firstBodyHeading)
      .filter((line) => !/^(姓名|学号|班级|指导教师|学年学期|设计时间|设计方案号)：/.test(line));
    const body = [
      docxParagraph("钢结构设计课程设计", "CoverKicker"),
      docxParagraph("梯形钢屋架计算书", "Title"),
      docxParagraph(`${nf(input.span, 0)} m 跨 · ${input.steel} · ${input.weldRod}`, "Subtitle"),
      docxParagraph("", "CoverSpace"),
      docxMetadataTable([
        ["设计方案", `${input.schemeNo} 号`],
        ["姓　　名", input.studentName || ""],
        ["学　　号", input.studentId || ""],
        ["班　　级", input.className || ""],
        ["指导教师", input.teacherName || ""],
        ["学年学期", input.academicYear || ""],
        ["设计时间", input.designWeek || ""]
      ]),
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
      docxParagraph("计算简图", "Heading1"),
      docxImageParagraph(1, 5486400, 2657475),
      docxParagraph("图 1　梯形钢屋架计算简图（左半跨标几何长度，右半跨标最不利内力）", "Caption"),
      ...contentLines.flatMap(docxLineToXml),
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1701" w:header="708" w:footer="708"/><w:cols w:space="425"/><w:docGrid w:linePitch="312"/></w:sectPr>'
    ].join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`;
    const files = {
      "[Content_Types].xml": strToU8(docxContentTypes()),
      "_rels/.rels": strToU8(docxRootRels()),
      "docProps/core.xml": strToU8(docxCoreProps()),
      "docProps/app.xml": strToU8(docxAppProps()),
      "word/document.xml": strToU8(documentXml),
      "word/styles.xml": strToU8(docxStyles()),
      "word/numbering.xml": strToU8(docxNumbering()),
      "word/settings.xml": strToU8(docxSettings()),
      "word/_rels/document.xml.rels": strToU8(docxDocumentRels()),
      "word/media/truss.png": imageBytes
    };
    return files;
  }

  function docxLineToXml(rawLine) {
    const line = rawLine.trimEnd();
    if (!line.trim()) return [];
    if (line.startsWith("### ")) return [docxParagraph(line.slice(4), "Heading2")];
    if (line.startsWith("## ")) return [docxParagraph(line.slice(3), "Heading1")];
    if (line.startsWith("# ")) return [docxParagraph(line.slice(2), "Title")];
    if (line.startsWith("- ")) return [docxParagraph(line.slice(2), "ListParagraph", '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')];
    if (isFormulaLine(line)) return [docxFormulaParagraph(line)];
    return [docxParagraph(line, "Normal")];
  }

  function isFormulaLine(line) {
    return /^(h|g|Gk|Qk|Gd|Qd|P|PG|PQ|P1|P2|k|lw)\s*=/.test(line) || /^(永久荷载设计值|可变荷载设计值)：/.test(line);
  }

  function docxParagraph(text, style = "Normal", extraPPr = "") {
    return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extraPPr}</w:pPr><w:r><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
  }

  function docxFormulaParagraph(text) {
    return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="80" w:after="120" w:line="360" w:lineRule="auto"/></w:pPr><m:oMath><m:r><m:rPr><m:sty m:val="p"/></m:rPr><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:eastAsia="宋体"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><m:t>${xmlEscape(text.replace(/：/g, "： "))}</m:t></m:r></m:oMath></w:p>`;
  }

  function docxMetadataTable(rows) {
    const cells = rows.map(([label, value]) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:shd w:fill="EDF2F0"/></w:tcPr>${docxParagraph(label, "TableLabel")}</w:tc><w:tc><w:tcPr><w:tcW w:w="6500" w:type="dxa"/></w:tcPr>${docxParagraph(value, "TableValue")}</w:tc></w:tr>`).join("");
    return `<w:tbl><w:tblPr><w:tblW w:w="8600" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="AAB7B2"/><w:left w:val="single" w:sz="4" w:color="AAB7B2"/><w:bottom w:val="single" w:sz="4" w:color="AAB7B2"/><w:right w:val="single" w:sz="4" w:color="AAB7B2"/><w:insideH w:val="single" w:sz="4" w:color="D4DDDA"/><w:insideV w:val="single" w:sz="4" w:color="D4DDDA"/></w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="2100"/><w:gridCol w:w="6500"/></w:tblGrid>${cells}</w:tbl>`;
  }

  function docxImageParagraph(relId, cx, cy) {
    return `<w:p><w:pPr><w:jc w:val="center"/><w:keepNext/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="梯形钢屋架计算简图" descr="梯形钢屋架杆件、节点、长度与内力标注"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="truss.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }

  function docxStyles() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="宋体"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>${docxStyle("Normal", "正文", 24, false, "000000", 0, 120, "both")}${docxStyle("Title", "标题", 44, true, "203B35", 0, 240, "center")}${docxStyle("Subtitle", "副标题", 24, false, "52645F", 0, 180, "center")}${docxStyle("CoverKicker", "封面眉题", 24, true, "2F7D6B", 1800, 180, "center")}${docxStyle("CoverSpace", "封面间距", 12, false, "FFFFFF", 900, 900, "center")}${docxStyle("Heading1", "一级标题", 32, true, "203B35", 300, 140, "left", true)}${docxStyle("Heading2", "二级标题", 28, true, "2F5F54", 220, 100, "left", true)}${docxStyle("Caption", "题注", 20, false, "52645F", 80, 180, "center")}${docxStyle("ListParagraph", "列表", 24, false, "000000", 0, 80, "left")}${docxStyle("TableLabel", "表格标签", 22, true, "203B35", 0, 0, "center")}${docxStyle("TableValue", "表格内容", 22, false, "000000", 0, 0, "left")}</w:styles>`;
  }

  function docxStyle(id, name, size, bold, color, before, after, align, keepNext = false) {
    return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:qFormat/><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="360" w:lineRule="auto"/><w:jc w:val="${align}"/>${keepNext ? "<w:keepNext/>" : ""}</w:pPr><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="${id.startsWith("Heading") || id === "Title" || id === "CoverKicker" ? "黑体" : "宋体"}"/><w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold ? "<w:b/><w:bCs/>" : ""}</w:rPr></w:style>`;
  }

  function docxNumbering() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="·"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="270"/></w:pPr><w:rPr><w:rFonts w:ascii="宋体" w:hAnsi="宋体" w:eastAsia="宋体"/></w:rPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`;
  }

  function docxSettings() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:zoom w:percent="100"/><w:defaultTabStop w:val="420"/><m:mathPr><m:mathFont m:val="Cambria Math"/><m:brkBin m:val="before"/><m:smallFrac m:val="0"/></m:mathPr><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;
  }

  function docxContentTypes() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  }

  function docxRootRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  }

  function docxDocumentRels() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/truss.png"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>`;
  }

  function docxCoreProps() {
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>钢结构设计课程设计计算书</dc:title><dc:subject>梯形钢屋架</dc:subject><dc:creator>${xmlEscape(state.input.studentName || "课程设计助手")}</dc:creator><cp:lastModifiedBy>钢结构屋架课程设计助手</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  }

  function docxAppProps() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>钢结构屋架课程设计助手</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>`;
  }

  function svgToPngBytes(svg, width, height) {
    return new Promise((resolve, reject) => {
      const clone = svg.cloneNode(true);
      clone.setAttribute("width", width);
      clone.setAttribute("height", height);
      const source = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error("计算简图转换失败"));
          resolve(new Uint8Array(await blob.arrayBuffer()));
        }, "image/png", 0.95);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("无法读取计算简图"));
      };
      image.src = url;
    });
  }

  function xmlEscape(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[ch]));
  }

  function exportJson() {
    const data = Object.fromEntries(ids.map((id) => [id, val(id)]));
    download("钢屋架课程设计数据.json", JSON.stringify(data, null, 2), "application/json");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        ids.forEach((id) => {
          if (Object.prototype.hasOwnProperty.call(data, id)) setVal(id, data[id]);
        });
        calculate();
        saveLocal();
      } catch (error) {
        alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function saveLocal() {
    const data = Object.fromEntries(ids.map((id) => [id, val(id)]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      ids.forEach((id) => {
        if (Object.prototype.hasOwnProperty.call(data, id)) setVal(id, data[id]);
      });
      return true;
    } catch {
      return false;
    }
  }

  function resetDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    setVal("schemeNo", 1);
    setVal("manualOverride", false);
    setVal("studentPreset", "");
    setVal("studentName", "");
    setVal("studentId", "");
    setVal("className", "23土木1、2班（房建）");
    setVal("teacherName", "陈昉健");
    setVal("academicYear", "2025-2026学年第二学期");
    setVal("designWeek", "第16周");
    setVal("bayInput", 6);
    setVal("panelInput", 1.5);
    setVal("slopeInput", 0.1);
    setVal("weldLegInput", 6);
    setVal("waterproofInput", 0.40);
    setVal("levelTopInput", 0.40);
    setVal("vaporInput", 0.05);
    setVal("levelBaseInput", 0.30);
    setVal("roofPanelInput", 1.40);
    setVal("pipeInput", 0.15);
    setVal("liveInput", 0.60);
    setVal("factorInput", "1.3 / 1.5");
    applySchemeDefaults(true);
    calculate();
  }

  function wireEvents() {
    $("#studentPreset").addEventListener("change", applyStudentPreset);
    $("#schemeNo").addEventListener("input", () => {
      setVal("studentPreset", "");
      applySchemeDefaults();
      calculate();
    });
    $("#manualOverride").addEventListener("change", () => {
      applySchemeDefaults();
      calculate();
    });
    ids.filter((id) => !["schemeNo", "manualOverride", "studentPreset"].includes(id)).forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.addEventListener("input", calculate);
    });
    $("#calculateBtn").addEventListener("click", calculate);
    $("#saveBtn").addEventListener("click", () => {
      saveLocal();
      $("#saveBtn").textContent = "已保存";
      setTimeout(() => { $("#saveBtn").textContent = "保存"; }, 1200);
    });
    $("#resetBtn").addEventListener("click", resetDefaults);
    $("#printBtn").addEventListener("click", () => window.print());
    $("#exportLoadsCsvBtn").addEventListener("click", exportLoadsCsv);
    $("#exportMembersCsvBtn").addEventListener("click", exportMembersCsv);
    $("#exportJsonBtn").addEventListener("click", exportJson);
    $("#importJsonInput").addEventListener("change", (event) => {
      const [file] = event.target.files;
      if (file) importJson(file);
      event.target.value = "";
    });
    $("#exportSvgBtn").addEventListener("click", () => {
      download("钢屋架计算简图.svg", $("#trussSvgWrap").innerHTML, "image/svg+xml");
    });
    $("#exportDxfBtn").addEventListener("click", exportDxf);
    $("#copyReportBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("#reportText").value);
      $("#copyReportBtn").textContent = "已复制";
      setTimeout(() => { $("#copyReportBtn").textContent = "复制"; }, 1200);
    });
    $("#exportReportBtn").addEventListener("click", () => {
      download("钢结构课程设计计算书草稿.md", $("#reportText").value, "text/markdown;charset=utf-8");
    });
    $("#exportWordBtn").addEventListener("click", exportWordReport);
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((item) => item.classList.toggle("active", item === tab));
        $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateStudentPreset();
    wireEvents();
    const restored = loadLocal();
    if (!restored) applySchemeDefaults(true);
    else applySchemeDefaults();
    calculate();
  });
})();

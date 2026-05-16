(() => {
  const STORAGE_KEY = "steel-truss-course-design-v1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const nf = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "-";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const ids = [
    "schemeNo", "manualOverride", "studentName", "studentId", "className", "teacherName",
    "spanInput", "bayInput", "panelInput", "slopeInput", "endHeightInput", "weldLegInput",
    "waterproofInput", "levelTopInput", "insulationInput", "vaporInput", "levelBaseInput",
    "roofPanelInput", "trussSelfInput", "pipeInput", "liveInput", "snowInput", "ashInput",
    "factorInput", "steelInput", "weldRodInput", "steelStrengthInput", "weldStrengthInput"
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
      [[1, 26], 0.55, 0.7], [[2, 27], 0.60, 0.8], [[3, 28], 0.65, 0.9],
      [[4, 29], 0.70, 1.0], [[5, 30], 0.40, 1.1], [[6, 31], 0.45, 1.2],
      [[7, 32], 0.50, 1.3], [[8, 33], 0.60, 0.7], [[9, 34], 0.65, 0.8],
      [[10, 35], 0.70, 0.9], [[11, 36], 0.55, 1.0], [[12, 37], 0.50, 1.1],
      [[13, 38], 0.40, 1.2], [[14, 39], 0.45, 1.3], [[15, 40], 0.65, 0.7],
      [[16, 41], 0.70, 0.8], [[17, 42], 0.55, 0.9], [[18, 43], 0.40, 1.0],
      [[19, 44], 0.45, 1.1], [[20, 45], 0.50, 1.2], [[21, 46], 0.60, 1.3],
      [[22, 47], 0.70, 0.7], [[23, 48], 0.45, 0.8], [[24, 49], 0.50, 0.9],
      [[25, 50], 0.60, 1.0], [[51, 76], 0.45, 1.1], [[52, 77], 0.50, 1.2],
      [[53, 78], 0.60, 1.3], [[54, 79], 0.75, 0.7], [[55, 80], 0.50, 0.8],
      [[56, 81], 0.55, 0.9], [[57, 82], 0.65, 1.0], [[58, 83], 0.70, 1.1],
      [[59, 84], 0.60, 1.2], [[60, 85], 0.50, 1.3], [[61, 86], 0.60, 0.7],
      [[62, 87], 0.55, 0.8], [[63, 88], 0.60, 0.9], [[64, 89], 0.65, 1.0],
      [[65, 90], 0.70, 1.1], [[66, 91], 0.40, 1.2], [[67, 92], 0.45, 1.3],
      [[68, 93], 0.75, 0.7], [[69, 94], 0.80, 0.8], [[70, 95], 0.65, 0.9],
      [[71, 96], 0.60, 1.0], [[72, 97], 0.55, 1.1], [[73, 98], 0.50, 1.2],
      [[74, 99], 0.45, 1.3], [[75], 0.65, 0.9]
    ];
    const row = pairs.find(([keys]) => keys.includes(schemeNo));
    return row ? { insulation: row[1], ash: row[2] } : { insulation: 0.55, ash: 0.9 };
  }

  function getSchemeDefaults(schemeNo) {
    let span = 18;
    if (schemeNo >= 22 && schemeNo <= 41) span = 21;
    if (schemeNo >= 42 && schemeNo <= 60) span = 24;
    const snow = schemeNo <= 19 ? 0.65 : schemeNo <= 40 ? 0.55 : 0.45;
    const material = schemeNo % 2 === 1
      ? { steel: "Q235", weldRod: "E43", f: 215, fwf: 160 }
      : { steel: "Q345", weldRod: "E50", f: 310, fwf: 200 };
    const thermalAsh = getThermalAsh(schemeNo);
    return {
      span,
      panel: 1.5,
      bay: 6,
      slope: 0.1,
      endHeight: span === 18 ? 1.75 : span === 21 ? 1.90 : 2.00,
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
      schemeNo: Math.round(num("schemeNo", 1)),
      manualOverride: val("manualOverride"),
      studentName: val("studentName").trim(),
      studentId: val("studentId").trim(),
      className: val("className").trim(),
      teacherName: val("teacherName").trim(),
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
    const schemeNo = Math.round(num("schemeNo", 1));
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

    for (let i = 0; i <= n; i += 1) {
      const x = i * panel;
      bottom.push(nodes.length);
      nodes.push({ id: `B${i}`, kind: "bottom", x, y: 0 });
    }
    for (let i = 0; i <= n; i += 1) {
      const x = i * panel;
      const rise = Math.min(x, input.span - x) * input.slope;
      top.push(nodes.length);
      nodes.push({ id: `T${i}`, kind: "top", x, y: input.endHeight + rise });
    }

    const members = [];
    const add = (id, a, b, group) => {
      const na = nodes[a];
      const nb = nodes[b];
      const length = Math.hypot(nb.x - na.x, nb.y - na.y);
      members.push({ id, a, b, group, length });
    };
    for (let i = 0; i < n; i += 1) add(`U${i + 1}`, top[i], top[i + 1], "上弦");
    for (let i = 0; i < n; i += 1) add(`L${i + 1}`, bottom[i], bottom[i + 1], "下弦");
    for (let i = 0; i <= n; i += 1) add(`V${i}`, bottom[i], top[i], "竖杆");
    for (let i = 0; i < n; i += 1) {
      if (i < n / 2) add(`D${i + 1}`, bottom[i], top[i + 1], "斜腹杆");
      else add(`D${i + 1}`, top[i], bottom[i + 1], "斜腹杆");
    }

    return { n, panel, nodes, bottom, top, members };
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
      model.bottom[model.n] * 2 + 1
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
    const pick = [
      { title: "下弦一般节点", nodeId: `B${Math.max(2, Math.floor(model.n / 4))}` },
      { title: "上弦一般节点", nodeId: `T${Math.max(2, Math.floor(model.n / 4))}` },
      { title: "下弦支座节点", nodeId: "B0" },
      { title: "屋脊节点", nodeId: `T${Math.floor(model.n / 2)}` },
      { title: "下弦中央节点", nodeId: `B${Math.floor(model.n / 2)}` }
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
      const isSupport = item.nodeId === "B0" || item.nodeId === `B${model.n}`;
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
      ["起拱参考", input.span >= 24 ? `${nf(input.span * 1000 / 500, 0)} mm` : "通常可不设", input.span >= 24 ? "教材建议梯形屋架 L≥24m 时 f=L/500" : "跨度小于 24m，按老师要求确定"]
    ];
    $("#summaryGrid").innerHTML = metrics.map(([label, value, note]) => `
      <article class="metric"><span>${label}</span><strong>${value}</strong><em>${note}</em></article>
    `).join("");
  }

  function renderNotices() {
    const input = state.input;
    const notices = [
      ["本工具按任务书附表进行方案查表；附表一可读文本显示 1-21 为 18m、22-41 为 21m、42-60 为 24m。若老师另行调整，请勾选手动覆盖。", "warn"],
      ["教材做法：屋面荷载按水平投影面积折算为节点荷载，先求全跨和半跨作用下内力，再列表取各杆最不利内力。", ""],
      ["杆件内力来自平面桁架刚度法和内置梯形屋架简图，可等效生成内力系数。提交前应对照老师给定屋架几何尺寸及内力系数图复核。", "warn"],
      ["默认分项系数已按教材例题设为 γG=1.3、γQ=1.5；如课堂按新版组合或老师要求取值，可在左侧直接修改。", "warn"],
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
    const importantNodes = new Set([0, Math.floor(model.n / 4), Math.floor(model.n / 2), Math.floor(model.n * 3 / 4), model.n]);
    const labels = model.nodes.filter((node) => {
      const index = Number(node.id.slice(1));
      return importantNodes.has(index);
    }).map((node) => {
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
        <text x="${width / 2}" y="62" text-anchor="middle" class="svg-note">点击任一杆件或节点查看详情；左半跨优先标长度，右半跨优先标控制内力</text>
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
设计方案号：${input.schemeNo}

本设计为某工业厂房梯形钢屋架设计。厂房柱距 ${nf(input.bay, 1)} m，屋架跨度 ${nf(input.span, 1)} m，屋面采用 1.5 m × 6.0 m 预应力混凝土大型屋面板，屋面坡度 i=${nf(input.slope, 3)}，屋架铰支于钢筋混凝土柱上。

钢材采用 ${input.steel}，焊条采用 ${input.weldRod}。钢材强度设计值 f=${nf(input.f, 0)} N/mm²，角焊缝强度设计值 fwf=${nf(input.fwf, 0)} N/mm²。

本计算按教材 2.3 节钢屋架设计做法整理：屋面荷载按水平投影面积折算为节点荷载，屋架按节点荷载作用下的铰接平面桁架计算，分别考虑全跨和半跨荷载以取得各杆最不利内力。

## 2 屋架形式与几何参数

屋架采用梯形钢屋架。计算模型按 ${model.n} 个节间布置，节间长度 a=L/n=${nf(input.span, 2)}/${model.n}=${nf(model.panel, 3)} m。端部高度取 ${nf(input.endHeight, 2)} m，跨中屋脊高度为：

h = h0 + L/2 × i = ${nf(input.endHeight, 2)} + ${nf(input.span, 2)}/2 × ${nf(input.slope, 3)} = ${nf(input.endHeight + input.span * input.slope / 2, 3)} m

${input.span >= 24 ? `跨度 L≥24m，施工图可按教材建议取起拱 f=L/500=${nf(input.span * 1000 / 500, 0)} mm。` : `本跨度小于 24m，起拱可按老师要求确定；若需表达，可在施工图索引图中注明。`}

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

教材例题通常先求单位节点荷载作用下的内力系数，再乘以各类节点荷载并列表组合。本工具采用平面桁架刚度法直接求各组合内力；若将单位节点荷载代入同一模型，可得到等效内力系数。杆件轴向刚度矩阵为：

k = EA/l × [ c²  cs -c² -cs; cs s² -cs -s²; -c² -cs c² cs; -cs -s² cs s² ]

整体方程为 Kd = F。支座条件为左支座 ux=0、uy=0，右支座 uy=0。拉力取正，压力取负。

控制杆件为 ${maxMember.id}（${maxMember.group}），最不利内力 ${nf(maxMember.absControl, 1)} kN，控制组合为 ${maxMember.controlCase}。

## 5 杆件截面初选

截面初选按双角钢截面库进行。拉杆按 N/A ≤ f 控制，压杆按 N/(φA) ≤ f 并验算长细比。教材要求桁架压杆容许长细比一般取 150，受静力荷载的拉杆可取 350；受拉下弦还承担受压腹杆下端的平面外支承作用，平面外长细比通常宜控制在 250 左右。该截面库用于课程设计初选，最终应查教材型钢表复核。

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
    setVal("studentName", "");
    setVal("studentId", "");
    setVal("className", "22土木（房建方向）");
    setVal("teacherName", "陈昉健");
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
    $("#schemeNo").addEventListener("input", () => {
      applySchemeDefaults();
      calculate();
    });
    $("#manualOverride").addEventListener("change", () => {
      applySchemeDefaults();
      calculate();
    });
    ids.filter((id) => !["schemeNo", "manualOverride"].includes(id)).forEach((id) => {
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
    $("#copyReportBtn").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("#reportText").value);
      $("#copyReportBtn").textContent = "已复制";
      setTimeout(() => { $("#copyReportBtn").textContent = "复制"; }, 1200);
    });
    $("#exportReportBtn").addEventListener("click", () => {
      download("钢结构课程设计计算书草稿.md", $("#reportText").value, "text/markdown;charset=utf-8");
    });
    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((item) => item.classList.toggle("active", item === tab));
        $$(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireEvents();
    const restored = loadLocal();
    if (!restored) applySchemeDefaults(true);
    else applySchemeDefaults();
    calculate();
  });
})();

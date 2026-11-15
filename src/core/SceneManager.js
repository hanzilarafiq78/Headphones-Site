import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.models = new Map();
    this.namedParts = new Map();
    this.currentModelKey = null;
    this.clock = new THREE.Clock();

    // Model transforms (scrubbed by GSAP)
    this.modelPos = { x: 0, y: 0, z: 0 };
    this.modelRot = { x: 0, y: 0, z: 0 };
    this.modelScale = 1.0;

    // Camera transforms (scrubbed by GSAP)
    this.cameraPos = { x: 0, y: 0, z: 4.8 };
    this.cameraLookAt = { x: 0, y: 0, z: 0 };
    this.currentLookAt = new THREE.Vector3(0, 0, 0);

    // Interactive Drag / Momentum state
    this.dragRotation = { x: 0, y: 0 };
    this.dragVelocity = { x: 0, y: 0 };
    this.isDragging = false;
    this.prevPointerPos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.modelProximity = 0;

    this.explodeFactor = 0;
    this.initialMeshTransforms = new Map();
    this.activeColorway = 'obsidian';
    this.hotspots = [];

    // Acoustic Rings & Dynamic Atmosphere
    this.rings = [];
    this.ringsGroup = null;
    this.atmosphereProgress = 0;
    this.ringProgress = 0;
    this.portalProgress = 0;
    this.ringOpacity = 0;

    // Mouse Kinetic Trajectory & Precision Visual System
    this.mouseTrajectoryGroup = null;
    this.mouseLineState = {
      mode: 1, // 1: Origin Trace, 2: Trajectory Splines, 3: CAD Precision, 4: Grounding Horizon, 0: Off
      progress: 0,
      opacity: 0,
    };
    this.mousePointerLag = { x: 0, y: 0 };
    this.mouseReticleTarget = { x: 0, y: 0 };

    this.init();
    this.setupStudioEnvironment();
    this.setupLighting();
    this.setupAcousticRings();
    this.setupMouseTrajectory();
    this.setupEvents();
    this.animate();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z);
    this.camera.lookAt(0, 0, 0);

    const isMobile = window.innerWidth < 1024;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: dpr < 1.5,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;

    this.modelContainer = new THREE.Group();
    this.scene.add(this.modelContainer);

    this.loader = new GLTFLoader();
  }

  setupStudioEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x090b10);

    // Top-right overhead studio softbox (creates gleaming top-right headband & bevel specular)
    const topRightBox = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 4.5),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 4.4, 4.8), side: THREE.DoubleSide })
    );
    topRightBox.position.set(4.5, 5.5, 4.0);
    topRightBox.lookAt(0, 0, 0);
    envScene.add(topRightBox);

    // Front-right studio strip (gives brushed aluminum earcup disc its radial silver sheen)
    const rightStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 8.0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.35, 2.65), side: THREE.DoubleSide })
    );
    rightStrip.position.set(5.2, 0.4, 5.2);
    rightStrip.lookAt(0, 0, 0);
    envScene.add(rightStrip);

    // Soft front-left cool fill reflector (keeps metallic earcup cones sculpted on shadow side)
    const leftReflector = new THREE.Mesh(
      new THREE.PlaneGeometry(4.0, 7.0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 0.98, 1.2), side: THREE.DoubleSide })
    );
    leftReflector.position.set(-5.5, 1.5, 3.0);
    leftReflector.lookAt(0, 0, 0);
    envScene.add(leftReflector);

    // Back-left rim strip (cool silver contour along rear earcup cushion edge)
    const leftRimStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 8.0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.75, 2.1), side: THREE.DoubleSide })
    );
    leftRimStrip.position.set(-5.8, 2.2, -3.5);
    leftRimStrip.lookAt(0, 0, 0);
    envScene.add(leftRimStrip);

    // Soft ceiling studio dome & dim floor bounce
    const topDiffuser = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.5, 0.6), side: THREE.DoubleSide })
    );
    topDiffuser.position.set(0, 8, 1);
    topDiffuser.lookAt(0, 0, 0);
    envScene.add(topDiffuser);

    const floorBounce = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.14, 0.16, 0.2), side: THREE.DoubleSide })
    );
    floorBounce.position.set(0, -6, 2);
    floorBounce.lookAt(0, 0, 0);
    envScene.add(floorBounce);

    this.envRenderTarget = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    pmrem.dispose();
  }

  setupLighting() {
    // Low chiaroscuro studio ambient so dark charcoal cushions stay rich and sculpted
    this.hemiLight = new THREE.HemisphereLight(0xcfd8e3, 0x050608, 0.28);
    this.scene.add(this.hemiLight);

    // Primary Top-Right Studio Key Light
    this.keyLight = new THREE.DirectionalLight(0xf6f8fc, 1.85);
    this.keyLight.position.set(3.2, 4.8, 3.2);
    this.keyLight.castShadow = false;
    this.scene.add(this.keyLight);

    // Restrained Cool Left Fill Light (preserves deep shadow gradient)
    this.fillLight = new THREE.DirectionalLight(0x8fa3bd, 0.45);
    this.fillLight.position.set(-4.2, 1.2, 2.2);
    this.scene.add(this.fillLight);

    // Crisp Specular Rim Light (Top-Back Right headband arch highlight)
    this.rimLight = new THREE.DirectionalLight(0xffffff, 2.8);
    this.rimLight.position.set(2.6, 4.0, -3.4);
    this.scene.add(this.rimLight);

    // Secondary Back-Left Rim Light (subtle silver edge along rear ear cushion)
    this.backLeftRim = new THREE.DirectionalLight(0xaec0d6, 0.95);
    this.backLeftRim.position.set(-3.2, 1.8, -3.0);
    this.scene.add(this.backLeftRim);

    // Subtle Under-bounce Fill (carves bottom curve of ear cushions)
    this.upLight = new THREE.DirectionalLight(0x222936, 0.42);
    this.upLight.position.set(0, -3.5, 2.0);
    this.scene.add(this.upLight);
  }

  setupAcousticRings() {
    this.ringsGroup = new THREE.Group();
    this.ringsGroup.name = 'acoustic_rings_group';
    this.scene.add(this.ringsGroup);

    // Subtle studio radial spotlight glow behind headphones inside the concentric field
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 512;
    glowCanvas.height = 512;
    const ctx = glowCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
    grad.addColorStop(0, 'rgba(185, 195, 212, 0.22)');
    grad.addColorStop(0.45, 'rgba(130, 142, 162, 0.08)');
    grad.addColorStop(1, 'rgba(18, 21, 27, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const haloMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ringHalo = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), haloMat);
    this.ringHalo.position.z = -0.1;
    this.ringsGroup.add(this.ringHalo);

    this.rings = [];
    const tierRadii = [0.92, 1.34, 1.76];
    const solidOpacities = [0.22, 0.27, 0.34];
    const dottedOpacities = [0.18, 0.22, 0.26];
    const pairGap = 0.048;
    const segments = 256;

    const createCircleLine = (radius, isDotted, opacity, tierIdx) => {
      const points = [];
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(theta) * radius,
            Math.sin(theta) * radius,
            0
          )
        );
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = isDotted
        ? new THREE.LineDashedMaterial({
            color: 0xd8d5d0,
            dashSize: 0.010,
            gapSize: 0.020,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          })
        : new THREE.LineBasicMaterial({
            color: 0xd8d5d0,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          });

      const line = new THREE.Line(geometry, material);
      if (isDotted) line.computeLineDistances();

      line.userData = {
        baseRadius: radius,
        baseOpacity: opacity,
        index: tierIdx,
        phase: tierIdx * 0.55,
      };

      this.rings.push(line);
      this.ringsGroup.add(line);
    };

    tierRadii.forEach((radius, t) => {
      // Outer solid circle
      createCircleLine(radius, false, solidOpacities[t], t);
      // Close companion dotted circle tucked inside the solid line
      createCircleLine(radius - pairGap, true, dottedOpacities[t], t);
    });
  }

  setAtmosphere(t) {
    // t: 0.0 (warm limestone gallery) -> 1.0 (deep graphite void)
    const clampedT = THREE.MathUtils.clamp(t, 0, 1);
    this.atmosphereProgress = clampedT;

    // Key Light interpolation
    this.keyLight.color.lerpColors(new THREE.Color(0xfff8f0), new THREE.Color(0xd8e6f5), clampedT);
    this.keyLight.intensity = THREE.MathUtils.lerp(2.6, 1.6, clampedT);

    // Fill Light interpolation
    this.fillLight.color.lerpColors(new THREE.Color(0xe0dcd4), new THREE.Color(0x1b222c), clampedT);
    this.fillLight.intensity = THREE.MathUtils.lerp(1.2, 0.55, clampedT);

    // Rim Light (sharp high-contrast edge in dark scene)
    this.rimLight.intensity = THREE.MathUtils.lerp(2.8, 4.4, clampedT);

    // Hemi light
    this.hemiLight.color.lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x8090a8), clampedT);
    this.hemiLight.groundColor.lerpColors(new THREE.Color(0x1a202c), new THREE.Color(0x06080b), clampedT);
    this.hemiLight.intensity = THREE.MathUtils.lerp(0.9, 0.5, clampedT);

    document.documentElement.style.setProperty('--atmosphere-t', clampedT.toFixed(3));
  }

  setAcousticRings(ringProgress = 0, portalProgress = 0, opacity = 0) {
    this.ringProgress = ringProgress;
    this.portalProgress = portalProgress;
    this.ringOpacity = opacity;

    if (this.modelContainer && this.ringsGroup) {
      this.ringsGroup.position.x = this.modelContainer.position.x;
      this.ringsGroup.position.y = this.modelContainer.position.y + 0.05;
      this.ringsGroup.position.z = this.modelContainer.position.z - 0.35;
    }

    if (this.ringHalo) {
      this.ringHalo.material.opacity = opacity * Math.min(1, ringProgress * 1.4) * 0.55;
    }

    this.rings.forEach((ring) => {
      const t = ring.userData.index;
      const stagger = Math.max(0, Math.min(1, ringProgress * 1.45 - t * 0.14));
      const currentScale = 0.78 + stagger * 0.22 + portalProgress * (0.65 + t * 0.32);
      ring.scale.set(currentScale, currentScale, currentScale);

      ring.material.opacity = opacity * ring.userData.baseOpacity * stagger * (1 + portalProgress * 0.5);
      ring.rotation.y = 0;
      ring.position.z = portalProgress * (t * 0.22);
    });
  }

  // =========================================================================
  // MOUSE KINETIC TRAJECTORY & PRECISION VISUAL SYSTEM
  // =========================================================================
  setupMouseTrajectory() {
    this.mouseTrajectoryGroup = new THREE.Group();
    this.mouseTrajectoryGroup.name = 'mouse_trajectory_group';
    this.scene.add(this.mouseTrajectoryGroup);

    // -----------------------------------------------------------------------
    // MODE 1: ORIGIN DYNAMIC GROUND LINE (TRACE)
    // -----------------------------------------------------------------------
    this.originTraceGroup = new THREE.Group();
    const originPointCount = 120;
    const originPositions = new Float32Array(originPointCount * 3);
    this.originBasePositions = new Float32Array(originPointCount * 3);

    for (let i = 0; i < originPointCount; i++) {
      const t = i / (originPointCount - 1); // 0 to 1
      const x = -3.2 + t * 6.4;
      // Gentle natural catenary arc
      const y = -0.52 + Math.sin(t * Math.PI) * 0.12;
      const z = -0.05 + Math.cos(t * Math.PI) * 0.08;

      originPositions[i * 3 + 0] = x;
      originPositions[i * 3 + 1] = y;
      originPositions[i * 3 + 2] = z;

      this.originBasePositions[i * 3 + 0] = x;
      this.originBasePositions[i * 3 + 1] = y;
      this.originBasePositions[i * 3 + 2] = z;
    }

    this.originTraceGeometry = new THREE.BufferGeometry();
    this.originTraceGeometry.setAttribute('position', new THREE.BufferAttribute(originPositions, 3));

    this.originTraceMaterial = new THREE.LineBasicMaterial({
      color: 0xC5A78D, // Refined champagne gold
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.originTraceLine = new THREE.Line(this.originTraceGeometry, this.originTraceMaterial);
    this.originTraceGroup.add(this.originTraceLine);

    // Subtle luminous contact node on the origin line beneath mouse
    const nodeGeo = new THREE.SphereGeometry(0.024, 16, 16);
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0xEAE8E4,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.originContactNode = new THREE.Mesh(nodeGeo, nodeMat);
    this.originContactNode.position.set(0.85, -0.44, 0);
    this.originTraceGroup.add(this.originContactNode);

    this.mouseTrajectoryGroup.add(this.originTraceGroup);

    // -----------------------------------------------------------------------
    // MODE 2: 3D AERODYNAMIC TRAJECTORY SPLINES (FLIGHT PATH)
    // -----------------------------------------------------------------------
    this.trajectoryGroup = new THREE.Group();
    this.trajectorySplines = [];

    const splineDefs = [
      // Primary center aerodynamic ribbon
      {
        points: [
          new THREE.Vector3(-3.2, -0.5, -0.8),
          new THREE.Vector3(-1.4, 0.45, 0.1),
          new THREE.Vector3(0.5, -0.15, 0.45),
          new THREE.Vector3(2.4, 0.65, -0.1),
          new THREE.Vector3(3.5, 0.2, -0.6),
        ],
        color: 0xC5A78D,
        opacityMultiplier: 0.95,
      },
      // Upper crest companion spline
      {
        points: [
          new THREE.Vector3(-2.8, 0.55, 0.2),
          new THREE.Vector3(-0.6, 0.95, 0.5),
          new THREE.Vector3(1.1, 0.55, 0.25),
          new THREE.Vector3(2.8, -0.15, -0.4),
        ],
        color: 0xCBD5D5,
        opacityMultiplier: 0.65,
      },
      // Lower underbody slipstream
      {
        points: [
          new THREE.Vector3(-2.6, -0.85, 0.35),
          new THREE.Vector3(0.1, -0.65, 0.55),
          new THREE.Vector3(1.6, -0.75, 0.15),
          new THREE.Vector3(3.2, -0.35, -0.3),
        ],
        color: 0x9EA2A9,
        opacityMultiplier: 0.50,
      },
    ];

    splineDefs.forEach((def, sIdx) => {
      const curve = new THREE.CatmullRomCurve3(def.points);
      const points = curve.getPoints(140);
      const geom = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineDashedMaterial({
        color: def.color,
        dashSize: 0.18,
        gapSize: 0.09,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      line.userData = {
        baseOpacity: def.opacityMultiplier,
        speed: 0.8 + sIdx * 0.35,
        offset: sIdx * 0.5,
      };

      this.trajectorySplines.push(line);
      this.trajectoryGroup.add(line);
    });

    this.mouseTrajectoryGroup.add(this.trajectoryGroup);

    // -----------------------------------------------------------------------
    // MODE 3: ARCHITECTURAL CAD CALIBRATION & RETICLE (PRECISION)
    // -----------------------------------------------------------------------
    this.precisionCadGroup = new THREE.Group();

    // Fine X axis hairline with millimeter tick marks
    const xAxisPoints = [new THREE.Vector3(-2.4, 0, 0), new THREE.Vector3(2.4, 0, 0)];
    const xAxisGeom = new THREE.BufferGeometry().setFromPoints(xAxisPoints);
    this.cadXAxis = new THREE.Line(
      xAxisGeom,
      new THREE.LineBasicMaterial({ color: 0xCBD5D5, transparent: true, opacity: 0, depthWrite: false })
    );
    this.precisionCadGroup.add(this.cadXAxis);

    // Fine Y axis hairline
    const yAxisPoints = [new THREE.Vector3(0, -1.4, 0), new THREE.Vector3(0, 1.4, 0)];
    const yAxisGeom = new THREE.BufferGeometry().setFromPoints(yAxisPoints);
    this.cadYAxis = new THREE.Line(
      yAxisGeom,
      new THREE.LineBasicMaterial({ color: 0xCBD5D5, transparent: true, opacity: 0, depthWrite: false })
    );
    this.precisionCadGroup.add(this.cadYAxis);

    // Millimeter tick marks along axes
    const tickGeom = new THREE.BufferGeometry();
    const tickPositions = [];
    for (let x = -2.2; x <= 2.2; x += 0.22) {
      if (Math.abs(x) < 0.05) continue;
      const h = (Math.round(x * 10) % 2 === 0) ? 0.045 : 0.025;
      tickPositions.push(x, -h, 0, x, h, 0);
    }
    for (let y = -1.2; y <= 1.2; y += 0.22) {
      if (Math.abs(y) < 0.05) continue;
      const w = (Math.round(y * 10) % 2 === 0) ? 0.045 : 0.025;
      tickPositions.push(-w, y, 0, w, y, 0);
    }
    tickGeom.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
    this.cadTicks = new THREE.LineSegments(
      tickGeom,
      new THREE.LineBasicMaterial({ color: 0x7A808C, transparent: true, opacity: 0, depthWrite: false })
    );
    this.precisionCadGroup.add(this.cadTicks);

    // Concentric polar calibration circles
    [0.32, 0.68].forEach((r, idx) => {
      const circlePts = [];
      const segs = 64;
      for (let s = 0; s <= segs; s++) {
        const theta = (s / segs) * Math.PI * 2;
        circlePts.push(new THREE.Vector3(Math.cos(theta) * r, Math.sin(theta) * r, 0));
      }
      const cGeom = new THREE.BufferGeometry().setFromPoints(circlePts);
      const cLine = new THREE.Line(
        cGeom,
        new THREE.LineDashedMaterial({
          color: idx === 0 ? 0xC5A78D : 0x7A808C,
          dashSize: 0.025,
          gapSize: 0.025,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      cLine.computeLineDistances();
      cLine.userData = { isCircle: true, baseOpacity: idx === 0 ? 0.8 : 0.45 };
      this.precisionCadGroup.add(cLine);
    });

    // Dynamic targeting reticle (steered via Motion Study)
    this.reticleGroup = new THREE.Group();
    const reticleCrossPts = [
      new THREE.Vector3(-0.08, 0, 0), new THREE.Vector3(0.08, 0, 0),
      new THREE.Vector3(0, -0.08, 0), new THREE.Vector3(0, 0.08, 0),
    ];
    const reticleCrossGeom = new THREE.BufferGeometry().setFromPoints(reticleCrossPts);
    this.reticleCross = new THREE.LineSegments(
      reticleCrossGeom,
      new THREE.LineBasicMaterial({ color: 0xEAE8E4, transparent: true, opacity: 0, depthWrite: false })
    );
    this.reticleGroup.add(this.reticleCross);

    const reticleDot = new THREE.Mesh(
      new THREE.RingGeometry(0.02, 0.035, 24),
      new THREE.MeshBasicMaterial({ color: 0xC5A78D, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    this.reticleDot = reticleDot;
    this.reticleGroup.add(reticleDot);

    this.precisionCadGroup.add(this.reticleGroup);
    this.precisionCadGroup.position.set(-0.85, 0.0, 0.0);
    this.mouseTrajectoryGroup.add(this.precisionCadGroup);

    // -----------------------------------------------------------------------
    // MODE 4: SPECIMEN GROUNDING HORIZON / OVAL (FINALE)
    // -----------------------------------------------------------------------
    this.groundingGroup = new THREE.Group();

    // Subtle elliptical floor shadow disc
    const floorOvalPts = [];
    const ovalSegs = 72;
    for (let s = 0; s <= ovalSegs; s++) {
      const theta = (s / ovalSegs) * Math.PI * 2;
      floorOvalPts.push(new THREE.Vector3(Math.cos(theta) * 1.55, 0, Math.sin(theta) * 0.95));
    }
    const ovalGeom = new THREE.BufferGeometry().setFromPoints(floorOvalPts);
    this.groundingOval = new THREE.Line(
      ovalGeom,
      new THREE.LineBasicMaterial({
        color: 0xC5A78D,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    this.groundingGroup.add(this.groundingOval);

    // Hairline ground horizon spanning the lower frame
    const horizonPts = [new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(4.5, 0, 0)];
    const horizonGeom = new THREE.BufferGeometry().setFromPoints(horizonPts);
    this.groundingHorizon = new THREE.Line(
      horizonGeom,
      new THREE.LineBasicMaterial({
        color: 0x7A808C,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    this.groundingGroup.add(this.groundingHorizon);

    this.groundingGroup.position.set(0.85, -0.68, 0);
    this.mouseTrajectoryGroup.add(this.groundingGroup);
  }

  setMouseTrajectoryState(mode = 1, progress = 0, opacity = 1) {
    this.mouseLineState.mode = mode;
    this.mouseLineState.progress = progress;
    this.mouseLineState.opacity = opacity;

    // Mode 1: Origin Trace
    const isMode1 = mode === 1;
    const alpha1 = isMode1 ? opacity : 0;
    if (this.originTraceMaterial) this.originTraceMaterial.opacity = alpha1 * 0.85;
    if (this.originContactNode) this.originContactNode.material.opacity = alpha1 * 0.95;

    // Mode 2: Trajectory Splines
    const isMode2 = mode === 2;
    const alpha2 = isMode2 ? opacity : 0;
    if (this.trajectorySplines) {
      this.trajectorySplines.forEach((spline) => {
        spline.material.opacity = alpha2 * spline.userData.baseOpacity;
      });
    }

    // Mode 3: Precision CAD
    const isMode3 = mode === 3;
    const alpha3 = isMode3 ? opacity : 0;
    if (this.cadXAxis) this.cadXAxis.material.opacity = alpha3 * 0.65;
    if (this.cadYAxis) this.cadYAxis.material.opacity = alpha3 * 0.65;
    if (this.cadTicks) this.cadTicks.material.opacity = alpha3 * 0.45;
    if (this.reticleCross) this.reticleCross.material.opacity = alpha3 * 0.9;
    if (this.reticleDot) this.reticleDot.material.opacity = alpha3 * 0.95;
    if (this.precisionCadGroup) {
      this.precisionCadGroup.children.forEach((child) => {
        if (child.userData && child.userData.isCircle) {
          child.material.opacity = alpha3 * child.userData.baseOpacity;
        }
      });
    }

    // Mode 4: Grounding Horizon (Finale)
    const isMode4 = mode === 4;
    const alpha4 = isMode4 ? opacity : 0;
    if (this.groundingOval) this.groundingOval.material.opacity = alpha4 * 0.55;
    if (this.groundingHorizon) this.groundingHorizon.material.opacity = alpha4 * 0.35;
  }

  updateMouseReticle(targetX = 0, targetY = 0) {
    this.mouseReticleTarget.x = targetX;
    this.mouseReticleTarget.y = targetY;
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onWindowResize());

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // 360 Drag Interaction (On mobile touch devices, active exclusively on chapter-finale)
    const onPointerDown = (clientX, clientY, isTouch = false) => {
      const finaleEl = document.getElementById('chapter-finale');
      const isFinaleActive = finaleEl && window.getComputedStyle(finaleEl).pointerEvents === 'auto';
      if (isTouch && !isFinaleActive) return;

      const isHero = window.scrollY < window.innerHeight * 0.7;
      if (isHero) return; // Prevent 360 drag on hero section

      this.isDragging = true;
      this.prevPointerPos = { x: clientX, y: clientY };
      this.dragVelocity = { x: 0, y: 0 };
    };

    const onPointerMove = (clientX, clientY) => {
      if (!this.isDragging) return;
      const deltaX = clientX - this.prevPointerPos.x;
      const deltaY = clientY - this.prevPointerPos.y;

      this.dragRotation.y += deltaX * 0.006;
      this.dragRotation.x += deltaY * 0.006;

      this.dragVelocity = {
        x: deltaY * 0.006,
        y: deltaX * 0.006,
      };

      this.prevPointerPos = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a, input, select, textarea, .color-btn, #main-nav, #reservation-modal')) return;
      onPointerDown(e.clientX, e.clientY, false);
    });
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('button, a, input, select, textarea, .color-btn, #main-nav, #reservation-modal')) return;
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', onPointerUp);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const isMobile = window.innerWidth < 1024;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    this.renderer.setPixelRatio(dpr);
  }

  async loadModel(key, url, scaleFactor = 1, yOffset = 0) {
    if (this.models.has(key)) {
      return this.models.get(key);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const rawModel = gltf.scene;

          // 1. Compute exact geometric bounds of raw model
          const box = new THREE.Box3().setFromObject(rawModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // 2. Wrap in pivot-centered parent group
          const wrapper = new THREE.Group();
          wrapper.name = key + '_wrapper';

          // Center the rawModel at wrapper origin (0, 0, 0)
          rawModel.position.set(-center.x, -center.y + yOffset, -center.z);
          wrapper.add(rawModel);

          // 3. Scale wrapper uniformly around (0, 0, 0)
          const targetSize = 2.4 * scaleFactor;
          const scale = targetSize / maxDim;
          wrapper.scale.set(scale, scale, scale);

          // Force matrix update to ensure bounding box is flush
          wrapper.updateMatrixWorld(true);

          const transforms = [];
          const partMap = new Map();

          rawModel.traverse((child) => {
            if (child.name) {
              partMap.set(child.name, {
                object: child,
                restPos: child.position.clone(),
                restRot: child.rotation.clone(),
                restScale: child.scale.clone(),
              });
            }

            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.frustumCulled = true;

              if (child.material) {
                child.material = child.material.clone();
                child.material.envMapIntensity = 1.15;
                child.material.needsUpdate = true;
                child.userData.originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xffffff);
                child.userData.originalRoughness = child.material.roughness !== undefined ? child.material.roughness : 0.4;
                child.userData.originalMetalness = child.material.metalness !== undefined ? child.material.metalness : 0.5;
              }

              transforms.push({
                mesh: child,
                originPos: child.position.clone(),
                normal: child.position.clone().normalize(),
              });
            }
          });

          this.namedParts.set(key, partMap);

          // Headphone custom anatomical layers & acoustic isolation membrane
          if (key === 'headphones') {
            const chassisR = partMap.get('Earcup_Chassis_R')?.object;
            const driverR = partMap.get('Acoustic_Driver_R')?.object;
            const cushionR = partMap.get('Ear_Cushion_R')?.object;

            if (chassisR && driverR && cushionR) {
              const membraneGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.0006, 48);
              membraneGeo.rotateX(Math.PI / 2);
              const membraneMat = new THREE.MeshPhysicalMaterial({
                color: 0x1f2633,
                roughness: 0.28,
                metalness: 0.25,
                transmission: 0.55,
                transparent: true,
                opacity: 0.2,
                clearcoat: 0.6,
                envMapIntensity: 1.3,
              });
              const membrane = new THREE.Mesh(membraneGeo, membraneMat);
              membrane.name = 'Isolation_Membrane_R';
              membrane.position.copy(driverR.position).lerp(cushionR.position, 0.45);
              membrane.rotation.copy(driverR.rotation);
              chassisR.add(membrane);

              partMap.set('Isolation_Membrane_R', {
                object: membrane,
                restPos: membrane.position.clone(),
                restRot: membrane.rotation.clone(),
                restScale: membrane.scale.clone(),
              });
            }

            // Left side isolation membrane as well
            const chassisL = partMap.get('Earcup_Chassis_L')?.object;
            const driverL = partMap.get('Acoustic_Driver_L')?.object;
            const cushionL = partMap.get('Ear_Cushion_L')?.object;

            if (chassisL && driverL && cushionL) {
              const membraneGeoL = new THREE.CylinderGeometry(0.024, 0.024, 0.0006, 48);
              membraneGeoL.rotateX(Math.PI / 2);
              const membraneMatL = new THREE.MeshPhysicalMaterial({
                color: 0x1f2633,
                roughness: 0.28,
                metalness: 0.25,
                transmission: 0.55,
                transparent: true,
                opacity: 0.2,
                clearcoat: 0.6,
                envMapIntensity: 1.3,
              });
              const membraneL = new THREE.Mesh(membraneGeoL, membraneMatL);
              membraneL.name = 'Isolation_Membrane_L';
              membraneL.position.copy(driverL.position).lerp(cushionL.position, 0.45);
              membraneL.rotation.copy(driverL.rotation);
              chassisL.add(membraneL);

              partMap.set('Isolation_Membrane_L', {
                object: membraneL,
                restPos: membraneL.position.clone(),
                restRot: membraneL.rotation.clone(),
                restScale: membraneL.scale.clone(),
              });
            }

            // Enhance acoustic driver transducer specular & metallic finish
            const driverMeshR = partMap.get('Acoustic_Driver_R')?.object;
            if (driverMeshR && driverMeshR.material) {
              driverMeshR.material.metalness = 0.85;
              driverMeshR.material.roughness = 0.24;
              driverMeshR.material.envMapIntensity = 1.6;
            }
            const driverMeshL = partMap.get('Acoustic_Driver_L')?.object;
            if (driverMeshL && driverMeshL.material) {
              driverMeshL.material.metalness = 0.85;
              driverMeshL.material.roughness = 0.24;
              driverMeshL.material.envMapIntensity = 1.6;
            }
          }

          // Mouse custom architectural materials & chiaroscuro studio finish
          if (key === 'mouse') {
            rawModel.traverse((child) => {
              if (child.isMesh && child.material) {
                const mat = child.material;
                const matName = (mat.name || '').toLowerCase();
                const nodeName = (child.name || '').toLowerCase();

                // 1. Monocoque Shell & Primary Click Paddles (Velvety stealth obsidian with soft chiaroscuro sheen)
                if (
                  matName.includes('glavna_1') ||
                  nodeName.includes('top_shell') ||
                  nodeName.includes('left_click') ||
                  nodeName.includes('right_click') ||
                  nodeName.includes('base_plate') ||
                  nodeName.includes('bottom_chassis')
                ) {
                  mat.color.set(0x151618);
                  mat.roughness = 0.46;
                  mat.metalness = 0.14;
                  mat.clearcoat = 0.22;
                  mat.clearcoatRoughness = 0.45;
                  mat.envMapIntensity = 1.35;
                }
                // 2. Micro Buttons (DPI Button & Ergonomic Thumb Side Buttons)
                else if (
                  matName.includes('glavna_0') ||
                  nodeName.includes('dpi_button') ||
                  nodeName.includes('side_buttons')
                ) {
                  mat.color.set(0x121315);
                  mat.roughness = 0.38;
                  mat.metalness = 0.15;
                  mat.envMapIntensity = 1.2;
                }
                // 3. Tactile Ribbed Scroll Wheel (Matte rubber)
                else if (
                  matName === 'crna' ||
                  nodeName.includes('scroll_wheel')
                ) {
                  mat.color.set(0x111214);
                  mat.roughness = 0.68;
                  mat.metalness = 0.04;
                }
                // 4. Scroll Axle & Wheel Rims (Precision titanium gunmetal, NOT blue)
                else if (
                  matName.includes('plava') ||
                  nodeName.includes('scroll_axle')
                ) {
                  mat.color.set(0x42464e);
                  mat.roughness = 0.24;
                  mat.metalness = 0.92;
                  mat.envMapIntensity = 1.8;
                }
                // 5. Internal Diffusers (Soft warm neutral light, NO electric cyan)
                else if (
                  matName.includes('svetlo') ||
                  nodeName.includes('diffuser') ||
                  nodeName.includes('rgb')
                ) {
                  mat.color.set(0xfffbf5);
                  if (mat.emissive) {
                    mat.emissive.set(0xfffbf5);
                    mat.emissiveIntensity = 0.35;
                  }
                }
                // 6. Internal Chamber Skeleton & Ribbing
                else if (
                  matName.includes('komora') ||
                  nodeName.includes('chamber')
                ) {
                  mat.color.set(0x101114);
                  mat.roughness = 0.55;
                  mat.metalness = 0.20;
                }
                // 7. Microcontroller ICs & Optical Engine
                else if (
                  nodeName.includes('microcontroller') ||
                  nodeName.includes('optical_sensor') ||
                  matName.includes('siva') ||
                  matName.includes('bela')
                ) {
                  mat.envMapIntensity = 1.5;
                  if (matName.includes('siva')) {
                    mat.roughness = 0.22;
                    mat.metalness = 0.85;
                  }
                }
                // 8. Virgin-Grade Curved PTFE Skates
                else if (
                  matName.includes('skate') ||
                  matName.includes('ptfe') ||
                  nodeName.includes('skate')
                ) {
                  mat.color.set(0xfafafc);
                  mat.roughness = 0.16;
                  mat.metalness = 0.02;
                }

                // Preserve tuned reference values in userData
                child.userData.originalColor = mat.color ? mat.color.clone() : new THREE.Color(0x151618);
                child.userData.originalRoughness = mat.roughness !== undefined ? mat.roughness : 0.46;
                child.userData.originalMetalness = mat.metalness !== undefined ? mat.metalness : 0.14;
                mat.needsUpdate = true;
              }
            });
          }

          this.initialMeshTransforms.set(key, transforms);
          this.models.set(key, wrapper);
          resolve(wrapper);
        },
        undefined,
        (error) => {
          console.error(`Error loading model ${key}:`, error);
          reject(error);
        }
      );
    });
  }

  displayModel(key) {
    this.modelContainer.clear();

    const model = this.models.get(key);
    if (model) {
      this.currentModelKey = key;
      this.modelContainer.add(model);
      this.dragRotation = { x: 0, y: 0 };
      this.dragVelocity = { x: 0, y: 0 };

      // Apply tailored studio illumination when displaying mouse matching reference photography
      if (key === 'mouse') {
        if (this.hemiLight) {
          this.hemiLight.color.set(0xf0eae1);
          this.hemiLight.groundColor.set(0x0e0d0c);
          this.hemiLight.intensity = 0.45;
        }
        if (this.keyLight) {
          this.keyLight.color.set(0xfffdfa);
          this.keyLight.position.set(3.6, 4.6, 3.4);
          this.keyLight.intensity = 2.2;
        }
        if (this.fillLight) {
          this.fillLight.color.set(0xcac1b4);
          this.fillLight.position.set(-3.8, 1.4, 2.4);
          this.fillLight.intensity = 0.52;
        }
        if (this.rimLight) {
          this.rimLight.color.set(0xffffff);
          this.rimLight.position.set(2.4, 3.4, -3.2);
          this.rimLight.intensity = 2.4;
        }
        if (this.upLight) {
          this.upLight.color.set(0x201c18);
          this.upLight.intensity = 0.35;
        }
      }
    }
  }

  setPartOffset(partName, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const partMap = this.namedParts.get(this.currentModelKey);
    if (!partMap || !partMap.has(partName)) return;

    const data = partMap.get(partName);
    data.object.position.x = data.restPos.x + offsetX;
    data.object.position.y = data.restPos.y + offsetY;
    data.object.position.z = data.restPos.z + offsetZ;
  }

  setPartsOffsetPattern(pattern, offsetX = 0, offsetY = 0, offsetZ = 0) {
    const partMap = this.namedParts.get(this.currentModelKey);
    if (!partMap) return;

    partMap.forEach((data, name) => {
      if (name.includes(pattern) || (pattern instanceof RegExp && pattern.test(name))) {
        data.object.position.x = data.restPos.x + offsetX;
        data.object.position.y = data.restPos.y + offsetY;
        data.object.position.z = data.restPos.z + offsetZ;
      }
    });
  }

  // Interactive Click Micro-Actuation for Optical Switches
  clickPaddle(paddle = 'left') {
    if (this.currentModelKey !== 'mouse') return;
    const partMap = this.namedParts.get('mouse');
    if (!partMap) return;

    const targetKey = paddle === 'left' ? 'Mouse_Left_Click' : 'Mouse_Right_Click';
    const item = partMap.get(targetKey) || partMap.get(targetKey + '_Mesh');
    if (!item || !item.object) return;

    gsap.killTweensOf(item.object.position);
    gsap.timeline()
      .to(item.object.position, {
        y: item.restPos.y - 0.0035,
        duration: 0.035,
        ease: 'power2.out',
      })
      .to(item.object.position, {
        y: item.restPos.y,
        duration: 0.14,
        ease: 'elastic.out(1.2, 0.45)',
      });
  }

  // Tactile Scroll Wheel Spin linked to Scroll Delta
  rotateScrollWheel(deltaY = 1) {
    if (this.currentModelKey !== 'mouse') return;
    const partMap = this.namedParts.get('mouse');
    if (!partMap) return;

    const wheel = partMap.get('Mouse_Scroll_Wheel');
    const axle = partMap.get('Mouse_Scroll_Axle');
    const angleDelta = deltaY * 0.0035;

    if (wheel && wheel.object) wheel.object.rotation.x += angleDelta;
    if (axle && axle.object) axle.object.rotation.x += angleDelta;
  }

  // Direct Mouse Internal RGB Diffuser Emission Control
  setMouseRGB(hexColor, intensity = 2.0) {
    if (this.currentModelKey !== 'mouse') return;
    const partMap = this.namedParts.get('mouse');
    if (!partMap) return;

    const diffuser = partMap.get('Mouse_RGB_Diffusers');
    if (diffuser && diffuser.object) {
      diffuser.object.traverse((node) => {
        if (node.isMesh && node.material) {
          const col = new THREE.Color(hexColor);
          node.material.color.copy(col);
          if (node.material.emissive) {
            node.material.emissive.copy(col);
            node.material.emissiveIntensity = intensity;
          }
          node.material.needsUpdate = true;
        }
      });
    }
  }

  setExplode(factor) {
    this.explodeFactor = THREE.MathUtils.clamp(factor, 0, 1);

    if (this.currentModelKey === 'headphones') {
      const partMap = this.namedParts.get('headphones');
      if (!partMap) return;

      const f = this.explodeFactor;

      // -------------------------------------------------------------
      // 1. Right Earcup Assembly Breakdown
      // -------------------------------------------------------------
      const chasR = partMap.get('Earcup_Chassis_R');
      if (chasR) {
        chasR.object.position.y = chasR.restPos.y + 0.040 * f;
        chasR.object.position.z = chasR.restPos.z + 0.030 * f;
      }

      const shellR = partMap.get('Earcup_Shell_R');
      if (shellR) shellR.object.position.z = shellR.restPos.z + 0.090 * f;
      const btnR = partMap.get('Button_Power');
      if (btnR) btnR.object.position.z = btnR.restPos.z + 0.090 * f;

      const driverR = partMap.get('Acoustic_Driver_R');
      if (driverR) {
        driverR.object.position.z = driverR.restPos.z + 0.050 * f;
        if (driverR.object.material) {
          driverR.object.material.metalness = 0.95;
          driverR.object.material.roughness = 0.16;
          driverR.object.material.envMapIntensity = 2.4;
        }
      }

      const membraneR = partMap.get('Isolation_Membrane_R');
      if (membraneR) {
        membraneR.object.position.z = membraneR.restPos.z + 0.025 * f;
        if (membraneR.object.material) {
          membraneR.object.material.opacity = 0.85 * f;
        }
      }

      const cushionR = partMap.get('Ear_Cushion_R');
      if (cushionR) cushionR.object.position.z = cushionR.restPos.z - 0.035 * f;

      // -------------------------------------------------------------
      // 2. Left Earcup Assembly Breakdown
      // -------------------------------------------------------------
      const chasL = partMap.get('Earcup_Chassis_L');
      if (chasL) {
        chasL.object.position.y = chasL.restPos.y - 0.050 * f;
      }

      const shellL = partMap.get('Earcup_Shell_L');
      if (shellL) shellL.object.position.z = shellL.restPos.z - 0.090 * f;

      const leftAccessories = [
        'Button_Bluetooth',
        'Decal_Bluetooth_Icon',
        'Decal_Power_Text',
        'LED_Indicator',
        'Port_Audio_Jack',
        'Port_USB_C',
      ];
      leftAccessories.forEach((name) => {
        const item = partMap.get(name);
        if (item) item.object.position.z = item.restPos.z - 0.090 * f;
      });

      const driverL = partMap.get('Acoustic_Driver_L');
      if (driverL) {
        driverL.object.position.z = driverL.restPos.z - 0.050 * f;
        if (driverL.object.material) {
          driverL.object.material.metalness = 0.95;
          driverL.object.material.roughness = 0.16;
          driverL.object.material.envMapIntensity = 2.4;
        }
      }

      const membraneL = partMap.get('Isolation_Membrane_L');
      if (membraneL) {
        membraneL.object.position.z = membraneL.restPos.z - 0.025 * f;
        if (membraneL.object.material) {
          membraneL.object.material.opacity = 0.85 * f;
        }
      }

      const cushionL = partMap.get('Ear_Cushion_L');
      if (cushionL) cushionL.object.position.z = cushionL.restPos.z + 0.035 * f;

      // -------------------------------------------------------------
      // 3. Headband & Suspension Gimbal Assembly Breakdown
      // -------------------------------------------------------------
      // Top cushion and leather stitches lift upward
      const topCushion = partMap.get('Headband_Cushion_Top');
      if (topCushion) topCushion.object.position.z = topCushion.restPos.z - 0.050 * f;

      const innerStitch = partMap.get('Headband_Stitches_Inner');
      if (innerStitch) innerStitch.object.position.z = innerStitch.restPos.z - 0.055 * f;

      const outerStitch = partMap.get('Headband_Stitches_Outer');
      if (outerStitch) outerStitch.object.position.z = outerStitch.restPos.z - 0.040 * f;

      // Lateral headband cushions arch outward and lift
      const cushR = partMap.get('Headband_Cushion_R');
      if (cushR) {
        cushR.object.position.x = cushR.restPos.x - 0.030 * f;
        cushR.object.position.z = cushR.restPos.z - 0.035 * f;
      }
      const cushL = partMap.get('Headband_Cushion_L');
      if (cushL) {
        cushL.object.position.x = cushL.restPos.x + 0.030 * f;
        cushL.object.position.z = cushL.restPos.z - 0.035 * f;
      }

      // Headband telescopic extensions separate outwards and down
      const extR = partMap.get('Headband_Extension_R');
      if (extR) {
        extR.object.position.x = extR.restPos.x - 0.030 * f;
        extR.object.position.z = extR.restPos.z + 0.015 * f;
      }
      const extL = partMap.get('Headband_Extension_L');
      if (extL) {
        extL.object.position.x = extL.restPos.x + 0.030 * f;
        extL.object.position.z = extL.restPos.z + 0.015 * f;
      }

      // Suspension hinge yokes decouple outwards
      const yokeR = partMap.get('Hinge_Yoke_R');
      if (yokeR) {
        yokeR.object.position.y = yokeR.restPos.y + 0.025 * f;
        yokeR.object.position.z = yokeR.restPos.z + 0.015 * f;
      }
      const yokeL = partMap.get('Hinge_Yoke_L');
      if (yokeL) {
        yokeL.object.position.y = yokeL.restPos.y - 0.025 * f;
        yokeL.object.position.z = yokeL.restPos.z - 0.005 * f;
      }

      return;
    }

    if (this.currentModelKey === 'mouse') {
      const partMap = this.namedParts.get('mouse');
      if (!partMap) return;

      const f = this.explodeFactor;
      const MOUSE_EXPLODED_VECTORS = {
        Mouse_Top_Shell: { x: 0.0, y: 0.065, z: -0.014 },
        Mouse_Left_Click: { x: -0.012, y: 0.045, z: 0.014 },
        Mouse_Right_Click: { x: 0.012, y: 0.045, z: 0.014 },
        Mouse_DPI_Button: { x: 0.0, y: 0.052, z: 0.009 },
        Mouse_Scroll_Wheel: { x: 0.0, y: 0.035, z: 0.022 },
        Mouse_Scroll_Axle: { x: 0.0, y: 0.035, z: 0.022 },
        Mouse_Primary_Switches: { x: 0.0, y: 0.018, z: 0.014 },
        Mouse_Side_Buttons: { x: -0.028, y: 0.006, z: 0.0 },
        Mouse_Internal_Chamber: { x: 0.0, y: 0.024, z: 0.006 },
        Mouse_RGB_Diffusers: { x: 0.0, y: 0.028, z: 0.006 },
        Mouse_Logo_Emblem: { x: 0.0, y: 0.018, z: -0.009 },
        Mouse_PCB_Motherboard: { x: 0.0, y: 0.005, z: 0.0 },
        Mouse_Microcontroller_ICs: { x: 0.0, y: 0.008, z: 0.0 },
        Mouse_Optical_Sensor: { x: 0.0, y: -0.018, z: -0.006 },
        Mouse_Bottom_Chassis: { x: 0.0, y: -0.028, z: 0.0 },
        Mouse_Base_Plate: { x: 0.0, y: -0.042, z: 0.0 },
        Mouse_Skate_Pads: { x: 0.0, y: -0.055, z: 0.0 },
        Mouse_PTFE_Skates: { x: 0.0, y: -0.055, z: 0.0 },
      };

      for (const [name, delta] of Object.entries(MOUSE_EXPLODED_VECTORS)) {
        const item = partMap.get(name);
        if (item && item.object) {
          const mult = 1.6;
          item.object.position.x = item.restPos.x + delta.x * mult * f;
          item.object.position.y = item.restPos.y + delta.y * mult * f;
          item.object.position.z = item.restPos.z + delta.z * mult * f;
        }
      }
      return;
    }

    // Default radial explosion for other models
    const transforms = this.initialMeshTransforms.get(this.currentModelKey);
    if (!transforms) return;

    transforms.forEach(({ mesh, originPos, normal }) => {
      const explosionDistance = 0.85 * this.explodeFactor;
      mesh.position.x = originPos.x + normal.x * explosionDistance;
      mesh.position.y = originPos.y + normal.y * explosionDistance;
      mesh.position.z = originPos.z + normal.z * explosionDistance;
    });
  }

  setColorway(colorway) {
    this.activeColorway = colorway;
    const model = this.models.get(this.currentModelKey);
    if (!model) return;

    const isHeadphones = this.currentModelKey === 'headphones';
    const isMouse = this.currentModelKey === 'mouse';

    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mat = child.material;
        const name = (mat.name || '').toLowerCase();

        if (isHeadphones) {
          const isMetal = name.includes('metal') || name.includes('steel');
          const isShell = name.includes('shell') || name.includes('plastic');
          const isLeather = name.includes('leather') || name.includes('skin') || name.includes('fabric');
          const isAccents = name.includes('led') || name.includes('vibrator') || name.includes('bluetooth') || name.includes('stiches');

          switch (colorway) {
            case 'frost':
              if (isMetal) {
                mat.color.set(0xF0F4F8);
                mat.roughness = 0.18;
                mat.metalness = 0.95;
              } else if (isShell) {
                mat.color.set(0xD2D8E0);
                mat.roughness = 0.28;
                mat.metalness = 0.70;
              } else if (isLeather) {
                mat.color.set(0xA4ABB5);
                mat.roughness = 0.65;
                mat.metalness = 0.05;
              } else {
                mat.color.set(0xDFE6EC);
                mat.roughness = 0.25;
                mat.metalness = 0.80;
              }
              if (mat.emissive) mat.emissive.set(0x000000);
              break;

            case 'brass':
              if (isMetal) {
                mat.color.set(0xD4AF37);
                mat.roughness = 0.22;
                mat.metalness = 0.95;
              } else if (isShell) {
                mat.color.set(0xC2B095);
                mat.roughness = 0.32;
                mat.metalness = 0.65;
              } else if (isLeather) {
                mat.color.set(0x352E28);
                mat.roughness = 0.65;
                mat.metalness = 0.02;
              } else {
                mat.color.set(0x8C7853);
                mat.roughness = 0.30;
                mat.metalness = 0.60;
              }
              if (mat.emissive) mat.emissive.set(0x000000);
              break;

            case 'cyber':
              if (name.includes('led') || name.includes('vibrator')) {
                mat.color.set(0x00F0FF);
                mat.emissive = new THREE.Color(0x00F0FF);
                mat.emissiveIntensity = 2.5;
              } else if (isShell) {
                mat.color.set(0x0B1220);
                mat.roughness = 0.28;
                mat.metalness = 0.85;
              } else if (isMetal) {
                mat.color.set(0x1C2230);
                mat.roughness = 0.24;
                mat.metalness = 0.92;
              } else {
                mat.color.set(0x10131A);
                mat.roughness = 0.55;
                mat.metalness = 0.15;
              }
              break;

            case 'obsidian':
            default:
              if (child.userData.originalColor) {
                mat.color.copy(child.userData.originalColor);
              }
              mat.roughness = child.userData.originalRoughness;
              mat.metalness = child.userData.originalMetalness;
              if (mat.emissive) {
                if (name.includes('led')) {
                  mat.emissive.set(0x7ce1ff);
                  mat.emissiveIntensity = 1.0;
                } else {
                  mat.emissive.set(0x000000);
                }
              }
              break;
          }
        } else if (isMouse) {
          const isDiffuser = name.includes('svetlo') || name.includes('diffuser') || name.includes('led');
          const isSensor = name.includes('glass') || name.includes('sensor');
          const isAccent = name.includes('axle') || name.includes('logo') || name.includes('metal') || name.includes('wheel');
          const isSkate = name.includes('skate') || name.includes('ptfe');

          switch (colorway) {
            case 'frost':
              if (isDiffuser) {
                mat.color.set(0x7CE1FF);
                if (mat.emissive) {
                  mat.emissive.set(0x7CE1FF);
                  mat.emissiveIntensity = 2.2;
                }
              } else if (isSensor) {
                if (mat.emissive) mat.emissive.set(0xFF2222);
              } else if (isAccent) {
                mat.color.set(0xE5EBF2);
                mat.roughness = 0.18;
                mat.metalness = 0.90;
              } else if (isSkate) {
                mat.color.set(0xFFFFFF);
                mat.roughness = 0.20;
                mat.metalness = 0.05;
              } else {
                mat.color.set(0xF2F5F8);
                mat.roughness = 0.32;
                mat.metalness = 0.10;
              }
              break;

            case 'cyber':
              if (isDiffuser) {
                mat.color.set(0x00FFFF);
                if (mat.emissive) {
                  mat.emissive.set(0x00FFFF);
                  mat.emissiveIntensity = 3.0;
                }
              } else if (isSensor) {
                if (mat.emissive) mat.emissive.set(0x00F0FF);
              } else if (isAccent) {
                mat.color.set(0x1B2C47);
                mat.roughness = 0.20;
                mat.metalness = 0.95;
              } else {
                mat.color.set(0x0D121B);
                mat.roughness = 0.30;
                mat.metalness = 0.75;
              }
              break;

            case 'brass':
              if (isDiffuser) {
                mat.color.set(0xFFC864);
                if (mat.emissive) {
                  mat.emissive.set(0xFFC864);
                  mat.emissiveIntensity = 1.8;
                }
              } else if (isSensor) {
                if (mat.emissive) mat.emissive.set(0xFF3333);
              } else if (isAccent) {
                mat.color.set(0xD4AF37);
                mat.roughness = 0.22;
                mat.metalness = 0.95;
              } else {
                mat.color.set(0x14161A);
                mat.roughness = 0.38;
                mat.metalness = 0.25;
              }
              break;

            case 'obsidian':
            default:
              if (child.userData.originalColor) {
                mat.color.copy(child.userData.originalColor);
              }
              mat.roughness = child.userData.originalRoughness;
              mat.metalness = child.userData.originalMetalness;
              if (isDiffuser && mat.emissive) {
                mat.color.set(0xfffbf5);
                mat.emissive.set(0xfffbf5);
                mat.emissiveIntensity = 0.35;
              }
              if (name.includes('axle') || name.includes('plava')) {
                mat.color.set(0x42464e);
                mat.roughness = 0.24;
                mat.metalness = 0.92;
              }
              break;
          }
        } else {
          // Standard keyboard colorway
          switch (colorway) {
            case 'frost':
              mat.color.set(0xDFE6EC);
              mat.roughness = 0.22;
              mat.metalness = 0.85;
              break;
            case 'cyber':
              if (mat.name && (mat.name.toLowerCase().includes('accent') || mat.name.toLowerCase().includes('diffuser') || mat.name.toLowerCase().includes('led'))) {
                mat.color.set(0x00F0FF);
                mat.emissive = new THREE.Color(0x00F0FF);
                mat.emissiveIntensity = 2.0;
              } else {
                mat.color.set(0x0B0E14);
                mat.roughness = 0.35;
                mat.metalness = 0.65;
              }
              break;
            case 'brass':
              if (mat.name && (mat.name.toLowerCase().includes('weight') || mat.name.toLowerCase().includes('metal') || mat.name.toLowerCase().includes('knob'))) {
                mat.color.set(0xD4AF37);
                mat.roughness = 0.25;
                mat.metalness = 0.95;
              } else {
                mat.color.set(0x181B22);
                mat.roughness = 0.38;
                mat.metalness = 0.50;
              }
              break;
            case 'obsidian':
            default:
              if (child.userData.originalColor) {
                mat.color.copy(child.userData.originalColor);
              }
              mat.roughness = child.userData.originalRoughness;
              mat.metalness = child.userData.originalMetalness;
              if (mat.emissive) {
                mat.emissiveIntensity = 1.0;
              }
              break;
          }
        }
        mat.needsUpdate = true;
      }
    });
  }

  registerHotspots(hotspotList) {
    this.hotspots = hotspotList;
  }

  updateHotspots() {
    if (!this.hotspots || this.hotspots.length === 0) return;

    if (!this._tempHotspotV) this._tempHotspotV = new THREE.Vector3();
    const tempV = this._tempHotspotV;

    this.hotspots.forEach((spot) => {
      const el = document.getElementById(spot.elementId);
      if (!el) return;

      tempV.set(spot.pos.x, spot.pos.y, spot.pos.z);
      tempV.applyMatrix4(this.modelContainer.matrixWorld);
      tempV.project(this.camera);

      if (tempV.z > 1) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }

      const screenX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-(tempV.y * 0.5) + 0.5) * window.innerHeight;

      el.style.transform = `translate(-50%, -50%) translate3d(${screenX}px, ${screenY}px, 0)`;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (document.hidden) return;

    const delta = this.clock.getDelta();
    const isHero = window.scrollY < window.innerHeight * 0.7;

    // Damping drag inertia (On hero, damp drag rotation to 0 to keep curated view stable)
    if (isHero) {
      this.dragRotation.x *= 0.85;
      this.dragRotation.y *= 0.85;
      this.dragVelocity.x = 0;
      this.dragVelocity.y = 0;
      this.isDragging = false;
    } else if (!this.isDragging) {
      this.dragRotation.x += this.dragVelocity.x;
      this.dragRotation.y += this.dragVelocity.y;

      this.dragVelocity.x *= 0.92;
      this.dragVelocity.y *= 0.92;
    }

    // Viewport bounds calculation
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const dist = Math.abs(this.camera.position.z);
    const visibleHalfHeight = Math.tan(fovRad) * dist;
    const visibleHalfWidth = visibleHalfHeight * (this.camera.aspect || 1);

    // Guaranteed viewport containment: clamped to safe bounds on any screen
    const isMobile = window.innerWidth < 1024;
    const isSmallMobile = window.innerWidth < 768;
    const isShortScreen = window.innerHeight < 760;
    const maxSafeX = Math.max(0.5, visibleHalfWidth * 0.74);
    const rawTargetX = isMobile ? 0 : this.modelPos.x;
    const effectivePosX = THREE.MathUtils.clamp(rawTargetX, -maxSafeX, maxSafeX);
    const effectivePosY = isSmallMobile
      ? (this.modelPos.y * 0.25 + 0.08)
      : (isMobile 
        ? this.modelPos.y * 0.3 
        : (isShortScreen ? this.modelPos.y * 0.75 : this.modelPos.y));

    // Calculate model 2D screen coordinate in NDC (-1 to 1) to determine cursor proximity
    let rawProximity = 0;
    let relX = this.mouse.x;
    let relY = this.mouse.y;

    if (this.modelContainer) {
      if (!this._modelScreenPos) this._modelScreenPos = new THREE.Vector3();
      const modelScreenPos = this._modelScreenPos;
      this.modelContainer.getWorldPosition(modelScreenPos);
      modelScreenPos.project(this.camera);

      relX = this.mouse.x - modelScreenPos.x;
      relY = this.mouse.y - modelScreenPos.y;

      // Distance from mouse to model in screen space
      const distToModel = Math.sqrt(relX * relX + relY * relY);
      
      // Proximity threshold: activates only when the cursor is near the model (~0.85 NDC radius)
      const proximityRadius = 0.85;
      if (distToModel < proximityRadius) {
        const normDist = distToModel / proximityRadius;
        rawProximity = 0.5 * (1 + Math.cos(normDist * Math.PI)); // smooth cosine falloff
      }
    }

    // Smooth proximity interpolation for butter-smooth easing in and out
    this.modelProximity += (rawProximity - this.modelProximity) * 0.08;

    // Dynamic responsive mouse interaction (active only when cursor is near the model)
    const mouseStrength = (isHero ? 1.0 : 0.4) * this.modelProximity;
    const parallaxX = -relY * 0.22 * mouseStrength;
    const parallaxY = relX * 0.26 * mouseStrength;
    const swayX = relX * 0.08 * mouseStrength;
    const swayY = relY * 0.06 * mouseStrength;

    if (this.modelContainer) {
      const targetPosX = effectivePosX + (isMobile ? 0 : swayX);
      const targetPosY = effectivePosY + (isMobile ? 0 : swayY);

      this.modelContainer.position.x += (targetPosX - this.modelContainer.position.x) * 0.18;
      this.modelContainer.position.y += (targetPosY - this.modelContainer.position.y) * 0.18;
      this.modelContainer.position.z += (this.modelPos.z - this.modelContainer.position.z) * 0.18;

      // Smooth model rotation
      const targetRotX = this.modelRot.x + this.dragRotation.x + parallaxX;
      const targetRotY = this.modelRot.y + this.dragRotation.y + parallaxY;
      const targetRotZ = this.modelRot.z;

      this.modelContainer.rotation.x += (targetRotX - this.modelContainer.rotation.x) * 0.18;
      this.modelContainer.rotation.y += (targetRotY - this.modelContainer.rotation.y) * 0.18;
      this.modelContainer.rotation.z += (targetRotZ - this.modelContainer.rotation.z) * 0.18;
    }

    // Responsive camera zoom adaptation for shorter / narrower viewports
    const aspect = this.camera.aspect || 1.777;
    let responsiveZ = this.cameraPos.z;
    if (aspect < 1.6) {
      const zoomFactor = isSmallMobile ? 1.55 : 1.1;
      responsiveZ += (1.6 - aspect) * zoomFactor;
    }

    // Smooth camera position & lookAt
    this.camera.position.x += (this.cameraPos.x - this.camera.position.x) * 0.18;
    this.camera.position.y += (this.cameraPos.y - this.camera.position.y) * 0.18;
    this.camera.position.z += (responsiveZ - this.camera.position.z) * 0.18;

    this.currentLookAt.x += (this.cameraLookAt.x - this.currentLookAt.x) * 0.18;
    this.currentLookAt.y += (this.cameraLookAt.y - this.currentLookAt.y) * 0.18;
    this.currentLookAt.z += (this.cameraLookAt.z - this.currentLookAt.z) * 0.18;
    this.camera.lookAt(this.currentLookAt);

    // Sync acoustic rings directly behind the headphones model
    if (this.modelContainer && this.ringsGroup) {
      this.ringsGroup.position.x = this.modelContainer.position.x;
      this.ringsGroup.position.y = this.modelContainer.position.y + 0.05;
      this.ringsGroup.position.z = this.modelContainer.position.z - 0.35;
    }

    // Subtle acoustic ring breathing & harmonic wave
    if (this.rings && this.ringOpacity > 0.01) {
      const time = this.clock.getElapsedTime();
      this.rings.forEach((ring) => {
        const wave = Math.sin(time * 1.4 + ring.userData.phase) * 0.012;
        const stagger = Math.max(0, Math.min(1, this.ringProgress * 1.45 - ring.userData.index * 0.14));
        const currentBase = 0.78 + stagger * 0.22 + this.portalProgress * (0.65 + ring.userData.index * 0.32);
        const finalScale = currentBase + wave * this.ringProgress;
        ring.scale.set(finalScale, finalScale, finalScale);
      });
    }

    // Kinetic Mouse Trajectory Animation
    if (this.currentModelKey === 'mouse' && this.mouseTrajectoryGroup) {
      const time = this.clock.getElapsedTime();

      // Mode 1: Sinuous elastic wave on Origin Trace line responding to cursor
      if (this.originTraceGeometry && this.mouseLineState.mode === 1) {
        const positions = this.originTraceGeometry.attributes.position.array;
        const count = positions.length / 3;
        this.mousePointerLag.x += (this.mouse.x - this.mousePointerLag.x) * 0.05;
        this.mousePointerLag.y += (this.mouse.y - this.mousePointerLag.y) * 0.05;

        for (let i = 0; i < count; i++) {
          const bx = this.originBasePositions[i * 3 + 0];
          const by = this.originBasePositions[i * 3 + 1];
          const bz = this.originBasePositions[i * 3 + 2];

          // Gaussian bell deflection near cursor X
          const cursor3DX = this.mousePointerLag.x * 2.2;
          const dist = Math.abs(bx - cursor3DX);
          const influence = Math.exp(-dist * dist * 1.6);

          const wave = Math.sin(time * 2.2 + bx * 1.4) * 0.022;
          const cursorDeflection = this.mousePointerLag.y * 0.14 * influence;

          positions[i * 3 + 1] = by + wave + cursorDeflection;
          positions[i * 3 + 2] = bz + Math.cos(time * 1.6 + bx) * 0.012;
        }
        this.originTraceGeometry.attributes.position.needsUpdate = true;
      }

      // Mode 2: Dynamic aerodynamic slipstream dash travel
      if (this.trajectorySplines && this.mouseLineState.mode === 2) {
        this.trajectorySplines.forEach((spline) => {
          if (spline.material.isLineDashedMaterial) {
            spline.material.dashOffset -= spline.userData.speed * 0.006;
          }
        });
      }

      // Mode 3: Smooth CAD reticle tracking
      if (this.reticleGroup && this.mouseLineState.mode === 3) {
        this.reticleGroup.position.x += (this.mouseReticleTarget.x - this.reticleGroup.position.x) * 0.12;
        this.reticleGroup.position.y += (this.mouseReticleTarget.y - this.reticleGroup.position.y) * 0.12;
      }
    }

    this.updateHotspots();
    this.renderer.render(this.scene, this.camera);
  }
}

// Scène 3D de Valmont (React Three Fiber). Chargée à la demande par CityHero.
// Repère : x et z vont de 0 à 12 (plan de la ville), y = hauteur.
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { dayFactor, duskFactor } from "./time";

const { damp, lerp } = THREE.MathUtils;
const UP = new THREE.Vector3(0, 1, 0);

/* Géométries partagées (une seule copie en mémoire) */
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const sphereGeo = new THREE.SphereGeometry(1, 18, 12);
const leafGeo = new THREE.IcosahedronGeometry(1, 1);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20);
const coneGeo = new THREE.ConeGeometry(1, 1, 20);
const torusGeo = new THREE.TorusGeometry(0.1, 0.02, 6, 18);
const capGeo = new THREE.CapsuleGeometry(0.07, 0.16, 4, 10);

/** Les 6 lieux cliquables, dans l'ordre des modules envoyés par Django. */
// anchor = point d'accroche de l'étiquette ; dx / stem = décalage et hauteur de la tige (px) ;
// cstem = hauteur de la tige sur mobile (les pastilles ne doivent pas se chevaucher).
const SPOTS = [
  { anchor: [2.5, 3.72, 2.2], dx: 0, stem: 22, cstem: 12, card: [200, 180], cx: 2.5, cz: 3.05, w: 3.7, d: 3.9 }, // gare -> Me déplacer (fiche décalée pour ne pas passer sous le menu)
  { anchor: [9.15, 0.75, 6.5], dx: 50, stem: 30, cstem: 6, cx: 9.1, cz: 6.5, w: 1.5, d: 1.0 }, //    chantier -> Signaler un problème
  { anchor: [7.3, 1.72, 8.9], dx: -34, stem: 26, cstem: 12, cx: 8, cz: 8.6, w: 2.9, d: 2.1 }, //     salle    -> Sortir à Valmont
  { anchor: [2.5, 0.2, 9.5], dx: 0, stem: 56, cstem: 14, cx: 2.5, cz: 9.5, w: 4.2, d: 4.2 }, //      parc     -> Observer un animal
  { anchor: [8.3, 1.1, 10.7], dx: 0, stem: 22, cstem: 10, cx: 8.05, cz: 10.8, w: 3.3, d: 1.8 }, //   marché   -> Acheter local
  { anchor: [7.95, 1.3, 4.55], dx: 44, stem: 26, cstem: 34, cx: 7.95, cz: 4.65, w: 1.9, d: 1.9 }, // boutique -> Mon espace vendeur
];

const Ctx = createContext(null);
const useCity = () => useContext(Ctx);

function makeMaterials() {
  const L = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  return {
    ground: L("#e3edd8"), base: L("#b7c9b1"), lawn: L("#c6e2b6"), plaza: L("#f2f0e3"), road: L("#fbfaf4"), dash: L("#c7d2c3"),
    river: L("#9dd6ca"), wall: L("#fbf9f0"), dark: L("#1d4a40"), roof: L("#0a8663"), lime: L("#c8f169"), coral: L("#f0906a"),
    cream: L("#fffefa"), yellow: L("#f4c95d"), ink: L("#173b33"), trunk: L("#7a5a44"),
    win: L("#2a5247", { emissive: "#ffd874", emissiveIntensity: 0 }),
    winOff: L("#2a5247"),
    bulb: L("#fffefa", { emissive: "#ffe6a0", emissiveIntensity: 0 }),
    glow: L("#fffefa", { emissive: "#ffe6a0", emissiveIntensity: 0 }),
    limeGlow: L("#c8f169", { emissive: "#c8f169", emissiveIntensity: 0 }),
    tree1: L("#2f8f68", { flatShading: true }), tree2: L("#5cb88a", { flatShading: true }),
    cloud: L("#ffffff", { transparent: true, opacity: 0.95, depthWrite: false }),
    hit: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  };
}

/* ------------------------------------------------------------------ */
/* Briques de base                                                     */
/* ------------------------------------------------------------------ */

/** Boîte définie par son coin (x, z), sa taille (w, d, h) et sa base y. */
function B({ x, z, w, d, h, y = 0, m, shadow = true }) {
  return (
    <mesh geometry={unitBox} material={m} position={[x + w / 2, y + h / 2, z + d / 2]} scale={[w, h, d]} castShadow={shadow} receiveShadow={shadow} />
  );
}

/** Fenêtres sur les façades : z/Z = faces avant/arrière, x/X = faces droite/gauche. */
function Windows({ x, z, w, d, cols, colsD = cols, rows = 1, y0, y1, faces = "zxZX", skip }) {
  const { M } = useCity();
  const rh = (y1 - y0) / rows;
  const out = [];
  for (const f of faces) {
    const alongX = f === "z" || f === "Z";
    const n = alongX ? cols : colsD;
    const cw = (alongX ? w : d) / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < rows; j++) {
        if (skip?.(f, i, j)) continue;
        const u = (i + 0.5) * cw;
        const y = y0 + (j + 0.5) * rh;
        const pos = f === "z" ? [x + u, y, z + d + 0.012] : f === "Z" ? [x + u, y, z - 0.012] : f === "x" ? [x + w + 0.012, y, z + u] : [x - 0.012, y, z + u];
        const sc = alongX ? [cw * 0.46, rh * 0.56, 0.03] : [0.03, rh * 0.56, cw * 0.46];
        const lit = (i * 7 + j * 13 + f.charCodeAt(0)) % 10 < 7;
        out.push(<mesh key={`${f}${i}-${j}`} geometry={unitBox} material={lit ? M.win : M.winOff} position={pos} scale={sc} />);
      }
  }
  return out;
}

function Tree({ x, z, s = 1 }) {
  const { M } = useCity();
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh geometry={cylGeo} material={M.trunk} position={[0, 0.3, 0]} scale={[0.04, 0.6, 0.04]} castShadow />
      <mesh geometry={leafGeo} material={M.tree1} position={[0, 0.86, 0]} scale={0.42} castShadow />
      <mesh geometry={leafGeo} material={M.tree2} position={[-0.1, 1.1, 0.1]} scale={0.25} />
    </group>
  );
}

function Lamp({ x, z, light = false }) {
  const { M, night } = useCity();
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={cylGeo} material={M.ink} position={[0, 0.45, 0]} scale={[0.022, 0.9, 0.022]} />
      <mesh geometry={sphereGeo} material={M.bulb} position={[0, 0.95, 0]} scale={0.075} />
      {light && <pointLight position={[0, 0.9, 0]} color="#ffcf80" intensity={night * 2.2} distance={4.5} decay={2} />}
    </group>
  );
}

function Pawn({ x, z, m }) {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={capGeo} material={m} position={[0, 0.16, 0]} castShadow />
      <mesh geometry={sphereGeo} material={m} position={[0, 0.4, 0]} scale={0.07} />
    </group>
  );
}

function Bike({ x, z }) {
  const { M } = useCity();
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
      <mesh geometry={torusGeo} material={M.roof} position={[-0.15, 0.12, 0]} />
      <mesh geometry={torusGeo} material={M.roof} position={[0.15, 0.12, 0]} />
      <mesh geometry={unitBox} material={M.roof} position={[0, 0.2, 0]} scale={[0.3, 0.025, 0.025]} />
      <mesh geometry={unitBox} material={M.ink} position={[-0.06, 0.27, 0]} scale={[0.09, 0.025, 0.05]} />
    </group>
  );
}

function Stall({ x, awning }) {
  const { M } = useCity();
  const fruits = [[0.25, M.coral], [0.45, M.lime], [0.65, M.yellow]];
  return (
    <group>
      <B x={x + 0.1} z={10.4} w={0.7} d={0.55} h={0.3} m={M.wall} />
      {fruits.map(([dx, m]) => (
        <mesh key={dx} geometry={sphereGeo} material={m} position={[x + dx, 0.36, 10.67]} scale={0.085} />
      ))}
      {[[0, 0], [0.9, 0], [0, 0.9], [0.9, 0.9]].map(([dx, dz]) => (
        <B key={`${dx}${dz}`} x={x + dx - 0.02} z={10.25 + dz - 0.02} w={0.04} d={0.04} h={0.9} m={M.ink} />
      ))}
      <B x={x - 0.05} z={10.2} w={1} d={1} h={0.1} y={0.9} m={awning} />
    </group>
  );
}

function Fox({ x, z, ry }) {
  const { M } = useCity();
  const box = (m, p, s, r) => <mesh geometry={unitBox} material={m} position={p} scale={s} rotation={r} castShadow />;
  return (
    <group position={[x, 0, z]} rotation-y={ry}>
      {box(M.coral, [0, 0.2, 0], [0.36, 0.15, 0.15])}
      {box(M.coral, [0.24, 0.28, 0], [0.15, 0.14, 0.14])}
      {box(M.cream, [0.33, 0.25, 0], [0.07, 0.06, 0.07])}
      {box(M.coral, [-0.27, 0.25, 0], [0.2, 0.09, 0.09], [0, 0, -0.5])}
      {box(M.cream, [-0.37, 0.31, 0], [0.07, 0.08, 0.08], [0, 0, -0.5])}
      {[-0.045, 0.045].map((dz) => (
        <mesh key={dz} geometry={coneGeo} material={M.ink} position={[0.22, 0.39, dz]} scale={[0.03, 0.08, 0.03]} />
      ))}
      {[[-0.12, -0.05], [-0.12, 0.05], [0.12, -0.05], [0.12, 0.05]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} geometry={unitBox} material={M.ink} position={[dx, 0.065, dz]} scale={[0.04, 0.13, 0.04]} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Éléments animés                                                     */
/* ------------------------------------------------------------------ */

function Bus() {
  const { M } = useCity();
  const g = useRef();
  useFrame(({ clock }) => (g.current.position.x = 4.1 + 3.6 * Math.sin(clock.elapsedTime * 0.25)));
  return (
    <group ref={g} position={[4, 0, 6.5]}>
      <mesh geometry={unitBox} material={M.lime} position={[0, 0.37, 0]} scale={[1.5, 0.5, 0.46]} castShadow />
      {[0.235, -0.235].map((dz) => (
        <mesh key={dz} geometry={unitBox} material={M.win} position={[0, 0.45, dz]} scale={[1.25, 0.2, 0.02]} />
      ))}
      {[[-0.45, 0.2], [0.45, 0.2], [-0.45, -0.2], [0.45, -0.2]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} geometry={cylGeo} material={M.ink} position={[dx, 0.13, dz]} rotation-x={Math.PI / 2} scale={[0.12, 0.08, 0.12]} />
      ))}
    </group>
  );
}

function Car() {
  const { M } = useCity();
  const g = useRef();
  useFrame(({ clock }) => (g.current.position.z = 5.6 + 5 * Math.sin(clock.elapsedTime * 0.25 + Math.PI / 2)));
  return (
    <group ref={g} position={[5.5, 0, 3]}>
      <mesh geometry={unitBox} material={M.coral} position={[0, 0.2, 0]} scale={[0.42, 0.24, 0.86]} castShadow />
      <mesh geometry={unitBox} material={M.win} position={[0, 0.38, 0]} scale={[0.36, 0.16, 0.46]} />
    </group>
  );
}

function Birds() {
  const { M } = useCity();
  const g = useRef();
  useFrame(({ clock }) => (g.current.rotation.y = clock.elapsedTime * 0.5));
  return (
    <group ref={g} position={[2.5, 2.9, 9.5]}>
      {[0, 2.1, 4.2].map((a, i) => (
        <group key={a} position={[Math.cos(a) * (1 + i * 0.25), i * 0.25, Math.sin(a) * (1 + i * 0.25)]} rotation-y={-a}>
          <mesh geometry={unitBox} material={M.ink} position={[0, 0, 0.07]} rotation-x={0.5} scale={[0.05, 0.015, 0.16]} />
          <mesh geometry={unitBox} material={M.ink} position={[0, 0, -0.07]} rotation-x={-0.5} scale={[0.05, 0.015, 0.16]} />
        </group>
      ))}
    </group>
  );
}

function Ducks() {
  const { M } = useCity();
  const g = useRef();
  useFrame(({ clock }) => (g.current.rotation.y = -clock.elapsedTime * 0.18));
  return (
    <group ref={g} position={[2.5, 0.08, 9.6]}>
      {[0, 2.4, 4.4].map((a, i) => (
        <group key={a} position={[Math.cos(a) * (0.45 + i * 0.15), 0, Math.sin(a) * (0.45 + i * 0.15)]} rotation-y={-a}>
          <mesh geometry={sphereGeo} material={M.cream} scale={[0.07, 0.055, 0.1]} />
          <mesh geometry={sphereGeo} material={M.cream} position={[0, 0.07, 0.07]} scale={0.04} />
          <mesh geometry={sphereGeo} material={M.coral} position={[0, 0.065, 0.115]} scale={0.02} />
        </group>
      ))}
    </group>
  );
}

function Clouds() {
  const { M } = useCity();
  const g = useRef();
  useFrame(({ clock }) => (g.current.position.x = Math.sin(clock.elapsedTime * 0.08) * 1.5));
  const puff = (p, s) => <mesh geometry={sphereGeo} material={M.cloud} position={p} scale={s} />;
  return (
    <group ref={g}>
      {puff([1.2, 0.9, 14.6], [0.8, 0.26, 0.45])}
      {puff([1.7, 1.03, 14.5], [0.5, 0.26, 0.36])}
      {puff([13.6, 4.6, 2.5], [0.7, 0.24, 0.4])}
      {puff([14, 4.72, 2.4], [0.45, 0.24, 0.32])}
    </group>
  );
}

function PulseRing({ x, z }) {
  const r = useRef();
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 2) / 2;
    r.current.scale.setScalar(0.6 + t * 1.3);
    r.current.material.opacity = (1 - t) * 0.8;
  });
  return (
    <mesh ref={r} position={[x, 0.07, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.42, 0.5, 40]} />
      <meshBasicMaterial color="#f0906a" transparent depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Lieu cliquable : se soulève et s'éclaire au survol                  */
/* ------------------------------------------------------------------ */

function Hot({ i, children }) {
  const { active, onOver, onOut, onPick } = useCity();
  const { cx, cz, w, d } = SPOTS[i];
  const g = useRef();
  const plate = useRef();
  const on = active === i;
  useFrame((_, dt) => {
    g.current.scale.setScalar(damp(g.current.scale.x, on ? 1.06 : 1, 9, dt));
    g.current.position.y = damp(g.current.position.y, on ? 0.14 : 0, 9, dt);
    plate.current.material.opacity = damp(plate.current.material.opacity, on ? 0.95 : 0, 9, dt);
  });
  return (
    <group>
      <mesh ref={plate} position={[cx, 0.055, cz]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w + 0.45, d + 0.45]} />
        <meshBasicMaterial color="#c8f169" transparent opacity={0} depthWrite={false} />
      </mesh>
      <group
        ref={g}
        position={[cx, 0, cz]}
        onPointerOver={(e) => (e.stopPropagation(), onOver(i))}
        onPointerOut={() => onOut(i)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return; // c'était un glisser, pas un clic
          onPick(i, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
        }}
      >
        <group position={[-cx, 0, -cz]}>{children}</group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* La ville                                                            */
/* ------------------------------------------------------------------ */

function City() {
  const { M } = useCity();
  const dashes = [];
  for (let i = 0; i < 12; i++) {
    if (i !== 5 && i !== 10) dashes.push(<B key={`h${i}`} x={i + 0.3} z={6.48} w={0.4} d={0.04} h={0.032} m={M.dash} shadow={false} />);
    if (i !== 6) dashes.push(<B key={`v${i}`} x={5.48} z={i + 0.3} w={0.04} d={0.4} h={0.032} m={M.dash} shadow={false} />);
  }
  const parkTrees = [[0.8, 7.8, 1.15], [1.9, 7.7, 0.9], [4.2, 7.8, 1.05], [0.8, 9.4, 1], [0.9, 11.1, 1.25], [2.2, 11.3, 0.95], [3.6, 11.2, 1.15], [4.3, 10.3, 0.9], [4.25, 8.9, 0.8]];
  const trees = [[0.5, 0.5, 1], [4.5, 0.6, 1.1], [4.55, 2.2, 0.85], [0.45, 2.4, 0.9], [0.4, 5.6, 0.9], [6.5, 3.6, 0.8], [9.6, 0.6, 1.05], [9.55, 3.4, 0.9], [9.6, 5.3, 0.8], [6.45, 0.5, 0.9], [11.5, 0.7, 1], [11.5, 2.3, 1.15], [11.55, 5.2, 0.9], [11.5, 8, 1.1], [11.45, 9.4, 0.85], [11.5, 11.3, 1.2], [9.65, 7.6, 0.8]];

  return (
    <>
      {/* Socle, rivière, routes */}
      <B x={0} z={0} w={12} d={12} h={0.75} y={-0.75} m={M.ground} />
      <B x={0} z={0} w={12} d={12} h={0.4} y={-1.15} m={M.base} />
      <B x={10} z={0} w={1} d={12} h={0.03} m={M.river} />
      <B x={10} z={12} w={1} d={0.03} h={0.75} y={-0.75} m={M.river} shadow={false} />
      <B x={10} z={-0.03} w={1} d={0.03} h={0.75} y={-0.75} m={M.river} shadow={false} />
      <B x={0} z={6} w={12} d={1} h={0.025} m={M.road} />
      <B x={5} z={0} w={1} d={12} h={0.026} m={M.road} />
      {dashes}
      <B x={9.9} z={6} w={1.2} d={1} h={0.11} m={M.wall} />
      <B x={9.9} z={5.96} w={1.2} d={0.05} h={0.3} m={M.wall} />
      <B x={9.9} z={6.99} w={1.2} d={0.05} h={0.3} m={M.wall} />
      <B x={0.5} z={3.7} w={4.1} d={1.9} h={0.035} m={M.plaza} />

      {/* 01 · Gare */}
      <Hot i={0}>
        <B x={0.8} z={1.2} w={3.4} d={2.2} h={1.6} m={M.wall} />
        <Windows x={0.8} z={1.2} w={3.4} d={2.2} cols={5} colsD={3} y0={0.45} y1={1.35} skip={(f, i) => f === "z" && i === 2} />
        <B x={2.2} z={3.39} w={0.6} d={0.04} h={0.95} m={M.roof} shadow={false} />
        <B x={0.68} z={1.08} w={3.64} d={2.44} h={0.16} y={1.6} m={M.roof} />
        <B x={2} z={1.7} w={1} d={1} h={1.75} y={1.76} m={M.wall} />
        <B x={1.9} z={1.6} w={1.2} d={1.2} h={0.16} y={3.51} m={M.lime} />
        <mesh geometry={cylGeo} material={M.glow} position={[2.5, 2.85, 2.71]} rotation-x={Math.PI / 2} scale={[0.3, 0.04, 0.3]} />
        <mesh geometry={unitBox} material={M.ink} position={[2.5, 2.93, 2.74]} scale={[0.03, 0.2, 0.02]} />
        <mesh geometry={unitBox} material={M.ink} position={[2.57, 2.83, 2.74]} scale={[0.15, 0.03, 0.02]} />
        <mesh geometry={cylGeo} material={M.glow} position={[3.01, 2.85, 2.2]} rotation-z={Math.PI / 2} scale={[0.3, 0.04, 0.3]} />
        <mesh geometry={unitBox} material={M.ink} position={[3.04, 2.93, 2.2]} scale={[0.02, 0.2, 0.03]} />
        <mesh geometry={unitBox} material={M.ink} position={[3.04, 2.83, 2.13]} scale={[0.02, 0.03, 0.15]} />
        <B x={0.75} z={4.15} w={3.2} d={0.08} h={0.22} m={M.lime} />
        {[0, 1, 2, 3, 4].map((n) => (
          <Bike key={n} x={1.1 + n * 0.62} z={4.55} />
        ))}
        <Pawn x={4.15} z={5.1} m={M.coral} />
        <Pawn x={3.6} z={5.3} m={M.ink} />
        <B x={0.7} z={1.1} w={3.7} d={3.9} h={1.7} m={M.hit} shadow={false} />
      </Hot>

      {/* 02 · Signalement : nid-de-poule, cône, barrière */}
      <Hot i={1}>
        <mesh geometry={cylGeo} material={M.ink} position={[8.75, 0.035, 6.6]} scale={[0.24, 0.02, 0.2]} />
        <B x={8.97} z={6.32} w={0.36} d={0.36} h={0.04} y={0.03} m={M.coral} />
        <mesh geometry={coneGeo} material={M.coral} position={[9.15, 0.28, 6.5]} scale={[0.15, 0.42, 0.15]} castShadow />
        <mesh geometry={cylGeo} material={M.cream} position={[9.15, 0.27, 6.5]} scale={[0.074, 0.07, 0.074]} />
        <B x={9.5} z={6.18} w={0.05} d={0.05} h={0.42} m={M.ink} />
        <B x={9.5} z={6.78} w={0.05} d={0.05} h={0.42} m={M.ink} />
        <B x={9.49} z={6.18} w={0.07} d={0.65} h={0.13} y={0.25} m={M.coral} />
        <B x={9.485} z={6.4} w={0.08} d={0.2} h={0.132} y={0.249} m={M.cream} shadow={false} />
        <PulseRing x={9.15} z={6.5} />
        <B x={8.4} z={6} w={1.4} d={1} h={0.8} m={M.hit} shadow={false} />
      </Hot>

      {/* 03 · Salle de spectacle */}
      <Hot i={2}>
        <B x={6.7} z={7.7} w={2.6} d={1.8} h={1.5} m={M.dark} />
        <B x={6.6} z={7.6} w={2.8} d={2} h={0.16} y={1.5} m={M.coral} />
        <B x={6.7} z={9.5} w={2.6} d={0.04} h={0.32} y={0.86} m={M.limeGlow} shadow={false} />
        {Array.from({ length: 12 }, (_, n) => (
          <mesh key={n} geometry={sphereGeo} material={M.bulb} position={[6.82 + n * 0.215, 0.8, 9.56]} scale={0.045} />
        ))}
        <B x={7.6} z={9.5} w={0.8} d={0.03} h={0.68} m={M.glow} shadow={false} />
        <Windows x={6.7} z={7.7} w={2.6} d={1.8} cols={4} colsD={3} y0={0.5} y1={1.2} faces="xXZ" />
        <Pawn x={8.7} z={10.02} m={M.ink} />
        <Pawn x={8.2} z={9.9} m={M.coral} />
        <Pawn x={7.3} z={9.95} m={M.lime} />
      </Hot>

      {/* 04 · Parc */}
      <Hot i={3}>
        <B x={0.4} z={7.4} w={4.2} d={4.2} h={0.04} m={M.lawn} />
        <mesh geometry={cylGeo} material={M.river} position={[2.5, 0.055, 9.6]} scale={[1.25, 0.03, 1.25]} receiveShadow />
        {parkTrees.map(([x, z, s]) => (
          <Tree key={`${x}-${z}`} x={x} z={z} s={s} />
        ))}
        <B x={3.3} z={8.5} w={0.6} d={0.18} h={0.06} y={0.14} m={M.trunk} />
        <B x={3.33} z={8.52} w={0.05} d={0.14} h={0.14} m={M.ink} />
        <B x={3.82} z={8.52} w={0.05} d={0.14} h={0.14} m={M.ink} />
        <Fox x={3.75} z={10.55} ry={-0.6} />
        <Ducks />
        <Birds />
        <Pawn x={3.1} z={8.95} m={M.ink} />
        <Pawn x={1.5} z={8.5} m={M.coral} />
        <B x={0.4} z={7.4} w={4.2} d={4.2} h={0.45} m={M.hit} shadow={false} />
      </Hot>

      {/* 05 · Marché */}
      <Hot i={4}>
        <B x={6.4} z={9.9} w={3.3} d={1.8} h={0.035} m={M.plaza} />
        <Stall x={6.6} awning={M.coral} />
        <Stall x={7.8} awning={M.lime} />
        <Stall x={9} awning={M.cream} />
        <Pawn x={7.45} z={11.45} m={M.coral} />
        <Pawn x={8.75} z={11.5} m={M.ink} />
        <Pawn x={6.9} z={11.55} m={M.lime} />
        <B x={6.4} z={10.1} w={3.3} d={1.6} h={1} m={M.hit} shadow={false} />
      </Hot>

      {/* 06 · Boutique du vendeur */}
      <Hot i={5}>
        <B x={7.1} z={3.9} w={1.7} d={1.3} h={1.1} m={M.wall} />
        <B x={7.02} z={3.82} w={1.86} d={1.46} h={0.14} y={1.1} m={M.lime} />
        <B x={7.3} z={5.19} w={0.45} d={0.04} h={0.72} m={M.dark} shadow={false} />
        <B x={7.95} z={5.19} w={0.65} d={0.04} h={0.44} y={0.28} m={M.win} shadow={false} />
        <mesh geometry={unitBox} material={M.coral} position={[7.95, 0.86, 5.42]} rotation-x={0.5} scale={[1.7, 0.04, 0.52]} castShadow />
        <Windows x={7.1} z={3.9} w={1.7} d={1.3} cols={3} colsD={2} y0={0.3} y1={0.9} faces="xXZ" />
      </Hot>

      {/* Décor : mairie, maison, arbres, lampadaires */}
      <B x={6.9} z={0.9} w={2.3} d={2.1} h={2.4} m={M.wall} />
      <Windows x={6.9} z={0.9} w={2.3} d={2.1} cols={3} rows={3} y0={0.3} y1={2.25} />
      <B x={6.8} z={0.8} w={2.5} d={2.3} h={0.16} y={2.4} m={M.dark} />
      <mesh geometry={cylGeo} material={M.ink} position={[8.05, 3.06, 1.95]} scale={[0.02, 1, 0.02]} />
      <B x={8.07} z={1.94} w={0.5} d={0.02} h={0.28} y={3.26} m={M.coral} />
      <B x={11.15} z={3.4} w={0.7} d={0.9} h={0.8} m={M.wall} />
      <Windows x={11.15} z={3.4} w={0.7} d={0.9} cols={2} y0={0.2} y1={0.65} />
      <B x={11.08} z={3.33} w={0.84} d={1.04} h={0.12} y={0.8} m={M.roof} />
      {trees.map(([x, z, s]) => (
        <Tree key={`${x}-${z}`} x={x} z={z} s={s} />
      ))}
      <Lamp x={4.8} z={5.85} light />
      <Lamp x={6.2} z={7.15} light />
      <Lamp x={1.6} z={7.15} light />
      <Lamp x={9.7} z={5.85} light />
      <Lamp x={4.8} z={10.6} light />
      <Lamp x={6.2} z={2.2} light />
      <Bus />
      <Car />
      <Clouds />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Étiquettes HTML accrochées aux lieux                                */
/* ------------------------------------------------------------------ */

const stop = (e) => e.stopPropagation();

function Label({ i, mod, info }) {
  const { active, compact, dark, onOver, onOut, onPick, onEnter } = useCity();
  const on = active === i;
  const num = `0${i + 1}`;
  const line = dark ? "bg-lime" : "bg-green";

  // La pastille reste toujours affichée ; la fiche détaillée s'ajoute au-dessus au survol.
  const card =
    on && !compact ? (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        onMouseEnter={() => onOver(i)}
        onMouseLeave={() => onOut(i)}
        className={`pointer-events-auto w-64 rounded-3xl p-5 text-left shadow-[0_26px_60px_rgb(11_42_35/0.38)] ${dark ? "bg-paper text-deep" : "bg-deep text-paper"}`}
      >
        <p className={`text-[11px] font-bold tracking-[0.14em] uppercase ${dark ? "text-green" : "text-lime"}`}>
          {num}
          {info ? ` · ${info}` : ""}
        </p>
        <h3 className="mt-1 font-serif text-[1.75rem] leading-tight font-medium">{mod.label}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed opacity-70">{mod.desc}</p>
        <button
          type="button"
          onClick={(e) => onEnter(i, { x: e.clientX, y: e.clientY })}
          className={`group mt-3.5 inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold ${dark ? "bg-green text-paper" : "bg-lime text-deep"}`}
        >
          Entrer <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
        </button>
      </motion.div>
    ) : null;

  const pill = (
      <button
        type="button"
        aria-label={mod.label}
        onMouseEnter={() => onOver(i)}
        onMouseLeave={() => onOut(i)}
        onClick={(e) => onPick(i, { x: e.clientX, y: e.clientY })}
        className={`pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full border text-[13px] font-semibold whitespace-nowrap shadow-[0_8px_22px_rgb(21_54_46/0.18)] transition-transform hover:scale-105 ${
          compact ? "p-1" : "py-1.5 pr-3.5 pl-1.5"
        } ${dark ? "border-white/15 bg-[#12382f] text-paper" : "border-line bg-paper text-ink"}`}
      >
        <b
          className={`grid place-items-center rounded-full text-[10.5px] ${compact ? "size-7" : "size-6"} ${
            on ? "bg-lime text-deep" : dark ? "bg-[#1f5a4b] text-lime" : "bg-mint text-green"
          }`}
        >
          {num}
        </b>
        {!compact && mod.label}
      </button>
  );
  const shift = compact ? undefined : `translateX(${SPOTS[i].dx}px)`;

  return (
    <Html position={SPOTS[i].anchor} zIndexRange={[on ? 45 : 40, 10]} style={{ pointerEvents: "none" }}>
      {/* Les clics sur l'étiquette ne doivent pas atteindre la scène 3D située derrière. */}
      <div className="flex w-max -translate-x-1/2 -translate-y-full flex-col items-center font-sans" onClick={stop} onPointerDown={stop} onPointerUp={stop} onPointerMove={stop}>
        {card && <div className="mb-2" style={{ transform: SPOTS[i].card ? `translate(${SPOTS[i].card[0]}px, ${SPOTS[i].card[1]}px)` : shift }}>{card}</div>}
        <div style={{ transform: shift }}>{pill}</div>
        <span className={`w-0.5 opacity-60 ${line}`} style={{ height: compact ? SPOTS[i].cstem : SPOTS[i].stem }} />
        <span className={`-mt-px size-2 rounded-full ${line}`} />
      </div>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Lumière (suit l'heure), caméra et rotation                          */
/* ------------------------------------------------------------------ */

function Lights({ hour }) {
  const day = dayFactor(hour);
  const n = 1 - day;
  const k = duskFactor(hour);
  const t = Math.min(1, Math.max(0, (hour - 6) / 12));
  const sun = new THREE.Color("#fff3df").lerp(new THREE.Color("#ff9f6e"), k * 0.75).lerp(new THREE.Color("#8fc6ff"), n);
  const amb = new THREE.Color("#ffffff").lerp(new THREE.Color("#ffd2b8"), k * 0.5).lerp(new THREE.Color("#3f9aa0"), n);
  // Le soleil passe de la gauche (matin) à la droite (soir) : les ombres tournent avec l'heure.
  const pos = [lerp(lerp(-8, 10, t), -5, n), lerp(5 + 8 * Math.sin(t * Math.PI), 11, n), lerp(lerp(10, -3, t), 7, n)];
  return (
    <>
      <ambientLight color={amb} intensity={lerp(2.0, 1.3, n)} />
      <directionalLight castShadow color={sun} intensity={lerp(2.1, 0.8, n)} position={pos} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.04}>
        <orthographicCamera attach="shadow-camera" args={[-11, 11, 11, -11, 0.5, 50]} />
      </directionalLight>
    </>
  );
}

function World({ rot, focus, zoom, compact, reduced, children }) {
  const g = useRef();
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const fit = Math.min(size.width / (compact ? 18.5 : 27.5), size.height / (compact ? 11.5 : 17.2));
    camera.zoom = damp(camera.zoom, fit * zoom * (focus ? 2.2 : 1), focus ? 3.5 : 5, dt);
    camera.updateProjectionMatrix();

    const sway = focus || reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.25) * 0.05;
    g.current.rotation.y = damp(g.current.rotation.y, rot.current + sway, 6, dt);

    // Au clic, la caméra se recentre sur le lieu choisi.
    if (focus) target.set(focus.cx - 6, 0, focus.cz - 6).applyAxisAngle(UP, g.current.rotation.y).multiplyScalar(-1).setY(-0.8);
    else target.set(0, compact ? -0.5 : -2, 0);
    g.current.position.x = damp(g.current.position.x, target.x, 4, dt);
    g.current.position.y = damp(g.current.position.y, target.y, 4, dt);
    g.current.position.z = damp(g.current.position.z, target.z, 4, dt);
  });
  return (
    <group ref={g} position={[0, compact ? -0.5 : -2, 0]}>
      <group position={[-6, 0, -6]}>{children}</group>
    </group>
  );
}

function GroundShadow() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, "rgba(11,42,35,.55)");
    grad.addColorStop(1, "rgba(11,42,35,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[6, -1.2, 6]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[25, 25]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0.55} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */

export default function CityScene({ hour, modules, info, active, entering, zoom, compact, dark, rot, paused, reduced, onOver, onOut, onPick, onEnter, onMiss, onReady }) {
  const M = useMemo(makeMaterials, []);
  const night = 1 - dayFactor(hour);

  useEffect(() => {
    M.win.emissiveIntensity = night * 1.25;
    M.bulb.emissiveIntensity = 0.1 + night * 1.5;
    M.glow.emissiveIntensity = night * 1.1;
    M.limeGlow.emissiveIntensity = night * 0.7;
    M.cloud.opacity = (1 - night) * 0.95;
  }, [M, night]);
  useEffect(() => () => Object.values(M).forEach((m) => m.dispose()), [M]);

  const ctx = { M, night, active, compact, dark, onOver, onOut, onPick, onEnter };

  return (
    <Canvas
      shadows
      flat
      orthographic
      dpr={[1, 1.75]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: [20, 16.33, 20], zoom: 26, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={onReady}
      onPointerMissed={onMiss}
    >
      <Ctx.Provider value={ctx}>
        <Lights hour={hour} />
        <World rot={rot} focus={entering == null ? null : SPOTS[entering]} zoom={zoom} compact={compact} reduced={reduced}>
          <GroundShadow />
          <City />
          {modules.slice(0, SPOTS.length).map((mod, i) => (entering == null ? <Label key={mod.label} i={i} mod={mod} info={info[i]} /> : null))}
        </World>
      </Ctx.Provider>
    </Canvas>
  );
}

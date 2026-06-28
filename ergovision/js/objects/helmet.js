import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * createHelmet()
 *
 * Builds a realistic full-face motorcycle helmet procedurally using
 * multiple SphereGeometry sections that naturally wrap around the
 * ErgoVision Shield visor opening.
 *
 * Architecture
 * ─────────────
 *  ① Crown cap      — full 360° from top to just above the visor
 *  ② Back / side    — partial arc covering the non-visor area at
 *                     visor height  (phi: phiEnd → phiStart+2π)
 *  ③ Chin guard     — full 360° below the visor → full-face look
 *  ④ Inner liner    — same sections, smaller radius, BackSide → thickness
 *  ⑤ Visor brow     — TubeGeometry tracing the exact visor perimeter
 *  ⑥ Neck trim      — partial tube along the helmet's bottom edge
 *
 * @param {Object} visorParams  { radius, phiStart, phiLength, thetaStart, thetaLength }
 * @param {number} offsetX      World-space X offset (0 = ErgoVision, -12 = Conventional)
 */
export function createHelmet(visorParams, offsetX = 0) {
    const group = new THREE.Group();
    group.name = 'Helmet';

    // ── materials ─────────────────────────────────────────────────────
    const shellMat = new THREE.MeshStandardMaterial({
        color: 0x0f0f0f,
        roughness: 0.70,
        metalness: 0.05,
        envMapIntensity: 0.4,
    });
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x1a1410,   // warm dark brown — looks like interior foam/liner
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.BackSide,
    });
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0x080808,
        roughness: 0.80,
        metalness: 0.18,
    });

    // ── visor parameters ──────────────────────────────────────────────
    const { radius, phiStart, phiLength, thetaStart, thetaLength } = visorParams;

    // Outer shell sits just outside the visor sphere
    const R  = radius + 0.50;
    // Inner liner (creates perceived shell thickness)
    const Ri = R - 0.42;

    const phiEnd      = phiStart + phiLength;
    const thetaEnd    = thetaStart + thetaLength;

    // phi arc that covers the BACK (everything except the visor opening)
    const backPhiStart = phiEnd;
    const backPhiLen   = Math.PI * 2.0 - phiLength;

    // ── ① Crown cap — full 360°, crown to just above visor opening ───
    const crownGeo  = new THREE.SphereGeometry(R,  72, 30, 0, Math.PI * 2, 0, thetaStart + 0.06);
    const crownIGeo = new THREE.SphereGeometry(Ri, 72, 30, 0, Math.PI * 2, 0, thetaStart + 0.06);

    // ── ② Back / side shell at visor height (partial phi) ────────────
    // Goes from theta just inside the crown cap down to near the neck
    const sideThetaLen = Math.PI * 0.88 - thetaStart;
    const backGeo  = new THREE.SphereGeometry(R,  64, 30, backPhiStart, backPhiLen, thetaStart + 0.04, sideThetaLen);
    const backIGeo = new THREE.SphereGeometry(Ri, 64, 30, backPhiStart, backPhiLen, thetaStart + 0.04, sideThetaLen);

    // ── ③ Chin guard — full 360°, covers below-visor zone ───────────
    // Overlaps slightly with piece ② so there are no seam gaps at the sides
    const chinThetaStart = thetaEnd - 0.10;
    const chinThetaLen   = Math.PI * 0.88 - chinThetaStart;
    const chinGeo  = new THREE.SphereGeometry(R,  72, 26, 0, Math.PI * 2, chinThetaStart, chinThetaLen);
    const chinIGeo = new THREE.SphereGeometry(Ri, 72, 26, 0, Math.PI * 2, chinThetaStart, chinThetaLen);

    // ── merge & add outer shell ───────────────────────────────────────
    const shellGeo = BufferGeometryUtils.mergeGeometries([crownGeo, backGeo, chinGeo]);
    shellGeo.computeVertexNormals();
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.castShadow  = true;
    shellMesh.receiveShadow = true;
    group.add(shellMesh);

    // ── merge & add inner liner ───────────────────────────────────────
    const linerGeo = BufferGeometryUtils.mergeGeometries([crownIGeo, backIGeo, chinIGeo]);
    linerGeo.computeVertexNormals();
    group.add(new THREE.Mesh(linerGeo, innerMat));

    // ── ④ Visor brow frame — TubeGeometry tracing visor perimeter ────
    // Uses the same coordinate formula as visor.js for perfect alignment
    function visorEdgePts(r, segs) {
        const pts = [];
        const pt  = (phi, theta) => pts.push(new THREE.Vector3(
            -r * Math.cos(phi) * Math.sin(theta),
             r * Math.cos(theta),
             r * Math.sin(phi) * Math.sin(theta)
        ));
        // top edge  (left → right)
        for (let i = 0;  i <= segs; i++) pt(phiStart + (i / segs) * phiLength, thetaStart);
        // right edge (top → bottom)
        for (let i = 1;  i <= segs; i++) pt(phiEnd, thetaStart + (i / segs) * thetaLength);
        // bottom edge (right → left)
        for (let i = 1;  i <= segs; i++) pt(phiEnd - (i / segs) * phiLength, thetaEnd);
        // left edge  (bottom → top, open)
        for (let i = 1;  i <  segs; i++) pt(phiStart, thetaEnd - (i / segs) * thetaLength);
        return pts;
    }

    const browPts = visorEdgePts(R + 0.06, 32);

    if (browPts.length >= 4) {

        const browCurve = new THREE.CatmullRomCurve3(
            browPts.filter(p => p instanceof THREE.Vector3),
            true
        );

        const browGeo = new THREE.TubeGeometry(
            browCurve,
            160,
            0.28,
            8,
            true
        );

        const browMesh = new THREE.Mesh(browGeo, rimMat);

        browMesh.castShadow = true;

        group.add(browMesh);

    }

    // ── ⑤ Neck / bottom trim — tube along the helmet's lower edge ────
    const neckTheta = Math.PI * 0.88;
    const neckPts   = [];
    const neckSegs  = 72;
    for (let i = 0; i <= neckSegs; i++) {
        const phi = backPhiStart + (i / neckSegs) * backPhiLen;
        neckPts.push(new THREE.Vector3(
            -R * Math.cos(phi) * Math.sin(neckTheta),
             R * Math.cos(neckTheta),
             R * Math.sin(phi) * Math.sin(neckTheta)
        ));
    }
    if (neckPts.length >= 4) {

        const neckCurve = new THREE.CatmullRomCurve3(
            neckPts.filter(p => p instanceof THREE.Vector3),
            false
        );

        const neckGeo = new THREE.TubeGeometry(
            neckCurve,
            90,
            0.24,
            8,
            false
        );

        group.add(new THREE.Mesh(neckGeo, rimMat));

    }
    // ── small chin-bottom arc on the front ───────────────────────────
    const chinBottomPts = [];
    const cbSegs = 28;
    for (let i = 0; i <= cbSegs; i++) {
        const phi = phiStart + (i / cbSegs) * phiLength;
        chinBottomPts.push(new THREE.Vector3(
            -R * Math.cos(phi) * Math.sin(neckTheta),
             R * Math.cos(neckTheta),
             R * Math.sin(phi) * Math.sin(neckTheta)
        ));
    }
    if (chinBottomPts.length >= 4) {

        const cbCurve = new THREE.CatmullRomCurve3(
            chinBottomPts.filter(p => p instanceof THREE.Vector3),
            false
        );

        const cbGeo = new THREE.TubeGeometry(
            cbCurve,
            40,
            0.24,
            8,
            false
        );

        group.add(new THREE.Mesh(cbGeo, rimMat));

    }

    // ── position & tilt to match visor assembly ───────────────────────
    group.position.set(offsetX, 0, 0);
    group.rotation.x = -0.15;   // identical to ergoGroup / conventionalGroup tilt

    return group;
}

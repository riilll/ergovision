import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export function createHelmet(visorParams, offsetX = 0) {
    const group = new THREE.Group();
    group.name = 'Helmet';

    const shellMat = new THREE.MeshStandardMaterial({
        color: 0x121212, roughness: 0.85, metalness: 0.15, side: THREE.FrontSide
    });
    const innerMat = new THREE.MeshStandardMaterial({
        color: 0x1a1410, roughness: 0.95, side: THREE.BackSide
    });
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0x050505, roughness: 0.8, metalness: 0.2
    });

    const { radius, phiStart, phiLength, thetaStart, thetaLength } = visorParams;
    const R = radius + 0.4; // Ketebalan batok
    const Ri = R - 0.35;    // Ketebalan busa
    const helmetThetaStart = thetaStart + 0.28;
    function deformHelmet(geometry) {

    const pos = geometry.attributes.position;

    for (let i = 0; i < pos.count; i++) {

        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // ==========================
        // TOP
        // ==========================
        // Turunkan bagian atas agar tidak seperti bola
        if (y > R * 0.45) {
            y *= 0.82;
        }

        // ==========================
        // SIDE
        // ==========================
        // Sedikit lebih lebar
        x *= 0.85;

        // ==========================
        // FRONT
        // ==========================
        // Area depan sedikit maju
        if (z > 0) {
            z *= 0.81;
        }
        
        // ==========================
        // BACK
        // ==========================
        // Belakang agak memanjang
        if (z < 0) {
            z *= 0.81;
        }

        // ==========================
        // LOWER
        // ==========================
        // Bawah sedikit mengecil
        if (y < -R * 0.25) {
            x *= 0.92;
        }

        pos.setXYZ(i, x, y, z);
    }

    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    return geometry;
}
    // Kalkulasi area yang TIDAK ditutupi visor (untuk membentuk batok helm)
    const phiEnd = phiStart + phiLength;
    const backPhiStart = phiEnd;
    const backPhiLength = Math.PI * 2.0 - phiLength;
    const chinExtension = 0.08; // Ekstensi area dagu/leher bawah

    // 1. BATOK ATAS (Dari ubun-ubun sampai batas atas visor)
    const domeGeo = deformHelmet(new THREE.SphereGeometry(R, 64, 32, 0, Math.PI * 2, 0, helmetThetaStart));
    const domeInner = deformHelmet(new THREE.SphereGeometry(Ri, 64, 32, 0, Math.PI * 2, 0, helmetThetaStart));

    // 2. BATOK BELAKANG & SAMPING (Membungkus area belakang kepala dan pipi)
    const backGeo = deformHelmet(new THREE.SphereGeometry(R, 64, 32, backPhiStart, backPhiLength, thetaStart, thetaLength + chinExtension));
    const backInner = deformHelmet(new THREE.SphereGeometry(Ri, 64, 32, backPhiStart, backPhiLength, thetaStart, thetaLength + chinExtension));

    // Gabungkan batok luar
    const shellGeo = BufferGeometryUtils.mergeGeometries([domeGeo, backGeo]);
    
    shellGeo.computeVertexNormals();
    group.add(new THREE.Mesh(shellGeo, shellMat));

    // Gabungkan batok dalam
    const innerGeo = BufferGeometryUtils.mergeGeometries([domeInner, backInner]);
    innerGeo.computeVertexNormals();
    group.add(new THREE.Mesh(innerGeo, innerMat));

    // 3. LIST KARET PINGGIRAN (Menelusuri potongan wajah secara presisi)
    const rimPts = [];
    const segs = 32;
    // Garis Dahi
    for(let i=0; i<=segs; i++) rimPts.push(new THREE.Vector3(-R*Math.cos(phiStart + (i/segs)*phiLength)*Math.sin(thetaStart), R*Math.cos(thetaStart), R*Math.sin(phiStart + (i/segs)*phiLength)*Math.sin(thetaStart)));
    // Garis Pipi Kanan
    for(let i=1; i<=segs; i++) rimPts.push(new THREE.Vector3(-R*Math.cos(phiEnd)*Math.sin(thetaStart + (i/segs)*(thetaLength+chinExtension)), R*Math.cos(thetaStart + (i/segs)*(thetaLength+chinExtension)), R*Math.sin(phiEnd)*Math.sin(thetaStart + (i/segs)*(thetaLength+chinExtension))));
    // Garis Rahang Bawah
    //for(let i=1; i<=segs; i++) rimPts.push(new THREE.Vector3(-R*Math.cos(phiEnd - (i/segs)*phiLength)*Math.sin(thetaStart + thetaLength + chinExtension), R*Math.cos(thetaStart + thetaLength + chinExtension), R*Math.sin(phiEnd - (i/segs)*phiLength)*Math.sin(thetaStart + thetaLength + chinExtension)));
    // Garis Pipi Kiri
    for(let i=1; i<segs; i++) rimPts.push(new THREE.Vector3(-R*Math.cos(phiStart)*Math.sin(thetaStart + thetaLength + chinExtension - (i/segs)*(thetaLength+chinExtension)), R*Math.cos(thetaStart + thetaLength + chinExtension - (i/segs)*(thetaLength+chinExtension)), R*Math.sin(phiStart)*Math.sin(thetaStart + thetaLength + chinExtension - (i/segs)*(thetaLength+chinExtension))));
    
    const rimCurve = new THREE.CatmullRomCurve3(rimPts, false);
    const rimGeo = new THREE.TubeGeometry(rimCurve, 128, 0.1, 10, false);
    //group.add(new THREE.Mesh(rimGeo, rimMat));

    group.position.set(offsetX, 0, 0);
    group.rotation.x = -0.15;
    return group;
}
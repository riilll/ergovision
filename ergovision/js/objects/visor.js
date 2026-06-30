import * as THREE from 'three';

export function createVisors(scene) {
    // ----------------------------------------------------------------
    // MATERIALS
    // ----------------------------------------------------------------
    const materialProps = {
        transmission: 0.55,
        roughness: 0.06,
        metalness: 0.0,
        transparent: true,
        side: THREE.DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        ior: 1.53
    };
    const hydrophobicMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0x2DAFFF, opacity: 0.22, thickness: 0.30 });
    const outerPCMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0x75CFFF, opacity: 0.72, transmission: 0.45, thickness: 1.5 });
    const innerPCMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xE8F4FF, opacity: 0.48, thickness: 1.2 });
    const antiFogMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0x7EE6B0, opacity: 0.20, thickness: 0.03 });
    const conventionalMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xf0f0f0, opacity: 0.4, thickness: 1.5, clearcoat: 0.8 });
    
    const sealMat = new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f0,      
        transmission: 0.25,   
        opacity: 0.85,        
        transparent: true,
        roughness: 0.6,       
        metalness: 0.0,
        thickness: 0.4,       
        clearcoat: 0.05
    });

    // ----------------------------------------------------------------
    // GEOMETRY PARAMS (Helmet stays original, Visor is adjusted to fit)
    // ----------------------------------------------------------------
    // Parameter yang akan dikirim ke helmet.js (dipertahankan agar helm tidak berubah)
    const radius = 9;
    const widthSegments = 64;
    const heightSegments = 32;
    const phiStart = Math.PI * 0.67;
    const phiLength = Math.PI * 0.66;
    const thetaStart = Math.PI * 0.27;
    const thetaLength = Math.PI * 0.43;

    // Parameter KHUSUS VISOR: Sedikit diperlebar agar masuk presisi ke dalam bukaan helm
    const vRadius = 8.3; 
    const vPhiStart = Math.PI * 0.65;
    const vPhiLength = Math.PI * 0.65;
    const vThetaStart = Math.PI * 0.33;
    const vThetaLength = Math.PI * 0.47;

    function deformVisor(geo) {

    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {

        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        if (y < -5.2) {

    const t = Math.min((-5.2 - y) / 2.0, 1);

    y += 1.6 * t;
    z += 0.8 * t;

}
            // Ratakan bagian bawah visor
if (y < -4.5) {

    const t = Math.min((-3.5 - y) / 2.0, 1);

    // Angkat sedikit
    y += 1.8 * t;

    // Kurangi lengkungan bawah
    z += 0.8 * t;
}
        // Bentuk dasar
        z *= 0.95;
        x *= 1.01;

        if (y > 3)
            y *= 0.98;

        // ==========================
        // PERBAIKAN PROFIL SAMPING
        // ==========================

        // hanya bagian kiri-kanan visor
        const side = Math.abs(x);

        if (side > 5.8) {

            const t = Math.min((side - 5.8) / 2.2, 1);

            // sisi dibuat lebih tegak
            x *= (1.0 - 0.10 * t);

            // tarik ke belakang
            z -= 0.1 * t;

            // sedikit turun agar mengikuti helm
            y -= 0.25 * t;
        }

        pos.setXYZ(i, x, y, z);

    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
}
 
    // ----------------------------------------------------------------
    // ERGOVISION SHIELD
    // ----------------------------------------------------------------
    const ergoGroup = new THREE.Group();
    
    // Coating sangat rapat dengan Polycarbonate
    const hydroGeo = deformVisor(new THREE.SphereGeometry(vRadius + 0.02, widthSegments, heightSegments, vPhiStart, vPhiLength, vThetaStart, vThetaLength));
    const hydroMesh = new THREE.Mesh(hydroGeo, hydrophobicMat);
    hydroMesh.name = "Hydrophobic Coating";
    
    const baseGeo = deformVisor(new THREE.SphereGeometry(vRadius, widthSegments, heightSegments, vPhiStart, vPhiLength, vThetaStart, vThetaLength));
    const outerMesh = new THREE.Mesh(baseGeo, outerPCMat);
    outerMesh.name = "Outer Polycarbonate";
    outerMesh.castShadow = true;
    
    // Thermal gap
    const innerRadius = vRadius - 0.3;
    const innerGeo = deformVisor(new THREE.SphereGeometry(innerRadius, widthSegments, heightSegments, vPhiStart, vPhiLength, vThetaStart, vThetaLength));
    const innerMesh = new THREE.Mesh(innerGeo, innerPCMat);
    innerMesh.name = "Inner Polycarbonate";

    const fogGeo = deformVisor(new THREE.SphereGeometry(innerRadius - 0.02, widthSegments, heightSegments, vPhiStart, vPhiLength, vThetaStart, vThetaLength));
    const fogMesh = new THREE.Mesh(fogGeo, antiFogMat);
    fogMesh.name = "Anti Fog Coating";

    function getVisorEdgePoints(r, segments, zOffset) {
        const points = [];
        for(let i = 0; i <= segments; i++) points.push(new THREE.Vector3(-r * Math.cos(vPhiStart + (i/segments)*vPhiLength) * Math.sin(vThetaStart), r * Math.cos(vThetaStart), r * Math.sin(vPhiStart + (i/segments)*vPhiLength) * Math.sin(vThetaStart) + zOffset));
        for(let i = 1; i <= segments; i++) points.push(new THREE.Vector3(-r * Math.cos(vPhiStart + vPhiLength) * Math.sin(vThetaStart + (i/segments)*vThetaLength), r * Math.cos(vThetaStart + (i/segments)*vThetaLength), r * Math.sin(vPhiStart + vPhiLength) * Math.sin(vThetaStart + (i/segments)*vThetaLength) + zOffset));
        for(let i = 1; i < segments; i++) points.push(new THREE.Vector3(-r * Math.cos(vPhiStart) * Math.sin(vThetaStart + vThetaLength - (i/segments)*vThetaLength), r * Math.cos(vThetaStart + vThetaLength - (i/segments)*vThetaLength), r * Math.sin(vPhiStart) * Math.sin(vThetaStart + vThetaLength - (i/segments)*vThetaLength) + zOffset));
        
        // Terapkan deformasi pada seal agar menempel erat di pinggir
        return points.map(pt => {
            let z = pt.z * 0.96;
            let x = pt.x * 1.01;
            let y = pt.y;
            if (y > 3) y *= 0.98;
            return new THREE.Vector3(x, y, z);
        });
    }

    const edgePoints = getVisorEdgePoints(vRadius - 0.15, 32, 0); 
    const sealPath = new THREE.CatmullRomCurve3(edgePoints, false);
    const sealGeo = new THREE.TubeGeometry(sealPath, 128, 0.12, 8, false);
    const sealMesh = new THREE.Mesh(sealGeo, sealMat);
    sealMesh.name = "Silicone Edge Seal";

    ergoGroup.add(hydroMesh, outerMesh, innerMesh, fogMesh);
    ergoGroup.position.set(0.9, -0.5, 0);
    ergoGroup.rotation.x = -0.15; 

    // ----------------------------------------------------------------
    // CONVENTIONAL VISOR
    // ----------------------------------------------------------------
    const conventionalGroup = new THREE.Group();
    const convMesh = new THREE.Mesh(baseGeo, conventionalMat);
    convMesh.name = "Conventional Visor";
    convMesh.castShadow = true;
    
    conventionalGroup.add(convMesh);
    conventionalGroup.visible = false; 
    conventionalGroup.position.set(-12, 0, 0);
    conventionalGroup.rotation.x = -0.15;

    scene.add(ergoGroup);
    scene.add(conventionalGroup);

    return {
        ergo: ergoGroup,
        conventional: conventionalGroup,
        layers: { hydro: hydroMesh, outer: outerMesh, inner: innerMesh, antiFog: fogMesh, seal: sealMesh },
        params: { radius, phiStart, phiLength, thetaStart, thetaLength, vRadius, vPhiStart, vPhiLength, vThetaStart, vThetaLength } // Export parameter original untuk helmet
    };
}
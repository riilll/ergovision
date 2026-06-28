import * as THREE from 'three';

export function createVisors(scene) {
    // ----------------------------------------------------------------
    // MATERIALS
    // ----------------------------------------------------------------
    const materialProps = {
        transmission: 1.0,
        roughness: 0.02,
        metalness: 0.1,
        transparent: true,
        side: THREE.DoubleSide,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        ior: 1.58 // Polycarbonate index of refraction
    };

    // ErgoVision Materials - highly transparent with slight premium blue-gray tint
    const hydrophobicMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xf4f9fb, opacity: 0.2, thickness: 0.01 });
    const outerPCMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xe8eef2, opacity: 0.1, thickness: 1.5 });
    const innerPCMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xf5f5f5, opacity: 0.1, thickness: 1.0 });
    const antiFogMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xf0fdf0, opacity: 0.1, thickness: 0.01 });
    
    // Conventional Material - slightly more distorted/tinted
    const conventionalMat = new THREE.MeshPhysicalMaterial({ ...materialProps, color: 0xf0f0f0, opacity: 0.4, thickness: 1.5, clearcoat: 0.8 });
    
    // Silicone Seal Material
    const sealMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8, metalness: 0.2 });

    // ----------------------------------------------------------------
    // GEOMETRY (Realistic Spherical Visor Shape)
    // ----------------------------------------------------------------
    const radius = 9;
    const widthSegments = 64;
    const heightSegments = 32;
    
    // Wider horizontal wrap and slightly taller vertical profile for a real helmet look
    const phiStart = Math.PI * 0.60;
    const phiLength = Math.PI * 0.80;
    const thetaStart = Math.PI * 0.32;
    const thetaLength = Math.PI * 0.36;

    const baseGeo = new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
    baseGeo.computeVertexNormals();

    // ----------------------------------------------------------------
    // ERGOVISION SHIELD (Right/Center)
    // ----------------------------------------------------------------
    const ergoGroup = new THREE.Group();
    
    // 1. Hydrophobic Coating (Outermost)
    const hydroGeo = new THREE.SphereGeometry(radius + 0.05, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
    const hydroMesh = new THREE.Mesh(hydroGeo, hydrophobicMat);
    hydroMesh.name = "Hydrophobic Coating";
    
    // 2. Outer Polycarbonate
    const outerMesh = new THREE.Mesh(baseGeo, outerPCMat);
    outerMesh.name = "Outer Polycarbonate";
    outerMesh.castShadow = true;
    
    // 4. Inner Polycarbonate (0.4mm gap)
    const innerRadius = radius - 0.4;
    const innerGeo = new THREE.SphereGeometry(innerRadius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
    const innerMesh = new THREE.Mesh(innerGeo, innerPCMat);
    innerMesh.name = "Inner Polycarbonate";

    // 5. Anti-Fog Coating (Innermost)
    const fogGeo = new THREE.SphereGeometry(innerRadius - 0.05, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
    const fogMesh = new THREE.Mesh(fogGeo, antiFogMat);
    fogMesh.name = "Anti Fog Coating";

    // 6. Silicone Edge Seal (Border between outer and inner)
    // We create a CatmullRomCurve3 path along the exact edges of the visor geometry
    function getVisorEdgePoints(r, segments, zOffset) {
        const points = [];
        // Top edge
        for(let i = 0; i <= segments; i++) {
            const phi = phiStart + (i / segments) * phiLength;
            const theta = thetaStart;
            points.push(new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) + zOffset));
        }
        // Right edge
        for(let i = 1; i <= segments; i++) {
            const phi = phiStart + phiLength;
            const theta = thetaStart + (i / segments) * thetaLength;
            points.push(new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) + zOffset));
        }
        // Bottom edge
        for(let i = 1; i <= segments; i++) {
            const phi = phiStart + phiLength - (i / segments) * phiLength;
            const theta = thetaStart + thetaLength;
            points.push(new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) + zOffset));
        }
        // Left edge
        for(let i = 1; i < segments; i++) { 
            const phi = phiStart;
            const theta = thetaStart + thetaLength - (i / segments) * thetaLength;
            points.push(new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta) + zOffset));
        }
        return points;
    }

    const edgePoints = getVisorEdgePoints(radius - 0.2, 32, 0); // Position exactly between outer and inner
    const sealPath = new THREE.CatmullRomCurve3(edgePoints, true);
    // Seal thickness covers the 0.4 gap
    const sealGeo = new THREE.TubeGeometry(sealPath, 128, 0.28, 8, true);
    const sealMesh = new THREE.Mesh(sealGeo, sealMat);
    sealMesh.name = "Silicone Edge Seal";

    ergoGroup.add(hydroMesh, outerMesh, innerMesh, fogMesh, sealMesh);
    
    // Adjust ErgoGroup Default Position and tilt for premium presentation
    ergoGroup.position.set(0, 0, 0);
    ergoGroup.rotation.x = -0.15; // slight tilt

    // ----------------------------------------------------------------
    // CONVENTIONAL VISOR (Left for Compare Mode)
    // ----------------------------------------------------------------
    const conventionalGroup = new THREE.Group();
    
    const convMesh = new THREE.Mesh(baseGeo, conventionalMat);
    convMesh.name = "Conventional Visor";
    convMesh.castShadow = true;
    
    conventionalGroup.add(convMesh);
    
    // Initially hidden
    conventionalGroup.visible = false;
    conventionalGroup.position.set(-12, 0, 0);
    conventionalGroup.rotation.x = -0.15;

    // Add to scene
    scene.add(ergoGroup);
    scene.add(conventionalGroup);

    return {
        ergo: ergoGroup,
        conventional: conventionalGroup,
        layers: {
            hydro: hydroMesh,
            outer: outerMesh,
            inner: innerMesh,
            antiFog: fogMesh,
            seal: sealMesh
        },
        params: {
            radius, phiStart, phiLength, thetaStart, thetaLength
        }
    };
}
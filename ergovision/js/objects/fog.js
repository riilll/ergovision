import * as THREE from 'three';

export class FogSystem {
    constructor(scene, visors) {
        this.scene = scene;
        this.visors = visors;
        this.active = false;
        
        this.initFogLayer();
    }

    initFogLayer() {
        // Create a fog layer specifically inside the conventional visor
        const radius = 8.8; // Slightly smaller than base radius 9
        const widthSegments = 64;
        const heightSegments = 32;
        const phiStart = Math.PI * 0.65;
        const phiLength = Math.PI * 0.7;
        const thetaStart = Math.PI * 0.35;
        const thetaLength = Math.PI * 0.28;

        const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength);
        
        this.fogMaterial = new THREE.MeshBasicMaterial({
            color: 0xdddddd,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.fogMesh = new THREE.Mesh(geo, this.fogMaterial);
        
        // Add to the conventional group so it moves with it
        this.visors.conventional.add(this.fogMesh);
    }

    toggle(active) {
        this.active = active;
        if (!active) {
            this.fogMaterial.opacity = 0;
        }
    }

    update() {
        if (!this.active) return;
        
        // Slowly increase fog opacity on the conventional visor
        if (this.fogMaterial.opacity < 0.6) {
            this.fogMaterial.opacity += 0.002;
        }
    }
}

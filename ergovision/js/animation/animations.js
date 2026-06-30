
import * as THREE from 'three';

export class AnimationController {
    constructor(camera, controls, visors, uiManager, helmets = {}) {
        this.camera = camera;
        this.controls = controls;
        this.visors = visors;
        this.uiManager = uiManager;
        this.helmets = helmets;

        this.explodeSpacing = 1.6; // Diperbesar agar Thermal Air Gap terlihat jelas
        this.controls.autoRotateSpeed = 0.7;
        
        this.defaultVisorPosition = new THREE.Vector3(this.visors.ergo.position.x, this.visors.ergo.position.y, this.visors.ergo.position.z);
        this.defaultVisorRotation = new THREE.Euler(this.visors.ergo.rotation.x, this.visors.ergo.rotation.y, this.visors.ergo.rotation.z);
    }

    animateToHome() {
        if(this.helmets.ergo) this.helmets.ergo.visible = true;
        if(this.helmets.conventional) this.helmets.conventional.visible = false;
        this.resetExploded();
        this._hideConventional();
        this.controls.autoRotate = true;

        gsap.to(this.camera.position, { x: -1, y: 1.5, z: 20, duration: 1.6, ease: 'power2.inOut', onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.6, ease: 'power2.inOut' });
        
        gsap.to(this.visors.ergo.position, { x: this.defaultVisorPosition.x, y: this.defaultVisorPosition.y, z: this.defaultVisorPosition.z, duration: 1 });
        gsap.to(this.visors.ergo.rotation, { x: this.defaultVisorRotation.x, y: this.defaultVisorRotation.y, z: this.defaultVisorRotation.z, duration: 1 });
    }

    animateToRain() {
        if(this.helmets.ergo) this.helmets.ergo.visible = true;
        if(this.helmets.conventional) this.helmets.conventional.visible = false;
        this.resetExploded();
        this._hideConventional();
        this.controls.autoRotate = false;

        gsap.to(this.camera.position, { x: 0, y: 1.3, z: 15, duration: 1.5, ease: "power2.inOut", onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { x: 0, y: -0.5, z: 4, duration: 1.5, ease: 'power2.inOut' });
        
        gsap.to(this.visors.ergo.position, { x: this.defaultVisorPosition.x, y: this.defaultVisorPosition.y, z: this.defaultVisorPosition.z, duration: 1 });
        gsap.to(this.visors.ergo.rotation, { x: this.defaultVisorRotation.x, y: this.defaultVisorRotation.y, z: this.defaultVisorRotation.z, duration: 1 });
    }

    animateToExploded() {
        this._hideConventional();
        if(this.helmets.ergo) this.helmets.ergo.visible = false;
        if(this.helmets.conventional) this.helmets.conventional.visible = false;
        this.controls.autoRotate = false;
        
        const S = this.explodeSpacing;
        const layers = this.visors.layers;

        gsap.to(this.visors.ergo.position, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power2.inOut" });
        
        // Memutar visor ke samping sedikit agar sparasi Sumbu-Z terlihat jelas dari Front Camera
        gsap.to(this.visors.ergo.rotation, { x: -0.12, y: -0.45, z: 0, duration: 1.2, ease: "power2.inOut" });

        Object.values(layers).forEach(layer => gsap.killTweensOf(layer.position));

        // Lapisan HANYA berpindah di Sumbu Z lokal. X dan Y dikunci di 0.
        const targets = [
            { mesh: layers.hydro,   x: 0, y: 0, z: S * 1.05, delay: 0 },    // Menempel pada Outer
            { mesh: layers.outer,   x: 0, y: 0, z: S * 1.0,  delay: 0 },    // Jarak lebar (Air Gap)
            { mesh: layers.seal,    x: 0, y: 0, z: 0,        delay: 0.1 },  // Posisi tengah
            { mesh: layers.inner,   x: 0, y: 0, z: -S * 1.0, delay: 0.2 },  // Jarak lebar (Air Gap)
            { mesh: layers.antiFog, x: 0, y: 0, z: -S * 1.05,delay: 0.2 }   // Menempel pada Inner
        ];

        targets.forEach(({ mesh, x, y, z, delay }) => {
            gsap.to(mesh.position, { x, y, z, duration: 1.3, ease: "power2.out", delay });
        });

        // Posisi Front Camera
        gsap.to(this.camera.position, { x: 0, y: 1.2, z: 15, duration: 1.5, ease: "power2.inOut", onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });

        setTimeout(() => { if (this.uiManager) this.uiManager.showLabels(layers); }, 1100);
    }

    animateToCompare() {
        this.resetExploded();
        this.controls.autoRotate = false;
        if(this.helmets.ergo) this.helmets.ergo.visible = true;
        if(this.helmets.conventional) this.helmets.conventional.visible = true;
        this.visors.conventional.visible = true;

        gsap.to(this.camera.position, { x: -5, y: 1, z: 22, duration: 1.5, ease: 'power2.inOut', onUpdate: () => this.controls.update() });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });
        gsap.to(this.visors.ergo.rotation, { x: -0.12, y: 0, z: 0, duration: 1.2, ease: "power2.inOut" });
    }

    resetExploded() {
        const layers = this.visors.layers;
        Object.values(layers).forEach(layer => gsap.killTweensOf(layer.position));

        // Mengunci X, Y, Z ke posisi 0 untuk presisi mutlak tanpa drifting
        Object.values(layers).forEach(mesh => {
            gsap.to(mesh.position, { x: 0, y: 0, z: 0, duration: 1 });
        });

        if (this.uiManager) this.uiManager.hideLabels();
    }

    _hideConventional() {
        this.visors.conventional.visible = false;
        if (this.helmets.conventional) this.helmets.conventional.visible = false;
        if (this.helmets.ergo) this.helmets.ergo.visible = true;
    }
}
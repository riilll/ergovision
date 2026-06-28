/**
 * AnimationController
 *
 * Manages all GSAP-driven camera transitions and object animations
 * for the four interaction modes: HOME, RAIN, EXPLODED, COMPARE.
 *
 * Exploded mode separates visor layers along the forward (Z) axis
 * with staggered delays so each layer peels away visibly.
 * The helmet group is NOT referenced here — it never moves.
 */
export class AnimationController {
    constructor(camera, controls, visors, uiManager) {
        this.camera   = camera;
        this.controls = controls;
        this.visors   = visors;
        this.uiManager = uiManager;

        // Spacing between exploded layers (world units)
        this.explodeSpacing = 2.6;

        // Idle rotation speed for HOME mode
        this.controls.autoRotateSpeed = 0.7;
    }

    // ================================================================
    //  HOME
    // ================================================================
    animateToHome() {
        this.resetExploded();
        this._hideConventional();
        this.controls.autoRotate = true;

        gsap.to(this.camera.position, {
            x: -1, y: 1.5, z: 20,
            duration: 1.6,
            ease: 'power2.inOut',
            onUpdate: () => this.controls.update(),
        });
        gsap.to(this.controls.target, {
            x: 0, y: 0, z: 0,
            duration: 1.6,
            ease: 'power2.inOut',
        });
    }

    // ================================================================
    //  RAIN
    // ================================================================
    animateToRain() {
        this.resetExploded();
        this._hideConventional();
        this.controls.autoRotate = false;

        // Close-up front view — audience can see individual droplets
        gsap.to(this.camera.position, {
            x: 1, y: 0.5, z: 9.5,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => this.controls.update(),
        });
        gsap.to(this.controls.target, {
            x: 0, y: -0.5, z: 4,
            duration: 1.5,
            ease: 'power2.inOut',
        });
    }

    // ================================================================
    //  EXPLODED
    // ================================================================
    animateToExploded() {
        this._hideConventional();
        this.controls.autoRotate = false;

        const S = this.explodeSpacing;
        const layers = this.visors.layers;

        // Layer Z offsets (front → back, along positive Z = toward viewer)
        // hydro (outermost) → farthest toward viewer
        // antiFog (innermost) → farthest away
        const targets = [
            { mesh: layers.hydro,   z:  S * 2.5, delay: 0.00 },
            { mesh: layers.outer,   z:  S * 1.5, delay: 0.08 },
            { mesh: layers.seal,    z:  S * 0.5, delay: 0.16 },
            { mesh: layers.inner,   z: -S * 0.5, delay: 0.24 },
            { mesh: layers.antiFog, z: -S * 1.5, delay: 0.32 },
        ];

        targets.forEach(({ mesh, z, delay }) => {
            gsap.to(mesh.position, {
                z,
                duration: 1.6,
                ease: 'power2.inOut',
                delay,
            });
        });

        // Camera: step back and slightly to the side so all layers
        // are visible and the explode depth reads clearly
        gsap.to(this.camera.position, {
            x: 12, y: 2, z: 20,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => this.controls.update(),
        });
        gsap.to(this.controls.target, {
            x: 0, y: 0, z: 0,
            duration: 1.5,
            ease: 'power2.inOut',
        });

        // Show layer labels after animation settles
        setTimeout(() => this.uiManager.showLabels(layers), 1100);
    }

    // ================================================================
    //  COMPARE
    // ================================================================
    animateToCompare() {
        this.resetExploded();
        this.controls.autoRotate = false;
        this.visors.conventional.visible = true;

        // Centre between the two visors
        // ErgoVision at x=0, Conventional at x=-12 → midpoint x=-6
        gsap.to(this.camera.position, {
            x: -5, y: 1, z: 22,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => this.controls.update(),
        });
        gsap.to(this.controls.target, {
            x: -6, y: 0, z: 0,
            duration: 1.5,
            ease: 'power2.inOut',
        });
    }

    // ================================================================
    //  HELPERS
    // ================================================================
    resetExploded() {
        const layers = this.visors.layers;
        const duration = 1.1;
        const ease = 'power2.inOut';

        Object.values(layers).forEach(mesh => {
            gsap.to(mesh.position, { z: 0, duration, ease });
        });

        this.uiManager.hideLabels();
    }

    _hideConventional() {
        this.visors.conventional.visible = false;
    }
}

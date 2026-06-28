import * as THREE from 'three';

/**
 * Realistic Rain Simulation for ErgoVision Shield demo.
 *
 * Architecture:
 *  - Falling Rain   : InstancedMesh of thin cylinder streaks
 *  - Surface Drops  : InstancedMesh of sphere-based teardrops on the visor
 *  - Trails         : Sub-pool within surface drops, flagged isTrail=true
 *  - Splashes       : InstancedMesh of billboard rings on impact
 *
 * Teardrop physics:
 *  Moving drops are scaled non-uniformly per frame:
 *    scaleY  grows with speed  → elongation under gravity
 *    scaleXZ shrinks as scaleY grows → conservation of volume look
 *    wobble   (sine) → continuous organic deformation
 */
export class RainSystem {
    constructor(scene, visors) {
        this.scene   = scene;
        this.visors  = visors;
        this.active  = false;
        this.intensity = 0; // 0‥1, animated externally by GSAP

        // ── visor sphere parameters (must match visor.js) ──────────
        this.visorRadius = 9.0;
        this.phiStart    = Math.PI * 0.60;
        this.phiLength   = Math.PI * 0.80;
        this.thetaStart  = Math.PI * 0.32;
        this.thetaLength = Math.PI * 0.36;

        // Conventional visor center offset
        this.convOffsetX = -12;

        this.dummy = new THREE.Object3D();
        this._time = 0;

        this._initFallingRain();
        this._initSurfaceDroplets();
        this._initSplashes();
    }

    // ================================================================
    //  INIT
    // ================================================================
    _initFallingRain() {
        this.maxFalling = 2500;

        // Thin rain streak — very elongated cylinder
        const geo = new THREE.CylinderGeometry(0.012, 0.018, 1.4, 4, 1);
        geo.rotateX(Math.PI); // tip points down
        geo.translate(0, -0.7, 0); // pivot at top

        const mat = new THREE.MeshBasicMaterial({
            color: 0xc8d4de,
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
        });

        this.fallingMesh = new THREE.InstancedMesh(geo, mat, this.maxFalling);
        this.fallingMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.fallingMesh.visible = false;

        this.rainData = Array.from({ length: this.maxFalling }, () => ({
            x: (Math.random() - 0.5) * 60,
            y: 20 + Math.random() * 30,
            z: (Math.random() - 0.5) * 40,
            speed:  0.9 + Math.random() * 0.9,
            windX: -0.03 - Math.random() * 0.04,
            len:    0.7 + Math.random() * 0.9,  // visual length scale
        }));

        this.scene.add(this.fallingMesh);
    }

    _initSurfaceDroplets() {
        this.maxDroplets = 2200;

        // Low-poly sphere — scaled per-instance to form teardrops
        const geo = new THREE.SphereGeometry(0.09, 10, 8);
        // Slightly flatten the base (bottom half) by scaling Y
        // We'll handle real shaping per-instance via the matrix

        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xddeeff,
            transmission: 0.92,
            transparent: true,
            opacity: 0.88,
            roughness: 0.04,
            ior: 1.333,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            reflectivity: 0.5,
            envMapIntensity: 1.2,
        });

        this.dropletMesh = new THREE.InstancedMesh(geo, mat, this.maxDroplets);
        this.dropletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.dropletMesh.count = 0;

        /** @type {Array<Object>} */
        this.drops = Array.from({ length: this.maxDroplets }, () => ({ active: false }));

        this.scene.add(this.dropletMesh);
    }

    _initSplashes() {
        this.maxSplashes = 400;

        // Ring geometry for splash ring animation
        const geo = new THREE.RingGeometry(0.05, 0.18, 16);

        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.splashMesh = new THREE.InstancedMesh(geo, mat, this.maxSplashes);
        this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.splashMesh.count = 0;

        this.splashes = Array.from({ length: this.maxSplashes }, () => ({ active: false }));
        this.scene.add(this.splashMesh);
    }

    // ================================================================
    //  PUBLIC API
    // ================================================================
    toggle(active) {
        this.active = active;
        this.fallingMesh.visible = active;
        if (!active) {
            this.drops.forEach(d => d.active = false);
            this.splashes.forEach(s => s.active = false);
            this.dropletMesh.count = 0;
            this.splashMesh.count = 0;
        } else {
            this.dropletMesh.count = this.maxDroplets;
            this.splashMesh.count = this.maxSplashes;
        }
    }

    // ================================================================
    //  COLLISION / COORDINATE HELPERS
    // ================================================================
    /** Returns {phi, theta} if (x,y,z) lies on the visor sphere segment, else false. */
    _visorCoords(x, y, z) {
        const R = Math.sqrt(x * x + y * y + z * z);
        if (R < 0.001) return false;
        const theta = Math.acos(Math.max(-1, Math.min(1, y / R)));
        let phi = Math.atan2(z, -x);
        if (phi < 0) phi += Math.PI * 2;

        if (theta  > this.thetaStart - 0.08  &&
            theta  < this.thetaStart + this.thetaLength + 0.08 &&
            phi    > this.phiStart   - 0.08  &&
            phi    < this.phiStart   + this.phiLength   + 0.08) {
            return { phi, theta };
        }
        return false;
    }

    /**
     * Check if world-space falling drop hits a visor.
     * Returns { hit, isErgo } or { hit: false }.
     */
    _checkRainCollision(x, y, z) {
        const R2  = this.visorRadius * this.visorRadius;
        const tol = 22;

        // ErgoVision (centered at origin)
        const d2e = x * x + y * y + z * z;
        if (Math.abs(d2e - R2) < tol) {
            const coords = this._visorCoords(x, y, z);
            if (coords) return { hit: true, isErgo: true, coords };
        }

        // Conventional (offset)
        if (this.visors.conventional.visible) {
            const cx = x - this.convOffsetX;
            const d2c = cx * cx + y * y + z * z;
            if (Math.abs(d2c - R2) < tol) {
                const coords = this._visorCoords(cx, y, z);
                if (coords) return { hit: true, isErgo: false, coords };
            }
        }

        return { hit: false };
    }

    // ================================================================
    //  SPAWNING
    // ================================================================
    _spawnDrop(isErgo, phi, theta, size = 0, isTrail = false) {
        // Find first inactive slot
        for (let i = 0; i < this.maxDroplets; i++) {
            if (!this.drops[i].active) {
                const d = this.drops[i];
                d.active   = true;
                d.isErgo   = isErgo;
                d.isTrail  = isTrail;
                d.phi      = phi + (Math.random() - 0.5) * 0.03;
                d.theta    = theta;
                d.rnd      = Math.random() * Math.PI * 2; // per-drop randomisation
                d.age      = 0;

                if (isTrail) {
                    d.size  = size > 0 ? size : 0.15 + Math.random() * 0.2;
                    d.speed = 0;
                    d.life  = isErgo ? 0.25 + Math.random() * 0.3 : 0.8 + Math.random() * 0.6;
                } else if (isErgo) {
                    // Hydrophobic — compact teardrop, slides fast
                    d.size  = size > 0 ? size : 0.28 + Math.random() * 0.45;
                    d.speed = 0.0055 + d.size * 0.008 + Math.random() * 0.002;
                    d.life  = 1.0;
                } else {
                    // Conventional — large flat smear, sticky
                    d.size  = size > 0 ? size : 0.6  + Math.random() * 1.1;
                    d.speed = 0.0008 + Math.random() * 0.0012;
                    d.life  = 1.0;
                }
                return i;
            }
        }
        return -1; // pool full
    }

    _spawnSplash(x, y, z) {
        for (let i = 0; i < this.maxSplashes; i++) {
            if (!this.splashes[i].active) {
                const s = this.splashes[i];
                s.active = true;
                s.x = x; s.y = y; s.z = z;
                s.life = 1.0;
                // Face the incoming rain direction (approximately outward from sphere)
                s.nx = x; s.ny = y; s.nz = z; // surface normal direction
                return;
            }
        }
    }

    // ================================================================
    //  UPDATE (called every frame)
    // ================================================================
    update() {
        if (!this.active) return;
        this._time += 0.016; // approx 60 fps dt

        const activeCount = Math.floor(this.maxFalling * this.intensity);

        // ── 1. FALLING RAIN ─────────────────────────────────────────
        for (let i = 0; i < this.maxFalling; i++) {
            const r = this.rainData[i];

            if (i >= activeCount) {
                // Hide inactive instances far below scene
                this.dummy.position.set(0, -200, 0);
                this.dummy.scale.setScalar(0.001);
                this.dummy.updateMatrix();
                this.fallingMesh.setMatrixAt(i, this.dummy.matrix);
                continue;
            }

            const prevY = r.y;
            r.y -= r.speed;
            r.x += r.windX;

            // Check visor collision in the relevant zone
            if (prevY > -6 && r.y <= 6) {
                const col = this._checkRainCollision(r.x, r.y, r.z);
                if (col.hit) {
                    this._spawnDrop(col.isErgo, col.coords.phi, col.coords.theta);
                    if (Math.random() < 0.4) this._spawnSplash(r.x, r.y, r.z);
                    // Reset drop to top
                    r.y = 20 + Math.random() * 25;
                    r.x = (Math.random() - 0.5) * 60;
                }
            }

            if (r.y < -14) {
                r.y = 20 + Math.random() * 25;
                r.x = (Math.random() - 0.5) * 60;
            }

            this.dummy.position.set(r.x, r.y, r.z);
            this.dummy.scale.set(1, r.len, 1);
            this.dummy.rotation.set(0, 0, -0.08); // slight wind tilt
            this.dummy.updateMatrix();
            this.fallingMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.fallingMesh.instanceMatrix.needsUpdate = true;

        // ── 2. SURFACE DROPLETS ──────────────────────────────────────
        const Rsurf = this.visorRadius + 0.06;
        const t = this._time;

        for (let i = 0; i < this.maxDroplets; i++) {
            const d = this.drops[i];

            if (!d.active) {
                // park out of view
                this.dummy.position.set(0, -200, 0);
                this.dummy.scale.setScalar(0.001);
                this.dummy.updateMatrix();
                this.dropletMesh.setMatrixAt(i, this.dummy.matrix);
                continue;
            }

            d.age++;

            // ── trail droplets just fade & shrink ──
            if (d.isTrail) {
                d.life -= d.isErgo ? 0.045 : 0.008;
                if (d.life <= 0) { d.active = false; continue; }
                d.size  *= 0.97;
            } else {
                // ── slide down (theta increases → lower on visor) ──
                d.theta += d.speed;

                // ── slight lateral drift ──
                d.phi   += (Math.random() - 0.5) * 0.0008;

                // ── organic size wobble ──
                d.size  += Math.sin(t * 3.5 + d.rnd) * 0.0012;
                d.size   = Math.max(0.1, d.size);

                // ── merge with nearby drops ──
                for (let j = Math.max(0, i - 50); j < i; j++) {
                    const o = this.drops[j];
                    if (!o.active || o.isErgo !== d.isErgo || o.isTrail) continue;
                    const dt = d.theta - o.theta;
                    const dp = d.phi   - o.phi;
                    const mergeThresh = 0.0012 * (d.size + o.size);
                    if (dt * dt + dp * dp < mergeThresh) {
                        // absorb d into o → o grows, gets faster
                        o.size  = Math.min(o.size + d.size * 0.6, d.isErgo ? 2.2 : 5.0);
                        o.speed = d.isErgo
                            ? (0.005 + o.size * 0.009)
                            : (0.001 + Math.random() * 0.0018);
                        d.active = false;
                        break;
                    }
                }

                if (!d.active) continue;

                // ── spawn trail behind large moving drops ──
                if (d.size > 0.6 && Math.random() < (d.isErgo ? 0.12 : 0.45)) {
                    this._spawnDrop(d.isErgo, d.phi, d.theta - 0.018, d.size * 0.28, true);
                }
            }

            // ── falls off the bottom edge of visor ──
            if (d.theta > this.thetaStart + this.thetaLength + 0.04) {
                d.active = false;
                continue;
            }

            // ── 3D position on sphere surface ──
            const sinT = Math.sin(d.theta);
            const cosT = Math.cos(d.theta);
            const sinP = Math.sin(d.phi);
            const cosP = Math.cos(d.phi);

            const lx = -Rsurf * cosP * sinT;
            const ly =  Rsurf * cosT;
            const lz =  Rsurf * sinP * sinT;

            const bx = d.isErgo ? 0 : this.convOffsetX;
            this.dummy.position.set(bx + lx, ly, lz);

            // ── orient normal to sphere surface (outward) ──
            // lookAt the point twice as far out = sphere normal direction
            this.dummy.up.set(0, 1, 0);
            this.dummy.lookAt(bx + lx * 2, ly * 2, lz * 2);

            // ── teardrop / smear scaling ──
            if (d.isErgo) {
                // Compact hydrophobic bead → elongates as it accelerates
                const stretch  = d.isTrail
                    ? (0.6 + d.life * 0.4)
                    : (1.0 + d.speed * 90 + Math.sin(t * 4 + d.rnd) * 0.12);
                const compress = d.isTrail ? 1.0 : Math.max(0.5, 1.0 - d.speed * 25);
                const depth    = d.isTrail ? 0.5 : 0.7;
                this.dummy.scale.set(
                    d.size * compress,          // width
                    d.size * stretch,           // height (along slide direction)
                    d.size * compress * depth   // depth into visor
                );
            } else {
                // Conventional — flat wide smear with long tail
                const stretch  = d.isTrail
                    ? (0.8 + d.life * 0.6)
                    : (1.8 + d.speed * 250 + Math.sin(t * 2 + d.rnd) * 0.2);
                const spread   = d.isTrail ? 1.0 : 1.6 + d.size * 0.3;
                this.dummy.scale.set(
                    d.size * spread,
                    d.size * stretch,
                    d.size * 0.08   // almost flat on surface
                );
            }

            this.dummy.updateMatrix();
            this.dropletMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.dropletMesh.instanceMatrix.needsUpdate = true;

        // ── 3. SPLASHES ──────────────────────────────────────────────
        for (let i = 0; i < this.maxSplashes; i++) {
            const s = this.splashes[i];
            if (!s.active) {
                this.dummy.position.set(0, -200, 0);
                this.dummy.scale.setScalar(0.001);
                this.dummy.updateMatrix();
                this.splashMesh.setMatrixAt(i, this.dummy.matrix);
                continue;
            }

            s.life -= 0.06;
            if (s.life <= 0) { s.active = false; continue; }

            const progress = 1.0 - s.life;
            const sc = progress * 2.2;
            this.dummy.position.set(s.x, s.y, s.z);
            // Face outward from sphere center
            this.dummy.lookAt(s.x * 2, s.y * 2, s.z * 2);
            this.dummy.scale.set(sc, sc, 1);
            this.dummy.updateMatrix();
            this.splashMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.splashMesh.instanceMatrix.needsUpdate = true;
    }
}
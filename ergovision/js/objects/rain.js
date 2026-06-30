import * as THREE from 'three';

/**
 * Realistic Rain Simulation for ErgoVision Shield demo.
 *
 * Architecture:
 * - Falling Rain   : InstancedMesh of thin cylinder streaks
 * - Surface Drops  : InstancedMesh of sphere-based teardrops on the visor
 * - Trails         : Sub-pool within surface drops, flagged isTrail=true
 * - Splashes       : InstancedMesh of billboard rings on impact
 */
export class RainSystem {
    constructor(scene, visors) {
        this.scene   = scene;
        this.visors  = visors;
        this.active  = false;
        this.intensity = 0; // 0‥1, animated externally by GSAP

        // ── visor sphere parameters (DIUBAH KE 9.15 AGAR PAS DENGAN VISOR.JS) ──────────
        const p = visors.params;

this.visorRadius = p.vRadius ?? p.radius;

this.phiStart = p.vPhiStart ?? p.phiStart;
this.phiLength = p.vPhiLength ?? p.phiLength;

this.thetaStart = p.vThetaStart ?? p.thetaStart;
this.thetaLength = p.vThetaLength ?? p.thetaLength;

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

        const geo = new THREE.CylinderGeometry(0.012, 0.018, 1.4, 4, 1);
        geo.rotateX(Math.PI); 
        geo.translate(0, -0.7, 0); 

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
            len:    0.7 + Math.random() * 0.9,  
        }));

        this.scene.add(this.fallingMesh);
    }

    _initSurfaceDroplets() {
        this.maxDroplets = 2200;

        const geo = new THREE.SphereGeometry(0.09, 10, 8);

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

        this.drops = Array.from({ length: this.maxDroplets }, () => ({ active: false }));
        this.scene.add(this.dropletMesh);
    }

    _initSplashes() {
        this.maxSplashes = 400;

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

    _checkRainCollision(x, y, z) {
        const R2  = this.visorRadius * this.visorRadius;
        const tol = 22;

        const d2e = x * x + y * y + z * z;
        if (Math.abs(d2e - R2) < tol) {
            const coords = this._visorCoords(x, y, z);
            if (coords) return { hit: true, isErgo: true, coords };
        }

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
        for (let i = 0; i < this.maxDroplets; i++) {
            if (!this.drops[i].active) {
                const d = this.drops[i];
                d.active   = true;
                d.isErgo   = isErgo;
                d.isTrail  = isTrail;
                d.phi      = phi + (Math.random() - 0.5) * 0.03;
                d.theta    = theta;
                d.rnd      = Math.random() * Math.PI * 2; 
                d.age      = 0;

                if (isTrail) {
                    d.size  = size > 0 ? size : 0.15 + Math.random() * 0.2;
                    d.speed = 0;
                    d.life  = isErgo ? 0.25 + Math.random() * 0.3 : 0.8 + Math.random() * 0.6;
                } else if (isErgo) {
                    // Hydrophobic — ErgoVision: bulatan kecil, meluncur sangat cepat
                    d.size  = size > 0 ? size : 0.28 + Math.random() * 0.45;
                    d.speed = 0.0055 + d.size * 0.008 + Math.random() * 0.002;
                    d.life  = 1.0;
                } else {
                    // Conventional — PERBAIKAN: ukuran besar, melebar, sangat lambat (menumpuk)
                    d.size  = size > 0 ? size : 0.8 + Math.random() * 1.5;
                    d.speed = 0.0002 + Math.random() * 0.0005; 
                    d.life  = 1.0;
                }
                return i;
            }
        }
        return -1; 
    }

    _spawnSplash(x, y, z) {
        for (let i = 0; i < this.maxSplashes; i++) {
            if (!this.splashes[i].active) {
                const s = this.splashes[i];
                s.active = true;
                s.x = x; s.y = y; s.z = z;
                s.life = 1.0;
                s.nx = x; s.ny = y; s.nz = z; 
                return;
            }
        }
    }

    // ================================================================
    //  UPDATE
    // ================================================================
    update() {
        if (!this.active) return;
        this._time += 0.016; 

        const activeCount = Math.floor(this.maxFalling * this.intensity);

        // ── 1. FALLING RAIN ─────────────────────────────────────────
        for (let i = 0; i < this.maxFalling; i++) {
            const r = this.rainData[i];

            if (i >= activeCount) {
                this.dummy.position.set(0, -200, 0);
                this.dummy.scale.setScalar(0.001);
                this.dummy.updateMatrix();
                this.fallingMesh.setMatrixAt(i, this.dummy.matrix);
                continue;
            }

            const prevY = r.y;
            r.y -= r.speed;
            r.x += r.windX;

            if (prevY > -6 && r.y <= 6) {
                const col = this._checkRainCollision(r.x, r.y, r.z);
                if (col.hit) {
                    this._spawnDrop(col.isErgo, col.coords.phi, col.coords.theta);
                    if (Math.random() < 0.4) this._spawnSplash(r.x, r.y, r.z);
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
            this.dummy.rotation.set(0, 0, -0.08); 
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
                this.dummy.position.set(0, -200, 0);
                this.dummy.scale.setScalar(0.001);
                this.dummy.updateMatrix();
                this.dropletMesh.setMatrixAt(i, this.dummy.matrix);
                continue;
            }

            d.age++;

            if (d.isTrail) {
                d.life -= d.isErgo ? 0.045 : 0.008;
                if (d.life <= 0) { d.active = false; continue; }
                d.size  *= 0.97;
            } else {
                d.theta += d.speed;
                d.phi   += (Math.random() - 0.5) * 0.0008;

                d.size  += Math.sin(t * 3.5 + d.rnd) * 0.0012;
                d.size   = Math.max(0.1, d.size);

                // ── MERGE DENGAN TETESAN LAIN ──
                for (let j = Math.max(0, i - 50); j < i; j++) {
                    const o = this.drops[j];
                    if (!o.active || o.isErgo !== d.isErgo || o.isTrail) continue;
                    const dt = d.theta - o.theta;
                    const dp = d.phi   - o.phi;
                    const mergeThresh = 0.0012 * (d.size + o.size);
                    if (dt * dt + dp * dp < mergeThresh) {
                        
                        // PERBAIKAN: Helm Konvensional menyerap tetesan jadi gumpalan sangat besar (6.0)
                        o.size  = Math.min(o.size + d.size * 0.6, d.isErgo ? 2.2 : 6.0); 
                        o.speed = d.isErgo
                            ? (0.005 + o.size * 0.009)
                            : (0.0003 + Math.random() * 0.0005); // Kecepatan konvensional tetap stagnan
                        d.active = false;
                        break;
                    }
                }

                if (!d.active) continue;

                if (d.size > 0.6 && Math.random() < (d.isErgo ? 0.12 : 0.45)) {
                    this._spawnDrop(d.isErgo, d.phi, d.theta - 0.018, d.size * 0.28, true);
                }
            }

            if (d.theta > this.thetaStart + this.thetaLength + 0.04) {
                d.active = false;
                continue;
            }

            const sinT = Math.sin(d.theta);
            const cosT = Math.cos(d.theta);
            const sinP = Math.sin(d.phi);
            const cosP = Math.cos(d.phi);

            const lx = -Rsurf * cosP * sinT;
            const ly =  Rsurf * cosT;
            const lz =  Rsurf * sinP * sinT;

            const bx = d.isErgo ? 0 : this.convOffsetX;
            this.dummy.position.set(bx + lx, ly, lz);

            this.dummy.up.set(0, 1, 0);
            this.dummy.lookAt(bx + lx * 2, ly * 2, lz * 2);

            // ── TEARDROP SCALING (BENTUK AIR) ──
            if (d.isErgo) {
                const stretch  = d.isTrail
                    ? (0.6 + d.life * 0.4)
                    : (1.0 + d.speed * 90 + Math.sin(t * 4 + d.rnd) * 0.12);
                const compress = d.isTrail ? 1.0 : Math.max(0.5, 1.0 - d.speed * 25);
                const depth    = d.isTrail ? 0.5 : 0.7;
                this.dummy.scale.set(
                    d.size * compress,          
                    d.size * stretch,           
                    d.size * compress * depth   
                );
            } else {
                // PERBAIKAN: Conventional — lapisan air menyebar melebar dan tebal
                const stretch  = d.isTrail
                    ? (0.8 + d.life * 0.6)
                    : (1.2 + d.size * 0.3 + Math.sin(t * 1.5 + d.rnd) * 0.1);
                
                // spread diperbesar agar titik air saling menyentuh dan menutupi kaca
                const spread   = d.isTrail ? 1.2 : 2.0 + d.size * 0.6; 
                this.dummy.scale.set(
                    d.size * spread,
                    d.size * stretch,
                    d.size * 0.12   // Sedikit menebal ke depan agar terasa numpuk
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
            this.dummy.lookAt(s.x * 2, s.y * 2, s.z * 2);
            this.dummy.scale.set(sc, sc, 1);
            this.dummy.updateMatrix();
            this.splashMesh.setMatrixAt(i, this.dummy.matrix);
        }
        this.splashMesh.instanceMatrix.needsUpdate = true;
    }
}
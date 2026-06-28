import * as THREE from 'three';

export class UIManager {
    constructor(camera) {
        this.camera = camera;
        this.infoPanel = document.getElementById('infoPanel');
        this.infoContent = document.getElementById('infoContent');
        this.labelContainer = document.getElementById('labelContainer');
        this.labels = [];
        this.activeLayers = null;
        this.isLabelsVisible = false;

        this.texts = {
            HOME: `
                <div class="feature">
                    <h3>Premium Design</h3>
                    <p>ErgoVision Shield offers a state-of-the-art dual layer design for maximum clarity in tropical climates.</p>
                </div>
            `,
            RAIN: `
                <div class="feature">
                    <h3>Hydrophobic Surface</h3>
                    <p>The outermost layer features an advanced hydrophobic coating. Rain droplets immediately bead up and roll away, keeping your field of view perfectly clear during heavy downpours.</p>
                </div>
            `,
            EXPLODED: `
                <div class="feature">
                    <h3>Multi-Layer Architecture</h3>
                    <p>We combine tough Polycarbonate with a 1.5mm thermal air gap and specialized coatings to prevent both exterior water adhesion and interior fogging.</p>
                </div>
            `,
            COMPARE: `
                <div class="feature">
                    <h3>ErgoVision vs Conventional</h3>
                    <p><strong>Left (Conventional):</strong> Rain droplets spread out, distorting vision. Interior fogs up due to thermal transfer.</p>
                    <p><strong>Right (ErgoVision):</strong> Water slides right off. The dual layer thermal barrier and anti-fog coating keep the interior crystal clear.</p>
                </div>
            `
        };
    }

    updatePanel(mode) {
        // Fade out
        gsap.to(this.infoPanel, { opacity: 0, duration: 0.3, onComplete: () => {
            this.infoContent.innerHTML = this.texts[mode];
            // Fade in
            gsap.to(this.infoPanel, { opacity: 1, duration: 0.5 });
        }});
    }

    showLabels(layers) {
        this.activeLayers = layers;
        this.isLabelsVisible = true;
        this.labelContainer.innerHTML = '';
        this.labels = [];

        Object.keys(layers).forEach((key) => {
            const el = document.createElement('div');
            el.className = 'label';
            el.innerText = layers[key].name;
            this.labelContainer.appendChild(el);
            this.labels.push({ element: el, mesh: layers[key] });
            
            // Fade in label
            setTimeout(() => { el.style.opacity = '1'; }, 100);
        });
    }

    hideLabels() {
        this.isLabelsVisible = false;
        this.labels.forEach(l => {
            l.element.style.opacity = '0';
        });
        setTimeout(() => {
            this.labelContainer.innerHTML = '';
            this.labels = [];
            this.activeLayers = null;
        }, 400);
    }

    updateLabelsPosition() {
        if (!this.isLabelsVisible) return;
        
        const tempV = new THREE.Vector3();
        
        this.labels.forEach(l => {
            // Get position in world space. Offset a bit to the right and top
            l.mesh.getWorldPosition(tempV);
            tempV.x += 10; // offset right
            tempV.y += 5;  // offset up
            
            tempV.project(this.camera);
            
            const x = (tempV.x *  .5 + .5) * window.innerWidth;
            const y = (tempV.y * -.5 + .5) * window.innerHeight;
            
            // Check if behind camera
            if (tempV.z > 1) {
                l.element.style.display = 'none';
            } else {
                l.element.style.display = 'block';
                l.element.style.left = `${x}px`;
                l.element.style.top = `${y}px`;
            }
        });
    }
}

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
        this.explodePanel =
document.getElementById("explodePanel");
        this.labelInfo = {

            outer: {
                title: "OUTER VISOR",
                desc: "Polycarbonate + Hydrophobic Coating"
            },

            airgap: {
                title: "THERMAL AIR GAP",
                desc: "1.5 mm Insulation Layer"
            },

            inner: {
                title: "INNER VISOR",
                desc: "Polycarbonate + Anti-Fog Coating"
            }

        };
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
        if(mode==="EXPLODED"){

gsap.to(this.explodePanel,{
opacity:1,
duration:.5
});

}else{

gsap.to(this.explodePanel,{
opacity:0,
duration:.3
});

}
        // Fade out
        gsap.to(this.infoPanel, { opacity: 0, duration: 0.3, onComplete: () => {
            this.infoContent.innerHTML = this.texts[mode];
            // Fade in
            gsap.to(this.infoPanel, { opacity: 1, duration: 0.5 });
        }});
    }

    showLabels(layers){

        // this.activeLayers = layers;

        // this.isLabelsVisible = true;

        // this.labelContainer.innerHTML="";

        // this.labels=[];

        // const configs=[

        //     {
        //         mesh:layers.outer,
        //         key:"outer"
        //     },

        //     {
        //         mesh:layers.inner,
        //         key:"inner"
        //     }

        // ];

        // configs.forEach(item=>{

        //     const card=document.createElement("div");

        //     card.className="label";

        //     card.innerHTML=`

        //     <strong>${this.labelInfo[item.key].title}</strong>

        //     <br>

        //     <small>${this.labelInfo[item.key].desc}</small>

        //     `;

        //     this.labelContainer.appendChild(card);

        //     this.labels.push({

        //         mesh:item.mesh,

        //         element:card,

        //         key:item.key

        //     });

        // });

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
    //     if (!this.isLabelsVisible) return;
        
    //     const tempV = new THREE.Vector3();
        
    //     this.labels.forEach(l => {
    //         if(this.airGapLabel){

    //         const p1=new THREE.Vector3();

    //         const p2=new THREE.Vector3();

    //         this.activeLayers.outer.getWorldPosition(p1);

    //         this.activeLayers.inner.getWorldPosition(p2);

    //         p1.lerp(p2,0.5);

    //         p1.project(this.camera);

    //         this.airGapLabel.style.left=
    //             ((p1.x*.5+.5)*window.innerWidth)+"px";

    //         this.airGapLabel.style.top=
    //             ((-p1.y*.5+.5)*window.innerHeight)+"px";

    //     }
    //         // Get position in world space. Offset a bit to the right and top
    //         l.mesh.getWorldPosition(tempV);
    //         // tempV.x += 10; // offset right
    //         // tempV.y += 5;  // offset up
    //         if(l.key==="outer"){

    //             tempV.x+=5;
    //             tempV.y+=2;

    //         }

    //         if(l.key==="inner"){

    //             tempV.x-=5;
    //             tempV.y-=2;

    //         }
            
    //         tempV.project(this.camera);
            
    //         const x = (tempV.x *  .5 + .5) * window.innerWidth;
    //         const y = (tempV.y * -.5 + .5) * window.innerHeight;
            
    //         // Check if behind camera
    //         if (tempV.z > 1) {
    //             l.element.style.display = 'none';
    //         } else {
    //             l.element.style.display = 'block';
    //             l.element.style.left = `${x}px`;
    //             l.element.style.top = `${y}px`;
    //         }
    //     });
     }
}

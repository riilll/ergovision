import * as THREE from 'three';
import { setupScene } from './scene/sceneSetup.js';
import { createVisors } from './objects/visor.js';
import { createHelmet } from './objects/helmet.js';
import { RainSystem } from './objects/rain.js';
import { FogSystem } from './objects/fog.js';
import { AnimationController } from './animation/animations.js';
import { UIManager } from './ui/uiManager.js';

let mode = 'HOME';

const container = document.getElementById('container');
const { scene, camera, renderer, controls } = setupScene(container);

const visors = createVisors(scene);

// Offset super lega untuk Helm Konvensional di Compare Mode
const convOffset = -30; 

const ergoHelmet = createHelmet(visors.params, 0);       
const convHelmet = createHelmet(visors.params, convOffset);     
convHelmet.visible = false; 

// Menyamakan posisi visor konvensional dengan helmnya
visors.conventional.position.x = convOffset;

scene.add(ergoHelmet);
window.ergoHelmet = ergoHelmet;
window.scene = scene;
scene.add(convHelmet);

const rainSystem = new RainSystem(scene, visors);
if(rainSystem) rainSystem.convOffsetX = convOffset; // Penyesuaian hujan
const fogSystem = new FogSystem(scene, visors);

const uiManager = new UIManager(camera);
const animController = new AnimationController(
    camera,
    controls,
    visors,
    uiManager,
    {
        ergo: ergoHelmet,
        conventional: convHelmet
    }
);
controls.autoRotateSpeed = 0.7;

window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('loading');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 1500);
        }
        setMode('HOME');
    }, 1000);
};

const btnHome = document.getElementById('homeBtn');
const btnRain = document.getElementById('rainBtn');
const btnExplode = document.getElementById('explodeBtn');
const btnCompare = document.getElementById('compareBtn');

if(btnHome) btnHome.addEventListener('click', () => setMode('HOME'));
if(btnRain) btnRain.addEventListener('click', () => setMode('RAIN'));
if(btnExplode) btnExplode.addEventListener('click', () => setMode('EXPLODED'));
if(btnCompare) btnCompare.addEventListener('click', () => setMode('COMPARE'));

function setMode(newMode) {
    if (newMode === 'EXPLODED' && mode === 'EXPLODED') {
        newMode = 'HOME'; // Fitur Toggle Tutup
    }

    if (mode === newMode && document.getElementById('infoPanel')?.style.opacity === '1') return;
    
    mode = newMode;
    
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(mode.toLowerCase() + 'Btn');
    if (activeBtn) activeBtn.classList.add('active');
    
    uiManager.updatePanel(mode);
    
    const isRain = mode === 'RAIN' || mode === 'COMPARE';
    rainSystem.toggle(isRain);
    fogSystem.toggle(mode === 'COMPARE');
    
    if (isRain && typeof gsap !== 'undefined') {
        rainSystem.intensity = 0.1;
        gsap.to(rainSystem, { intensity: 1.0, duration: 4.0, ease: 'power1.inOut' });
    }
    
    switch(mode) {
        case 'HOME': animController.animateToHome(); break;
        case 'RAIN': animController.animateToRain(); break;
        case 'EXPLODED': animController.animateToExploded(); break;
        case 'COMPARE': animController.animateToCompare(); break;
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    rainSystem.update();
    fogSystem.update();
    uiManager.updateLabelsPosition();
    renderer.render(scene, camera);
}
animate();
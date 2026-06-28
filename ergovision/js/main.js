import * as THREE from 'three';
import { setupScene } from './scene/sceneSetup.js';
import { createVisors } from './objects/visor.js';
import { createHelmet } from './objects/helmet.js';
import { RainSystem } from './objects/rain.js';
import { FogSystem } from './objects/fog.js';
import { AnimationController } from './animation/animations.js';
import { UIManager } from './ui/uiManager.js';

// Application State
let mode = 'HOME';

// Setup
const container = document.getElementById('container');
const { scene, camera, renderer, controls } = setupScene(container);

// Objects
const visors = createVisors(scene);
console.log(visors);
console.log(visors.params);
const helmet = createHelmet(visors.params, 0);
scene.add(helmet);
const rainSystem = new RainSystem(scene, visors);
const fogSystem = new FogSystem(scene, visors);

// Controllers
const uiManager = new UIManager(camera);
const animController = new AnimationController(camera, controls, visors, uiManager);

// Hide loading screen
window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('loading');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 1500);
        
        // Initialize HOME state
        setMode('HOME');
    }, 1000);
};

// Event Listeners for Buttons
document.getElementById('homeBtn').addEventListener('click', () => setMode('HOME'));
document.getElementById('rainBtn').addEventListener('click', () => setMode('RAIN'));
document.getElementById('explodeBtn').addEventListener('click', () => setMode('EXPLODED'));
document.getElementById('compareBtn').addEventListener('click', () => setMode('COMPARE'));

function setMode(newMode) {
    if (mode === newMode && document.getElementById('infoPanel').style.opacity === '1') return;
    mode = newMode;
    
    // Update UI Buttons
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode.toLowerCase() + 'Btn').classList.add('active');
    
    // Update Text
    uiManager.updatePanel(mode);
    
    // Manage Systems
    const isRain = mode === 'RAIN' || mode === 'COMPARE';
    rainSystem.toggle(isRain);
    fogSystem.toggle(mode === 'COMPARE');
    
    if (isRain) {
        // Start with light rain and gradually increase to heavy downpour over 4 seconds
        rainSystem.intensity = 0.1;
        gsap.to(rainSystem, { intensity: 1.0, duration: 4.0, ease: 'power1.inOut' });
    }
    
    // Trigger Camera & Object Animations
    switch(mode) {
        case 'HOME':
            animController.animateToHome();
            break;
        case 'RAIN':
            animController.animateToRain();
            break;
        case 'EXPLODED':
            animController.animateToExploded();
            break;
        case 'COMPARE':
            animController.animateToCompare();
            break;
    }
}

// Render Loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    rainSystem.update();
    fogSystem.update();
    uiManager.updateLabelsPosition();
    
    renderer.render(scene, camera);
}

animate();
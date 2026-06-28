import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupScene(container) {
    // SCENE
    const scene = new THREE.Scene();
    // We don't set scene.background so the CSS radial gradient shows through
    // scene.background = new THREE.Color(0x09090F);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 25); // Default HOME position

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 1.7; // Don't allow camera below ground

    // LIGHTING - Premium Studio Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.normalBias = 0.02;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(-15, 10, -15);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf0f4f8, 1.0);
    fillLight.position.set(0, 0, 15);
    scene.add(fillLight);

    // ENVIRONMENT MAP (for realistic glass reflections)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Create a bright synthetic environment map for studio reflections
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0xffffff);
    
    // Create large softbox panels for beautiful reflections on polycarbonate
    const panelGeo = new THREE.PlaneGeometry(20, 20);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const panel1 = new THREE.Mesh(panelGeo, panelMat);
    panel1.position.set(-20, 10, -20);
    panel1.lookAt(0, 0, 0);
    envScene.add(panel1);
    
    const panel2 = new THREE.Mesh(panelGeo, panelMat);
    panel2.position.set(20, 15, -10);
    panel2.lookAt(0, 0, 0);
    envScene.add(panel2);
    
    const panel3 = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), panelMat);
    panel3.position.set(0, 25, 0);
    panel3.lookAt(0, 0, 0);
    envScene.add(panel3);
    
    const envMap = pmremGenerator.fromScene(envScene).texture;
    scene.environment = envMap;

    // GROUND PLANE
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0xe5e7eb, 
        roughness: 0.4, 
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -8;
    ground.receiveShadow = true;
    scene.add(ground);

    // RESIZE HANDLER
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer, controls };
}

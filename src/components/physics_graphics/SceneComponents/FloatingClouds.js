import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from "cannon-es";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Lighting } from '../SceneUtilities/Lighting';
import ImageUtils from '../../hooks/ImageUtils';
import GeoUtils from '../SceneUtilities/GeoUtils';
import useColorUtils from '../../hooks/UseColorUtils';
import PlaneManager from '../SceneUtilities/PlaneManager';
import ShaderManager from '../SceneUtilities/ShaderManager';
import TexturesManager from '../SceneUtilities/TexturesManager';
import GaussianDistribution from '../SceneUtilities/GaussianDistribution';
import SphereUtils from '../SceneUtilities/SphereUtils';
import MouseUtils from '../SceneUtilities/MouseUtils';
import PhysicsEngine from '../SceneUtilities/PhysicsEngine';
import Particles from '../SceneUtilities/Particles';
import Params from '../SceneUtilities/Params';

const FloatingClouds = ({width = window.innerWidth, height = window.innerHeight, particleCount = 140}) => {
 
  const sceneRef = useRef(new THREE.Scene());
  const worldRef = useRef(new CANNON.World());
  const canvasRef = useRef();
  const cameraRef = useRef();
  const renderRef = useRef();
  const sceneMeshesRef = useRef([]);
  const { randomHexColor } = useColorUtils();

  useEffect(() => {
    const scene = sceneRef.current;
    const world = worldRef.current;

    // Set up camera
    cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const camera = cameraRef.current;
    camera.position.set(-5, 30, 30);

    // Set up renderer
    renderRef.current = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    const renderer = renderRef.current;
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;

    // Params and Mouse Utilities
    const params = new Params();
    const mouseUtils = new MouseUtils(camera);
    const mouse = mouseUtils.mouse;

    // Set up Loaders
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const cubeTextureLoader = new THREE.CubeTextureLoader();

    // Image Utils
    const imageUtils = new ImageUtils();
    const stars = imageUtils.stars;
    const nebula = imageUtils.nebula;
    const blue_concert = imageUtils.blue_concert;

    // 🎥 Load Textures and Materials
    const textureManager = new TexturesManager(imageUtils, textureLoader, imageUtils.images.concerts);
    const texturedMaterials = textureManager.texturedMaterials;
    // const randomTexturedMaterial = textureManager.randomTexturedMaterial;

    // 🎭 Shader Management
    const shaderManager = new ShaderManager(width, height, params.deltaTime, params.time, params.shapeFactor, cubeTextureLoader, params.explodeIntensity, params.thickness, params.flatShading, params.u_frequency, mouse);
    const texturedShaderMaterial = shaderManager.ceasarsShaderMaterial;
    const noiseMaterial = shaderManager.noiseMaterial;

    //  Set up background
    scene.background = cubeTextureLoader.load([stars, stars, stars, '', blue_concert, nebula]);

    // 🌍 Fog
    scene.fog = new THREE.Fog(0xFFFFFF, 0, 200);
    scene.fog = new THREE.FogExp2(randomHexColor(), 0.01);

    // Light setup
    const light = new Lighting(scene, camera, params.speed, renderer, params.speedFactor, params.withHelpers, params.axesSize, params.gridSize, params.gridDivisions);

    // Plane and Ground Physics
    const gaussianDistribution = new GaussianDistribution();
    const physics = new PhysicsEngine(mouseUtils, shaderManager);
    const planeManager = new PlaneManager(scene, world, params.boundary + (params.boundary / 2), params.boundary + (params.boundary / 2), params.thickness, THREE.DoubleSide, shaderManager, texturedShaderMaterial, params.withFiniteGround, params.withPlanePad, params.withPlaneBox);
    planeManager.createExplosivePlane();

    const geoUtils = new GeoUtils(scene, world, textureLoader, gltfLoader, textureManager, shaderManager, imageUtils);
    geoUtils.createBasicBox();
    geoUtils.createMultiBox();
    geoUtils.createGLTFModel();
    geoUtils.createMultifacedBoundaryBox(params.boundary + (params.boundary / 2), 0);
    sceneMeshesRef.current.push(geoUtils.basicBox, geoUtils.multiBox);
    const sphereUtils = new SphereUtils(scene, world, textureLoader, texturedMaterials, mouseUtils, imageUtils, shaderManager, physics, gaussianDistribution, shaderManager.wrinkledCoalMaterial, sceneMeshesRef.current);

    // Step 5: Create sand particles with assigned material and interaction properties
    const particles = new Particles(scene, world, shaderManager, mouseUtils, textureLoader, texturedMaterials, noiseMaterial, particleCount);
    particles.createParticles(params.radius, params.mass, params.sleepSpeedLimit, params.sleepTimeLimit, params.linearDamping);
 
    const animate = (time = params.time) => {
      requestAnimationFrame(animate);

      time += params.deltaTime;

      // Step the physics world forward
      world.step(params.deltaTime);

      // Update Scene Elements
      light.update()
      geoUtils.update();
      sphereUtils.update();
      shaderManager.update();
      particles.updateParticles();

      renderer.render(scene, camera);
    };

    animate();
    // useEffect(() => {
    //   // Initializing scene and world setup here...

    //   // Example of optimizing scene updates (for example, applying changes only when necessary)
    //   sceneRef.current.fog = new THREE.Fog(0xFFFFFF, 0, 200);
    //   sceneRef.current.fog = new THREE.FogExp2(randomHexColor(), 0.01); // Example: dynamic fog update
    //   shaderManager.update();

    //   animate(); // Start the animation loop
    // }, []); 

    // Handle window resizing
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      // noiseShader.uniforms.resolution.value.set(width, height); // Update shader resolution
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      // Cleanup Three.js resources
      // particleMeshesRef.current.forEach(mesh => scene.remove(mesh));
      // particleMeshesRef.current = [];

      // // Cleanup Cannon.js bodies
      // particleBodiesRef.current.forEach(body => world.removeBody(body));
      // particleBodiesRef.current = [];

      light.dispose();
      renderer.dispose();
      geoUtils.dispose();
      particles.dispose();
      sphereUtils.dispose();
      planeManager.dispose();
    };
  }, [width, height, particleCount, randomHexColor]);

  return <canvas ref={canvasRef} />
    // className="party-lights" 
    // style={{
    //   margin: '-5px 0px',
    // }} />;
};

export default FloatingClouds;
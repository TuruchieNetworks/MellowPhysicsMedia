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

const PhysicsGalaxy = ({width = window.innerWidth, height = window.innerHeight, particleCount = 100}) => {
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
    camera.position.set(-5, 0.30, -30);

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
    // const randomTexturedMaterial = textureManager.randomTexturedMaterial;
    const texturedMaterials = textureManager.texturedMaterials;

    // 🎭 Shader Management
    const shaderManager = new ShaderManager(params, mouse);
    const noiseMaterial = shaderManager.noiseMaterial;
    const texturedShaderMaterial = shaderManager.dragonCityTerrainMaterial; ///ceasarsShaderMaterial;

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
    const planeManager = new PlaneManager(scene, world, params.boundary, params.boundary, params.thickness, THREE.DoubleSide, shaderManager, texturedShaderMaterial, params.withFiniteGround, params.withPlanePad, params.withPlaneBox);
    planeManager.createExplosivePlane();

    // Define the keys in the same order as face names
    const faces = {
      top: shaderManager.wiredCityTerrainSDFShader,
      bottom: shaderManager.wiredCityTerrainSDFShader,
      left: shaderManager.tubeCityShader,
      right: shaderManager.ceasarsShader,
      front: shaderManager.purpleStormShader,
      back: shaderManager.terrestialDragonShader,
    };

    /*
    //atlanticFlowerShader,//atlanticGutterShader,//milkyWaterFallShader,//purpleStormShader, 
    */
    const geoUtils = new GeoUtils(scene, world, textureLoader, gltfLoader, textureManager, shaderManager, imageUtils);
    geoUtils.createMultifacedBoundaryBox(params.boundary, faces, 0.0);
    geoUtils.createBasicBox();
    geoUtils.createMultiBox();
    geoUtils.createGLTFModel();

    sceneMeshesRef.current.push(geoUtils.basicBoxObj, geoUtils.multiBoxObj);
    const sphereUtils = new SphereUtils(scene, world, textureLoader, texturedMaterials, mouseUtils, imageUtils, shaderManager, physics, gaussianDistribution, shaderManager.wrinkledCoalMaterial, sceneMeshesRef.current, geoUtils.boundaryObj);

    // Step 5: Create sand particles with assigned material and interaction properties
    const particles = new Particles(scene, world, shaderManager, mouseUtils, textureLoader, texturedMaterials, noiseMaterial, particleCount);
    particles.createParticles(params.radius, params.mass, params.sleepSpeedLimit, params.sleepTimeLimit, params.linearDamping);
 
    const animate = (time = params.time) => {
      requestAnimationFrame(animate);

      time += params.deltaTime;

      // Step the physics world forward
      world.step(params.deltaTime);

      // Update Camera
      light.update();
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

      // Also trigger shaderManager or implementers to update resolution
      shaderManager.handleResize(width, height); // ✅ if you have it setup that way
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      // Cleanup Three.js resources
      light.dispose();
      renderer.dispose();
      geoUtils.dispose();
      particles.dispose();
      sphereUtils.dispose();
      planeManager.dispose();
    };
  }, [width, height, particleCount, randomHexColor]);

  return <canvas ref={canvasRef} />
};

export default PhysicsGalaxy;












    // const logo_scene = videos.video;
    // const videoFiles = [logo_scene, logo_scene, logo_scene, logo_scene, logo_scene, logo_scene];
    // const videoTextures = videoFiles.map((src) => {
    //   const video = document.createElement("video");
    //   video.src = src;
    //   video.loop = true;
    //   video.muted = true;
    //   video.play();
    //   return new THREE.VideoTexture(video);
    // });

    // Create a cube and apply video textures to each face
    // const videoGeo = new THREE.BoxGeometry(5, 5, 5);
    // const videoMat = videoTextures.map((texture) => new THREE.MeshBasicMaterial({ map: texture }));
    // const videoCube = new THREE.Mesh(videoGeo, videoMat);
    // scene.add(videoCube);
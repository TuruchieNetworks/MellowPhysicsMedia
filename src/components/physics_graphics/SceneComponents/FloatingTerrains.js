import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from "cannon-es";
// import GlslCanvas from 'glslCanvas';
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
import ListPopulator from '../SceneUtilities/ListPopulator';

const FloatingTerrains = ({ width = window.innerWidth, height = window.innerHeight, particleCount = 140 }) => {
  const sceneRef = useRef(new THREE.Scene());
  const worldRef = useRef(new CANNON.World());
  const canvasRef = useRef();
  const cameraRef = useRef();
  const renderRef = useRef();
  const sceneMeshesRef = useRef([]);
  const { randomHexColor } = useColorUtils();
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);


  useEffect(() => {
    const scene = sceneRef.current;
    const world = worldRef.current;

    // Camera
    cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    cameraRef.current.position.set(-5, 5.30, -91.30);
    const camera = cameraRef.current;

    // Renderer
    // if (!canvas) return; // Make sure canvas is loaded before anything
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderRef.current = renderer;

    // Now sceneMeshesRef.current, PhysicsEngine init, etc...
    // Everything else now plays nicely with the correct size
    // // and nicely abstracted refs 🔧🧼

    // // Set up camera
    // cameraRef.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // const camera = cameraRef.current;
    // camera.position.set(-5, 5.30, -91.30);

    // // Set up renderer
    // renderRef.current = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    // const renderer = renderRef.current;
    // renderer.setSize(width, height);
    // // renderer.setPixelRatio( window.devicePixelRatio );
    // renderer.shadowMap.enabled = true;

    // Params and Mouse Utilities
    const params = new Params();
    const mouseUtils = new MouseUtils(camera);
    const mouse = mouseUtils.mouse;
    // const holyGrailShaders = ()=> {
    //   const holyGrailShader = {
    //     uniforms: {
    //       time: { value: params.time },
    //       hovered: { value: 0.0},
    //       shapeFactor: { value: params.shapeFactor },
    //       mousePosition: { value: mouse },
    //       explodeIntensity: { value: params.explodeIntensity },
    //       resolution: { value: new THREE.Vector2(width, height) },
    //     },

    //     vertexShader: `
    //     #ifdef GL_ES
    //     precision mediump float;
    //     #endif

    //       uniform float time;
    //       uniform float hovered;
    //       uniform vec2 mousePosition;
    //       uniform float explodeIntensity;
    //       varying vec2 vUv;

    //       float noise(vec2 p) {
    //         return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    //       }

    //       void main() {
    //         vUv = uv;
    //         vec3 pos = position;

    //         // Calculate distance to mouse position
    //         // float dist = distance(mousePosition, vec2(pos.x, pos.y));
    //         // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);

    //         // // Apply explode effect
    //         // pos += normal * effect * explodeIntensity;

    //         // Calculate distance from the mouse to the vertex position
    //         float dist = distance(mousePosition, uv); // Use UV for spatial mapping

    //         // Apply mouse interaction as distortion (push/pull effect)
    //         float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(time + dist * 10.0);

    //         // Apply explode effect based on intensity and mouse interaction
    //         pos += normal * effect * explodeIntensity;

    //         gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    //       }
    //     `,

    //     fragmentShader: `
    //       #ifdef GL_ES
    //       precision mediump float;
    //       #endif

    //       varying vec2 vUv;
    //       uniform float time;
    //       uniform float hovered;
    //       uniform float shapeFactor;
    //       uniform vec2 mousePosition;
    //       uniform vec2 resolution;
    //       uniform float explodeIntensity;

    //       // Digit-based growth term
    //       float gt(float n, float h, float p, float time) {
    //           float base = pow(10.0, -n); // Scale for target decimal
    //           float amp = base * p; // Positional influence
    //           float osc = base * sin(time * 2.0); // Oscillating offset
    //           return amp * pow(h * amp, time) + osc;
    //       }

    //       float randomOsc(float t, float freq, float seed) {
    //           return fract(sin(t * freq + seed) * 43758.5453);
    //       }

    //       float computeAbn(float sd, float pz) {
    //         return min(min(sd, sd), pz * sin(2.0));
    //       }

    //       float computeAtn(float sd, float abn, float posY, float pz) {
    //           return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
    //       }

    //       float computeReno(float sd, float abn, float posY, float pz) {
    //           return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
    //       }

    //       float computeAcn(float sd, float abn, float posY, float pz) {
    //           return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
    //       }

    //       float computeAfn(float sd, float abn, float pz) {
    //           return atan(min(sd * fract(abn), sd), pz * sin(2.0));
    //       }

    //       float computeA(float posY, float atn) {
    //           return atan(posY, atn);
    //       }

    //       float computeB(float posY, float abn, float atn) {
    //           return atan(posY, abn * atn);
    //       }

    //       float computeBf(float posY, float abn, float atn) {
    //           return atan(posY, abn + atn);
    //       }

    //       vec3 holyGrails(vec2 u){
    //         vec2 pos = vec2(0.5)-u;
    //         vec3 p = vec3(-90.0+time);

    //         float r = length(pos)*2.0;
    //         float rp =length(p)*2.0;
    //         float sd = pos.x * sin(0.1 * time);
    //         float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
    //         // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
    //         // r *= p.z;

    //         float abn = computeAbn(sd, p.z);
    //         float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
    //         float atm = computeAtn(sd, abn, pos.y, p.z);
    //         float reno = computeReno(sd, abn, pos.y, p.z);
    //         float acn = computeAcn(sd, abn, pos.y, p.z);
    //         float afn = computeAfn(sd, abn, p.z);
    //         float bch = (+1.+fract(reno));

    //         float a = computeA(pos.y, atn);
    //         float at = computeA(pos.y, atn );
    //         a =at;
    //         float b = computeB(pos.y, abn, atn);
    //         float bf = computeBf(pos.y, abn, atn);

    //         // a += a + p.z; 
    //         // float h = atan(pos.y,pos.x);
    //         float ab = cos(a*2.280)*( time); //-r;
    //         float abt = cos(a*tan(a)*4.968);
    //         vec2 sdr = vec2(0.0, p.z)-u;
    //         float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));

    //         float f = (ab*abt);
    //         f = sin(ab*abt);
    //         // f = stripe;
    //         // f = abs(cos(a*3.));
    //         // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe)*a*-r;
    //         // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
    //         // f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
    //         // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

    //         float renodrive = 1.-smoothstep(f,f+0.02,r) ;
    //         float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;

    //         // Optional: depth fade
    //         float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 

    //         vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0);
    //         vec3 color =vec3(renodrive);
    //         color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
    //         pkwy = vec3(f+renodrive*time, lampdrive*a*cos((reno*(abn*ab)*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));

    //         // vec3 tunnel = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         // vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));

    //         vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         // vec3 pkwy =vec3(renodrive);
    //         pkwy *= sun;
    //         return pkwy;
    //       }

    //       vec3 holyGrail(vec2 u) {
    //         vec2 pos = vec2(0.5)-u;
    //         vec3 p = vec3(-90.0+time);

    //         float r = length(pos)*2.0;
    //         float rp =length(p)*2.0;
    //         float sd = pos.x * sin(0.1 * time);
    //         float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
    //         // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
    //         // r *= p.z;

    //         float abn = computeAbn(sd, p.z);
    //         float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
    //         float atm = computeAtn(sd, abn, pos.y, p.z);
    //         float reno = computeReno(sd, abn, pos.y, p.z);
    //         float acn = computeAcn(sd, abn, pos.y, p.z);
    //         float afn = computeAfn(sd, abn, p.z);
    //         float bch = (+1.+fract(reno));

    //         float a = computeA(pos.y, atn);
    //         float at = computeA(pos.y, atn );
    //         a =at;
    //         float b = computeB(pos.y, abn, atn);
    //         float bf = computeBf(pos.y, abn, atn);

    //         // a += a + p.z; 
    //         // float h = atan(pos.y,pos.x);
    //         float ab = cos(a*2.280)*( time); //-r;
    //         float abt = cos(a*tan(a)*4.968);
    //         vec2 sdr = vec2(0.0, p.z)-u;
    //         float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));

    //         float f = (ab*abt);
    //         f = sin(ab*abt);
    //         // f = stripe;
    //         // f = abs(cos(a*3.));
    //         // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe)*a*-r;
    //         // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
    //         // f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
    //         // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

    //         float renodrive = 1.-smoothstep(f,f+0.02,r) ;
    //         float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;

    //         // Optional: depth fade
    //         float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 

    //         vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0);
    //         vec3 color =vec3(renodrive);
    //         color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
    //         // pkwy = vec3(f+renodrive*time, lampdrive*a*cos((reno*(abn*ab)*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));

    //         vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         pkwy = electricCloud;
    //         // vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));

    //         // vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
    //         // vec3 pkwy =vec3(renodrive);
    //         pkwy *= sun;
    //         return pkwy;
    //       }

    //       void main() {
    //         // UV Mapping
    //         // vec2 uv = (gl_FragCoord.xy / resolution.xy);
    //         // uv.x *= resolution.x / resolution.y;

    //         vec2 uv = (2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y;

    //         // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
    //         vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
    //         // vec2 mouseUV = mousePosition / resolution;

    //         vec3 grail = holyGrail(uv);
    //         vec3 color = vec3(grail);

    //         // Check if hovered is active or not
    //         if (hovered > 0.0) {
    //           // Mouse is hovering, apply mouse interaction effects
    //           float dist = distance(mouse, uv);
    //           float absT =  abs(sin(time));
    //           // dist +=  absT;
    //           color = vec3(grail);


    //           // Use the distance to influence the color (make mouse position cause a color shift)
    //           color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

    //           // Use distance to control the opacity
    //           float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position

    //           // Optionally, add time-based animation for extra dynamics
    //           color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time

    //           gl_FragColor = vec4(color, opacity);
    //         } else {
    //           // Mouse is not hovering, apply default effect based on UV coordinates and distance
    //           float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

    //           color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
    //           color = vec3(grail);
    //           color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
    //           float opacity = smoothstep(0.6, 0.8, 1.0);
    //           gl_FragColor = vec4(color, opacity); // Default behavior
    //         }
    //       }

    //     `
    //   };
    //   return holyGrailShader;
    // }
    // const holyGrailShader = holyGrailShaders();


    // const holyGrailMaterial = new THREE.ShaderMaterial(holyGrailShader);

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
    const shaderManager = new ShaderManager(params, mouse);
    const noiseMaterial = shaderManager.noiseMaterial;
    const texturedShaderMaterial = shaderManager.wiredCityTerrainSDFMaterial;//dragonCityTerrainMaterial;//terrestialDragonMaterial;//wiredCityTerrainSDFMaterial; // tunnelTerrainMaterial; // cityTerrainMaterial; // wiredCityTerrainSDFMaterial; // flyingTerrainMaterial; //lyingTerrainMaterial;

    //  Set up background
    scene.background = cubeTextureLoader.load([stars, blue_concert, stars, blue_concert, blue_concert, nebula]);

    // 🌍 Fog
    scene.fog = new THREE.Fog(0xFFFFFF, 0, 200);
    scene.fog = new THREE.FogExp2(randomHexColor(), 0.01);

    // Light setup
    const light = new Lighting(scene, camera, params.speed, renderer, params.speedFactor, params.withHelpers, params.axesSize, params.gridSize, params.gridDivisions);

    // Plane and Ground Physics
    const gaussianDistribution = new GaussianDistribution();
    const physics = new PhysicsEngine(mouseUtils, shaderManager);
    const planeManager = new PlaneManager(scene, world, params.largeBoundary, params.largeBoundary, params.thickness, THREE.DoubleSide, shaderManager, texturedShaderMaterial, params.withFiniteGround, params.withPlanePad, params.withPlaneBox);
    planeManager.createExplosivePlane();

    // Define the keys in the same order as face names
    const faces = {
      top: shaderManager.wiredCityTerrainSDFShader,
      bottom: shaderManager.wiredCityTerrainSDFShader,
      left: shaderManager.tubeCityShader,
      right: shaderManager.ceasarsShader,
      front: shaderManager.mangroveSwampShader,
      back: shaderManager.terrestialDragonShader,
    };

    const geoUtils = new GeoUtils(scene, world, textureLoader, gltfLoader, textureManager, shaderManager, imageUtils);
    geoUtils.createMultifacedBoundaryBox(params.largeBoundary, faces, 0.0);
    geoUtils.createBasicBox();
    geoUtils.createMultiBox();
    geoUtils.createGLTFModel();

    sceneMeshesRef.current.push(geoUtils.basicBoxObj, geoUtils.multiBoxObj);
    const sphereUtils = new SphereUtils(scene, world, textureLoader, texturedMaterials, mouseUtils, imageUtils, shaderManager, physics, gaussianDistribution, shaderManager.wrinkledCoalMaterial, sceneMeshesRef.current, geoUtils.boundaryObj);

    // Step 5: Create sand particles with assigned material and interaction properties
    const particles = new Particles(scene, world, shaderManager, mouseUtils, textureLoader, texturedMaterials, noiseMaterial, particleCount);
    // if (trackIndex === currentTrackIndex && isPlaying) {
    //   particles.createParticles(params.radius, params.mass, params.sleepSpeedLimit, params.sleepTimeLimit, params.linearDamping);
    // }
    particles.createParticles(params.radius, params.mass, params.sleepSpeedLimit, params.sleepTimeLimit, params.linearDamping);

    const animate = () => {
      requestAnimationFrame(animate);

      // Step the physics world forward
      world.step(params.deltaTime);

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
      // ✅ Only update light/camera if audio is playing
      // if (isPlaying) {
      //   light.update();
      // }
      // //

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
  }, [particleCount, randomHexColor]);

  return <canvas ref={canvasRef} />
};

export default FloatingTerrains;

















    // geoUtils.create3DBoxObject();
import * as THREE from 'three';
import AtlanticShaderMaterials from '../Shaders/AtlanticShaderMaterials';
import BeachShaderMaterials from '../Shaders/BeachShaderMaterials';
import ConvolutionShaderMaterials from '../Shaders/ConvolutionShaderMaterials';
import DragonCityShaderMaterials from '../Shaders/DragonCityShaderMaterials';
import ExplosiveShaderMaterials from '../Shaders/ExplosiveShaderMaterials';
import FrequencyShaderMaterials from '../Shaders/FrequencyShaderMaterials';
import GalacticEuphoricShaderMaterials from '../Shaders/GalacticEuphoricShaderMaterials';
import GalacticLakeWaterShaderMaterials from '../Shaders/GalacticLakeWaterShaderMaterials';
import GiantBugsShaderMaterials from '../Shaders/GiantBugsShaderMaterials';
import GrailShaderMaterials from '../Shaders/GrailShaderMaterials.js';
import GraphShaderMaterials from '../Shaders/GraphShaderMaterials';
import GrassFieldMaterial from '../Shaders/GrassFieldMaterials';
import LandScapeMaterials from '../Shaders/LandScapeMaterials';
import LavaCaveShaderMaterials from '../Shaders/LavaCaveShaderMaterials';
import LucentShaderMaterials from '../Shaders/LucentShaderMaterials';
import MangroveShaderMaterials from '../Shaders/MangroveShaderMaterials';
import MarienBedShaderMaterials from '../Shaders/MarineBedShaderMaterials';
import MillWorkShaderMaterials from '../Shaders/MillWorksShaderMaterials';
import MoltenTerrazoMaterials from '../Shaders/MoltenTerrazoMaterials';
import NoiseShaderMaterials from '../Shaders/NoiseShaderMaterials';
import ParkCityShaderMaterials from '../Shaders/ParkCityShaderMaterials';
import RainForestLandScapeShaderMaterials from '../Shaders/RainForestLandScapeShaderMaterials';
import SandyPlainShaderMaterials from '../Shaders/SandyPlainShaderMaterials';
import SavannahShaderMaterials from '../Shaders/SavannahShaderMaterials';
import SawShaderMaterials from '../Shaders/SawShaderMaterials';
import SkyLineMaterials from '../Shaders/SkyLineMaterials';
import SwampShaderMaterials from '../Shaders/SwampShaderMaterials';
import TerrainShaderMaterials from '../Shaders/TerrainShaderMaterials';
import TerrestialMosaicMaterials from '../Shaders/TerrestialMosaicMaterials';
import TunnelTubeCityMaterials from '../Shaders/TunnelTubeCityMaterials';
import WaterFallShaderMaterials from '../Shaders/WaterFallShaderMaterials';
import WrinkledShaderMaterials from '../Shaders/WrinkledShaderMaterials';

class ShaderManager {
  constructor(params,
    mouse = null) {
    // this.params = {
    //   width: params.width ?? window.innerWidth,
    //   height: params.height ?? window.innerHeight,
    //   time: params.time ?? 0.1,
    //   deltaTime: params.deltaTime ?? 1 / 60,
    //   shapeFactor: params.shapeFactor ?? 0.5,
    //   cubeTexture: params.cubeTexture ?? null,
    //   explodeIntensity: params.explodeIntensity ?? 0.1,
    //   thickness: params.thickness ?? 1,
    //   flatShading: params.flatShading ?? true,
    //   u_frequency: params.u_frequency ?? 0.0,
    // }

    this.params = params;
    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse.mouse;

    // this.activateManagers();
    this.setShaderManagers();
    this.setShaderMaterials();
    this.setShaders();
    // this.updateMouseHoverEvents();
  }

  initializeManagers(ShaderClass) {
    return new ShaderClass(
      // this.width,
      // this.height,
      // this.deltaTime,
      // this.time,
      // this.shapeFactor,
      // this.cubeTexture,
      // this.explodeIntensity,
      // this.thickness,
      // this.flatShading,
      // this.u_frequency,
      this.params,
      this.mouse
    );
  }

  setShaderManagers() {
    const shaderManagers = [
      // // Saw and Noise Manager
      { name: 'sawManager', material: SawShaderMaterials },
      { name: 'noiseManager', material: NoiseShaderMaterials },

      // // Wrinkle Convolutions and Explosive Managers
      { name: 'wrinkledManager', material: WrinkledShaderMaterials },
      { name: 'explosiveManager', material: ExplosiveShaderMaterials },
      { name: 'convolutionManager', material: ConvolutionShaderMaterials },

      // // Terrain Managers
      { name: 'tunnelManager', material: TunnelTubeCityMaterials },
      { name: 'terrainManager', material: TerrainShaderMaterials },

      // Lucent Mozaics
      { name: 'moltenManager', material: MoltenTerrazoMaterials },
      { name: 'lucentManager', material: LucentShaderMaterials },

      // Music and Frequency
      { name: 'graphManager', material: GraphShaderMaterials },
      { name: 'frequencyManager', material: FrequencyShaderMaterials },

      //  Estate Management
      { name: 'skylineManager', material: SkyLineMaterials },
      { name: 'landScapeManager', material: LandScapeMaterials },
      { name: 'parkCityManager', material: ParkCityShaderMaterials },
      { name: 'terrestialManager', material: TerrestialMosaicMaterials },
      { name: 'dragonCityManager', material: DragonCityShaderMaterials },
      // { name: 'grailManager', material: GrailShaderMaterials },

      // Water Scenery
      { name: 'beachManager', material: BeachShaderMaterials },
      { name: 'lavaManager', material: LavaCaveShaderMaterials },
      { name: 'bugManager', material: GiantBugsShaderMaterials },
      { name: 'mangroveManager', material: MangroveShaderMaterials },

      // Forest LandScape
      { name: 'swampManager', material: SwampShaderMaterials },
      { name: 'waterFallsManager', material: WaterFallShaderMaterials },
      { name: 'lakeManager', material: GalacticLakeWaterShaderMaterials },
      { name: 'forestManager', material: RainForestLandScapeShaderMaterials },
      { name: 'tropicalManager', material: RainForestLandScapeShaderMaterials },

      // Tropical Grass and Savannah
      { name: 'grassManager', material: GrassFieldMaterial },
      { name: 'savannahManager', material: SavannahShaderMaterials },
      { name: 'sandyPlainManager', material: SandyPlainShaderMaterials },

      // Ocean and Marine Life
      { name: 'marineManager', material: MarienBedShaderMaterials },
      { name: 'atlanticManager', material: AtlanticShaderMaterials },
      { name: 'millworkManager', material: MillWorkShaderMaterials },
    ];

    // Loop through each manager and initialize them

    this.shaderManagers = {};

    shaderManagers.forEach(({ name, material }) => {
      const manager = this.initializeManagers(material);
      this[name] = manager;
      this.shaderManagers[name] = manager;
    });
  }

  setShaders() {
    this.shaders = {};

    for (const [managerName, managerInstance] of Object.entries(this.shaderManagers)) {
      for (const [key, value] of Object.entries(managerInstance)) {
        if (key.toLowerCase().includes('shader')) {
          this[key] = value;
          this.shaders[key] = value; // Optional: Keep a collection
        }
      }
    }
    console.log(this.shaders);
  }

  setShaderMaterials() {
    this.shaderMaterials = {};

    for (const [managerName, managerInstance] of Object.entries(this.shaderManagers)) {
      for (const [key, value] of Object.entries(managerInstance)) {
        if (key.toLowerCase().includes('material')) {
          this[key] = value;
          this.shaderMaterials[key] = value; // Optional: Keep a collection
        }
      }
    }
  }

  computeVelocity(v) {
    return new THREE.Vector3(
      v.x + 5.0,
      v.y + Math.sin(v.y),
      v.z + 1.0
    );
  }

  coolDownRipples(u, meshObj) {
    const id = meshObj.uuid || meshObj.id;
    const cooldownMs = 300;

    u.u_collisionDetected = 1.0;

    if (this.rippleCooldowns.has(id)) {
      clearTimeout(this.rippleCooldowns.get(id));
    }

    const timeoutId = setTimeout(() => {
      u.u_collisionDetected = 0.0;
      this.rippleCooldowns.delete(id);
    }, cooldownMs);

    this.rippleCooldowns.set(id, timeoutId);
  }

  applyMeshUniformUpdates(u, meshObj, hit) {
    const now = performance.now();
    const v = meshObj.velocity || new THREE.Vector3(0, 0, 0);

    if (u.u_meshPosition?.set) u.u_meshPosition.set(hit.x, hit.y, hit.z);
    if (u.u_velocity?.set) u.u_velocity.copy(this.computeVelocity(v));
    if (u.u_rippleOrigin?.set) u.u_rippleOrigin.set(hit.x, hit.y, hit.z);
    if (u.u_intersectionPoint?.set) u.u_intersectionPoint.set(hit.x, hit.y, hit.z);
    if (typeof u.u_rippleTime !== 'undefined') u.u_rippleTime = now * 0.001;
    if (typeof u.u_collisionDetected !== 'undefined') this.coolDownRipples(u, meshObj);
  }

  updateShaderUniforms(meshObj, collisionPoint = null) {
    const hit = collisionPoint || meshObj.position;

    this.shaders.forEach(shader => {
      const u = shader?.uniforms?.customUniforms?.value;
      if (u) {
        this.applyMeshUniformUpdates(u, meshObj, hit);
      }
    });
  }

  handleResize(width = window.innerWidth, height = window.innerHeight) {
    // Each shader handles its own resolution updates
    Object.values(this.shaderManagers).forEach(manager => {
      if (manager?.handleResize instanceof Function) {
        manager.handleResize(width, height);
      }
    });
  }

  update() {
    Object.values(this.shaderManagers).forEach(manager => {
      if (manager?.update instanceof Function) {
        manager.update();
      }
    });
  }

}
export default ShaderManager;




















  // Saw and Noise Manager

  // activateManagers() {
  //   // Saw and Noise Manager
  //   this.initializeManagers(SawShaderMaterials);
  //   this.initializeManagers(NoiseShaderMaterials);

  //   // Convolutions and Explosive Managers
  //   this.initializeManagers(ExplosiveShaderMaterials);
  //   this.initializeManagers(ConvolutionShaderMaterials);

  //   // Wrinkled Manager    
  //   this.initializeManagers(WrinkledShaderMaterials);

  //   // Music-Frequency Manager
  //   this.initializeManagers(FrequencyShaderMaterials);
  // }
  // this.sawManager = this.initializeManagers(SawShaderMaterials);
  // this.noiseManager = this.initializeManagers(NoiseShaderMaterials);

  // // Convolutions and Explosive Managers
  // this.explosiveManager = this.initializeManagers(ExplosiveShaderMaterials);
  // this.convolutionManager = this.initializeManagers(ConvolutionShaderMaterials);

  // // Wrinkled Manager    
  // this.wrinkledManager = this.initializeManagers(WrinkledShaderMaterials);
  // // this.wrinkledBubbleManager = this.initializeManagers(NoiseShaderMaterials);

  // // Terrain Manager
  // this.tunnelManager = this.initializeManagers(TunnelTubeCityMaterials);
  // this.terrainManager = this.initializeManagers(TerrainShaderMaterials);

  // // Music-Frequency Manager
  // this.frequencyManager = this.initializeManagers(FrequencyShaderMaterials);

  // // Music-Frequency Manager
  // this.skylineManager = this.initializeManagers(SkyLineMaterials);// }

  // setShaderMaterials() {
  //   // Saw Materials
  //   this.sawMaterial = this.sawManager.sawMaterial;
  //   this.axialSawMaterial = this.sawManager.axialSawMaterial;

  //   // // Noise Materials
  //   this.noiseMaterial = this.noiseManager.noiseMaterial;
  //   this.starryMaterial = this.noiseManager.starryMaterial;
  //   this.darkNoiseMaterial = this.noiseManager.darkNoiseMaterial;
  //   this.scatteredNoiseMaterial = this.noiseManager.scatteredNoiseMaterial;

  //   // Convolutions and Explosive Materials
  //   this.convolutionMaterial = this.convolutionManager.convolutionMaterial;
  //   this.explosiveMaterial = this.explosiveManager.explosiveMaterial;

  //   // Music and Frequency Materials
  //   this.icoMaterial = this.frequencyManager.icoMaterial;
  //   this.musicMaterial = this.frequencyManager.musicMaterial;
  //   this.frequencyMaterial = this.frequencyManager.frequencyMaterial;

  //   // Wrinkled  Materials
  //   this.wrinkledMaterial = this.wrinkledManager.wrinkledMaterial;
  //   this.wrinkledCoalMaterial = this.wrinkledManager.wrinkledCoalMaterial;

  //   // Terrain MaterialscityTerrainMaterial
  //   this.cityTerrainMaterial = this.terrainManager.cityTerrainMaterial;
  //   this.tunnelTerrainMaterial = this.terrainManager.tunnelTerrainMaterial;
  //   this.flyingTerrainMaterial = this.terrainManager.flyingTerrainMaterial;
  //   this.wiredCityTerrainSDFMaterial = this.terrainManager.wiredCityTerrainSDFMaterial;

  //   // Tube Materials
  //   this.tubeCityMaterial = this.tunnelManager.tubeCityMaterial;
  //   this.tunnelCityMaterial = this.tunnelManager.tunnelCityMaterial
  //   this.flyingTubeCityMaterial = this.tunnelManager.flyingTubeCityMaterial;

  //   // Glass City Skyline
  //   this.skyCityMaterial = this.skylineManager.skyCityMaterial;
  //   this.glassSkylineMaterial = this.skylineManager.glassSkylineMaterial;
  //   this.ceasarsShaderMaterial = this.skylineManager.ceasarsShaderMaterial;
  //   this.skylineTerrainMaterial = this.skylineManager.skylineTerrainMaterial;

  //   // Molten Terrazzo
  //   this.moltenTunnelMaterial = this.moltenManager.moltenTunnelMaterial
  //   this.moltenSiliconMaterial = this.moltenManager.moltenSiliconMaterial;
  //   this.flyingMoltenSiliconMaterial = this.moltenManager.flyingMoltenSiliconMaterial;
  // }

  // Adding mouse hover functionality
  // Attach the event listener
  // addMouseHover() {
  //   window.addEventListener('mousemove', this.onMouseMove);

  //   // window.addEventListener('mousemove', onMouseMove);
  // }

  // handleMouseMoveEvent(even) {
  //     this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //     this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //     // Delegate to each manager to handle the hover effect
  //     this.sawManager.updateHoverEffect(this.mousePosition);
  //     this.noiseManager.updateHoverEffect(this.mousePosition);
  //     this.explosiveManager.updateHoverEffect(this.mousePosition);
  //     this.convolutionManager.updateHoverEffect(this.mousePosition);
  //     this.frequencyManager.updateHoverEffect(this.mousePosition);
  //     this.wrinkledManager.updateHoverEffect(this.mousePosition);
  //     this.terrainManager.updateHoverEffect(this.mousePosition, event);
  //     this.skylineManager.updateHoverEffect(this.mousePosition);
  //     this.moltenManager.updateHoverEffect(this.mousePosition);
  //   // }
  // }

  // updateMouseHoverEvents() {
  //   window.addEventListener('mousemove', this.handleMouseMoveEvent);
  // }


  // // Remove the mousemove event listener to prevent memory leaks
  // removeMouseHoverEvents() {
  //   if (this.onMouseMove) {
  //     window.removeEventListener('mousemove', this.updateHoverEvents);
  //     this.updateHoverEvents = null;
  //   }
  // }
  // handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
  //   if (!renderer) return;

  //   // Update Shader Resolutions
  //   this.sawManager.handleResize(width, height);
  //   this.noiseManager.handleResize(width, height);
  //   this.explosiveManager.handleResize(width, height);
  //   this.convolutionManager.handleResize(width, height);
  //   this.frequencyManager.handleResize(width, height);
  //   this.wrinkledManager.handleResize(width, height);
  //   this.terrainManager.handleResize(width, height);
  //   this.tunnelManager.handleResize(width, height);
  //   this.skylineManager.handleResize(width, height);
  //   this.moltenManager.handleResize(width, height);
  // }

  // Update method for shader uniforms and dynamic behavior
  // update() {
  // this.managers.forEach(manager => {
  //     if (manager && typeof manager.update === 'function') {
  //       manager.update();
  //     }
  //   });
  // }
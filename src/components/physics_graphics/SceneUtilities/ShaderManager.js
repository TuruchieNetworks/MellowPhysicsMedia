import * as THREE from 'three';
import ConvolutionShaderMaterials from '../Shaders/ConvolutionShaderMaterials';
import ExplosiveShaderMaterials from '../Shaders/ExplosiveShaderMaterials';
import FrequencyShaderMaterials from '../Shaders/FrequencyShaderMaterials';
import LucentShadereMaterials from '../Shaders/LucentShadaerMaterials';
import MoltenTerrazoMaterials from '../Shaders/MoltenTerrazoMaterials';
import NoiseShaderMaterials from '../Shaders/NoiseShaderMaterials';
import SawShaderMaterials from '../Shaders/SawShaderMaterials';
import SkyLineMaterials from '../Shaders/SkyLineMaterials';
import TerrainShaderMaterials from '../Shaders/TerrainShaderMaterials';
import TunnelTubeCityMaterials from '../Shaders/TunnelTubeCityMaterials';
import WrinkledShaderMaterials from '../Shaders/WrinkledShaderMaterials';

class ShaderManager {
  constructor(width = window.innerWidth,
    height = window.innerHeight,
    deltaTime = 1 / 60,
    time = 0.1,
    shapeFactor = 0.5,
    cubeTexture = null,
    explodeIntensity = 0.1,
    thickness = 1,
    flatShading = true,
    u_frequency = 0.0,
    mouse = null) {
    this.width = width;
    this.height = height;
    this.time = time;
    this.u_frequency = u_frequency;
    this.thickness = thickness;
    this.explodeIntensity = explodeIntensity;
    this.flatShading = flatShading;
    this.deltaTime = deltaTime;
    this.shapeFactor = shapeFactor;
    this.cubeTexture = cubeTexture;

    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse.mouse;

    // this.activateManagers();
    this.setShaderManagers();
    this.setShaderMaterials();
    // this.updateMouseHoverEvents();
  }

  initializeManagers(ShaderClass) {
    return new ShaderClass(
      this.width,
      this.height,
      this.deltaTime,
      this.time,
      this.shapeFactor,
      this.cubeTexture,
      this.explodeIntensity,
      this.thickness,
      this.flatShading,
      this.u_frequency,
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
      { name: 'lucentManager', material: LucentShadereMaterials },

      // Music and Frequency
      { name: 'frequencyManager', material: FrequencyShaderMaterials },
      { name: 'skylineManager', material: SkyLineMaterials },
    ];

    // Loop through each manager and initialize them

    this.shaderManagers = {};

    shaderManagers.forEach(({ name, material }) => {
      const manager = this.initializeManagers(material);
      this[name] = manager;
      this.shaderManagers[name] = manager;
    });

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
  update() {
    [this.sawManager, this.noiseManager, this.explosiveManager,
    this.convolutionManager, this.frequencyManager,
    this.wrinkledManager, this.terrainManager, this.tunnelManager,
    this.skylineManager, this.moltenManager, this.lucentManager].forEach(manager => {
      if (manager && typeof manager.update === 'function') {
        manager.update();
      }
    });
    // // Noise and Saw Managers Updates
    // if (this.sawManager) this.sawManager.update();
    // if (this.noiseManager) this.noiseManager.update();

    // // Convolutions and Explosive Managers Updates
    // if (this.explosiveManager) this.explosiveManager.update();
    // if (this.convolutionManager) this.convolutionManager.update();

    // // Wrinkled Managers Updates 
    // if (this.wrinkledManager) this.wrinkledManager.update();
    // // if (this.wrinkledBubbleManager) this.wrinkledBubbleManager.update();

    // // Music-Frequency Managers Updates
    // if (this.frequencyManager) this.frequencyManager.update();

    // // Terrain Manager
    // if (this.terrainManager) this.terrainManager.update();
  }
}
export default ShaderManager;
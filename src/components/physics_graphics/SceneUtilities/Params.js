import * as THREE from 'three';
class Params {
  constructor() {
    this.loadParams();
    this.loadShaderParams();
    this.loadCustomShaderUniforms();
  }

  loadParams() {
    this.speed = 5.0;
    this.speedFactor = 1;
    this.deltaTime = 1 / 60;
    this.shapeFactor = 0.5;
    this.explodeIntensity = 0.1;
    this.boundary = 80;
    this.thickness = 4.2;
    this.flatShading = true;
    this.u_frequency = 0.0;
    this.withFiniteGround = false;
    this.withPlanePad = true;
    this.withPlaneBox = true;
    this.mass = 13.1;
    this.radius = 1.6;
    this.cubeSize = 50;
    this.sleepTimeLimit = 3;
    this.linearDamping = 0.1;
    this.sleepSpeedLimit = 3.1;
    this.time = 1.0;

    // light params
    this.axesSize = 5;
    this.gridSize = 30;
    this.gridDivisions = 80;
    this.withHelpers = true;
  }

  loadShaderParams() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.clock = new THREE.Clock();
    this.sineTime = 0.0;
    this.time = this.clock.getElapsedTime();
    this.deltaTime = 1 / 60;
    this.shapeFactor = 0.5;
    this.cubeTexture = null;
    this.explodeIntensity = 0.1;
    this.thickness = 1.0;
    this.flatShading = 1.0;
    this.u_frequency = 0.0;
    this.hovered = 0.0;
  }

  loadCustomShaderUniforms() {
    this.customShaderUniforms = {
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_sine_time: { value: this.sineTime },
      u_time: { value: this.clock.getElapsedTime() },
      u_meshPosition: { value: new THREE.Vector3() },
      u_rippleOrigin: { value: new THREE.Vector3() },
      u_velocity: { value: new THREE.Vector3() },
      u_rippleTime: { value: 0.0 },

      // Optional extensions
      u_terrainElevation: { value: 0.0 },

      // 🌧️ Add new uniform for weather effect toggle
      climateCondition: { value: 0.0 },
      musicUniforms: {value: this.musicUniforms},
      interactiveUniforms: {value: this.interactiveUniforms},
    }

    // Music And Frequency
    this.musicUniforms = {
      u_frequency: { value: this.u_frequency }, // Current frequency value from the audio analysis
      u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
      u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
      u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
    }

      // Interactions
    this.interactiveUniforms = {
      hovered: { value: this.hovered },
      shapeFactor: { value: this.shapeFactor },
      flatShading: { value: this.flatShading }, // Retain flat shading
      explodeIntensity: { value: this.explodeIntensity },

      // Optional extensions
      u_intersectionPoint: { value: new THREE.Vector3() },
    }
  };

  getUniforms(...keys) {
    return keys.reduce((acc, key) => {
      if (this.params.shaderUniforms[key]) {
        acc[key] = this.params.shaderUniforms[key];
      }
      return acc;
    }, {});
  }
}

export default Params;

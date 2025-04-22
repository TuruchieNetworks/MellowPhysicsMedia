import * as THREE from 'three';

export class ExplosiveShaderMaterials {
  constructor(params,
    mouse) {
    this.params = params;
    this.width = this.params.width ?? window.innerWidth;
    this.height = this.params.height ?? window.innerHeight;
    this.clock = this.params.clock ?? new THREE.Clock();
    this.sineTime = this.params.sineTime ?? this.params.time;
    this.time = this.params.time ?? this.clock.getElapsedTime();
    this.deltaTime = this.params.deltaTime ?? 1 / 60;
    this.shapeFactor = this.params.shapeFactor ?? 0.5;
    this.cubeTexture = this.params.cubeTexture ?? null;
    this.explodeIntensity = this.params.explodeIntensity ?? 0.1;
    this.thickness = this.params.thickness ?? 1;
    this.flatShading = this.params.flatShading ?? true;
    this.u_frequency = this.params.u_frequency ?? 0.0;
    this.hovered = this.params.hovered ?? 0.1;

    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse;

    this.useExplosiveShader();
    this.updateEvents();
    this.getShaders();
  }

  useExplosiveShader() {
    this.explosiveShader = {
      uniforms: {
        u_red: { value: 1.0 },
        u_green: { value: 1.0 },
        u_blue: { value: 1.0 },
        u_ampFactor: { value: 1.0 },           // Amplitude factor to scale frequency effects
        u_frequency: { value: this.u_frequency },           // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        u_resolution: { value: new THREE.Vector2(this.width, this.height) }, // Resolution (screen size)
        hovered: { value: this.hovered},
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        backgroundTexture: { value: this.cubeTexture },
        side: { value: this.side }, // Retain the side parameter
        flatShading: { value: this.flatShading }, // Retain flat shading
        color: { value: new THREE.Color() },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
        uniform float sineTime;
        uniform float hovered;
        uniform vec2 mousePosition;
        uniform float explodeIntensity;
        uniform float u_frequency;
        uniform float shapeFactor;
        varying vec2 vUv;

        float trapezoid(float x, float height, float width) {
            float slope = height / (width * 0.5);
            return smoothstep(0.0, slope, height - abs(x));
        }
  
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
    
        void main() {
          vUv = uv;
          vec3 pos = position;

          // Apply noise based on UV coordinates and sineTime
          float n = noise(vUv * 10.0 + sineTime * 0.1 + u_frequency);
  
          // Calculate distance to mouse position
          float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + sin(sineTime));
          float effect = hovered * smoothstep(0.2, (0.0 + sin(shapeFactor) + sineTime), dist) * noise(pos.xy * 10.0 + sin(sineTime + shapeFactor));
  
          // Apply explode effect
          pos += normal * effect * (explodeIntensity + sin(sineTime));
  
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          //gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, sin(position.z + (n * sineTime)) + cos(position.y * sineTime), cos(position.z + (n * sineTime)), 1.0);// Flat Bird
        }
      `,

      fragmentShader: `
        uniform float sineTime;
        varying vec2 vUv;
  
        // Simple 2D noise function
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        void main() {
          float value = 0.0;

          // Apply noise based on UV coordinates and sineTime
          float n = noise(vUv * 10.0 + sineTime * 0.1);
  
          // Modify the color with noise
          vec3 color = vec3(vUv.x + sin(n * 0.2), vUv.y + n * 0.2, 1.0); // Adds noise to the x and y UV-based color
  
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    this.explosiveMaterial = new THREE.ShaderMaterial(this.explosiveShader);
  } 

  getShaders() {
    this.shaders = [
      this.explosiveShader,
    ];
  }

  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }

  handleResize(width = window.innerWidth, height = window.innerHeight) {
    // Each shader handles its own resolution updates
    this.shaders.forEach(shader => {if (shader) this.updateResolution(shader, width, height)});
  }

  handleHoverEffect(mousePosition) {
    if (!mousePosition) return;
    // Update the shader with the current mouse position and toggle the effect
    this.shaders.forEach(shader => {
      shader.uniforms.mousePosition.value =  new THREE.Vector2(mousePosition.x, mousePosition.y);
      shader.uniforms.explodeIntensity.value += this.explodeIntensity + Math.sin(this.sineTime + this.explodeIntensity);
      shader.uniforms.hovered.value = 1.0;
    });
  }

  updateHoverEffect(event) {
    if (event && this.mousePosition) {
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
  
    // Update the shader with the current mouse position and toggle the effect
    this.shaders.forEach(shader => {
      if (shader) this.handleHoverEffect(shader, this.mousePosition);
    });
  }

  updateEvents() {
    window.addEventListener('mousemove', (e) => {
      this.updateHoverEffect(e);
    });
  }

  // Update method for shader uniforms and dynamic behavior
  update() {
    this.sineTime += this.deltaTime; // Update sineTime for animation

    // Update other uniforms if necessary
    this.shaders.forEach(shader => {
    if (shader) {
      shader.uniforms.sineTime.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
      shader.uniforms.explodeIntensity.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
    }
  });
  }

}
export default ExplosiveShaderMaterials
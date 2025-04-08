import * as THREE from 'three';

export class ExplosiveShaderMaterials {
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
    mousePosition) {
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
    this.hovered = 0.1;

    // Mouse Utils
    this.mousePosition = mousePosition;

    this.useExplosiveShader();
    // this.updateEvents();
  }

  useExplosiveShader() {
    this.explosiveShader = {
      uniforms: {
        u_red: { value: 1.0 },
        u_green: { value: 1.0 },
        u_blue: { value: 1.0 },
        u_frequency: { value: this.u_frequency },           // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 },           // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        u_resolution: { value: new THREE.Vector2(this.width, this.height) }, // Resolution (screen size)
        time: { value: this.time },
        hovered: { value: this.hovered},
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: new THREE.Vector2(this.mousePosition ) },
        // mousePosition: { value: new THREE.Vector2(this.mousePosition.x / this.width, this.mousePosition.y / this.height) },
        explodeIntensity: { value: this.explodeIntensity },
        backgroundTexture: { value: this.cubeTexture },
        side: { value: this.side }, // Retain the side parameter
        flatShading: { value: this.flatShading }, // Retain flat shading
        color: { value: new THREE.Color() }
      },

      vertexShader: `
        uniform float time;
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

          // Apply noise based on UV coordinates and time
          float n = noise(vUv * 10.0 + time * 0.1 + u_frequency);
  
          // Calculate distance to mouse position
          float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + sin(time));
          float effect = hovered * smoothstep(0.2, (0.0 + sin(shapeFactor) + time), dist) * noise(pos.xy * 10.0 + sin(time + shapeFactor));
  
          // Apply explode effect
          pos += normal * effect * (explodeIntensity + sin(time));
  
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          //gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, sin(position.z + (n * time)) + cos(position.y * time), cos(position.z + (n * time)), 1.0);// Flat Bird
        }
      `,

      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
  
        // Simple 2D noise function
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        void main() {
          float value = 0.0;

          // Apply noise based on UV coordinates and time
          float n = noise(vUv * 10.0 + time * 0.1);
  
          // Modify the color with noise
          vec3 color = vec3(vUv.x + sin(n * 0.2), vUv.y + n * 0.2, 1.0); // Adds noise to the x and y UV-based color
  
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    this.explosiveMaterial = new THREE.ShaderMaterial(this.explosiveShader);
  }  

  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }
  
  handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
    if (!renderer) return;

    // Each shader handles its own resolution updates
    if (this.explosiveShader) this.updateResolution(this.explosiveShader, width, height);
  }

  handleHoverEffect(mousePosition) {
    if (!mousePosition) return;
    // Update the shader with the current mouse position and toggle the effect
    this.explosiveShader.uniforms.mousePosition.value =  new THREE.Vector2(mousePosition.x, mousePosition.y);
    this.explosiveShader.uniforms.explodeIntensity.value += this.explodeIntensity + Math.sin(this.time + this.explodeIntensity);
    this.explosiveShader.uniforms.hovered.value = 1.0;
  }

  updateHoverEffect(event) {
    if (event && this.mouseUtils.mouse) {
      this.mouseUtils.updateMouse(event);
    }

    // Update internal mousePosition
    this.mousePosition = this.mouseUtils.getMousePosition();

    // Update shaders if available
    if (this.explodeIntensity) this.handleHoverEffect(this.explodeIntensity, this.mousePosition);
  }

  updateEvents() {
    window.addEventListener('mousemove', (e) => {
      this.updateHoverEffect(e);
    });
  }

  // Update method for shader uniforms and dynamic behavior
  update() {
    this.time += this.deltaTime; // Update time for animation

    // Update other uniforms if necessary
    if (this.explosiveShader) {
      this.explosiveShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.explosiveShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }
  }

}
export default ExplosiveShaderMaterials
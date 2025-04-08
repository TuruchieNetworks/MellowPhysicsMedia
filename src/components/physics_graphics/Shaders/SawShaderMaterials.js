import * as THREE from 'three';

class SawShaderMaterials {
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

    this.useSawShader();
    this.useAxialSawShader();
    // this.updateEvents();
  }

  // Noise Plane
  useSawShader() {
    this.sawShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        shapeFactor: { value: this.shapeFactor }, // Control for trapezoidashape
        u_frequency: { value: this.u_frequency }, // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        hovered: { value: this.hovered },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        backgroundTexture: { value: this.cubeTexture },
        side: { value: this.side }, // Retain the side parameter
        flatShading: { value: this.flatShading }, // Retain flat shading
      },

      vertexShader: `
        varying vec2 vUv;
        void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,

      fragmentShader: `
        uniform float time;
        uniform float shapeFactor;
        varying vec2 vUv;

        float noise(float x, float z) {
          return fract(sin(dot(vec2(x, z) + time, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float S(float t) {
          return smoothstep(0.0, 1.0, t);
        }

        void main() {
          vec2 uv = vUv * 10.0; // Scale the UV coordinates
          float x = uv.x;
          float z = uv.y;

          // note: set up basic colors
          vec3 black = vec3(0.0);
          vec3 white = vec3(1.0);
          vec3 red = vec3(time, 0.0, 0.0);
          vec3 blue = vec3(0.65, 0.85, 1.0);
          vec3 orange = vec3(0.9, 0.6, 0.3);
          vec3 color = red;

          float burst = noise(x + shapeFactor, z);
          float value = 0.2;

          // color = vec3(uv, 0.0);

          /*vec2 uv = gl_FragCoord.xy / vUv;
            uv = uv - 0.5;
            uv = uv * vUv / 100.0;
          */

          for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
              float aij = 0.0; // base value
              float bij = 1.0; // variation
              float cij = 0.51; // adjust
              float dij = 0.33; // noise contribution

              value += aij + (bij - aij) * S(x - float(i)) + (aij - bij - cij + dij) * S(x - float(i)) * S(z - float(j));
            }
          }
          vec3 noiseColor = vec3(burst, value, burst + value);

          // gl_FragColor = vec4(vec3(value + burst), 1.0); // Change the color based on the shader output 
          gl_FragColor = vec4(noiseColor, time);
        }
      `,
    };

    this.sawMaterial = new THREE.ShaderMaterial(this.sawShader);
  };

  useAxialSawShader() {
    this.axialSawShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        shapeFactor: { value: this.shapeFactor }, // Control for trapezoidashape
        u_frequency: { value: this.u_frequency },           // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 },           // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        mousePosition: { value: this.mousePosition },
        hovered: { value: this.hovered },
        explodeIntensity: { value: this.explodeIntensity },
        backgroundTexture: { value: this.cubeTexture },
        side: { value: this.side }, // Retain the side parameter
        flatShading: { value: this.flatShading }, // Retain flat shadingl 
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float shapeFactor; // Now we can adjust this dynamically
        varying vec2 vUv;

        float noise(float x, float z) {
          return fract(sin(dot(vec2(x, z) + time, vec2(12.9898, 78.233))) * 43758.5453);
        }

        float S(float t) {
          return smoothstep(0.0, 1.0, t);
        }

        void main() {
          vec2 uv = vUv * 10.0 * shapeFactor; // Scale UV based on shapeFactor
          float x = uv.x;
          float z = uv.y;

          vec3 color = vec3(0.65, 0.85, 1.0); // Blue color
          float burst = noise(x, z);
          float value = 0.2;

          for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
              float aij = 0.0;
              float bij = 1.0;
              float cij = 0.51;
              float dij = 0.33;

              value += aij + (bij - aij) * S(x - float(i)) + (aij - bij - cij + dij) * S(x - float(i)) * S(z - float(j));
            }
          }

          vec3 noiseColor = vec3(burst, value, burst + value);
          gl_FragColor = vec4(noiseColor, 1.0);
        }
      `
    };

    this.axialSawMaterial = new THREE.ShaderMaterial(this.axialSawShader);
  }
  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }

  updateResize(shader, width = window.innerWidth, height = window.innerHeight) {
    if (shader) this.updateResolution(shader, width, height);
  }

  handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
    if (!renderer) return;

    // Each shader handles its own resolution updates
    if (this.sawShader) this.updateResolution(this.sawShader, width, height);
    if (this.axialSawShader) this.updateResolution(this.axialSawShader, width, height);
  }

  handleHoverEffect(shader, mousePosition) {
    if (!shader && !mousePosition)
    // Update the shader with the current mouse position and toggle the effect
    shader.uniforms.mousePosition.value = new THREE.Vector2(mousePosition.x, mousePosition.y);
    shader.uniforms.hovered.value = 1.0;
  }

  updateHoverEffect(event) {
    if (event && this.mousePosition) {
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
      // this.mouseUtils.updateMouse(event);
    }

    // Copy Updated Mouse Position
    // this.mousePosition = this.mouseUtils.getMousePosition();

    if (this.sawShader) this.handleHoverEffect(this.sawShader, this.mousePosition);
    if (this.axialSawShader) this.handleHoverEffect(this.axialSawShader, this.mousePosition);
  }

  updateEvents() {
    window.addEventListener('mousemove', (e) => {
      this.updateHoverEffect(e);
    });
  }

  // Update method for shader uniforms and dynamic behavior
  update() {
    // this.addMouseListener();
    this.time += this.deltaTime; // Update time for animation

    // Update other uniforms if necessary
    if (this.sawShader) this.sawShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    if (this.axialSawShader) this.axialSawShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
  }

}
export default SawShaderMaterials;
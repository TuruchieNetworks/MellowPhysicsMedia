import * as THREE from 'three';

class SawShaderMaterials {
  constructor(params,
    mouse) {
    this.params = params;
    this.width = this.params.width ?? window.innerWidth;
    this.height = this.params.height ?? window.innerHeight;
    this.clock = this.params.clock ?? new THREE.Clock();
    this.sineTime = this.params.sineTime ?? 0.0;
    this.time = this.params.time ?? this.clock.getElapsedTime();
    this.deltaTime = this.params.deltaTime ?? 1 / 60;
    this.shapeFactor = this.params.shapeFactor ?? 0.5;
    this.cubeTexture = this.params.cubeTexture ?? null;
    this.explodeIntensity = this.params.explodeIntensity ?? 0.1;
    this.u_frequency = this.params.u_frequency ?? 0.0;
    this.hovered = this.params.hovered ?? 0.1;

    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse;

    this.useSawShader();
    this.useAxialSawShader();
    this.updateEvents();
    this.getShaders();
  }

  // Noise Plane
  useSawShader() {
    this.sawShader = {
      uniforms: {
        sineTime: { value: this.sineTime },
        time: { value: this.clock.getElapsedTime() },
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
        flatShading: { value: this.flatShading }, // Retain flat shading

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
        varying vec2 vUv;
        void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
      `,

      fragmentShader: `
        uniform float sineTime;
        uniform float shapeFactor;
        uniform vec2 resolution;
        uniform vec2 mousePosition;
        varying vec2 vUv;

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
        }

        float noise(float x, float z) {
          return fract(sin(dot(vec2(x, z) + sineTime, vec2(12.9898, 78.233))) * 43758.5453);
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
          vec3 red = vec3(sineTime, 0.0, 0.0);
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
          gl_FragColor = vec4(noiseColor, sineTime);
        }
      `,
    };

    this.sawMaterial = new THREE.ShaderMaterial(this.sawShader);
  };

  useAxialSawShader() {
    this.axialSawShader = {
      uniforms: {
        sineTime: { value: this.sineTime },
        time: { value: this.clock.getElapsedTime() },
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
        flatShading: { value: this.flatShading }, // Retain flat shading

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float sineTime;
        uniform float shapeFactor; // Now we can adjust this dynamically
        varying vec2 vUv;

        float noise(float x, float z) {
          return fract(sin(dot(vec2(x, z) + sineTime, vec2(12.9898, 78.233))) * 43758.5453);
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

  getShaders() {
    this.shaders = [
      this.sawShader,
      this.axialSawShader
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
  
  updateMouseExit() {
    this.shaders.forEach(shader => {
      if (shader?.uniforms?.hovered) {
        shader.uniforms.hovered.value = 0.0;
      }
    });
  }
  
  handleMouseMove(event) {
    if (event && this.mousePosition) {
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    this.shaders.forEach(shader => {
      if (!shader?.uniforms) return;
      
      const { uniforms } = shader;
  
      if (uniforms.hovered) uniforms.hovered.value = 1.0;
      if (uniforms.mousePosition) uniforms.mousePosition.value.set(this.mousePosition.x, this.mousePosition.y);
      if (uniforms.explodeIntensity) uniforms.explodeIntensity.value = Math.sin(this.explodeIntensity + this.sineTime);
      if (uniforms.shapeFactor) uniforms.shapeFactor.value = this.shapeFactor + (this.sineTime * Math.sin(0.001 + this.sineTime));
    });
  }
  
  updateEvents() {
    // Only bind listeners once
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseout', () => this.updateMouseExit());
  }

  update() {
    this.sineTime += this.deltasineTime;
    const elapsed = this.clock.getElapsedTime();
    this.shaders.forEach(shader => {
      if (shader) {
        shader.uniforms.sineTime.value =  elapsed;
        shader.uniforms.shapeFactor.value = this.sineTime * Math.sin(0.001 + this.sineTime);
        shader.uniforms.sineTime.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
        shader.uniforms.explodeIntensity.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
      }
    });
  }
}
export default SawShaderMaterials;
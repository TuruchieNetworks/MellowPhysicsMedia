import * as THREE from 'three';

export class NoiseShaderMaterials {
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

    // this.addMouseHover();
    // this.addMouseListener();
    this.useNoiseShader();
    this.useDarkNoiseShader();
    this.useStarryBackgrounds();
    this.useScatteredNoise();
    this.updateEvents();
    this.getShaders();
  }

  useStarryBackgrounds() {
    this.starryShader = {
      uniforms: {
        hovered: { value: this.hovered},
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime()},
        mousePosition: { value: this.mousePosition },
        backgroundTexture: { value: this.cubeTexture },
        explodeIntensity: { value: this.explodeIntensity},
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
      uniform samplerCube backgroundTexture;
      varying vec3 vWorldPosition;

      // Simple random noise function
      float randomNoise(vec3 pos) {
        return fract(sin(dot(pos.xyz * sin(time), vec3(12.9898, 78.233, 54.53))) * 43758.5453);
      }

      void main() {
          vec4 texColor = textureCube(backgroundTexture, vWorldPosition);
          float noise = randomNoise(vWorldPosition * 0.1);
          vec3 color = mix(texColor.rgb, vec3(1.0, 0.8, 0.6), noise * 0.2); // Adding subtle noise effect
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    this.starryMaterial = new THREE.ShaderMaterial(this.starryMaterial);
  }

  useNoiseShader() {
    this.noiseShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime()},
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            //gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, sin(position.z) + cos(position.y), cos(position.z), 1.0);// Flat Bird
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;

        // https://iquilezles.org/articles/distfunctions2d/
        float sdfCircle(vec2 p, float r) {
        // note: sqrt(pow(p.x, 2.0) + pow(p.y, 2.0)) - r;
          return length(p) - r;
        }

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

          // vec2 uv = gl_FragCoord.xy / u_resolution;
          // uv = uv - 0.5;
          // uv = uv * u_resolution / 100.0;

          // note: set up basic colors
          vec3 black = vec3(0.0);
          vec3 white = vec3(1.0);
          vec3 red = vec3(1.0, 0.0, 0.0);
          vec3 blue = vec3(0.65, 0.85, 1.0);
          vec3 orange = vec3(0.9, 0.6, 0.3);
          vec3 color = black;
          color = vec3(uv.x, uv.y, 0.0);

          float burst = noise(x, z);
          float value = 0.0;

          for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
              float aij = 0.1; // base value
              float bij = 1.7; // variation
              float cij = 0.51; // adjust
              float dij = 0.33; // noise contribution

              value += aij + (bij - aij) * S(x - float(i)) + (aij - bij - cij + dij) * S(x - float(i)) * S(z - float(j));
            }
          }

          vec3 noiseColor = vec3(value + burst);
          vec3 axialNoiseColor = vec3((value * value) + (burst + burst));

          // note: draw circle sdf
          float radius = 2.5;
          // radius = 3.0;
          vec2 center = vec2(0.0, 0.0);
          // center = vec2(sin(2.0 * time), 0.0);
          float distanceToCircle = sdfCircle(uv - center, radius);
          color = distanceToCircle > 0.0 ? noiseColor : axialNoiseColor;

          // note: adding a black outline to the circle
          // color = color * exp(distanceToCircle);
          // color = color * exp(2.0 * distanceToCircle);
          // color = color * exp(-2.0 * abs(distanceToCircle));
          color = color * (1.0 - exp(-2.0 * abs(distanceToCircle)));
          // color = color * (1.0 - exp(-5.0 * abs(distanceToCircle)));
          // color = color * (1.0 - exp(-5.0 * abs(distanceToCircle)));

          // note: adding waves
          // color = color * 0.8 + color * 0.2;
          // color = color * 0.8 + color * 0.2 * sin(distanceToCircle);
          // color = color * 0.8 + color * 0.2 * sin(50.0 * distanceToCircle);
          color = color * 0.8 + color * 0.2 * sin(50.0 * distanceToCircle - 4.0 * time);

          // note: adding white border to the circle
          // color = mix(white, color, step(0.1, distanceToCircle));
          // color = mix(white, color, step(0.1, abs(distanceToCircle)));
          //color = mix(white, color, smoothstep(0.0, 0.1, abs(distanceToCircle)));

          // note: thumbnail?
          // color = mix(white, color, abs(distanceToCircle));
          // color = mix(white, color, 2.0 * abs(distanceToCircle));
          // color = mix(white, color, 4.0 * abs(distanceToCircle));

          gl_FragColor = vec4(color, 1.0); // Change the color based on the shader output
        }
      `,
    };

    this.noiseMaterial = new THREE.ShaderMaterial(this.noiseShader);
  }

  useDarkNoiseShader() {
    this.darkNoiseShader = {
      uniforms: {
        sineTime: { value: this.sineTime },
        time: { value: this.clock.getElapsedTime()},
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
        shapeFactor: { value: this.shapeFactor }, // Control for trapezoidashape
        u_frequency: { value: this.u_frequency }, // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        hovered: { value: this.hovered },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
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

          float burst = noise(x, z);
          float value = 0.3;

          for (int i = -1; i <= 1; i++) {
              for (int j = -1; j <= 1; j++) {
                  float aij = 0.13; // base value
                  float bij = 1.7; // variation
                  float cij = 0.51; // adjust
                  float dij = 0.33; // noise contribution

                  value += aij + (bij - aij) * S(x - float(i)) + (aij - bij - cij + dij) * S(x - float(i)) * S(z - float(j));
              }
          }

          //   gl_FragColor = vec4(vec3(value + burst), 1.0); // Change the color based on the shader output

          vec3 noiseColor = vec3(burst, value, 0.0);

          // gl_FragColor = vec4(vec3(value + burst), 1.0); // Change the color based on the shader output 
          gl_FragColor = vec4(noiseColor, 1.0);
        }
      `,
    };

    this.darkNoiseMaterial = new THREE.ShaderMaterial(this.darkNoiseShader);
  }

  useScatteredNoise() {
    this.scatteredNoiseShader = {
      uniforms: {
        time: { value: this.clock.getElapsedTime()},
        sineTime: { value: this.sineTime },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        shapeFactor: { value: this.shapeFactor }, // Control for trapezoidashape
        u_frequency: { value: this.u_frequency }, // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        hovered: { value: this.hovered },
        mousePosition: { value: new THREE.Vector2(this.mousePosition ) },
        explodeIntensity: { value: this.explodeIntensity },
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
        varying vec2 vUv;
              
        // https://iquilezles.org/articles/distfunctions2d/
        float sdfCircle(vec2 p, float r) {
          // note: sqrt(pow(p.x, 2.0) + pow(p.y, 2.0)) - r;
          return length(p) - r;
        }
  
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
  
          // vec2 uv = gl_FragCoord.xy / u_resolution;
          // uv = uv - 0.5;
          // uv = uv * u_resolution / 100.0;
  
          // note: set up basic colors
          vec3 black = vec3(0.0);
          vec3 white = vec3(1.0);
          vec3 red = vec3(1.0, 0.0, 0.0);
          vec3 blue = vec3(0.65, 0.85, 1.0);
          vec3 orange = vec3(0.9, 0.6, 0.3);
          vec3 color = black;
          color = vec3(uv.x, uv.y, 0.0);
  
          float burst = noise(x, z);
          float value = 0.0;
  
          for (int i = -1; i <= 1; i++) {
            for (int j = -1; j <= 1; j++) {
              float aij = 0.1; // base value
              float bij = 1.7; // variation
              float cij = 0.51; // adjust
              float dij = 0.33; // noise contribution
  
              value += aij + (bij - aij) * S(x - float(i)) + (aij - bij - cij + dij) * S(x - float(i)) * S(z - float(j));
            }
          }
  
          vec3 noiseColor = vec3(value + burst);
          vec3 axialNoiseColor = vec3((value * value) + (burst + burst));
                  
          // note: draw circle sdf
          float radius = 2.5;
          // radius = 3.0;
          vec2 center = vec2(0.0, 0.0);
          // center = vec2(sin(2.0 * time), 0.0);
          float distanceToCircle = sdfCircle(uv - center, radius);
          color = distanceToCircle > 0.0 ? noiseColor : axialNoiseColor;
  
          // note: adding a black outline to the circle
          // color = color * exp(distanceToCircle);
          // color = color * exp(2.0 * distanceToCircle);
          // color = color * exp(-2.0 * abs(distanceToCircle));
          color = color * (1.0 - exp(-2.0 * abs(distanceToCircle)));
          // color = color * (1.0 - exp(-5.0 * abs(distanceToCircle)));
          // color = color * (1.0 - exp(-5.0 * abs(distanceToCircle)));
  
          // note: adding waves
          // color = color * 0.8 + color * 0.2;
          // color = color * 0.8 + color * 0.2 * sin(distanceToCircle);
          // color = color * 0.8 + color * 0.2 * sin(50.0 * distanceToCircle);
          color = color * 0.8 + color * 0.2 * sin(50.0 * distanceToCircle - 4.0 * time);
  
          // note: adding white border to the circle
          // color = mix(white, color, step(0.1, distanceToCircle));
          // color = mix(white, color, step(0.1, abs(distanceToCircle)));
          //color = mix(white, color, smoothstep(0.0, 0.1, abs(distanceToCircle)));
  
          // note: thumbnail?
          // color = mix(white, color, abs(distanceToCircle));
          // color = mix(white, color, 2.0 * abs(distanceToCircle));
          // color = mix(white, color, 4.0 * abs(distanceToCircle));
  
          gl_FragColor = vec4(color, 1.0); // Change the color based on the shader output
        }
      `,
    };

    this.scatteredNoiseMaterial = new THREE.ShaderMaterial(this.scatteredNoiseShader);
  }

  getShaders() {
    this.shaders = [
      this.noiseShader,
      this.starryShader,
      this.darkNoiseShader,
      this.scatteredNoiseShader
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
    this.sineTime += this.deltaTime;
    const elapsed = this.clock.getElapsedTime();
    this.shaders.forEach(shader => {
      if (shader) {
        shader.uniforms.time.value =  elapsed;
        shader.uniforms.shapeFactor.value = this.sineTime * Math.sin(0.001 + this.sineTime);
        shader.uniforms.sineTime.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
        shader.uniforms.explodeIntensity.value = (Math.sin(this.sineTime) * 0.5) + 0.5 + Math.cos(0.1 + this.sineTime);
      }
    });
  }
}
export default NoiseShaderMaterials;
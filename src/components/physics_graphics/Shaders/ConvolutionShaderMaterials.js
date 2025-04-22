import * as THREE from 'three';

export class ConvolutionShaderMaterials {
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
    this.hovered = this.params.hovered ?? 0.0;

    // Mouse Utils
    this.mousePosition = mouse;

    this.useConvolutionShader();
    this.updateEvents();
    this.getShaders();
  }

  // gl_FragColor = vec4(vec3(value + burst), 1.0); // Change the color based on the shader output
  useConvolutionShader() {
    this.convolutionShader = {
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
        uniform float time;
        uniform vec2 resolution;
        uniform float shapeFactor;
        varying vec2 vUv;

        float trapezoid(float x, float height, float width) {
            float slope = height / (width * 0.5);
            return smoothstep(0.0, slope, height - abs(x));
        }

        float noise(float x, float z) {
            return fract(sin(dot(vec2(x, z) + time, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv * 10.0; // Scale the UV coordinates
            float value = 0.0;

            // Create the convolution shape effect
            for (int i = -11; i <= 11; i++) {
                for (int j = -5; j <= 5; j++) {
                    float xOffset = float(i) * shapeFactor; // Adjusting the shape dynamically
                    float zOffset = float(j) * shapeFactor;
                    float burst = noise(uv.x + xOffset, uv.y + zOffset);
                    float trapValue = trapezoid(uv.x - xOffset, 1.0, shapeFactor); // Trapezoidal shape
                    value += burst * trapValue; // Combine noise with the trapezoid shape
                }
            }

            // Apply a wave effect to color based on the value
            vec3 color = vec3(value * 0.3 + 0.5); // Modulate color based on the calculated value
            gl_FragColor = vec4(color, 0.9); // Final output color
        }
    `,
    };
    this.convolutionMaterial = new THREE.ShaderMaterial(this.convolutionShader);
  };

  getShaders() {
    this.shaders = [
      this.convolutionShader,
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

  handleHoverEffect(shader) {
    // Update the shader with the current mouse position and toggle the effect
    if (shader) {
      shader.uniforms.mousePosition.value = this.mousePosition;
      shader.uniforms.hovered.value = 1.0;
    }
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
    // this.addMouseListener();
    this.time += this.deltaTime; // Update time for animation

    // Update other uniforms if necessary
    if (this.convolutionShader) this.convolutionShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
  }

}
export default ConvolutionShaderMaterials;
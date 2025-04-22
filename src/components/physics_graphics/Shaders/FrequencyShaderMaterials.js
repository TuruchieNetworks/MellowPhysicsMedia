import * as THREE from 'three';

export class FrequencyShaderMaterials {
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
    this.explodeIntensity = this.params.explodeIntensity ?? 0.1;
    this.u_frequency = this.params.u_frequency ?? 0.0;
    this.hovered = this.params.hovered ?? 0.1;

    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse;

    this.useIcoShader();
    this.useMusicShader();
    this.useFrequencyShader();
    this.updateEvents();
    this.getShaders();
  }

  useIcoShader() {
    this.icoShader = {
      uniforms: {
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        u_resolution: { value: new THREE.Vector2(this.width, this.height) }, // Resolution (screen size)
        u_frequency: { value: this.u_frequency }, // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
        u_time: { value: this.time }, 
        u_red: { value: 1.0 },
        u_green: { value: 1.0 },
        u_blue: { value: 1.0 },
        hovered: { value: this.hovered },
        mousePosition: { value: this.mousePosition },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
        uniform float u_time;

        vec3 mod289(vec3 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 mod289(vec4 x)
        {
          return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x)
        {
          return mod289(((x*34.0)+10.0)*x);
        }
        
        vec4 taylorInvSqrt(vec4 r)
        {
          return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        vec3 fade(vec3 t) {
          return t*t*t*(t*(t*6.0-15.0)+10.0);
        }

        // Classic Perlin noise, periodic variant
        float pnoise(vec3 P, vec3 rep)
        {
          vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
          vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P); // Fractional part for interpolation
          vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
          vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
          vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
          vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
          vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
          vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
          vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
          vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;
          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
          return 2.2 * n_xyz;
        }

        uniform float u_frequency;

        void main() {
            float noise = 3.0 * pnoise(position + u_time, vec3(10.0));
            float displacement = (u_frequency + u_time / 30.) * (noise / 10.);
            vec3 newPosition = position + normal * displacement;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,

      fragmentShader: `
        uniform float u_time;
        uniform float u_red;
        uniform float u_blue;
        uniform float u_green;
        void main() {
            gl_FragColor = vec4(vec3(u_red, 0.0 + u_time, u_blue), 1. );
        }
      `
    };

    this.icoMaterial = new THREE.ShaderMaterial(this.icoShader);
  }

  useMusicShader() {
    this.musicShader = {
      uniforms: {
        u_time: { value: this.time },                // Time for animation (used for Perlin animation)
        u_frequency: { value: this.u_frequency },           // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 },           // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        u_resolution: { value: new THREE.Vector2(this.width, this.height) }, // Resolution (screen size)
        mousePosition: { value: this.mousePosition },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
        hovered: { value: this.hovered }
      },

      vertexShader: `#version 300 es
        precision highp float;
    
        in vec3 position;
        in vec3 normal;
    
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float u_time;
        uniform vec3 u_freqBands;
        uniform vec2 u_perlinScale;
        uniform vec2 u_resolution;
    
        out vec3 vPosition;
  
        // Classic Perlin noise functions
        vec3 mod289(vec3 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
    
        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
    
        vec4 permute(vec4 x) {
            return mod289(((x * 34.0) + 10.0) * x);
        }
    
        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }
    
        vec3 fade(vec3 t) {
            return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
        }
    
        float pnoise(vec3 P, vec3 rep) {
          vec3 Pi0 = mod(floor(P), rep);
          vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
          Pi0 = mod289(Pi0);
          Pi1 = mod289(Pi1);
          vec3 Pf0 = fract(P);
          vec3 Pf1 = Pf0 - vec3(1.0);

          vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
          vec4 iy = vec4(Pi0.yy, Pi1.yy);
          vec4 iz0 = Pi0.zzzz;
          vec4 iz1 = Pi1.zzzz;

          vec4 ixy = permute(permute(ix) + iy);
          vec4 ixy0 = permute(ixy + iz0);
          vec4 ixy1 = permute(ixy + iz1);

          vec4 gx0 = ixy0 * (1.0 / 7.0);
          vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
          gx0 = fract(gx0);
          vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
          vec4 sz0 = step(gz0, vec4(0.0));
          gx0 -= sz0 * (step(0.0, gx0) - 0.5);
          gy0 -= sz0 * (step(0.0, gy0) - 0.5);

          vec4 gx1 = ixy1 * (1.0 / 7.0);
          vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
          gx1 = fract(gx1);
          vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
          vec4 sz1 = step(gz1, vec4(0.0));
          gx1 -= sz1 * (step(0.0, gx1) - 0.5);
          gy1 -= sz1 * (step(0.0, gy1) - 0.5);

          vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
          vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
          vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
          vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
          vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
          vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
          vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
          vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

          vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
          g000 *= norm0.x;
          g010 *= norm0.y;
          g100 *= norm0.z;
          g110 *= norm0.w;

          vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
          g001 *= norm1.x;
          g011 *= norm1.y;
          g101 *= norm1.z;
          g111 *= norm1.w;

          float n000 = dot(g000, Pf0);
          float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
          float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
          float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
          float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
          float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
          float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
          float n111 = dot(g111, Pf1);

          vec3 fade_xyz = fade(Pf0);
          vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
          vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
          float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
          return 2.2 * n_xyz;
        }
    
        void main() {
          // Modify noise based on current frequency data (bass, mid, treble) and time
          float noise = 3.0 * pnoise(position + u_time, vec3(10.0)); 

          // Normalize frequency bands to influence displacement
          float frequencyEffect = u_freqBands.x * 0.5 + u_freqBands.y * 0.3 + u_freqBands.z * 0.2;

          // Scale displacement by screen resolution for dynamic scaling
          float resolutionScale = u_resolution.x * u_resolution.y;

          /* Final displacement, now influenced by both time, frequency, and screen resolution
          */

          float displacement = (u_frequency / 30.0) * (noise / 10.0) * frequencyEffect * resolutionScale * u_ampFactor;

          // Apply displacement to vertex positions
          vec3 newPosition = position + normal * displacement;

          // Set the final vertex position
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,

      fragmentShader: `
        #version 300 es
        precision highp float;
    
        out vec4 fragColor;
    
        uniform vec3 u_freqBands;      // Frequency data (bass, mid, treble)
        uniform float u_time;          // Time to animate the shader
        uniform vec2 u_resolution;     // Resolution of the screen
    
        void main() {
          // Simple color effect based on the frequency bands
          vec3 color = vec3(u_freqBands.x * 0.3, u_freqBands.y * 0.5, u_freqBands.z * 0.2);

          // Time-based effect to animate the color
          color.r += sin(u_time * 0.1) * 0.1;
          color.g += sin(u_time * 0.2) * 0.1;
          color.b += sin(u_time * 0.3) * 0.1;

          fragColor = vec4(color, 1.0);
        }
      `
    };

    this.musicMaterial = new THREE.ShaderMaterial(this.musicShader);
  }

  useFrequencyShader() {
    this.freuencyShader = {
      uniforms: {
        u_time: { value: 0.0 }, // Time for animation (used for Perlin animation)
        u_frequency: { value: 0.0 }, // Current frequency value from the audio analysis
        u_freqBands: { value: new THREE.Vector3(0.0, 0.0, 0.0) }, // Frequency bands (bass, mid, treble)
        u_ampFactor: { value: 1.0 }, // Amplitude factor to scale frequency effects
        u_perlinScale: { value: new THREE.Vector2(50.0, 20000.0) }, // Frequency scale for Perlin noise (50Hz to 20,000Hz)
        u_resolution: { value: new THREE.Vector2(this.width, this.height) }, // Resolution (screen size)
        mousePosition: { value: this.mousePosition },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
        hovered: { value: this.hovered }
      },

      vertexShader: `#version 300 es
        precision highp float;
        in vec3 position;
        in vec3 normal;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float u_time;
        uniform vec3 u_freqBands;
        uniform vec2 u_perlinScale;
        out vec3 vPosition;
        out vec3 vColor;
  
        // Function to generate Perlin noise based on input frequency
        float perlinNoise(vec3 position) {
            // Placeholder Perlin noise generation (adjust as per your library)
            return fract(sin(dot(position.xyz ,vec3(12.9898,78.233,151.7182))) * 43758.5453);
        }
  
        void main() {
          // Generate Perlin noise based on time and position, scaled by frequency data
          float noise = perlinNoise(position + u_time * 0.1); // Using time to animate noise
  
          // Map the noise value to the desired frequency range (50Hz to 20,000Hz)
          float frequencyEffect = mix(u_perlinScale.x, u_perlinScale.y, noise);
  
          // Adjust displacement based on frequency bands (bass, mid, treble)
          // Bass, mid, and treble frequencies are weighted for more dynamic effects
          float bassEffect = u_freqBands.x * 0.5;   // Bass (low frequencies)
          float midEffect = u_freqBands.y * 0.3;    // Mid (mid-range frequencies)
          float trebleEffect = u_freqBands.z * 0.2; // Treble (high frequencies)
  
          // The final displacement is based on the frequency bands and the Perlin noise scale
          float displacement = (bassEffect + midEffect + trebleEffect) * frequencyEffect * u_ampFactor;
  
          // Apply displacement to vertex positions
          vec3 newPosition = position + normal * displacement;
  
          // Compute color based on frequency bands
          // Bass frequencies will be red, mid frequencies green, and treble frequencies blue
          vec3 bassColor = vec3(1.0, 0.0, 0.0);    // Red for bass
          vec3 midColor = vec3(0.0, 1.0, 0.0);     // Green for mid
          vec3 trebleColor = vec3(0.0, 0.0, 1.0);  // Blue for treble
  
          // Combine the colors based on frequency bands
          vec3 color = bassColor * bassEffect + midColor * midEffect + trebleColor * trebleEffect;
  
          // Set the final vertex position and color
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          vColor = color; // Pass the color to the fragment shader
        }
      `,

      fragmentShader: `#version 300 es
        precision highp float;
        in vec3 vColor;  // The color passed from the vertex shader
        out vec4 FragColor;
  
        void main() {
          // Output the color of the fragment (vertex color)
          FragColor = vec4(vColor, 1.0); // Set alpha to 1.0 for full opacity
        }
      `,
    };

    this.frequencyMaterial = new THREE.ShaderMaterial(this.frequencyShader);
  } 

  getShaders() {
    this.shaders = [
      this.icoShader, 
      this.musicShader,
      this.freuencyShader
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


  handleHoverEffect(shader, mousePosition) {
    // Update the shader with the current mouse position and toggle the effect
    if (shader && mousePosition) {
      shader.uniforms.mousePosition.value =  new THREE.Vector2(mousePosition.x, mousePosition.y);
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
    this.time += this.deltaTime; // Update time for animation

    // Update other uniforms if necessary
    if (this.icoShader) {
      this.icoShader.uniforms.u_time.value = this.time;
    }

    if (this.musicShader) {
      this.musicShader.uniforms.u_time.value = (Math.sin(this.time) * 0.5) + 0.5;
    }

    if (this.freuencyShader) {
      this.freuencyShader.uniforms.u_time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }  
  }
}
export default FrequencyShaderMaterials;
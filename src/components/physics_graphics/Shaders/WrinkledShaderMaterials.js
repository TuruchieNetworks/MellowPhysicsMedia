import * as THREE from 'three';

export class WrinkledShaderMaterials {
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

    this.useWrinkledShader();
    this.useWrinkledCoalSDFShader();
    // this.updateEvents();
  }

  useWrinkledShader() {
    this.wrinkledShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: new THREE.Vector2(this.mousePosition ) },
        hovered: { value: this.hovered },
        explodeIntensity: { value: this.explodeIntensity }
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
  
        // Noise function based on hash
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
  
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
  
        // Signed distance function for a circle
        float sdfCircle(vec2 p, float radius) {
          return length(p) - radius;
        }
  
        // Function to create a smooth gradient with noise and SDFs
        void main() {
          vec2 uv = vUv * shapeFactor * 3.0; // Scale UV for finer details
          vec2 p = uv - 0.5; // Center the UV coordinates
  
          // Animate noise with time and add it to coordinates
          float n = noise(uv * 10.0 + time * 0.1);
          float sdf = sdfCircle(p, 0.3 + 0.1 * sin(time)); // Dynamic radius
  
          // Mix colors based on noise and SDF results
          vec3 color1 = vec3(0.1, 0.4, 0.7);
          vec3 color2 = vec3(1.0, 0.6, 0.2);
          vec3 color3 = vec3(0.8, 0.2, 0.4);
          
          vec3 color = mix(color1, color2, smoothstep(0.0, 0.5, sdf));
          color = mix(color, color3, n);
  
          gl_FragColor = vec4(color, 1.0);
        }
      `
    };

    this.wrinkledMaterial = new THREE.ShaderMaterial(this.wrinkledShader);
  }

  useWrinkledCoalSDFShader() {
    this.wrinkledCoalSDFShader = {
      uniforms: {
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        explodeIntensity: { value: this.explodeIntensity },
        mousePosition: { value: new THREE.Vector2(this.mousePosition ) },
        // mousePosition: { value: new THREE.Vector2(this.mousePosition.x / this.width, this.mousePosition.y / this.height) },
      },

      vertexShader: `
        uniform float time;
        uniform float hovered;
        uniform vec2 mousePosition;
        uniform float explodeIntensity;
        varying vec2 vUv;
  
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        void main() {
          vUv = uv;
          vec3 pos = position;
      
          // Calculate distance to mouse position
          float dist = distance(mousePosition, vec2(pos.x, pos.y));
          float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);
      
          // Apply explode effect
          pos += normal * effect * explodeIntensity;
      
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,

      fragmentShader: `
        uniform float time;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        varying vec2 vUv;
  
        // Cyclic noise function with smooth oscillations
        float cyclicNoise(vec2 p) {
          float angle = sin(p.x * 5.0 + time * 0.5) + cos(p.y * 5.0 + time * 0.5);
          return fract(sin(dot(p + angle, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        // Noise function (similar to saw shader)
        float abstractNoise(vec2 p) {
          float angle = sin(p.x * 5.0 + time * 0.5) + cos(p.y * 5.0 + time * 0.5);
          return fract(sin(dot(p + angle, vec2(12.9898, 78.233))) * 43758.5453);
        }
  
        // Smoothstep interpolation function for blending
        float S(float t) {
          return t * t * (3.0 - 2.0 * t);
        }
  
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
  
        float harshNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
  
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
  
        // Smooth noise based on UV coordinates
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
  
        float opUnion(float d1, float d2) {
          return min(d2, d2);
        }
  
        float opSubtraction(float d1, float d2) {
          return max(-d1, d2);
        }
  
        float opIntersection(float d1, float d2) {
          return max(d1, d2);
        }
  
        float opSmoothUnion(float d1, float d2, float k) {
          float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, d1, h) - k * h * (1.0 - h);
        }
  
        float opSmoothSubtraction(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }
  
        float opSmoothIntersection(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }
  
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * h * k * (1.0 / 6.0);
        }
  
        float dist(vec3 p) {
          return length(p) - 1.0;
        }
  
        float map(vec3 p) {
          float sphPos = vec3(sin(time) * 3.0, 0, 0); // Sphere Position
          float sphere = sdSphere(p - sphPos, 1.0); // Sphere SDF
  
          p.z += time * 0.4; // Forward Camera Movement
  
          vec3 q = p; // input copy
          q.y -= time * 0.4; // Upward Movement
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
  
          float box = sdBox(p, vec3(0.15)); // Scaled Cube SDF
  
          float ground = p.y + 0.75; // Ground SDF
  
          // To combine the two shapes using the union operator
          return smin(sphere, box, 2.0); // The additional param is for the blending
        }
  
        float sdSphere(vec3 p, float s) {
          return length(p) - s;
        }
  
        mat2 rot2D(float angle) {
          float s = sin(angle);
          float c = cos(angle);
  
          return mat2(c, -s, s, c);
        }
  
        vec3 rot3D(vec3 p, vec3 axis, float angle) {
          // Rodrigues' Rotation Formula
          return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
        }
  
        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          vec2 mouse = (mousePosition.xy * 2.0 - fragCoord) / resolution.y;
  
          // UV Transformations
          uv *= 2.0 + time;
  
          float fov = 1.0;
          vec3 ro = vec3(0, 0, -3); // Ray Origin
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction
  
          float depthFactor = 0.064;
          float t = 0.0; // Total Distance Travelled By Ray
  
          uv *= 1.2 + noise(uv * time) * 0.05;  // Slight noise-based distortion
  
          // Camera rotations
          ro.xz *= rot2D(-mouse.x);
          rd.xz *= rot2D(-mouse.x);
  
          ro.yz *= rot2D(-mouse.y);
          rd.yz *= rot2D(-mouse.y);
  
          vec3 matchedColor = vec3(time * 0.2 * depthFactor + noise(uv.xy * 3.0 + time * 0.5));
  
          // Ray Marching Algorithm
          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = map(p); // Current distance to the scene
  
            t += d; // March the distance
  
            matchedColor = vec3(i) / 80.0;
  
            if (d < 0.001 || t > 100.0) break;
          }
  
          // Final Coloring
          matchedColor = vec3(
            noise(uv.xy * 4.0 + time * 0.3),  // Red channel
            noise(uv.yz * 3.0 + time * 0.5),  // Green channel
            noise(uv.xz * 2.0 + time * 0.7)   // Blue channel
          );
  
          gl_FragColor = vec4(matchedColor, 1);
        }
      `
    };

    this.wrinkledCoalSDFMaterial = new THREE.ShaderMaterial(this.wrinkledCoalSDFShader);
  }

  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }

  handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
    if (!renderer) return;
    // Each shader handles its own resolution updates
    if (this.wrinkledShader) this.updateResolution(this.wrinkledShader, width, height);
    if (this.wrinkledCoalSDFShader) this.updateResolution(this.wrinkledCoalSDFShader, width, height);
  }

  handleHoverEffect(shader, mousePosition) {
    if (!shader && mousePosition) return;
    // Update the shader with the current mouse position and toggle the effect
    shader.uniforms.mousePosition.value = mousePosition;
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

    // Update the shader with the current mouse position and toggle the effect
    if (this.wrinkledShader) this.handleHoverEffect(this.wrinkledShader, this.mousePosition);
    if (this.wrinkledCoalSDFShader) this.handleHoverEffect(this.wrinkledCoalSDFShader, this.mousePosition);
  }

  updateEvents() {
    window.addEventListener('mousemove', (e) => {
      this.updateHoverEffect(e);
    });
  }
  // Update method for shader uniforms and dynamic behavior
  update() {
    // this.addMouseListener()
    this.time += this.deltaTime; // Update time for animation

    // Update other uniforms if necessary
    if (this.wrinkledShader) {
      this.wrinkledShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.wrinkledShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.wrinkledShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.wrinkledCoalSDFShader) {
      this.wrinkledCoalSDFShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.wrinkledCoalSDFShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.wrinkledCoalSDFShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }
  }
}
export default WrinkledShaderMaterials
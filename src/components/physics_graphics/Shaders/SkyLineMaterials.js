import * as THREE from 'three';

export class SkyLineMaterials {
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

    this.useSkyCityShader();
    this.useCeasarsShader();
    this.useGlassSkylineShader();
    this.useSkylineTerrainShader();
    // this.updateEvents();
  }


  useSkyCityShader() {
    this.skyCityShader = {
      uniforms: {
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
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
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;
        varying vec2 vUv;

        // Define the size of a building block
        float boxSize = 1.0;
        float buildingHeight = 3.0;

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
          return clamp(mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y, 0.0, 1.0);
        }

        // Simple float hash function for generating pseudo-random values
        float hash(float x) {
            return fract(sin(x) * 43758.5453123); // A pseudo-random generator based on sin(x)
        }

        // Smoothstep interpolation function for blending
        float S(float t) {
          return t * t * (3.0 - 2.0 * t);
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

        vec3 rotate3D(vec3 p, vec3 k, float angle) {
          k = normalize(k); // Ensure unit length
          float cosA = cos(angle);
          float sinA = sin(angle);
      
          return p * cosA + cross(k, p) * sinA + k * dot(k, p) * (1.0 - cosA);
        }

        float S(float x, float y,  float z) {
          return smoothstep(x, y, z);
        }

        // Signed distance function for a circle
        float sdCircle(vec2 p, float radius) {
          return length(p) - radius;
        }
  
        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        // Create a basic box (building) SDF
        float sdBox(vec3 p, vec3 size) {
          vec3 q = abs(p) - size; 
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // Create a cuboid box (building) SDF
        float sdBuilding(vec3 p, vec3 size) {
          vec3 d = abs(p) - size;  // Get the distance from the cuboid
          return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
        }
        
        // Define ground SDF function
        float sdfGround(vec3 p) {
            return p.y + noise(p.xz * 0.1) * 0.5; // Example ground height variation
        }
        
        // Define smooth union operation
        float opSmoothUnion(float d1, float d2, float k) {
            float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) + k * h * (1.0 - h);
        }
  
        float opSmoothIntersection(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }
  
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * h * k * (1.0 / 6.0);
        }

        // The main map function that will define the scene
        float map(vec3 p) {
          // Define building parameters
          vec3 spherePos = vec3(-5.0 * sin(time * 5.0), 2.0, 0.0);
          // spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), time * 0.3);
          float sphere = sdSphere(p - spherePos, 0.9);

          // Ground SDF
          float ground = sdfGround(p);
          // p += rot3D(p, p.xy, angle);  
  
          // Infinite city generation
          vec3 q = p; // input copy


          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += time * 0.4; // Forward Camera Movement  
          q.y -= time * 0.4; // Upward Movement

          // q.xz *= rot2D(time * 0.4);
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
          //q.xz = fract(p.xz) - 0.5; // Space Repetition 0.5 is the center of repetition

          // // Boxes
          float boxSize = 1.0;
          float box = sdBox(q * 4.0, vec3(0.25)) / 4.0;

          // Streets and Parkways, Create building SDF and place it on street
          // Use mod(p.x, grid_size) and mod(p.z, grid_size) for infinite grid layout
          float grid_size = 15.0;  // Grid spacing for streets & buildings
          float road_width = 2.5;  // Adjust road width

          // Calculate building's position based on street number
          float buildingHeight = 3.0 + noise(p.xz * 0.1) * 2.0; // Random building height
          vec3 buildingPos = q - vec3(mod(q.x, grid_size), 0.0, mod(q.z, grid_size));
          float building = sdBuilding(buildingPos, vec3(boxSize, buildingHeight, boxSize * 3.0) / 3.0);  // Generate a unique "houseNumber" based on the building's grid position

          // Use hash function to introduce randomness for building properties based on the houseNumber
          float houseNumber = floor(buildingPos.x / grid_size) + floor(buildingPos.z / grid_size) * 57.0;  // Unique ID for each building
          float heightFactor = hash(houseNumber + 1.0); // Random value for height variation
          float sizeFactor = hash(houseNumber + 2.0);   // Random value for size variation

          // Apply these random values to alter building height and size
          buildingHeight += heightFactor * 2.0; // Alter height based on houseNumber
          boxSize += sizeFactor * 0.5;          // Alter size based on houseNumber

          // Combine the ground with buildings
          float terrain = min(ground, building);  

          // Combine ground with buildings using smooth union
          // return opSmoothUnion(ground, building, min(min(box, building), terrain));
          return opSmoothUnion(terrain, building, min(min(box, building), terrain));
        }
  

        // Light
        vec3 computeLighting(vec3 p, vec3 normal, vec3 lightPos, vec3 viewDir, float shadow) {
          vec3 lightDir = normalize(lightPos - p);
      
          // Compute soft shadow
          // float shadow = softShadow(p + normal * 0.02, lightDir, 0.1, 10.0, 16.0);
          
          // Diffuse lighting
          float diff = max(dot(normal, lightDir), 0.0);
          
          // Specular lighting (Phong reflection)
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
          
          // Combine lighting and shadow
          vec3 color = vec3(1.0, 0.9, 0.7); // Light color
          return (diff + spec) * color * shadow;
        }

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float time) {
          // Adding wiggle effect to the camera
          ro.x += sin(time * 2.0) * 0.5;
          ro.y += cos(time * 1.5) * 0.2;
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * time * 0.5) * 0.1,  
              cos(uv.y * time * 0.3) * 0.1,  
              sin(uv.x * time * 0.7) * 0.1  
          ));

          rd = normalize(rd); // Normalize direction after adding noise

          // Camera rotations
          ro.yz *= rot2D(-mouse.y);
          rd.yz *= rot2D(-mouse.y);

          ro.xz *= rot2D(-mouse.x);
          rd.xz *= rot2D(-mouse.x);
        }

        // Optional Shadow calculator
        float computeShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small offset to avoid self-shadowing
          float shadowFactor = 1.0; // Default: no shadow
      
          for (int j = 0; j < 10; j++) { // Optimized iteration count
              vec3 shadowPoint = p + shadowDir * shadowT;
              float shadowDist = map(shadowPoint);
      
              if (shadowDist < 0.001) {
                  shadowFactor = 0.5; // In shadow
                  break;
              }
      
              shadowT += shadowDist;
              if (shadowT > 5.0) break; // Exit if ray goes too far
          }
          return shadowFactor;
        }

        // Function to compute soft shadows
        float computeSoftShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small initial offset to avoid self-shadowing
          float shadowFactor = 1.0;
          float maxDist = 5.0;

          for (int j = 0; j < 24; j++) { // Optimized loop count
            vec3 shadowPoint = p + shadowDir * shadowT;
            float shadowDist = map(shadowPoint);
                
            if (shadowDist < 0.001) {
              shadowFactor *= 0.5; // Reduce intensity for occlusion
            }
                
            shadowT += shadowDist * 0.5; // Smaller steps improve softness
            if (shadowT > maxDist) break; // Stop marching if too far
          }

          return clamp(shadowFactor, 0.2, 1.0); // Ensure valid shadow range
        }

        // Display Shadows
        float computeHardShadow(vec3 ro, vec3 lightPos) {
          vec3 shadowRayDir = normalize(lightPos - ro);
          float shadowT = 0.0;
          float shadowIntensity = 1.0;
      
          for (int i = 0; i < 20; i++) {
              vec3 shadowPoint = ro + shadowRayDir * shadowT;
              float shadowDist = map(shadowPoint);
              shadowT += shadowDist;
      
              if (shadowDist < 0.001) {
                  shadowIntensity = 0.5; // Shadowed region
                  break;
              }
          }
      
          return shadowIntensity;
        }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              map(p + vec3(epsilon, 0, 0)) - map(p - vec3(epsilon, 0, 0)),
              map(p + vec3(0, epsilon, 0)) - map(p - vec3(0, epsilon, 0)),
              map(p + vec3(0, 0, epsilon)) - map(p - vec3(0, 0, epsilon))
          ));
        }
      
        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          vec2 mouse = (mousePosition.xy * 2.0 - fragCoord) / resolution.y;

          // Noise and Soft Min calculations
          float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
          float smn = smin(uv.x + time, uv.y + shapeFactor, shapeFactor + sin(uv.x * shapeFactor));
          float shadowIntensity = 0.1;
        
          // UV Transformations
          uv *= 2.0 + time;
          uv *= 1.2 + noise(uv * time) * 0.05;  // Slight noise-based distortion

          // Initialize Ray marching variables
          float fov = 1.0; 
          float depthFactor = 0.064;
          float intensityFactor = 0.02;

          // Light Setup
          vec3 ro = vec3(0.0, 0.0, -3.0); // Ray Origin
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction rd = normalize(rd);

          // Shadow and Reflections
          vec3 lightPos = vec3(0.0, 10.0, -5.0); // Light position
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0)); // Camera view direction
          vec3 lightDir;
      
          // ro.x += sin(time * 2.0) * 0.5; // Wiggle the x-axis of the camera path
          // ro.y += cos(time * 1.5) * 0.2; // Wiggle the y-axis of the camera path
          
          // // Slight noise-based distortion on ray direction (wiggling)
          // rd += normalize(vec3(
          //   sin(uv.x * time * 0.5) * 0.1,  // X-axis wiggle
          //   cos(uv.y * time * 0.3) * 0.1,  // Y-axis wiggle
          //   sin(uv.x * time * 0.7) * 0.1   // Z-axis wiggle
          // ));
        
          // // Normalize the direction after adding noise
          // rd = normalize(rd);
        
          // // Camera rotations
          // ro.xz *= rot2D(-mouse.x);
          // rd.xz *= rot2D(-mouse.x);
        
          // ro.yz *= rot2D(-mouse.y);
          // rd.yz *= rot2D(-mouse.y);

          // Apply wiggle effect to the camera
          wiggleCamera(ro, rd, uv, mouse, time);
        
          // 🔥🔥 Ray Marching Algorithm
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 color = vec3(t);
          vec3 normal; // Declare normal

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = map(p); // Current distance to the scene
            lightDir = normalize(lightPos - p);
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, lightPos);
              // vec3 light = computeLighting(p, normal, lightPos, viewDir, shadow);
              shadowIntensity = computeSoftShadow(p, lightPos); // Call function
              // shadowIntensity = computeSoftShadow(p, lightPos); // Compute soft shadow
              // shadowIntensity = computeHardShadow(p, lightPos); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
  
            t += d; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey Value
        
            // Safely Break Loop
            if (d < 0.001 || t > 100.0) break;
          }

          // Apply depth factor
          float rayPower = t * intensityFactor * depthFactor;
          float rgR = shadowIntensity + rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity; 
          float rgG = shadowIntensity + rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity;
          float rgB = shadowIntensity + rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;
      
          // Final Coloring with Shadows
          color = vec3(rgR, rgG, rgB);
          // color = vec3(
          //     rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity,
          //     rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity,
          //     rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity
          // );
        
          gl_FragColor = vec4(color, 1);
        }
        
      `
    };

    this.skyCityMaterial = new THREE.ShaderMaterial(this.skyCityShader);
  }

  useCeasarsShader() {
    this.ceasarsShader = {
      uniforms: {
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
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
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;
        varying vec2 vUv;

        // Define the size of a building block
        float boxSize = 1.0;
        float buildingHeight = 3.0;

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
          return clamp(mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y, 0.0, 1.0);
        }

        // Simple float hash function for generating pseudo-random values
        float hash(float x) {
            return fract(sin(x) * 43758.5453123); // A pseudo-random generator based on sin(x)
        }

        // Smoothstep interpolation function for blending
        float S(float t) {
          return t * t * (3.0 - 2.0 * t);
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

        vec3 rotate3D(vec3 p, vec3 k, float angle) {
          k = normalize(k); // Ensure unit length
          float cosA = cos(angle);
          float sinA = sin(angle);
      
          return p * cosA + cross(k, p) * sinA + k * dot(k, p) * (1.0 - cosA);
        }

        float S(float x, float y,  float z) {
          return smoothstep(x, y, z);
        }

        // Signed distance function for a circle
        float sdCircle(vec2 p, float radius) {
          return length(p) - radius;
        }
  
        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        // Create a basic box (building) SDF
        float sdBox(vec3 p, vec3 size) {
          vec3 q = abs(p) - size; 
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // Create a cuboid box (building) SDF
        float sdBuilding(vec3 p, vec3 size) {
          vec3 d = abs(p) - size;  // Get the distance from the cuboid
          return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
        }
        
        // Define ground SDF function
        float sdfGround(vec3 p) {
            return p.y + noise(p.xz * 0.1) * 0.5; // Example ground height variation
        }
        
        // Define smooth union operation
        float opSmoothUnion(float d1, float d2, float k) {
            float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) + k * h * (1.0 - h);
        }
  
        float opSmoothIntersection(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }
  
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * h * k * (1.0 / 6.0);
        }

        // The main map function that will define the scene
        float map(vec3 p) {
          // Define building parameters
          vec3 spherePos = vec3(-5.0 * sin(time * 5.0), 2.0, 0.0);
          // spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), time * 0.3);
          float sphere = sdSphere(p - spherePos, 0.9);

          // Ground SDF
          float ground = sdfGround(p);
          // p += rot3D(p, p.xy, angle);  
  
          // Infinite city generation
          vec3 q = p; // input copy


          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += time * 0.4; // Forward Camera Movement  
          q.y -= time * 0.4; // Upward Movement

          // q.xz *= rot2D(time * 0.4);
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
          //q.xz = fract(p.xz) - 0.5; // Space Repetition 0.5 is the center of repetition

          // // Boxes
          float boxSize = 1.0;
          float box = sdBox(q * 4.0, vec3(0.25)) / 4.0;

          // Streets and Parkways, Create building SDF and place it on street
          // Use mod(p.x, grid_size) and mod(p.z, grid_size) for infinite grid layout
          float grid_size = 15.0;  // Grid spacing for streets & buildings
          float road_width = 2.5;  // Adjust road width

          // Calculate building's position based on street number
          float buildingHeight = 3.0 + noise(p.xz * 0.1) * 2.0; // Random building height
          vec3 buildingPos = q - vec3(mod(q.x, grid_size), 0.0, mod(q.z, grid_size));
          float building = sdBuilding(buildingPos * 3.0, vec3(boxSize, buildingHeight, boxSize * 3.0) / 3.0) / 3.0;  // Generate a unique "houseNumber" based on the building's grid position

          // Use hash function to introduce randomness for building properties based on the houseNumber
          float houseNumber = floor(buildingPos.x / grid_size) + floor(buildingPos.z / grid_size) * 57.0;  // Unique ID for each building
          float heightFactor = hash(houseNumber + 1.0); // Random value for height variation
          float sizeFactor = hash(houseNumber + 2.0);   // Random value for size variation

          // Apply these random values to alter building height and size
          buildingHeight += heightFactor * 2.0; // Alter height based on houseNumber
          boxSize += sizeFactor * 0.5;          // Alter size based on houseNumber

          // Combine the ground with buildings
          float terrain = min(ground, building);  

          // Combine ground with buildings using smooth union
          // return opSmoothUnion(ground, building, min(min(box, building), terrain));
          return opSmoothUnion(terrain, building, smin(min(box, building), terrain, 2.0));
          //return smin(terrain, building, smin(min(box, building), terrain, 2.0));
        }

        // Light
        vec3 computeLighting(vec3 p, vec3 normal, vec3 lightPos, vec3 viewDir, float shadow) {
          vec3 lightDir = normalize(lightPos - p);
      
          // Compute soft shadow
          // float shadow = softShadow(p + normal * 0.02, lightDir, 0.1, 10.0, 16.0);
          
          // Diffuse lighting
          float diff = max(dot(normal, lightDir), 0.0);
          
          // Specular lighting (Phong reflection)
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
          
          // Combine lighting and shadow
          vec3 color = vec3(1.0, 0.9, 0.7); // Light color
          return (diff + spec) * color * shadow;
        }

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float time) {
          // Adding wiggle effect to the camera
          ro.x += sin(time * 2.0) * 0.5;
          ro.y += cos(time * 1.5) * 0.2;
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * time * 0.5) * 0.1,  
              cos(uv.y * time * 0.3) * 0.1,  
              sin(uv.x * time * 0.7) * 0.1  
          ));

          rd = normalize(rd); // Normalize direction after adding noise

          // Camera rotations
          ro.yz *= rot2D(-mouse.y);
          rd.yz *= rot2D(-mouse.y);

          ro.xz *= rot2D(-mouse.x);
          rd.xz *= rot2D(-mouse.x);
        }

        // Optional Shadow calculator
        float computeShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small offset to avoid self-shadowing
          float shadowFactor = 1.0; // Default: no shadow
      
          for (int j = 0; j < 10; j++) { // Optimized iteration count
              vec3 shadowPoint = p + shadowDir * shadowT;
              float shadowDist = map(shadowPoint);
      
              if (shadowDist < 0.001) {
                  shadowFactor = 0.5; // In shadow
                  break;
              }
      
              shadowT += shadowDist;
              if (shadowT > 5.0) break; // Exit if ray goes too far
          }
          return shadowFactor;
        }

        // Function to compute soft shadows
        float computeSoftShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small initial offset to avoid self-shadowing
          float shadowFactor = 1.0;
          float maxDist = 5.0;

          for (int j = 0; j < 24; j++) { // Optimized loop count
            vec3 shadowPoint = p + shadowDir * shadowT;
            float shadowDist = map(shadowPoint);
                
            if (shadowDist < 0.001) {
              shadowFactor *= 0.5; // Reduce intensity for occlusion
            }
                
            shadowT += shadowDist * 0.5; // Smaller steps improve softness
            if (shadowT > maxDist) break; // Stop marching if too far
          }

          return clamp(shadowFactor, 0.2, 1.0); // Ensure valid shadow range
        }

        // Display Shadows
        float computeHardShadow(vec3 ro, vec3 lightPos) {
          vec3 shadowRayDir = normalize(lightPos - ro);
          float shadowT = 0.0;
          float shadowIntensity = 1.0;
      
          for (int i = 0; i < 20; i++) {
              vec3 shadowPoint = ro + shadowRayDir * shadowT;
              float shadowDist = map(shadowPoint);
              shadowT += shadowDist;
      
              if (shadowDist < 0.001) {
                  shadowIntensity = 0.5; // Shadowed region
                  break;
              }
          }
      
          return shadowIntensity;
        }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              map(p + vec3(epsilon, 0, 0)) - map(p - vec3(epsilon, 0, 0)),
              map(p + vec3(0, epsilon, 0)) - map(p - vec3(0, epsilon, 0)),
              map(p + vec3(0, 0, epsilon)) - map(p - vec3(0, 0, epsilon))
          ));
        }

        vec3 applyFog(vec3 color, float distance, vec3 fogColor, float fogDensity) {
          float fogFactor = exp(-distance * fogDensity); // Exponential fog
          return mix(fogColor, color, fogFactor); // Blend fog with scene color
        }
      
        // Ripple Utilities
        vec3 applyFloatRipple(float x, float y, float z, float d) {
          float ripple = sin(10.0 * d - time * 5.0);
          float intensity = smoothstep(0.3, 0.0, d);

          vec3 wave = vec3(x, y, z) + ripple * intensity;
          return wave;
        }

        vec3 applyRipple(vec3 p, float d, float time) {
            float ripple = sin(10.0 * d - time * 5.0);
            float intensity = smoothstep(0.3, 0.0, d);
            return p + normalize(vec3(p.xy, 0.0)) * ripple * intensity;
        }
        
        vec3 applyTurboRipple(vec3 position, float dist, float time, float frequency, float speed, float fade) {
          float ripple = sin(frequency * dist - time * speed);
          float intensity = smoothstep(fade, 0.0, dist);
          return position + normalize(vec3(position.xy, 0.0)) * ripple * intensity;
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          // vec2 uv = (fragCoord.xy / resolution) * 2.0 - 1.0;
          vec2 mice = (mousePosition / resolution) * 2.0 - 1.0;
          vec2 mouse = (mousePosition.xy * 2.0 - fragCoord) / resolution.y;
          vec2 centeredUv = uv - mouse; // vector from mouse to frag

          // Noise and Soft Min calculations
          float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
          float smn = smin(uv.x + time, uv.y + shapeFactor, shapeFactor + sin(uv.x * shapeFactor));
        
          // UV Transformations
          uv *= 2.0 + time;
          uv *= 1.2 + noise(uv * time) * 0.05;  // Slight noise-based distortion

          // Initialize Ray marching variables
          float fov = 1.0; 
          float depthFactor = 0.064;
          float intensityFactor = 0.002;
          float shadowIntensity = 0.1;

          // Light Setup
          vec3 ro = vec3(0.0, 0.0, -3.0); // Ray Origin
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction rd = normalize(rd);
          float dist = distance(mouse, rd.xy);

          // Shadow and Reflections
          vec3 lightPos = vec3(0.0, 10.0, -5.0); // Light position
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0)); // Camera view direction
          vec3 lightDir;


          // Apply wiggle effect to the camera
          wiggleCamera(ro, rd, uv, mouse, time);
        
          // 🔥🔥 Ray Marching Algorithm
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 color = vec3(t);
          vec3 normal; // Declare normal

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = map(p); // Current distance to the scene
            lightDir = normalize(lightPos - p);

            // Apply ripple effect
            // rd += applyRipple(ro, dist, time);
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, lightPos);
              // vec3 light = computeLighting(p, normal, lightPos, viewDir, shadow);
              shadowIntensity = computeSoftShadow(p, lightPos); // Call function
              // shadowIntensity = computeSoftShadow(p, lightPos); // Compute soft shadow
              // shadowIntensity = computeHardShadow(p, lightPos); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
  
            t += d; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey Value
        
            // Safely Break Loop
            if (d < 0.001 || t > 100.0) break;
          }

          // Apply depth factor
          float rayPower = t * intensityFactor * depthFactor;

          // Color Palette
          float rgR = rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity; 
          float rgG = rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity;
          float rgB = rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;

          // Define Fog parameters
          vec3 fog = vec3(0.2, 0.3, 0.4); // Adjust for desired atmosphere
          float fogDensity = 0.02; // Adjust for stronger/weaker fog

          // Apply Colors With Fogs and Shadows
          color += vec3(rgR , rgG, rgB );
          color += vec3(rgR + smn, rgG, rgB * (fract(smn) - smn)) + applyFog(color, rayPower, fog, fogDensity);
          // color += applyRipple(color, rayPower, time);
          gl_FragColor = vec4(color, 1);
        }
      `
    };

    this.ceasarsShaderMaterial = new THREE.ShaderMaterial(this.ceasarsShader);
  }

  useGlassSkylineShader() {
    this.glassSkylineShader = {
      uniforms: {
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        explodeIntensity: { value: this.explodeIntensity },
        mousePosition: { value: this.mousePosition },
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
        varying vec2 vUv;
        uniform float time;
        uniform float hovered;
        uniform vec2 resolution;
        uniform vec2 mousePosition;
        uniform float shapeFactor;
        uniform float explodeIntensity;
  
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

        // Simple float hash function for generating pseudo-random values
        float hash(float x) {
            return fract(sin(x) * 43758.5453123); // A pseudo-random generator based on sin(x)
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

        mat2 rot2D(float angle) {
          float s = sin(angle);
          float c = cos(angle);
  
          return mat2(c, -s, s, c);
        }
  
        vec3 rot3D(vec3 p, vec3 axis, float angle) {
          // Rodrigues' Rotation Formula
          return mix(dot(axis, p) * axis, p, cos(angle)) + cross(axis, p) * sin(angle);
        }
  
        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }
  
        // Create a basic box (building) SDF
        float sdBox(vec3 p, vec3 l) {
          vec3 q = abs(p) - l; 
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // Create a cuboid box (building) SDF
        float sdBuilding(vec3 p, vec3 size) {
          vec3 d = abs(p) - size;  // Get the distance from the cuboid
          return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
        }

        float sdGround(vec3 p) {
          return p.y + 0.75; // Ground SDF
        }

        // Signed distance function for a cone
        float sdCone(vec3 p, vec3 dir, float height, float radius) {
            // Ensure direction is normalized
            dir = normalize(dir);

            // Project point onto the cone's axis
            float d = dot(p, dir);
            vec3 projected = dir * d;

            // Compute the distance from the projected point to the actual point
            float lateralDist = length(p - projected);
            
            // Compute the expected radius at this height
            float expectedRadius = (d / height) * radius;

            // Compute the signed distance (negative inside, positive outside)
            float distance = lateralDist - expectedRadius;

            // Enforce height limits
            float capBottom = d;
            float capTop = d - height;
            
            // If above the cone's tip or below the base, clamp distance
            return max(distance, max(-capBottom, capTop));
        }

        // Bird body (simplified)
        float sdBirdBody(vec3 p, float size) {
            return sdSphere(p, size);
        }

        // Simplified Bird wings (simplified with two spheres for each wing)
        float sdWing(vec3 p, vec3 wingPos, vec3 birdPos, float wingSize, float angle) {
            // Rotate the wing around the body for animation
            // vec3 rotatedPos = rot3D(p - wingPos, vec3(0.0, 0.0, 1.0), angle) + wingPos;
            vec3 rotatedPos = rot3D(p - wingPos, birdPos, angle) + wingPos;
            return sdSphere(rotatedPos, wingSize); // Using sphere to approximate wing
        }

        // Bird head
        float sdHead(vec3 p, vec3 headPos, float headSize) {
            return sdSphere(p - headPos, headSize);
        }

        // Bird beak
        float sdBeak(vec3 p, vec3 headPos, float beakLength) {
          vec3 beakDir = normalize(p - headPos);
          return sdCone(p - headPos, beakDir, beakLength, 0.1); // A cone for the beak
        }

        // Combine the components to form a bird
        float sdBird(vec3 p, vec3 bodyPos, float bodySize, vec3 wingPos, float wingSize, vec3 headPos, float headSize, float beakLength, float wingAngle) {
            float body = sdBirdBody(p - bodyPos, bodySize);
            // float wing1 = sdWing(p, wingPos, wingSize, wingAngle);
            // float wing2 = sdWing(p, wingPos + vec3(0.5, 0.0, 0.0), wingSize, -wingAngle); // Second wing
            float rightWing = sdWing(p, wingPos, bodyPos, wingSize, wingAngle);
            float leftWing = sdWing(p, wingPos + vec3(0.5, 0.0, 0.0), bodyPos, wingSize, -wingAngle);

            float head = sdHead(p, headPos, headSize);
            float beak = sdBeak(p, headPos, beakLength);
            // Combine parts using smooth union
            return opSmoothUnion(opSmoothUnion(body, rightWing, 0.1), opSmoothUnion(leftWing, opSmoothUnion(head, beak, 0.1), 0.1), 0.1);
        }

        float generateFlock(vec3 q, vec3 birdPos, float bodySize, float wingSize, float headSize, float beakLength, float wingAngle, float ageFactor) {
          // Young birds (light, fly higher, move faster)
          float youngHeight = mix(4.0, 2.0, ageFactor);  
          float youngBirds = sdBird(q, birdPos + vec3(2.0, youngHeight, -1.0), 
                                    bodySize * ageFactor, 
                                    birdPos, wingSize * ageFactor, 
                                    birdPos + vec3(0.0, 0.5, 0.0) * ageFactor, 
                                    headSize * ageFactor, beakLength * ageFactor, wingAngle);
        
          // Mature birds (medium weight, moderate altitude and speed)
          float matureHeight = mix(3.5, 1.5, ageFactor * 0.8);
          float matureBirds = sdBird(q, birdPos + vec3(2.0, matureHeight, -1.0), 
                                    bodySize * ageFactor * 0.5, 
                                    birdPos, wingSize * ageFactor, 
                                    birdPos + vec3(0.0, 0.5, 0.0) * ageFactor, 
                                    headSize * ageFactor, beakLength * ageFactor, wingAngle);
        
          // Aged birds (heavier, fly lower, move slower)
          float agedHeight = mix(2.5, 1.0, ageFactor * 0.6);
          float agedBirds = sdBird(q, birdPos + vec3(-3.0, agedHeight, 2.5), 
                                  bodySize * (ageFactor * 0.8), 
                                  birdPos, wingSize * (ageFactor * 0.8), 
                                  birdPos + vec3(0.0, 0.5, 0.0) * (ageFactor * 0.8), 
                                  headSize * (ageFactor * 0.8), beakLength * (ageFactor * 0.8), wingAngle);
        
          float baseBird = sdBird(q, birdPos, bodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);
        
          return opSmoothIntersection(min(baseBird, youngBirds),
                                      opSmoothIntersection(youngBirds, matureBirds, min(matureBirds, agedBirds)),
                                      min(baseBird, youngBirds));
        }

        float generateAgeDependentFlock(vec3 q, vec3 birdPos, float bodySize, float wingSize, float headSize, float beakLength, float wingAngle, float ageFactor) {
          float t = time;
        
          // Age-based oscillation amplitude and frequency
          float youngWiggleAmp = 0.3 * (1.0 - ageFactor); // More wiggle for young
          float youngWiggleFreq = 5.0 * (1.0 - ageFactor); // Faster wiggle for young
          float matureWiggleAmp = 0.15 * (1.0 - ageFactor * 0.8);
          float matureWiggleFreq = 3.0 * (1.0 - ageFactor * 0.8);
          float agedWiggleAmp = 0.05 * (1.0 - ageFactor * 0.6);
          float agedWiggleFreq = 1.5 * (1.0 - ageFactor * 0.6);
        
          // Apply wiggling offsets (x and y directions for a more organic look)
          vec3 youngOffset = vec3(
            sin(t * youngWiggleFreq + 1.0) * youngWiggleAmp,
            mix(4.0, 2.0, ageFactor),
            cos(t * youngWiggleFreq + 1.5) * youngWiggleAmp
          );
          vec3 matureOffset = vec3(
            sin(t * matureWiggleFreq + 2.0) * matureWiggleAmp,
            mix(3.5, 1.5, ageFactor * 0.8),
            cos(t * matureWiggleFreq + 2.5) * matureWiggleAmp
          );
          vec3 agedOffset = vec3(
            sin(t * agedWiggleFreq + 3.0) * agedWiggleAmp,
            mix(2.5, 1.0, ageFactor * 0.6),
            cos(t * agedWiggleFreq + 3.5) * agedWiggleAmp
          );
        
          // Young bird
          float youngBirds = sdBird(q, birdPos + vec3(2.0, 0.0, -1.0) + youngOffset, 
                                    bodySize * ageFactor, 
                                    birdPos, wingSize * ageFactor, 
                                    birdPos + vec3(0.0, 0.5, 0.0) * ageFactor, 
                                    headSize * ageFactor, beakLength * ageFactor, wingAngle);
        
          // Mature bird
          float matureBirds = sdBird(q, birdPos + vec3(2.0, 0.0, -1.0) + matureOffset, 
                                     bodySize * ageFactor * 0.5, 
                                     birdPos, wingSize * ageFactor, 
                                     birdPos + vec3(0.0, 0.5, 0.0) * ageFactor, 
                                     headSize * ageFactor, beakLength * ageFactor, wingAngle);
        
          // Aged bird
          float agedBirds = sdBird(q, birdPos + vec3(-3.0, 0.0, 2.5) + agedOffset, 
                                   bodySize * (ageFactor * 0.8), 
                                   birdPos, wingSize * (ageFactor * 0.8), 
                                   birdPos + vec3(0.0, 0.5, 0.0) * (ageFactor * 0.8), 
                                   headSize * (ageFactor * 0.8), beakLength * (ageFactor * 0.8), wingAngle);
        
          // Main bird (leader or origin reference)
          float baseBird = sdBird(q, birdPos, bodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);
        
          // Smooth blending into one flock
          return opSmoothIntersection(
                   min(baseBird, youngBirds),
                   opSmoothIntersection(youngBirds, matureBirds, min(matureBirds, agedBirds)),
                   min(baseBird, youngBirds));
        }
        
        // Main Map with birds in the scene
        float map(vec3 p) {
          // Sun
          vec3 sunPos = vec3(sin(time) * 3.0, 9.0, -90.0); // Sun Position
          float sun = sdSphere(p - sunPos, 1.0); // Sphere SDF

          // Bird position and movement based on time
          float bodySize = 0.5;
          float wingSize = 0.2;
          float headSize = 0.2;
          float beakLength = 0.1;
          float wingAngle = sin(time * 2.0) * 0.5; // Flapping wing animation
          vec3 birdPos = vec3(sin(time) * 3.0, cos(time) * 3.0, time); // Bird movement

          // Streets and Parkways, Create building SDF and place it on street
          // Use mod(p.x, grid_size) and mod(p.z, grid_size) for infinite grid layout
          float grid_size = 15.0;  // Grid spacing for streets & buildings
          float road_width = 2.5;  // Adjust road widthfloat grid_size = 15.0;

          // Age Factor
          float ageFactor = 0.5 + 0.3 * sin(time * 2.0);  // Dynamic size variation
  
          vec3 q = p; // input copy

          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += time * 0.4; // Forward Camera Movement  
          q.xz = fract(p.xz) - 0.5; // Space Repetition 0.5 is the center of repetition
          q.y -= time * 0.4; // Upward Movement
          // q.xz *= rot2D(fract(time * 4.0) - 0.5); 
  
          // float box = sdBox(q * 3.0, vec3(0.15)) / 3.0; 
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
          
          // fluid lines float box = sdBox(q * 3.0, vec3(0.15) * 3.0) / 3.0; // Scaled Cube SDF

          // Calculate building's position based on street number
          float buildingSize = 1.0;
          float buildingHeight = 3.0 + noise(q.xz * 0.1) * 2.0; // Random building height
          vec3 buildingPos = q - vec3(mod(q.x, grid_size), 0.0, mod(q.z, grid_size));

          // Address building properties based on the houseNumber
          float houseNumber = floor(buildingPos.x / grid_size) + floor(buildingPos.z / grid_size) * 57.0;  // Unique ID for each building
          float heightFactor = hash(houseNumber + 1.0); // Random value for height variation
          float sizeFactor = hash(houseNumber + 2.0);   // Random value for size variation

          // Apply these random values to alter building height and size
          buildingHeight += heightFactor * 2.0; // Alter height based on houseNumber
          buildingSize += sizeFactor * 0.5;          // Alter size based on houseNumber
          float building = sdBuilding(buildingPos * 3.0, vec3(buildingSize, buildingHeight, buildingSize * 3.0) / 3.0) / 3.0;  // Generate a unique "houseNumber" based on the building's grid position

          // Generate birds
          float bird = sdBird(q, birdPos, bodySize, birdPos, wingSize, birdPos, headSize, beakLength, wingAngle);
          float flock = generateFlock(q * 3.0, birdPos, bodySize, wingSize, headSize, beakLength, wingAngle, ageFactor) / 3.0;
          birdPos += q - vec3(mod(q.x, grid_size), 6.0 * time, mod(q.z, grid_size));

          // ground 
          float ground = sdGround(p);
          float terrain = min(min(ground, sun), building); 
          float terrainBirds = opSmoothIntersection(terrain, min(bird, flock), min(flock, terrain)); 
          float flockTerrain = opSmoothIntersection(terrainBirds, min(flock, terrain), min(flock, terrain)); 
  
          // To combine the two shapes using the union operator
          return opSmoothUnion(terrain, opSmoothUnion(min(building, flock), terrainBirds, opSmoothUnion(terrain, flock, terrainBirds)), min(flock, terrain));
        }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              map(p + vec3(epsilon, 0, 0)) - map(p - vec3(epsilon, 0, 0)),
              map(p + vec3(0, epsilon, 0)) - map(p - vec3(0, epsilon, 0)),
              map(p + vec3(0, 0, epsilon)) - map(p - vec3(0, 0, epsilon))
          ));
        }

        // Function to compute soft shadows
        float computeSoftShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small initial offset to avoid self-shadowing
          float shadowFactor = 1.0;
          float maxDist = 5.0;

          for (int j = 0; j < 24; j++) { // Optimized loop count
            vec3 shadowPoint = p + shadowDir * shadowT;
            float shadowDist = map(shadowPoint);
                
            if (shadowDist < 0.001) {
              shadowFactor *= 0.5; // Reduce intensity for occlusion
            }
                
            shadowT += shadowDist * 0.5; // Smaller steps improve softness
            if (shadowT > maxDist) break; // Stop marching if too far
          }

          return clamp(shadowFactor, 0.2, 1.0); // Ensure valid shadow range
        }
      
        vec3 computeCameraPosition(float time) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(time * speed);
          float camZ = radius * sin(time * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
        }
      
        vec3 computeUVCameraPosition(vec2 res, float t) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = t  + (radius * cos(time * speed));
          float camZ = t + (radius * sin(time * speed));
          float x = camX * res.x;
          float y = res.y;
          float z = camZ - 3.0;
          
          return vec3(x, y, z); // Y-position can be adjusted for height
        }

        vec3 applyFog(vec3 color, float distance, vec3 fogColor, float fogDensity) {
          float fogFactor = exp(-distance * fogDensity); // Exponential fog
          return mix(fogColor, color, fogFactor); // Blend fog with scene color
        }

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float time) {
          // Adding wiggle effect to the camera
          ro.x += sin(time * 2.0) * 0.5;
          ro.y += cos(time * 1.5) * 0.2;
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * time * 0.5) * 0.1,  
              cos(uv.y * time * 0.3) * 0.1,  
              sin(uv.x * time * 0.7) * 0.1  
          ));

          rd = normalize(rd); // Normalize direction after adding noise

          // Camera rotations
          ro.yz *= rot2D(-mouse.y);
          rd.yz *= rot2D(-mouse.y);

          ro.xz *= rot2D(-mouse.x);
          rd.xz *= rot2D(-mouse.x);
        }
        
        // Main fragment shader function
        void main() {
            vec2 fragCoord = gl_FragCoord.xy;
            vec2 uv = fragCoord / resolution; // Proper UV mapping
            vec2 mouse = (mousePosition.xy * 2.0 - fragCoord) / resolution.y;

            // Noise and Soft Min calculations
            float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
            float smn = smin(uv.x + time, uv.y + shapeFactor, shapeFactor + sin(uv.x * shapeFactor));
            float shadowIntensity = 0.1;
        
            // UV Transformations
            uv *= 2.0 + time;
        
            float fov = 1.0;
            vec3 ro = vec3(uv, -3.0); // Ray Origin
            vec3 rd = normalize(vec3(uv * fov, 1.0)); // Ray Direction
        
            uv *= 1.2 + noise(uv * time) * 0.05;  // Slight noise-based distortion

            // Shadow and Reflections
            vec3 lightPos = vec3(0.0, 10.0, -5.0); // Light position
            vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0)); // Camera view direction
            vec3 lightDir;
        
            // 🔥🔥 Ray Marching Algorithm
            float depthFactor = 0.064;
            float lightIntensity = 0.02;
            float t = 0.0; // Total Distance Travelled By Ray
            vec3 normal; // Declare normal
            vec3 color = vec3(t);
            // vec3 color = vec3(t * time * 0.2 * depthFactor + noise(uv.xy * 3.0 + time * 0.5));
        
            // Ray Marching Algorithm
            for (int i = 0; i < 80; i++) {
                vec3 p = ro + rd * t; // Position along the ray
                float d = map(p); // Current distance to the scene
                // lightDir = normalize(lightPos - p);

                // Apply wiggle effect to the camera
                wiggleCamera(ro, rd, uv, mouse, time);
                    
                // Compute Shadows and reflections
                if (d < 0.001) {  
                  normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
                  float shadow = computeSoftShadow(p + normal, lightPos);
                  //float light = computeLighting(p, normal, lightPos, viewDir, shadow);
                  shadowIntensity = computeSoftShadow(p, lightPos); // Call function
                  // shadowIntensity = computeSoftShadow(p, lightPos); // Compute soft shadow
                  // shadowIntensity = computeHardShadow(p, lightPos); // Call function
                  break;
        
                t += d; // March the distance
        
                color = vec3(i) / 80.0;
                color *= shadowIntensity; // Apply shadow effect
        
                if (d < 0.001 || t > 100.0) break;
            }

            // Apply depth factor
            float rayPower = t * 0.003 * lightIntensity * depthFactor * shadowIntensity;
  
            // Define fog parameters
            vec3 fog = vec3(0.2 * ro.x, 0.3 * ro.y, 0.4 * ro.z); // Adjust for desired atmosphere
            float fogDensity = 0.02; // Adjust for stronger/weaker fog

            // color += fract(rayPower) - 0.5; // Space Repetition 0.5 is the center of repetitins
  
            // Final Coloring with Shadows
            float rgR = rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity;
            float rgG = rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity;
            float rgB = rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;
            
            color += vec3(rgR, rgG, rgB);
            color += vec3(rayPower);
  
            color = applyFog(color, t, fog, fogDensity);
            //color = mix(color, fog, 1.0 - exp(-fogDensity * t));
  
          
            gl_FragColor = vec4(color, 1);
          }
        }        
      `
    };

    this.glassSkylineMaterial = new THREE.ShaderMaterial(this.glassSkylineShader);
  }

  useSkylineTerrainShader() {
    this.skylineTerrainShader = {
      uniforms: {
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
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
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;
        varying vec2 vUv;

        // Define the size of a building block
        float boxSize = 1.0;
        float buildingHeight = 3.0;

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
          return clamp(mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y, 0.0, 1.0);
        }

        // Simple float hash function for generating pseudo-random values
        float hash(float x) {
            return fract(sin(x) * 43758.5453123); // A pseudo-random generator based on sin(x)
        }

        // Smoothstep interpolation function for blending
        float S(float t) {
          return t * t * (3.0 - 2.0 * t);
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

        vec3 rotate3D(vec3 p, vec3 k, float angle) {
          k = normalize(k); // Ensure unit length
          float cosA = cos(angle);
          float sinA = sin(angle);
      
          return p * cosA + cross(k, p) * sinA + k * dot(k, p) * (1.0 - cosA);
        }

        float S(float x, float y,  float z) {
          return smoothstep(x, y, z);
        }

        // Define smooth union operation
        float opSmoothUnion(float d1, float d2, float k) {
            float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
            return mix(d2, d1, h) + k * h * (1.0 - h);
        }
  
        float opSmoothIntersection(float d1, float d2, float k) {
          float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
          return mix(d2, -d1, h) + k * h * (1.0 - h);
        }
  
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * h * k * (1.0 / 6.0);
        }

        // Signed distance function for a circle
        float sdCircle(vec2 p, float radius) {
          return length(p) - radius;
        }
  
        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        // Signed distance function for a cone
        float sdCone(vec3 p, vec3 dir, float height, float radius) {
            // Ensure direction is normalized
            dir = normalize(dir);

            // Project point onto the cone's axis
            float d = dot(p, dir);
            vec3 projected = dir * d;

            // Compute the distance from the projected point to the actual point
            float lateralDist = length(p - projected);
            
            // Compute the expected radius at this height
            float expectedRadius = (d / height) * radius;

            // Compute the signed distance (negative inside, positive outside)
            float distance = lateralDist - expectedRadius;

            // Enforce height limits
            float capBottom = d;
            float capTop = d - height;
            
            // If above the cone's tip or below the base, clamp distance
            return max(distance, max(-capBottom, capTop));
        }

        // Create a basic box (building) SDF
        float sdBox(vec3 p, vec3 size) {
          vec3 q = abs(p) - size; 
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        }

        // Create a cuboid box (building) SDF
        float sdBuilding(vec3 p, vec3 size) {
          vec3 d = abs(p) - size;  // Get the distance from the cuboid
          return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
        }

        // Bird body (simplified)
        float sdBirdBody(vec3 p, float size) {
            return sdSphere(p, size);
        }

        // Simplified Bird wings (simplified with two spheres for each wing)
        float sdWing(vec3 p, vec3 wingPos, float wingSize, float angle) {
            // Rotate the wing around the body for animation
            vec3 rotatedPos = rotate3D(p - wingPos, vec3(0.0, 0.0, 1.0), angle) + wingPos;
            return sdSphere(rotatedPos, wingSize); // Using sphere to approximate wing
        }

        // Bird wings (simplified with two spheres for each wing)
        // float sdFlappyWing(vec3 p, vec3 wingPos, float wingSize, float angle) {
        //     // Rotate the wing around the body for animation
        //     mat3 rot = rotationMatrix(angle, vec3(0.0, 0.0, 1.0)); // Rotate along Z-axis (wing flapping)
        //     vec3 rotatedPos = rot * (p - wingPos);
        //     return sdSphere(rotatedPos, wingSize); // Using sphere to approximate wing
        // }

        // Bird head
        float sdHead(vec3 p, vec3 headPos, float headSize) {
            return sdSphere(p - headPos, headSize);
        }

        // Bird beak
        float sdBeak(vec3 p, vec3 headPos, float beakLength) {
            vec3 beakDir = normalize(p - headPos);
            return sdCone(p - headPos, beakDir, beakLength, 0.1); // A cone for the beak
        }

        // Combine the components to form a bird
        float sdBird(vec3 p, vec3 bodyPos, float bodySize, vec3 wingPos, float wingSize, vec3 headPos, float headSize, float beakLength, float wingAngle) {
            float body = sdBirdBody(p - bodyPos, bodySize);
            float wing1 = sdWing(p, wingPos, wingSize, wingAngle);
            float wing2 = sdWing(p, wingPos + vec3(0.5, 0.0, 0.0), wingSize, -wingAngle); // Second wing
            float head = sdHead(p, headPos, headSize);
            float beak = sdBeak(p, headPos, beakLength);
            
            // Combine parts using smooth union
            return opSmoothUnion(opSmoothUnion(body, wing1, 0.1), opSmoothUnion(wing2, opSmoothUnion(head, beak, 0.1), 0.1), 0.1);
        }

        // // Main map function with bird in the scene
        // float map(vec3 p) {
        //     // Bird position and movement based on time
        //     vec3 birdPos = vec3(sin(time) * 3.0, cos(time) * 3.0, 0.0); // Bird movement
        //     float birdBodySize = 0.5;
        //     float birdWingSize = 0.2;
        //     float birdHeadSize = 0.2;
        //     float birdBeakLength = 0.1;
        //     float wingAngle = sin(time * 2.0) * 0.5; // Flapping wing animation

        //     // Generate bird
        //     float bird = sdBird(p, birdPos, birdBodySize, birdPos, birdWingSize, birdPos + vec3(0.0, 0.5, 0.0), birdHeadSize, birdBeakLength, wingAngle);

        //     // Terrain and other objects
        //     float ground = sdfGround(p);
        //     return min(ground, bird); // Combine the bird with the ground
        // }

        // Define ground SDF function
        float sdGround(vec3 p) {
            return p.y + noise(p.xz * 0.1) * 0.5; // Example ground height variation
        }

        // The main map function that will define the scene
        float map(vec3 p) {
          // Define building parameters
          vec3 spherePos = vec3(-5.0 * sin(time * 5.0), 2.0, 0.0);
          spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), time * 0.3);
          float sphere = sdSphere(p - spherePos, 0.9);

          // Bird position and movement, include more natural flight behavior
          vec3 birdPos = vec3(sin(time + p.x * 2.0) * 3.0, cos(time + p.z * 2.0) * 3.0 + 1.0, cos(time + p.x * 0.5) * 2.0); // Flight movement, based on world position for variety
          float birdBodySize = 0.5;
          float wingSize = 0.2;
          float headSize = 0.2;
          float beakLength = 0.1;
          float wingAngle = sin(time * 2.0) * 0.5; // Flapping wing animation


          // Ground SDF
          float ground = sdGround(p);
          // p += rotate3D(p, p.xy, angle);

          // Weather Factor
          p.z += time * 0.4; // Forward Camera Movement      
  
          // Infinite city generation
          vec3 q = p; // input copy
          q.y -= time * 0.4; // Upward Movement
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition

          // // Boxes
          float boxSize = 1.0;
          float box = sdBox(q * 4.0, vec3(0.75)) / 4.0;

          // Streets and Parkways, Create building SDF and place it on street
          // Use mod(p.x, grid_size) and mod(p.z, grid_size) for infinite grid layout
          float grid_size = 15.0;  // Grid spacing for streets & buildings
          float road_width = 2.5;  // Adjust road width

          // Calculate building's position based on street number
          float buildingHeight = 3.0 + noise(p.xz * 0.1) * 2.0; // Random building height
          vec3 buildingPos = q - vec3(mod(q.x, grid_size), 0.0, mod(q.z, grid_size));
          float building = sdBuilding(buildingPos, vec3(boxSize, buildingHeight, boxSize * 3.0) / 3.0);  // Generate a unique "houseNumber" based on the building's grid position

          // Use hash function to introduce randomness for building properties based on the houseNumber
          float houseNumber = floor(buildingPos.x / grid_size) + floor(buildingPos.z / grid_size) * 57.0;  // Unique ID for each building
          float heightFactor = hash(houseNumber + 1.0); // Random value for height variation
          float sizeFactor = hash(houseNumber + 2.0);   // Random value for size variation

          // Apply these random values to alter building height and size
          buildingHeight += heightFactor * 2.0; // Alter height based on houseNumber
          boxSize += sizeFactor * 0.5;          // Alter size based on houseNumber

          // Animals and Flying Creatures
          float bird = sdBird(q, birdPos, birdBodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);
          // Smaller birds at different offsets
          float scaleFactor = 0.5 + 0.3 * sin(time * 2.0);  // Dynamic size variation
          float bird1 = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float bird2 = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor * 0.5, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float bird3 = sdBird(q, birdPos + vec3(-3.0, 2.0, 2.5), birdBodySize * (scaleFactor * 0.8), birdPos, wingSize * (scaleFactor * 0.8), birdPos + vec3(0.0, 0.5, 0.0) * (scaleFactor * 0.8), headSize * (scaleFactor * 0.8), beakLength * (scaleFactor * 0.8), wingAngle);

          // Combine the ground with buildings
          float terrain = min(ground, building); 
          float terrainBirds = opSmoothIntersection(terrain, bird, min(bird, terrain)); 

          // Combine ground with buildings using smooth union
          //return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          return opSmoothUnion(terrain,  opSmoothUnion(building, opSmoothIntersection(box, bird, min(bird, terrain)), opSmoothUnion(terrain, box, bird)), min(bird, terrain));
          //float bird1 = sdBird(q, birdPos, birdBodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);

          //return opSmoothUnion(terrain, terrainBirds, min(terrain, bird));
          //return opSmoothUnion(terrain, opSmoothUnion(building, opSmoothIntersection(box, bird1, min(bird1, terrain)), 
             //             opSmoothUnion(bird2, bird3, bird1)), min(bird1, terrain));

          // return opSmoothUnion(min(ground, building), bird, min(box, terrain));
        }
  

        // Light
        vec3 computeLighting(vec3 p, vec3 normal, vec3 lightPos, vec3 viewDir, float shadow) {
          vec3 lightDir = normalize(lightPos - p);
      
          // Compute soft shadow
          // float shadow = softShadow(p + normal * 0.02, lightDir, 0.1, 10.0, 16.0);
          
          // Diffuse lighting
          float diff = max(dot(normal, lightDir), 0.0);
          
          // Specular lighting (Phong reflection)
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
          
          // Combine lighting and shadow
          vec3 color = vec3(1.0, 0.9, 0.7); // Light color
          return (diff + spec) * color * shadow;
        }

        // Optional Shadow calculator
        float computeShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small offset to avoid self-shadowing
          float shadowFactor = 1.0; // Default: no shadow
      
          for (int j = 0; j < 10; j++) { // Optimized iteration count
              vec3 shadowPoint = p + shadowDir * shadowT;
              float shadowDist = map(shadowPoint);
      
              if (shadowDist < 0.001) {
                  shadowFactor = 0.5; // In shadow
                  break;
              }
      
              shadowT += shadowDist;
              if (shadowT > 5.0) break; // Exit if ray goes too far
          }
          return shadowFactor;
        }

        // Function to compute soft shadows
        float computeSoftShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small initial offset to avoid self-shadowing
          float shadowFactor = 1.0;
          float maxDist = 5.0;

          for (int j = 0; j < 24; j++) { // Optimized loop count
            vec3 shadowPoint = p + shadowDir * shadowT;
            float shadowDist = map(shadowPoint);
                
            if (shadowDist < 0.001) {
              shadowFactor *= 0.5; // Reduce intensity for occlusion
            }
                
            shadowT += shadowDist * 0.5; // Smaller steps improve softness
            if (shadowT > maxDist) break; // Stop marching if too far
          }

          return clamp(shadowFactor, 0.2, 1.0); // Ensure valid shadow range
        }

        // Display Shadows
        float computeHardShadow(vec3 ro, vec3 lightPos) {
          vec3 shadowRayDir = normalize(lightPos - ro);
          float shadowT = 0.0;
          float shadowIntensity = 1.0;
      
          for (int i = 0; i < 20; i++) {
              vec3 shadowPoint = ro + shadowRayDir * shadowT;
              float shadowDist = map(shadowPoint);
              shadowT += shadowDist;
      
              if (shadowDist < 0.001) {
                  shadowIntensity = 0.5; // Shadowed region
                  break;
              }
          }
      
          return shadowIntensity;
        }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              map(p + vec3(epsilon, 0, 0)) - map(p - vec3(epsilon, 0, 0)),
              map(p + vec3(0, epsilon, 0)) - map(p - vec3(0, epsilon, 0)),
              map(p + vec3(0, 0, epsilon)) - map(p - vec3(0, 0, epsilon))
          ));
        }

        vec3 computeCameraTubePosition(float time) {
          float radius = 5.0;  // Adjust radius for left/right swing
          float speed = 0.5;   // Rotation speed
      
      
          float camX = radius * sin(time * speed);  // Left/Right movement
          float camZ = -time * 3.0;  // Forward movement into the tunnel

          // float camX = radius * sin(time * speed);
          // float camY = cos(time * 0.4) * 0.5;  // Small up/down motion
          // float camZ = -time * (2.5 + sin(time * 0.2) * 1.5); // Smooth speed variation  
          // return vec3(camX, camY, camZ);
          return vec3(camX, 0.5, camZ);  // Keep Y constant
        }
      
        vec3 computeCameraPosition(float time) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(time * speed);
          float camZ = radius * sin(time * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
        }

        vec3 applyFog(vec3 color, float distance, vec3 fogColor, float fogDensity) {
          float fogFactor = exp(-distance * fogDensity); // Exponential fog
          return mix(fogColor, color, fogFactor); // Blend fog with scene color
        }

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float time) {
          // Adding wiggle effect to the camera
          ro.x += sin(time * 2.0) * 0.5; // Wiggle the x-axis of the camera path
          ro.y += cos(time * 1.5) * 0.2; // Wiggle the y-axis of the camera path
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * time * 0.5) * 0.1,  
              cos(uv.y * time * 0.3) * 0.1,  
              sin(uv.x * time * 0.7) * 0.1  
          ));

          rd = normalize(rd); // Normalize direction after adding noise

          // Camera rotations
          ro.xz *= rot2D(-mouse.x);
          rd.xz *= rot2D(-mouse.x);
      
          ro.yz *= rot2D(-mouse.y);
          rd.yz *= rot2D(-mouse.y);
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          vec2 mouse = (mousePosition.xy * 2.0 - fragCoord) / resolution.y;
        
          // Noise and Soft Min calculations
          float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
          float smn = smin(uv.x + time, uv.y + shapeFactor, shapeFactor + sin(uv.x * shapeFactor));
          float shadowIntensity = 0.1;
        
          // UV Transformations
          uv *= 2.0 + time;
          uv *= 1.2 + noise(uv * time) * 0.05;  // Slight noise-based distortion

          // Initialize Ray marching variables
          float fov = 1.0; 
          float depthFactor = 0.064;

          // Light Setup
          vec3 ro = computeCameraPosition(time);
          // vec3 ro = vec3(0.0, 0.0, -3.0); // Ray Origin
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction rd = normalize(rd);

          // Shadow and Reflections
          vec3 lightPos = vec3(0.0, 10.0, -5.0); // Light position
          vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0)); // Camera view direction
          vec3 lightDir;
          
          // Apply wiggle effect to the camera
          wiggleCamera(ro, rd, uv, mouse, time);
        
          // 🔥🔥 Ray Marching Algorithm
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 color = vec3(t);
          vec3 normal; // Declare normal

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = map(p); // Current distance to the scene
            lightDir = normalize(lightPos - p);
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, lightPos);
              //float light = computeLighting(p, normal, lightPos, viewDir, shadow);
              shadowIntensity = computeSoftShadow(p, lightPos); // Call function
              // shadowIntensity = computeSoftShadow(p, lightPos); // Compute soft shadow
              // shadowIntensity = computeHardShadow(p, lightPos); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
        
            t += d; // March the distance
        
            color = vec3(i) / 80.0;
        
            if (d < 0.001 || t > 100.0) break;
          }

          // Depth Factor
          float rayPower = t * 0.2 * depthFactor;
          // color = vec3(rayPower * depthFactor );

          // Compute colors with depth factor
          float rgR = shadowIntensity + rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity; 
          float rgG = shadowIntensity + rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity;
          float rgB = shadowIntensity + rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;
      
          // Final Coloring with Shadows
          color = vec3(rgR, rgG, rgB);

          // Define fog parameters
          vec3 fog = vec3(0.2, 0.3, 0.4); // Adjust for desired atmosphere
          float fogDensity = 0.02; // Adjust for stronger/weaker fog

          // Final Coloring with Shadows
          color = vec3(
              rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) * shadowIntensity,
              rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * shadowIntensity,
              rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity
          );

          color = applyFog(color, t, fog, fogDensity);
          gl_FragColor = vec4(color, 1);
        }
        
      `
    };
    this.skylineTerrainMaterial = new THREE.ShaderMaterial(this.skylineTerrainShader);
  }

  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }

  handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
    if (!renderer) return;
    // Each shader handles its own resolution updates
    if (this.skyCityShader) this.updateResolution(this.skyCityShader, width, height);
    if (this.ceasarsShader) this.updateResolution(this.ceasarsShader, width, height);
    if (this.skylineTerrainShader) this.updateResolution(this.skylineTerrainShader, width, height);
    if (this.glassSkylineShader) this.updateResolution(this.glassSkylineShader, width, height);
  }


  // Handle hover effect on shaders
  handleHoverEffect(shader, mousePosition) {
    if (shader && mousePosition) {
      // Update hover effect uniforms
      shader.uniforms.hovered.value = 1.0;
      shader.uniforms.mousePosition.value =  new THREE.Vector2(mousePosition.x, mousePosition.y);

      // Dynamically update explodeIntensity based on time and mouse hover
      shader.uniforms.explodeIntensity.value = Math.sin(this.explodeIntensity + this.time);
      shader.uniforms.shapeFactor.value = this.shapeFactor + (this.time * Math.sin(0.001 + this.time));
    }
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
    if (this.skyCityShader) this.handleHoverEffect(this.skyCityShader, this.mousePosition);
    if (this.ceasarsShader) this.handleHoverEffect(this.ceasarsShader, this.mousePosition);
    if (this.skylineTerrainShader) this.handleHoverEffect(this.skylineTerrainShader, this.mousePosition);
    if (this.glassSkylineShader) this.updateResolution(this.glassSkylineShader, this.mousePosition);
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
    if (this.skyCityShader) {
      this.skyCityShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.skyCityShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.skyCityShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.glassSkylineShader) {
      this.glassSkylineShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.glassSkylineShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.glassSkylineShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.ceasarsShader) {
      this.ceasarsShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.ceasarsShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.ceasarsShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.skylineTerrainShader) {
      this.skylineTerrainShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.skylineTerrainShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.skylineTerrainShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }
  }
}
export default SkyLineMaterials;
import * as THREE from 'three';

export class LucentShaderMaterials {
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
    this.mousePosition = mouse;

    this.useBlendedLucentShader();
    this.useBlendedMosaicShader();
    this.useBlendedCaveShader();

    this.updateEvents();
    this.getShaders();
  }

  useBlendedLucentShader() {
    this.blendedLucentShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
      #ifdef GL_ES
      precision mediump float;
      #endif
      
        uniform float sineTime;
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + sineTime);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(sineTime + dist * 10.0);
          
          // Apply explode effect based on intensity and mouse interaction
          pos += normal * effect * explodeIntensity;
      
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,

      fragmentShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        
        varying vec2 vUv;
        uniform float sineTime;
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;

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
          vec3 spherePos = vec3(-5.0 * sin(sineTime * 5.0), 2.0, 0.0);
          // spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), sineTime * 0.3);
          float sphere = sdSphere(p - spherePos, 0.9);

          // Ground SDF
          float ground = sdfGround(p);
          // p += rot3D(p, p.xy, angle);  
  
          // Infinite city generation
          vec3 q = p; // input copy


          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += sineTime * 0.4; // Forward Camera Movement  
          q.y -= sineTime * 0.4; // Upward Movement

          // q.xz *= rot2D(sineTime * 0.4);
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

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float sineTime) {
          // Adding wiggle effect to the camera
          ro.x += sin(sineTime * 2.0) * 0.5;
          ro.y += cos(sineTime * 1.5) * 0.2;
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * sineTime * 0.5) * 0.1,  
              cos(uv.y * sineTime * 0.3) * 0.1,  
              sin(uv.x * sineTime * 0.7) * 0.1  
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
          float ripple = sin(10.0 * d - sineTime * 5.0);
          float intensity = smoothstep(0.3, 0.0, d);

          vec3 wave = vec3(x, y, z) + ripple * intensity;
          return wave;
        }

        vec3 applyRipple(vec3 p, float d, float sineTime) {
            float ripple = sin(10.0 * d - sineTime * 5.0);
            float intensity = smoothstep(0.3, 0.0, d);
            return p + normalize(vec3(p.xy, 0.0)) * ripple * intensity;
        }
        
        vec3 applyTurboRipple(vec3 position, float dist, float sineTime, float frequency, float speed, float fade) {
          float ripple = sin(frequency * dist - sineTime * speed);
          float intensity = smoothstep(fade, 0.0, dist);
          return position + normalize(vec3(position.xy, 0.0)) * ripple * intensity;
        }
      
        float blendShapeFactor(float uvx, float factor, float sineTimeMod) {
          float raw = fract(factor * uvx);
          float st = smoothstep(0.0, 1.0, raw); // or your custom S()
          float animated = st * sin(sineTimeMod + uvx * factor);
          return animated;
        }

        vec3 computeCameraTubePosition(float sineTime) {
          float radius = 5.0;  // Adjust radius for left/right swing
          float speed = 0.5;   // Rotation speed
          float camX = radius * sin(sineTime * speed);  // Left/Right movement
          float camZ = -sineTime * 3.0;  // Forward movement into the tunnel

          // float camX = radius * sin(sineTime * speed);
          // float camY = cos(sineTime * 0.4) * 0.5;  // Small up/down motion
          // float camZ = -sineTime * (2.5 + sin(sineTime * 0.2) * 1.5); // Smooth speed variation  
          // return vec3(camX, camY, camZ);
          return vec3(camX, 0.5, camZ);  // Keep Y constant
        }
      
        vec3 computeCameraPosition(float sineTime) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(sineTime * speed);
          float camZ = radius * sin(sineTime * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range

          vec3 specs = dimensions(uv);
          float r = specs.x;
          float a = specs.y;
          float f = specs.z;
          float sun = sdSun(uv);
            
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
        
          // RayMarch
          vec4 renderer = raymarch(ro, rd);
          float d = renderer.w;
        
        
          vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );

          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(sineTime));
            // dist +=  absT;
            
            // Use the distance to influence the color (make mouse position cause a color shift)
            vec3 color = vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            
            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            
            // Optionally, add sineTime-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            vec3 color = vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.blendedLucentMaterial = new THREE.ShaderMaterial(this.blendedLucentShader);
  }

  useBlendedCaveShader() {
    this.blendedCaveShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
      },

      vertexShader: `
      #ifdef GL_ES
      precision mediump float;
      #endif
      
        uniform float sineTime;
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + sineTime);
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(sineTime + dist * 10.0);
          
          // Apply explode effect based on intensity and mouse interaction
          pos += normal * effect * explodeIntensity;
      
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,

      fragmentShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        
        varying vec2 vUv;
        uniform float time;
        uniform float sineTime;
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;

        #define MAX_STEPS 100
        #define MAX_DIST 100.0
        #define SURF_DIST 0.001
        
        // === Fractal Hill Pattern ===
        float fractalHill(float t) {
        float total = 0.0;
        float amplitude = 1.0;
        float frequency = 1.0;
        float persistence = 0.5;
      
        for (int i = 0; i < 4; i++) {
          total += sin(t * frequency * 3.14159) * amplitude;
          amplitude *= persistence;
          frequency *= 2.0;
        }

        return total * 0.5 + 0.5; // normalize to [0,1]
        }
  
        // Terrain height using XZ
        float terrainHeight(vec2 posXZ) {
          return fractalHill(posXZ.x * 0.5 + sin(posXZ.y) * 0.25);
        }
          
        // Usage
        float getHeight(float t) {
          return fractalHill(t); // fractal height
        }

        float sdCylinder(vec3 p, float h, float r) {
          vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h * 0.5);
          return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }
  
        float ripples(float t) {
          return 0.5 + 0.5 * sin(t * 2.0 * 3.14159); // repeats every 1.0
        }
  
        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }
          
        vec3 getPath (vec3 startPos, vec3 endPos, float t){
            return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
        }
  
        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.x+time);
          return p.y - h; // above = positive, below = negative
        }
  
         
        float terrainVolumeSDF(vec3 p) {
           float h = terrainHeight(p.xz); // 2D hill over XZ
             return p.y - h;
         }

         float treeSDF(vec3 p) {
          p.z -= time;
          p =fract(p);
          // Distribute trees periodically over terrain
          vec2 cell = floor(p.xz * 2.0); // spacing
          vec3 pos = p - vec3(cell.x + 0.5, 0.0 , cell.y + 0.5);
          pos.y -= terrainHeight(cell + 0.5); // offset by terrain
        
          float trunk = sdCylinder(pos,  0.5, .05); // trunk
          return trunk;
        }
  
        float foliageSDF(vec3 p, vec3 base, float rnd) {
          float foliageHeight = 0.2 + 0.1 * fract(rnd * 60.0);
          vec3 canopyCenter = base + vec3(0.0, foliageHeight, 0.0);
          // vec3 q = fract(p)-0.5;
          return length(p - canopyCenter) - 0.15; // sphere canopy
        }
  float forestSDF(vec3 p) {
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float foliage = min(foliageSDF(p, (vec3(tree)), terrain), tree);
          // foliage = min(foliageSDF(p, -log(p), terrain), tree);
          // return min(min(terrain, tree), foliage);
          // return min(min(terrain, tree), foliage);
          return min((terrain, tree), foliage);
        }

        // Estimate normal from SDF
        vec3 computeNormal(vec3 p) {
          float d = terrainVolumeSDF(p)+forestSDF(p);
          vec2 e = vec2(0.001, 0.0);
          return normalize(vec3(
            terrainVolumeSDF(p + e.xyy) - d,
            terrainVolumeSDF(p + e.yxy) - d,
            terrainVolumeSDF(p + e.yyx) - d
          ));
        }
  
        vec3 terrainColor(vec3 p, float d) {
          // Shading
          vec3 color = vec3(0.6, 0.85, 0.4); // default grass color
          if (d < MAX_DIST) {
            vec3 normal = computeNormal(p);
            float diff = clamp(dot(normal, vec3(0.3, 1.0, 0.5)), 0.0, 1.0);
              color = vec3(0.3, 0.6, 0.2) * diff;
            } else {
              color = vec3(0.6, 0.8, 1.0); // sky
            }
              return color;
          }

          // Raymarching algorithm
          float renderer(vec3 ro, vec3 rd) {
          float t = 0.0;
          for (int i = 0; i < MAX_STEPS; i++) {
            vec3 p = ro + rd * t;
            float d = terrainVolumeSDF(p) + linearTerrainSDF(p);
            if (d < SURF_DIST || t > MAX_DIST) break;
            t += d;
          }
          return t;
        }
 
        vec4 raymarch(vec3 ro, vec3 rd) {
          float depthFactor = 0.064;
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 depthGreyValue = vec3(t);
          vec3 p; // declared outside loop so it's accessible after
          float d = 0.0;
          vec3 pth = getPath(ro, rd, t) ;
          
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            float d = terrainVolumeSDF(p)* linearTerrainSDF(p+pth);// LandScape;
            d = terrainVolumeSDF(p)+ linearTerrainSDF(p+pth);// Coniferous Forests
            // d = terrainVolumeSDF(p)* linearTerrainSDF(p+pth)+hillTerrain(p.y); // Riparian Forest 
            d = forestSDF(p);
            // d=forestSDF(p+pth)+forestSDF(p)+linearTerrainSDF(p+pth);
            // d = terrainVolumeSDF(p)* linearTerrainSDF(p+pth)+hillTerrain(p.z); //Snow Grassland
            // d = (terrainVolumeSDF(p)+ linearTerrainSDF(p+pth)+hillTerrain(p.z)); // Plain Field
            if (d < 0.001 || t > 100.0) break;
              
            t += d;
            depthGreyValue = vec3(i) / 80.0;
          }
     
          float ray = t * 0.2 * depthFactor;
          float rpl = ripples(ray*sin(time+0.7));
          
          // 🌿 Base shading — default grass tint
          vec3 color = depthGreyValue * vec3(0.6, .85, 0.4);
          vec3 landScape = terrainColor(p, t);
          // color = depthGreyValue * landScape;
          // vec3 cloudyLandScape = terrainColor(p, t*rpl);
          // vec3 foggyLandScape = terrainColor(p, t/rpl);
          // color = depthGreyValue * landScape;
          // color = depthGreyValue / cloudyLandScape;// Wind AND 
          // color = depthGreyValue * foggyLandScape; // FloodedDelta
          // vec3 rayColor= rayPower(p, d, t);
        
          return vec4(color, ray);
        }

        float sdSun(vec2 u) {
          vec2 p = vec2(0.5)-u;
          return length(p)*2.0;
        }
        
        vec3 sunLight(vec2 uv) {
          float d = sdSun(uv);  // you can vary this radius
          float mask = 1.0 - smoothstep(0.0, 0.02, d);
          vec3 color = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 0.9, 1.0), sin(time * 0.25) * 0.5 + 0.5);
          return color * mask;
        }

        vec3 dimensions(vec2 u) {
          vec2 p = vec2(0.5)-u;
      
          float r = length(p)*2.0;  // This can serve as the Sun since sdf circle need only r
          float a = atan(p.y,p.x);
                
          float f = cos(a*3.);
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          return vec3(r, a, f);
        }
    
        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          vec3 specs = dimensions(uv);
          float r = specs.x;
          float a = specs.y;
          float f = specs.z;
          float sun = sdSun(uv);
            
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
        
          // RayMarch
          vec4 renderer = raymarch(ro, rd);
          float d = renderer.w;
        
        
          vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );
          
          vec3 shape = r-vec3(renderer.w-r/a, renderer.y, renderer.z)-renderer.z+((uv.y)*0.14)/(sun);
          color = shape;

          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(sineTime));
            // dist +=  absT;
            
            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            
            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            
            // Optionally, add sineTime-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = shape;
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
      `
    };

    this.blendedCaveMaterial = new THREE.ShaderMaterial(this.blendedCaveShader);
  }

  useBlendedMosaicShader() {
    this.blendedMosaicShader = {
      uniforms: {
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition },
        time: { value: this.clock.getElapsedTime() },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.params.customShaderUniforms }, 
        sineTime: { value: this.sineTime },
      },

      vertexShader: `
      #ifdef GL_ES
      precision mediump float;
      #endif
      
        uniform float sineTime;
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + sineTime);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(sineTime + dist * 10.0);
          
          // Apply explode effect based on intensity and mouse interaction
          pos += normal * effect * explodeIntensity;
      
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,

      fragmentShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
        
        varying vec2 vUv;
        uniform float sineTime;
        uniform float hovered;
        uniform float shapeFactor;
        uniform vec2 mousePosition;
        uniform vec2 resolution;
        uniform float explodeIntensity;

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
          vec3 spherePos = vec3(-5.0 * sin(sineTime * 5.0), 2.0, 0.0);
          // spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), sineTime * 0.3);
          float sphere = sdSphere(p - spherePos, 0.9);

          // Ground SDF
          float ground = sdfGround(p);
          // p += rot3D(p, p.xy, angle);  
  
          // Infinite city generation
          vec3 q = p; // input copy


          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += sineTime * 0.4; // Forward Camera Movement  
          q.y -= sineTime * 0.4; // Upward Movement

          // q.xz *= rot2D(sineTime * 0.4);
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

        float mapDagonWasp(vec2 p) {
          float r = length(p) * 2.616;
          float a = fract(atan(p.y, fract(p.x) - 0.2)) - r;
      
          // Animate 'f' to simulate leg movement using sineTime
          float t = fract(sineTime * 0.25); // slow looping sineTime
          float wave = sin(a * 10.0 + t * 6.2831); // 2π = full rotation
          float f = abs(wave) * 0.8 + 0.1;
      
          // Optional: add smoother leg outlines with smoothstep
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
      
          // Final mix with radial distance to simulate a crawl
          float legShape = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
      
          return legShape;
        }
        
        float dragonSpider(vec3 p) {
          // Create a pseudo distance estimate for SDF
          vec2 proj = p.xz; // Or any plane like xy or yz
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 2.5)) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
        
          float d = 1.0 - smoothstep(f, sin(f + r) - 0.25, r); // kind of SDF-ish
          return d - 0.5; // shrink a little
        }

        vec3 dragonSpiderColor(vec3 p) {
          vec2 proj = p.xz;
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          vec3 color = vec3(1.0 - smoothstep(f, sin(f + r) - 0.25, r));
          return color;
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

        void wiggleCamera(inout vec3 ro, inout vec3 rd, vec2 uv, vec2 mouse, float sineTime) {
          // Adding wiggle effect to the camera
          ro.x += sin(sineTime * 2.0) * 0.5;
          ro.y += cos(sineTime * 1.5) * 0.2;
          
          // Slight noise-based distortion on ray direction
          rd += normalize(vec3(
              sin(uv.x * sineTime * 0.5) * 0.1,  
              cos(uv.y * sineTime * 0.3) * 0.1,  
              sin(uv.x * sineTime * 0.7) * 0.1  
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
          float ripple = sin(10.0 * d - sineTime * 5.0);
          float intensity = smoothstep(0.3, 0.0, d);

          vec3 wave = vec3(x, y, z) + ripple * intensity;
          return wave;
        }

        vec3 applyRipple(vec3 p, float d, float sineTime) {
            float ripple = sin(10.0 * d - sineTime * 5.0);
            float intensity = smoothstep(0.3, 0.0, d);
            return p + normalize(vec3(p.xy, 0.0)) * ripple * intensity;
        }
        
        vec3 applyTurboRipple(vec3 position, float dist, float sineTime, float frequency, float speed, float fade) {
          float ripple = sin(frequency * dist - sineTime * speed);
          float intensity = smoothstep(fade, 0.0, dist);
          return position + normalize(vec3(position.xy, 0.0)) * ripple * intensity;
        }
      
        float blendShapeFactor(float uvx, float factor, float sineTimeMod) {
          float raw = fract(factor * uvx);
          float st = smoothstep(0.0, 1.0, raw); // or your custom S()
          float animated = st * sin(sineTimeMod + uvx * factor);
          return animated;
        }

        vec3 computeCameraTubePosition(float sineTime) {
          float radius = 5.0;  // Adjust radius for left/right swing
          float speed = 0.5;   // Rotation speed
          float camX = radius * sin(sineTime * speed);  // Left/Right movement
          float camZ = -sineTime * 3.0;  // Forward movement into the tunnel

          // float camX = radius * sin(sineTime * speed);
          // float camY = cos(sineTime * 0.4) * 0.5;  // Small up/down motion
          // float camZ = -sineTime * (2.5 + sin(sineTime * 0.2) * 1.5); // Smooth speed variation  
          // return vec3(camX, camY, camZ);
          return vec3(camX, 0.5, camZ);  // Keep Y constant
        }
      
        vec3 computeCameraPosition(float sineTime) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(sineTime * speed);
          float camZ = radius * sin(sineTime * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
        }

        mat2 scale(vec2 _scale){
            return mat2(_scale.x,0.0,
                        0.0,_scale.y);
        }
        
        float rollinBox(in vec2 u, in vec2 s){
          s = vec2(0.5) - s*0.5;
          vec2 suv = smoothstep(
            s,
            s+vec2(0.001),
            u
          );
          suv *= smoothstep(
            s,
            s+vec2(0.001),
            vec2(1.0)-u
          );
          return suv.x*suv.y;
        }
                
        float ripple(vec2 uv, float t) {
          float dist = length(uv - 0.5);
          float wave = sin(20.0 * dist - t * 5.0);
          return smoothstep(0.01, 0.015, wave);
        }

        float scanline(vec2 uv, float t) {
          float y = fract(t * 0.2);
          return smoothstep(y - 0.01, y, uv.y) - smoothstep(y, y + 0.01, uv.y);
        }

        float fractilize(float f, float t) {
          float st = sin(pow(f, t));
          float smh = S(smoothstep(st + f, t, st));
          float tx = fract(fract(st) + smh);
          return tx;
        }
      
        // Smoothstep interpolation function for blending
        float smoothsineTime(float t) {
          float u = t * t * (3.0 - 2.0 * t); // Standard smoothstep easing
          float blend = smoothstep(
            S(u + (t *  sineTime)), 
            sqrt(u + sin(t * sineTime)), 
            sqrt(u)
          );
          return blend;
        }

        float smoothFloatsineTime(float t) {
          float u = t * t * (3.0 - 2.0 * t);
          float a = u;
          float b = u + sin(t * 1.5);
          float x = sqrt(u);
          return smoothstep(a, b, x);
        }
        
        // Smoothstep interpolation function for blending
        float blendView(vec3 p, float t) {
          float u = sin(t * t * (3.0 - 2.0 * t));
          float v = pow(t, u);
          float mv = fract(v);
          float s = sdSphere(p, smoothsineTime(mv));
          float blend = smoothstep(
            S(sineTime * (t + mv)), 
            S(pow(u, sin(t + u))), 
            s
          );

          return blend * sqrt(blend * sineTime);
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
        
          // Noise and Soft Min calculationsshapeFactor + uv.x
          float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
          float bl = blendView(vec3(uv, sineTime), sineTime); 
          float shadowIntensity = 0.1;

          // Initialize Ray marching variables
          float fov = 1.0; 
          float depthFactor = 0.064;

          // Light Setup
          vec3 ro = computeCameraPosition(sineTime);
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction 

          // 🔥🔥 Ray Marching Algorithm
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 color = vec3(t);
          vec3 normal; // Declare normal

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = dragonSpider(p); // Current distance to the scene
            // rd = normalize(ro - p);
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, ro);
              shadowIntensity = computeSoftShadow(p, ro); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
        
            t += d; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey White Color
        
            if (d < 0.001 || t > 100.0) break;
          }

          // Depth FactordragonSpiderColor(uvt)
          vec3 uvt = vec3(uv, smoothstep(mouse.x, mouse.y, sineTime));
          float rayPower = t * 0.2 * depthFactor;
          float redBlend = blendView(uvt, fract(dragonSpider(uvt * sineTime)));
          float blueButter = shadowIntensity + rayPower + S(noise(uv.xy * 2.0 + sineTime * 0.7)) * shadowIntensity;
          float bt = smoothsineTime(blueButter + sineTime);
          float greenMoney = smoothstep(bt, sin(sineTime + bt), sqrt(sineTime + uv.x));
          float rgR = smoothstep(shadowIntensity, (rayPower + S(noise(uv.xy * 4.0 + sineTime * 0.3)) ), shadowIntensity); 
          float rgG = sqrt(shadowIntensity + rayPower + S(noise(uv.yx * 3.0 + sineTime * 0.5)) * smoothsineTime(shadowIntensity));
          float rgB = smoothsineTime(blueButter + sineTime);
          vec3 colorBlend = vec3(rgR, rgG, rgB);
          vec3 colorDust = vec3(smoothsineTime(redBlend), sineTime + mouse.x, sqrt(redBlend));
          vec3 colorButter = mix(colorBlend, colorDust, redBlend * blueButter);
        
          // // Aspect ratio correction for final rendering only, not for distance
          // vec2 aspectUV = uv;
          // aspectUV.x *= resolution.x / resolution.y;
          // // Center and scale position
          // vec2 p = vec2(0.55, 0.54) - uv;
      
          // // Call your effect function
          // vec3 spiderColor = dragonSpider(p);

          // Check if hovered is active or not
          float absT =  abs(sin(sineTime));
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mousePosition, uv);
            // dist +=  absT;

            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
  
            // Optionally, add sineTime-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
            color += mix(color, colorPallete, sineTime);//fract( * absT); //, sin(dist * (uv.x + sineTime)));

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
            color += mix(color, colorPallete, absT);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.blendedMosaicMaterial = new THREE.ShaderMaterial(this.blendedMosaicShader);
  }

  getShaders() {
    this.shaders = [
      this.blendedLucentShader, 
      this.blendedMosaicShader,
      this.blendedCaveShader,
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
export default LucentShaderMaterials;
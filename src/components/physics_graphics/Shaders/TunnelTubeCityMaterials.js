import * as THREE from 'three';

export class TunnelTubeCityMaterials {
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

    this.useTubeCityShader();
    this.useTunnelCityShader();
    this.useFlyingTubeCityShader();
    // this.updateEvents();
  }

  useTubeCityShader() {
    this.tubeCityShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition},
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
        varying vec2 vUv;
        uniform float time;
        uniform float hovered;
        uniform vec2 resolution;
        uniform vec2 mousePosition;
        uniform float shapeFactor;
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
  
          // Input Copy Before Fract
          vec3 q = p; // input copy

          // Weather Factor
          q.z += time * 0.4; // Forward Camera Movement    
          q.y -= time * 0.4; // Upward Movement

          // Infinite city generation with grid seperation
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition

          // // Boxes
          float boxSize = 1.0;
          float box = sdBox(q * 4.0, vec3(0.75)) / 4.0;
          // vec3 pos = q - vec3(mod(q.x + grid_size, grid_size), 0.0, mod(q.z, grid_size));
          // vec3 boxPos = pos;
          // boxPos.yz *= rot2D(boxPos.y);

          // Streets and Parkways, Create building SDF and place it on street
          // Use mod(p.x, grid_size) and mod(p.z, grid_size) for infinite grid layout
          float grid_size = 15.0;  // Grid spacing for streets & buildings
          float road_width = 2.5;  // Adjust road width

          // Calculate building's position based on street number
          float buildingHeight = 3.0 + noise(q.xz * 0.1) * 2.0; // Random building height
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
          float youngBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float matureBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor * 0.5, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float agedBirds = sdBird(q, birdPos + vec3(-3.0, 2.0, 2.5), birdBodySize * (scaleFactor * 0.8), birdPos, wingSize * (scaleFactor * 0.8), birdPos + vec3(0.0, 0.5, 0.0) * (scaleFactor * 0.8), headSize * (scaleFactor * 0.8), beakLength * (scaleFactor * 0.8), wingAngle);
          float baseBird = opSmoothIntersection(min(bird, youngBirds), opSmoothIntersection(youngBirds, matureBirds, min(matureBirds, agedBirds)),
          min(bird, youngBirds));

          // Combine the ground with buildings
          float terrain = min(ground, min(bird, building)); 
          float terrainBirds = opSmoothIntersection(terrain, baseBird, min(bird, terrain)); 

          // Combine ground with buildings using smooth union
          //return opSmoothUnion(smin(terrain, building, 2.0), terrainBirds, min(box, terrain));
          // return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(bird, terrain, min(bird, terrain)), min(box, terrain));
          //return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          // Fogged cityreturn opSmoothUnion(terrain,  opSmoothUnion(building, terrainBirds, opSmoothUnion(terrain, building, bird)), min(bird, terrain)); 
          // return opSmoothUnion(terrain,  opSmoothUnion(building, opSmoothIntersection(box, bird, min(bird, terrain)), opSmoothUnion(terrain, box, bird)), min(bird, terrain));
          //float youngBirds = sdBird(q, birdPos, birdBodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);

          //return opSmoothUnion(terrain, terrainBirds, min(terrain, bird));
          //return opSmoothUnion(terrain, opSmoothUnion(building, opSmoothIntersection(box, youngBirds, min(youngBirds, terrain)), opSmoothUnion(matureBirds, agedBirds, youngBirds)), min(youngBirds, terrain));
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

        // // Shadows and reflections
        // float softShadowReflection(vec3 ro, vec3 rd, float minDist, float maxDist, float k) {
        //     float res = 1.0;
        //     float t = minDist;

        //     for (int i = 0; i < 50; i++) { // March along the shadow ray
        //         float d = map(ro + rd * t); // ✅ Use map(p) instead of sceneSDF(p)
        //         if (d < 0.001) return 0.0; // In shadow
        //         res = min(res, k * d / t);
        //         t += d;
        //         if (t > maxDist) break;
        //     }

        //     return res;
        // }

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
          // vec3 ro = computeCameraTubePosition(time);
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
          float rayPower = t * 0.02 * depthFactor;
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

          color += applyFog(color, t, fog, fogDensity);
          // color *= applyFog(color, t, fog, fogDensity); // NICE DARK BLEND
          gl_FragColor = vec4(color, 1);
        }
        
      `
    };

    this.tubeCityMaterial = new THREE.ShaderMaterial(this.tubeCityShader);    
  }  

  useTunnelCityShader() {
    this.tunnelCityShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition},
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
          // spherePos += rotate3D(spherePos, vec3(1.0, 0.5, 0.0), time * 0.3);
          // float sphere = sdSphere(p - spherePos, 0.9);

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
          float youngBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float matureBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor * 0.5, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float agedBirds = sdBird(q, birdPos + vec3(-3.0, 2.0, 2.5), birdBodySize * (scaleFactor * 0.8), birdPos, wingSize * (scaleFactor * 0.8), birdPos + vec3(0.0, 0.5, 0.0) * (scaleFactor * 0.8), headSize * (scaleFactor * 0.8), beakLength * (scaleFactor * 0.8), wingAngle);

          // Combine the ground with buildings
          float terrain = min(ground, building); 
          float terrainBirds = opSmoothIntersection(terrain, bird, min(bird, terrain)); 

          // Combine ground with buildings using smooth union
          return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          //return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          // return opSmoothUnion(terrain,  opSmoothUnion(building, terrainBirds, opSmoothUnion(terrain, building, bird)), min(bird, terrain)); 
          // return opSmoothUnion(terrain,  opSmoothUnion(building, opSmoothIntersection(box, bird, min(bird, terrain)), opSmoothUnion(terrain, box, bird)), min(bird, terrain));
          //float youngBirds = sdBird(q, birdPos, birdBodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);

          //return opSmoothUnion(terrain, terrainBirds, min(terrain, bird));
          //return opSmoothUnion(terrain, opSmoothUnion(building, opSmoothIntersection(box, youngBirds, min(youngBirds, terrain)), 
             //             opSmoothUnion(matureBirds, agedBirds, youngBirds)), min(youngBirds, terrain));

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

        // // Shadows and reflections
        // float softShadowReflection(vec3 ro, vec3 rd, float minDist, float maxDist, float k) {
        //     float res = 1.0;
        //     float t = minDist;

        //     for (int i = 0; i < 50; i++) { // March along the shadow ray
        //         float d = map(ro + rd * t); // ✅ Use map(p) instead of sceneSDF(p)
        //         if (d < 0.001) return 0.0; // In shadow
        //         res = min(res, k * d / t);
        //         t += d;
        //         if (t > maxDist) break;
        //     }

        //     return res;
        // }

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

    this.tunnelCityMaterial = new THREE.ShaderMaterial(this.tunnelCityShader);
  }

  useFlyingTubeCityShader() {
    this.flyingTubeCityShader = {
      uniforms: {
        time: { value: this.time },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        time: { value: this.time },
        hovered: { value: this.hovered },
        shapeFactor: { value: this.shapeFactor },
        mousePosition: { value: this.mousePosition},
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
          q.xz *= time * o.4;
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
          // q.xz = fract(p.xz) - 0.5; // Space Repetition 0.5 is the center of repetition
          // q.xy = fract(p.xy) - 0.5; // Space Repetition 0.5 is the center of repetition

          // // Boxes
          float boxSize = 1.0;
          float box = sdBox(q * 4.0, vec3(0.75)) / 4.0;
          // vec3 pos = q - vec3(mod(q.x + grid_size, grid_size), 0.0, mod(q.z, grid_size));
          // vec3 boxPos = pos;
          // boxPos.yz *= rot2D(boxPos.y);

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
          float youngBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float matureBirds = sdBird(q, birdPos + vec3(2.0, 1.0, -1.0), birdBodySize * scaleFactor * 0.5, birdPos, wingSize * scaleFactor, birdPos + vec3(0.0, 0.5, 0.0) * scaleFactor, headSize * scaleFactor, beakLength * scaleFactor, wingAngle);

          float agedBirds = sdBird(q, birdPos + vec3(-3.0, 2.0, 2.5), birdBodySize * (scaleFactor * 0.8), birdPos, wingSize * (scaleFactor * 0.8), birdPos + vec3(0.0, 0.5, 0.0) * (scaleFactor * 0.8), headSize * (scaleFactor * 0.8), beakLength * (scaleFactor * 0.8), wingAngle);

          // Combine the ground with buildings
          float terrain = min(ground, building); 
          float terrainBirds = opSmoothIntersection(terrain, bird, min(bird, terrain)); 

          // Combine ground with buildings using smooth union
          //return opSmoothUnion(smin(terrain, building, 2.0), terrainBirds, min(box, terrain));
          return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          //return opSmoothUnion(smin(terrain, building, 2.0), opSmoothIntersection(terrain, bird, min(bird, terrain)), min(box, terrain));
          // Fogged cityreturn opSmoothUnion(terrain,  opSmoothUnion(building, terrainBirds, opSmoothUnion(terrain, building, bird)), min(bird, terrain)); 
          // return opSmoothUnion(terrain,  opSmoothUnion(building, opSmoothIntersection(box, bird, min(bird, terrain)), opSmoothUnion(terrain, box, bird)), min(bird, terrain));
          //float youngBirds = sdBird(q, birdPos, birdBodySize, birdPos, wingSize, birdPos + vec3(0.0, 0.5, 0.0), headSize, beakLength, wingAngle);

          //return opSmoothUnion(terrain, terrainBirds, min(terrain, bird));
          //return opSmoothUnion(terrain, opSmoothUnion(building, opSmoothIntersection(box, youngBirds, min(youngBirds, terrain)), 
             //             opSmoothUnion(matureBirds, agedBirds, youngBirds)), min(youngBirds, terrain));

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

        // // Shadows and reflections
        // float softShadowReflection(vec3 ro, vec3 rd, float minDist, float maxDist, float k) {
        //     float res = 1.0;
        //     float t = minDist;

        //     for (int i = 0; i < 50; i++) { // March along the shadow ray
        //         float d = map(ro + rd * t); // ✅ Use map(p) instead of sceneSDF(p)
        //         if (d < 0.001) return 0.0; // In shadow
        //         res = min(res, k * d / t);
        //         t += d;
        //         if (t > maxDist) break;
        //     }

        //     return res;
        // }

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
          // vec3 ro = computeCameraTubePosition(time);
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
          float rayPower = t * 0.02 * depthFactor;
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

    this.flyingTubeCityMaterial = new THREE.ShaderMaterial(this.flyingTubeCityShader);
  }

  updateResolution(shader, width, height) {
    if (shader && shader.uniforms && shader.uniforms.resolution) {
      shader.uniforms.resolution.value.set(width, height);
    }
  }
  
  handleResize(renderer, width = window.innerWidth, height = window.innerHeight) {
    if (!renderer) return;
    // Each shader handles its own resolution updates
    if (this.tubeCityShader) this.updateResolution(this.tubeCityShader, width, height);
    if (this.tunnelCityShader) this.updateResolution(this.tunnelCityShader, width, height);
    if (this.flyingTubeCityShader) this.updateResolution(this.flyingTubeCityShader, width, height);
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
    // const mousePosition = this.mouseUtils.getMousePosition();
  
    // Update the shader with the current mouse position and toggle the effect
    if (this.tubeCityShader) this.handleHoverEffect(this.tubeCityShader, this.mousePosition);
    if (this.tunnelCityShader) this.handleHoverEffect(this.tunnelCityShader, this.mousePosition);
    if (this.flyingTubeCityShader) this.handleHoverEffect(this.flyingTubeCityShader, this.mousePosition);
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
    if (this.tubeCityShader) {
      this.tubeCityShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.tubeCityShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.tubeCityShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.tunnelCityShader) {
      this.tunnelCityShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.tunnelCityShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.tunnelCityShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }

    if (this.flyingTubeCityShader) {
      this.flyingTubeCityShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
      this.flyingTubeCityShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      this.flyingTubeCityShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
    }
  }
}
export default TunnelTubeCityMaterials;
import * as THREE from 'three';

export class GalacticLakeWaterShaderMaterials {
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

    this.useBlueHavenShader();
    this.useBugSpreaderShader();
    this.useRedLakesShader();
    this.useJungleIslandShader();
    this.updateEvents();
    this.getShaders();
  }

  useBlueHavenShader() {
    this.blueHavenShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        customUniforms: { value: this.params.customShaderUniforms },
      },

      vertexShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
      
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(time + dist * 10.0);
          
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

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
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

        // Digit-based growth term
        float computeGeometricProgression(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
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
        
        vec3 blueHaven(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(-90.5+sin(time*0.3));
      
          // bottom-left
          vec2 bl = smoothstep(vec2(0.1),1.0-u, u);
          float pct = bl.x * bl.y;
      
          // top-right
          // vec2 tr = step(vec2(0.1),1.0-st);
          // pct *= tr.x * tr.y;
      
          vec3 basin = vec3(pct);
      
          float ap = pos.x*sin(p.z*pct);
          float qap = ap+sin(ap*p.z);
          float fap = fract(qap);
          float azp = pos.y*p.z;
          float asp = cos(sin(azp));
          float afp = atan(tan(asp*qap), azp*asp);
          float atp = pos.x*tan(p.z*sin(pct));
          float r = length(pos)*2.0;
          float a = atan(pos.y, atp);
          a = atan(azp, fap);
          a = atan((azp), afp);
          a = atan((azp), cos(afp+fap));
          float b = atan(pos.y, atp+sin(fap));
          
          float ofc = 17.;
      
          float ft = fract(cos(a*12.5*b));
          float fb = abs(cos(a*3.));
          float fbs = abs(sin(fb*a));
          float fbc = fb + fbs;
          float fab = abs(cos(a*3.));
          float fsb = abs(cos(a*ofc*sin(a)));
          float fpc =pow(fab, 2.0);
          // a = c;
          // f = fb + fbs;
          float f = cos(a*3.);
          f = fab;
          float fh = fpc +fsb;
          fh = fab * qap + fh;
          f = fh;
          // f = abs(cos(a*2.5)*cos(b))*ft*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.+cos(time))*sin(time +a))*.8+.1;
          // f = (fbc)+smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      
          float shape =  1.-smoothstep(f,f+0.02,r);
          vec3 haven = vec3(shape*fap, shape*ft, b*shape );
          // basin += pct;
          // basin *= smoothstep(basin.x + basin.y, pct*basin.z, basin-pct*basin.z);
          return haven;
        }

        float dragonSpider(vec3 p) {
          vec2 drg = p.xz;
          float r = length(drg) * 2.616;
          float a = fract(atan(drg.y * p.z, fract(drg.x) - 0.2 * sin(drg.x * drg.y * p.z))) - r;
        
          float f = abs(cos(a * 2.5)) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
        
          float spider = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
          return spider - 0.5;
        }

        float sdWaspDagon(vec3 p, float r, float t) {
          r = length(p) * 2.616;
          float a = fract(atan(p.y * p.z, fract(p.x * sin(t * p.z)) - 0.2 * p.z + t)) - r;
        
          t += fract(time * 0.25 * p.z);
          float wave = sin(a * 10.0 + t * 6.2831); // 2π loop
          float f = abs(wave * p.z) * 0.8 + 0.1;

          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
          float waspDagon = 1.0 - smoothstep(f, sin(f + r + t) - 0.25, r);
          return waspDagon;
        }        

        float sdDragonWingedSpider(vec3 p, float wings, float tails) {
          vec2 drg = p.xz;
          float r = length(drg) * 2.616;
          float a = fract(atan(drg.y * p.z, fract(drg.x) - 0.2 * sin(drg.x * drg.y * p.z))) - r;
        
          float f = abs(cos(a * 2.5 * sqrt(wings))) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0 + sqrt(wings + tails))) * 0.2 + 0.5 + tails;
        
          float dragonWingedSpider = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
          return dragonWingedSpider - 0.5;
        }
        
        float waspSpider(vec3 p) {
          vec3 q = p; // input copy

          // Weather Factor the ommitted swizzled vec param is the axis of rotation
          q.z += time * 0.4; // Forward Camera Movement  
          q.y -= time * 0.4; // Upward Movement
          q.xz *= rot2D(time * 0.4);
          q = fract(p) - 0.5; // Space Repetition 0.5 is the center of repetition
          //q.xz = fract(p.xz) - 0.5; // Space Repetition 0.5 is the center of repetition

          vec2 proj = q.xz;
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float sh = smoothstep(f, sin(f + r) - 0.25, r);
          float spider =  1.0 - sh;
          return spider;
        }

        // The main map function that will define the scene
        float mapTerrain(vec3 p) {
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

          // Dragons
          // vec3 dragonPos = q - vec3(mod(q.x * q.z, sin(-grid_size * road_width)), q.z + 0.0, mod(q.z, grid_size));
          // float dragons = sdWaspDagon(dragonPos, sizeFactor, heightFactor);

          // Apply these random values to alter building height and size
          buildingHeight += heightFactor * 2.0; // Alter height based on houseNumber
          boxSize += sizeFactor * 0.5;          // Alter size based on houseNumber

          // Combine the ground with buildings
          float terrain = min(ground, building);
          // float dragonTerrain = opSmoothIntersection(terrain, dragons, min(dragons, terrain)); 

          // Combine ground with buildings using smooth union
          return opSmoothUnion(terrain, building, smin(min(box, building), terrain, 2.0));
        }

        float mapDragons(vec3 p) {
          // Base ground
          float ground = sdfGround(p);
        
          // Infinite tiling
          vec3 q = p;
          q.z += time * 0.4;
          q.y -= time * 0.4;
          q = fract(q) - 0.5;
        
          // DRAGON SPIDER CREATURE
          float dragonSpiders = dragonSpider(q * 4.0);
        
          // Grid setup
          float grid_size = 15.0;
          float road_width = 2.5;
        
          // WASP-DRAGON MOBILITY OFFSET
          vec2 waspTile = floor(q.xz / grid_size);
          float waspSeed = hash(dot(waspTile, vec2(7.3, 5.1))); // unique per tile
          vec3 waspWiggle = vec3(
            sin(time * 0.8 + waspSeed * 3.0),
            cos(time * 0.6 + waspSeed * 5.0),
            sin(time * 0.4 + waspSeed * 7.0)
          ) * 1.5;

          float waspSize = 3.0 + noise(p.xy * 0.1) * 2.0;
          float waspTail = q.x * time;
          vec3 waspOffset = vec3(mod(q.x * 0.02, grid_size), road_width, mod(q.z, grid_size));
          vec3 waspPos = q - waspOffset + waspWiggle;
          float waspDragon = sdWaspDagon(q - waspPos * 3.0,  waspSize, waspTail);
        
          // DRAGON DISTRIBUTION + WIGGLE
          vec2 dragonTile = floor(q.xz / grid_size);
          float dragonSeed = hash(dot(dragonTile, vec2(3.1, 8.2)));
          vec3 dragonWiggle = vec3(
            cos(time * 0.6 + dragonSeed * 10.0),
            sin(time * 0.4 + dragonSeed * 6.0),
            cos(time * 0.5 + dragonSeed * 4.0)
          ) * 1.8;
        
          float dragonTail = time * q.z;
          float dragonSize = S(time * q.z);
          float tailFactor = hash(dragonTail + 1.0);
          float sizeFactor = hash(dragonSize + tan(q.z) + 0.002);
          dragonSize += tailFactor * 2.0;
          waspSize += sizeFactor * 0.5;
        
          vec3 dragonPos = vec3(
            floor(q.x / grid_size) * grid_size,
            0.0,
            floor(q.z / grid_size) * grid_size
          ) + dragonWiggle;
        
          float dragonWingedSpider = sdDragonWingedSpider(q - dragonPos, dragonTail, dragonSize);
        
          // FINAL BLEND
          float springCreatures = min(dragonWingedSpider, waspDragon);
          float springDragons = smin(springCreatures, dragonSpiders, 0.4);
        
          // 🌍 TERRAIN MAP
          float terrain = mapTerrain(p);

          // 🌈 Final World Blend
          return smin(terrain, springDragons, 0.3);
        }

        // Function to compute soft shadows
        float computeSoftShadow(vec3 p, vec3 lightPos) {
          vec3 shadowDir = normalize(lightPos - p);
          float shadowT = 0.1; // Small initial offset to avoid self-shadowing
          float shadowFactor = 1.0;
          float maxDist = 5.0;

          for (int j = 0; j < 24; j++) { // Optimized loop count
            vec3 shadowPoint = p + shadowDir * shadowT;
            float shadowDist = mapTerrain(shadowPoint);
                
            if (shadowDist < 0.001) {
              shadowFactor *= 0.5; // Reduce intensity for occlusion
            }
                
            shadowT += shadowDist * 0.5; // Smaller steps improve softness
            if (shadowT > maxDist) break; // Stop marching if too far
          }

          return clamp(shadowFactor, 0.2, 1.0); // Ensure valid shadow range
        }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              mapTerrain(p + vec3(epsilon, 0, 0)) - mapTerrain(p - vec3(epsilon, 0, 0)),
              mapTerrain(p + vec3(0, epsilon, 0)) - mapTerrain(p - vec3(0, epsilon, 0)),
              mapTerrain(p + vec3(0, 0, epsilon)) - mapTerrain(p - vec3(0, 0, epsilon))
          ));
        }

        vec3 applyFog(vec3 color, float distance, vec3 fogColor, float fogDensity) {
          float fogFactor = exp(-distance * fogDensity); // Exponential fog
          return mix(fogColor, color, fogFactor); // Blend fog with scene color
        }

        vec3 applyRipple(vec3 p, float d, float time) {
            float ripple = sin(10.0 * d - time * 5.0);
            float intensity = smoothstep(0.3, 0.0, d);
            return p + normalize(vec3(p.xy, 0.0)) * ripple * intensity;
        }
      
        float blendShapeFactor(float uvx, float factor, float timeMod) {
          float raw = fract(factor * uvx);
          float st = smoothstep(0.0, 1.0, raw); // or your custom S()
          float animated = st * sin(timeMod + uvx * factor);
          return animated;
        }
      
        vec3 computeCameraPosition(float time) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(time * speed);
          float camZ = radius * sin(time * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
        }

        mat2 scale(vec2 _scale){
            return mat2(_scale.x,0.0,
                        0.0,_scale.y);
        }
                
        float rippler(vec2 uv, float t) {
          float dist = length(uv - 0.5);
          float wave = sin(20.0 * dist - t * 5.0);
          return smoothstep(0.01, 0.015, wave);
        }
      
        // Smoothstep interpolation function for blending
        float smoothTime(float t) {
          float u = t * t * (3.0 - 2.0 * t); // Standard smoothstep easing
          float blend = smoothstep(
            S(u + (t *  time)), 
            sqrt(u + sin(t * time)), 
            sqrt(u)
          );
          return blend;
        }
        
        // Smoothstep interpolation function for blending
        float blendView(vec3 p, float t) {
          float u = sin(t * t * (3.0 - 2.0 * t));
          float v = pow(t, u);
          float mv = fract(v);
          float s = sdSphere(p, smoothTime(mv));
          float blend = smoothstep(
            S(time * (t + mv)), 
            S(pow(u, sin(t + u))), 
            s
          );

          return blend * sqrt(blend * time);
        }

        vec3 colorPallete(vec3 p, vec3 color, vec2 u, vec2 m,  float shadowIntensity, float rayPower) {
          float redBlend = blendView(p, fract(dragonSpider(p * time)));
          float blueButter = shadowIntensity + rayPower + S(noise(u.xy * 2.0 + time * 0.7)) * shadowIntensity;
          float bt = smoothTime(blueButter + time);
          float greenMoney = smoothstep(bt, sin(time + bt), sqrt(time + u.x));
          float rgR = smoothstep(shadowIntensity, (rayPower + S(noise(u.xy * 4.0 + time * 0.3)) ), shadowIntensity); 
          float rgG = sqrt(shadowIntensity + rayPower + S(noise(u.yx * 3.0 + time * 0.5)) * smoothTime(shadowIntensity));
          float rgB = smoothTime(blueButter + time);
          vec3 colorBlend = vec3(rgR, rgG, rgB);
          vec3 colorDust = vec3(smoothTime(redBlend), time + m.x, sqrt(redBlend));
          vec3 colorButter = mix(colorBlend, colorDust, redBlend * blueButter);
  
          return mix(smoothstep(color, colorDust, colorButter), colorBlend, smoothstep(redBlend, blueButter, greenMoney));
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

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
        
          // Noise and Soft Min calculationsshapeFactor + uv.x
          float n = noise(uv * sin(shapeFactor + uv.x) + sin(uv * sin(shapeFactor + uv.x)));
          float bl = blendView(vec3(uv, time), time); 
          float shadowIntensity = 0.1;

          // Initialize Ray marching variables
          float fov = 1.0; 
          float depthFactor = 0.064;

          // Light Setup
          vec3 ro = computeCameraPosition(time);
          vec3 rd = normalize(vec3(uv * fov, 1)); // Ray Direction 

          // 🔥🔥 Ray Marching Algorithm
          float t = 0.0; // Total Distance Travelled By Ray
          vec3 color = vec3(t);
          vec3 normal; // Declare normal
          vec3 haven; 

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray

            // Apply wiggle effect to the camera
            wiggleCamera(ro, rd, uv * mousePosition, mouse, time);
            haven = blueHaven(vec3(0.0), uv);

            float d = mapDragons(p); // Current distance to the scene
            d += smoothstep(haven.x, haven.y, haven.z); // Current distance to the scene
            float ds = dragonSpider(p); // Current distance to the scene
            d += smin(blueHaven(p, uv).x, min(blueHaven(p, uv).y, waspSpider(p)), 2.0);
                
            // Compute Shadows and reflections
            if (d < 0.001 || ds < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, ro);
              shadowIntensity = computeSoftShadow(p, ro); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
        
            t += d; // March the distance
            t += ds; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey White Color
        
            if (d < 0.001 || ds < 0.001 || t > 100.0) break;
          }

          // Depth FactordragonSpiderColor(uvt)
          vec3 uvt = vec3(uv.x, uv.y, smoothstep(mouse.x, mouse.y, time));
          float rayPower = t * 0.2 * depthFactor; 

          vec3 colorObj = colorPallete(haven*rayPower, haven, uv, mouse, shadowIntensity, rayPower);
          // color = smoothstep(color+haven, haven*colorObj, colorObj);
          color *= colorObj*rayPower;

          // Check if hovered is active or not
          float absT =  abs(sin(time));
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            // dist +=  absT;

            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            // opacity *= haven.x;

            color *= mix(haven*colorObj, color, haven.z * time);
  
            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            color *= haven;

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time

            color = mix(haven, color, haven * time);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
      `
    }

    this.blueHavenMaterial = new THREE.ShaderMaterial(this.blueHavenShader);
  }

  useJungleIslandShader() {
    this.jungleIslandShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        customUniforms: { value: this.params.customShaderUniforms },
      },

      vertexShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
      
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(time + dist * 10.0);
          
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

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
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

        // Digit-based growth term
        float computeGeometricProgression(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
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

        vec3 jungleIsland(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(-90.5+sin(time*0.3));
      
          // bottom-left
          vec2 bl = smoothstep(vec2(0.1),1.0-u, u);
          float pct = bl.x * bl.y;
      
          // top-right
          // vec2 tr = step(vec2(0.1),1.0-st);
          // pct *= tr.x * tr.y;
      
          vec3 basin = vec3(pct);
      
          float ap = pos.x*sin(p.z*pct);
          float qap = ap+sin(ap*p.z);
          float fap = fract(qap);
          float azp = pos.y*p.z;
          float asp = cos(sin(azp));
          float afp = atan(tan(asp*qap), azp*asp);
          float atp = pos.x*tan(p.z*sin(pct));
          float r = length(pos)*2.0;
          float a = atan(pos.y, atp);
          a = atan(azp, fap);
          a = atan((azp), afp);
          a = atan((azp), cos(afp+fap));
          float b = atan(pos.y, atp+sin(fap));
          
          float ofc = 17.;
      
          float ft = fract(cos(a*12.5*b));
          float fb = abs(cos(a*3.));
          float fbs = abs(sin(fb*a));
          float fbc = fb + fbs;
          float fab = abs(cos(a*3.));
          float fsb = abs(cos(a*ofc*sin(a)));
          float fpc =pow(fab, 2.0);
          // a = c;
          // f = fb + fbs;
          float f = cos(a*3.);
          f = fab;
          float fh = fpc +fsb;
          fh = fab * qap + fh;
          f = fh;
          f = abs(cos(a*2.5)*cos(b))*ft*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.+cos(time))*sin(time +a))*.8+.1;
          // f = (fbc)+smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      
          float s =  1.-smoothstep(f,f+0.02,r);
          vec3 island = vec3(s*fap, s*ft, b*s);
          // basin += pct;
          // basin *= smoothstep(basin.x + basin.y, pct*basin.z, basin-pct*basin.z);
          return island;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
       
          vec3 island = jungleIsland(vec3(uv, 0.0), uv);
          vec3 color = island;

          // Check if hovered is active or not
          float absT =  abs(sin(time));
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            // dist +=  absT;

            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            // opacity *= island.y;

            color = mix(island, color, island.x * time);

            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            color *= island;

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time

            color = mix(island, color, island.x * time);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
      `
    }

    this.jungleIslandMaterial = new THREE.ShaderMaterial(this.jungleIslandShader);
  } 

  useRedLakesShader() {
    this.redLakesShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        customUniforms: { value: this.params.customShaderUniforms },
      },

      vertexShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
      
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(time + dist * 10.0);
          
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

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
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

        // Digit-based growth term
        float computeGeometricProgression(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
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

        vec3 redLakes(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(-90.5+sin(time*0.3));
      
          // bottom-left
          vec2 bl = smoothstep(vec2(0.1),1.0-u, u);
          float pct = bl.x * bl.y;
      
          // top-right
          // vec2 tr = step(vec2(0.1),1.0-st);
          // pct *= tr.x * tr.y;
      
          vec3 basin = vec3(pct);
      
          float ap = pos.x*sin(p.z*pct);
          float qap = ap+sin(ap*p.z);
          float fap = fract(qap);
          float azp = pos.y*p.z;
          float asp = cos(sin(azp));
          float afp = atan(tan(asp*qap), azp*asp);
          float atp = pos.x*tan(p.z*sin(pct));
          float r = length(pos)*2.0;
          float a = atan(pos.y, atp);
          a = atan(azp, fap);
          a = atan((azp), afp);
          a = atan((azp), cos(afp+fap));
          float b = atan(pos.y*atp, atp+sin(fap*atp));
          
          float ofc = 17.;
      
          float ft = fract(cos(a*12.5*b));
          float fb = abs(cos(a*3.));
          float fbs = abs(sin(fb*a));
          float fbc = fb + fbs;
          float fab = abs(cos(a*3.));
          float fsb = abs(cos(a*ofc*sin(a)));
          float ftb = abs(cos(atp*ofc*sin(a)));
          fsb = ftb;
          float fpc =pow(fab, 2.0);
          // a = c;
          // f = fb + fbs;
          float f = cos(a*3.);
          f = fab;
          float fh = fpc +fsb;
          // fh = fpc +fsb*ft;
          fh = fab * qap + fh;
          f = fh;
          f -= abs(cos(a*2.5)*cos(b))*ft*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.+cos(time))*sin(time +a))*.8+.1;
          // f = (fbc)+smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      
          float s =  1.-smoothstep(f,f+0.02,r);
          vec3 lake = vec3(s*fap, s*ft, b*s );
          // basin += pct;
          // basin *= smoothstep(basin.x + basin.y, pct*basin.z, basin-pct*basin.z);
          return lake;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
       
          vec3 lake = redLakes(vec3(uv, 0.0), uv);
          vec3 color = lake;

          // Check if hovered is active or not
          float absT =  abs(sin(time));
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            // dist +=  absT;

            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            // opacity *= lake.z;

            color = mix(lake, color, lake.z * time);
  
            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            color *= lake;

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time

            color = mix(lake, color, lake.z * time);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }     
        }   
      `
    }

    this.redLakesMaterial = new THREE.ShaderMaterial(this.redLakesShader);
  }

  useBugSpreaderShader() {
    this.bugSpreaderShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        customUniforms: { value: this.params.customShaderUniforms },
      },

      vertexShader: `
        #ifdef GL_ES
        precision mediump float;
        #endif
      
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
          // float dist = distance(mousePosition, vec2(pos.x, pos.y));
          // float effect = hovered * smoothstep(0.2, 0.0, dist) * noise(pos.xy * 10.0 + time);
      
          // // Apply explode effect
          // pos += normal * effect * explodeIntensity;
    
          // Calculate distance from the mouse to the vertex position
          float dist = distance(mousePosition, uv); // Use UV for spatial mapping
          
          // Apply mouse interaction as distortion (push/pull effect)
          float effect = hovered * smoothstep(0.2, 0.0, dist) * 0.5 * sin(time + dist * 10.0);
          
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

      vec3 oceanJungle(vec3 p, vec2 u) {
        vec2 pos = vec2(0.5)-u;
        p += vec3(-90.5+sin(time*0.3));
    
        // bottom-left
        vec2 bl = smoothstep(vec2(0.1),1.0-u, u);
        float pct = bl.x * bl.y;
    
        // top-right
        // vec2 tr = step(vec2(0.1),1.0-st);
        // pct *= tr.x * tr.y;
    
        vec3 basin = vec3(pct);
    
        float ap = pos.x*sin(p.z*pct);
        float qap = ap+sin(ap*p.z);
        float fap = fract(qap);
        float azp = pos.y*p.z;
        float asp = cos(sin(azp));
        float afp = atan(tan(asp*qap), azp*asp);
        float atp = pos.x*tan(p.z*sin(pct));
    
        float r = length(pos)*2.0;
        float a = atan(pos.y, atp);
        a = atan(azp, fap);
        a = atan((azp), afp);
        a = atan((azp), cos(afp+fap));
        float b = atan(pos.y*atp, atp+sin(fap*atp));
        
        float ofc = 17.;
    
        float ft = fract(cos(a*12.5*b));
        float fb = abs(cos(a*3.));
        float fbs = abs(sin(fb*a));
        float fbc = fb + fbs;
        float fab = abs(cos(a*3.));
        float fsb = abs(cos(a*ofc*sin(a)));
        float ftb = abs(cos(atp*ofc*sin(a)));
        fsb = ftb;
        float fpc =pow(fab, 2.0);
        // a = c;
        // f = fb + fbs;
    
        float f = cos(a*3.);
        f = fab;
        float fh = fpc +fsb;
        // fh = fpc +fsb*ft;
        fh = fab * qap + fh;
        f = fh;
        f -= abs(cos(a*2.5)*cos(b))*ft*.5+.3;
        // f = abs(cos(a*12.)*sin(a*3.+cos(time))*sin(time +a))*.8+.1;
        // f = (fbc)+smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
    
        float s =  1.-smoothstep(f,f+0.02,r);
        basin = vec3(s*fap, s*ft, b*s );
        // basin += pct;
        // basin *= smoothstep(basin.x + basin.y, pct*basin.z, basin-pct*color.z);
        return basin
      }    

      void main() {
        // UV Mapping
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = fragCoord / resolution; // Proper UV mapping
        uv.x *= resolution.x / resolution.y;

        // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
        vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
       
        float ocean = oceanJungle(vec3(uv, 0.0), uv);

        // Check if hovered is active or not
        float absT =  abs(sin(time));
        if (hovered > 0.0) {
          // Mouse is hovering, apply mouse interaction effects
          float dist = distance(mouse, uv);
          // dist +=  absT;

          // Use the distance to influence the color (make mouse position cause a color shift)
          color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)

          // Use distance to control the opacity
          float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
          // opacity *= ocean;

          color = mix(vec3(ocean), color, ocean * time);

          // Optionally, add time-based animation for extra dynamics
          color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
          color *= ocean;

          gl_FragColor = vec4(color, opacity);
        } else {
          // Mouse is not hovering, apply default effect based on UV coordinates and distance
          float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
          color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
          color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time

          color = mix(vec3(ocean), color, ocean * time);
          float opacity = smoothstep(0.6, 0.8, 1.0);
          gl_FragColor = vec4(color, opacity); // Default behavior
        }
      `
    }

    this.bugSpreaderMaterial = new THREE.ShaderMaterial(this.bugSpreaderShader);
  }

  getShaders() {
    this.shaders = [
      this.blueHavenShader, 
      this.bugSpreaderShader,
      this.redLakesShader,
      this.jungleIslandShader
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
export default GalacticLakeWaterShaderMaterials;
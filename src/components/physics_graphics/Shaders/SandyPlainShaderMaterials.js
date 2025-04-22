import * as THREE from 'three';

export class SandyPlainShaderMaterials {
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

    this.useSandGalaxyShader();
    this.useDancingCreatureShader();
    this.useFlyingDragonTerrainShader();
    this.updateEvents();
    this.getShaders();
  }

  useSandGalaxyShader() {
    this.sandGalaxyShader = {
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

      // CreatureParams waspParams = CreatureParams(2.616, 3.0, 2.5, 12.0, 0.0);
      // CreatureParams spiderParams = CreatureParams(3.4, 8.0, 2.2, 15.0, 0.7);
      // CreatureParams snailParams = CreatureParams(1.2, 1.0, 1.5, 4.0, 0.4);    
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

        float sdFlowers(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          float r = length(p)*2.0;
          float a = atan(atan(p.y,p.x), p.z);
      
          float f = cos(a*3.);
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          float sh = smoothstep(f, f + 0.02, r);
      
          float shape = 1.0 - sh;

          return shape;
        }

        float sdFlowerVortex(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          float r = length(p)*2.0;
          float a = atan(atan(p.y,p.x), p.z);
      
          float f = cos(a*3.);
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          float smh = smoothstep(f, f + 0.02, r);
      
          float shape = 1.0 - smh;

          return shape;
        }

        float dragonSpider(vec3 p) {
          vec2 drg = p.xz;
          float r = length(drg) * 2.616;
          float a = fract(atan(drg.y * p.z, fract(drg.x) - 0.2 * sin(drg.x * drg.y * p.z))) - r;
        
          float f = abs(cos(a * 2.5)) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
        
          float d = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
          return d - 0.5;
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
          vec2 proj = p.xz;
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float sh = smoothstep(f, sin(f + r) - 0.25, r);
          float spider =  1.0 - sh;
          return spider;
        }

        float waterFront(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          // vec2 pos = vec2(0.5)-uv;
          // float r = length(p)*2.0;
          // float a = atan(p.y,(p.x));
          // a = atan(u, fract(v + r)) - r;
      
          // float f = cos(a*(3.0 + m));
          // // f = abs(cos(a*3.));
          // // f = abs(cos(a*(2.5+ m)))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          // f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;

          float r = length(p)*2.0;
          float a = atan(atan(p.y, p.z),(p.x * p.z));
          a = atan(u, fract(v + r)) - r;
          a = atan(fract(p.y * p.z) - 0.2 * cos(p.x * p.z), sin(p.z * p.y));

          float f = cos(a*(3.0 + m));
          // f = abs(cos(a*3.));
          // f = abs(cos(a*(2.5+ m)))*.5+.3;
          f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;
          float waterFront = 1.-smoothstep(f,f+0.02,r);
          return waterFront;
        }

        float blendedMosaic(vec3 p, float r, float h){
            r *= length(p)*2.0;
            h *= atan(
              p.y, 
              atan(
                p.z, 
                fract(p.y)
              ))*length(p)*2.816;
            float a = atan(p.y,p.x * sin(fract(p.x * time)));
            float v = atan(p.y, p.y * p.z) / sqrt(a);
            float avb = fract(atan(v * p.z * p.y, fract(p.y + smoothstep(p.x, sin(0.3 *(time) ), p.x*p.z)) - 0.2 * sin(p.x * p.y))) - r;
            a += avb;
            float bf = -0.176; //+ (time * 0.001);
            float f = cos(a*3.);
            f = smoothstep(-0.5, 1.0, cos(a * 10.200 * atan(p.x + sin(time), fract(a * time)))) * (bf) + 0.5;
            // f = abs(cos(a*3.));
            // f = abs(cos(a*2.5))*.5+.3;
            // f += abs(cos(a*12.)*sin(a*3.))*.8+.1;
            // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
        
            float mosaic =  1.-smoothstep(f,f+0.02,r);
            return mosaic;
        }
        
        float duckSpring(vec3 p, float r, float h){
            r *= length(p)*2.0;
            h *= atan(
              p.y * p.z, 
              atan(
                p.z, 
                fract(p.y)
              )
            )*length(p)*2.816;
            float a = atan(p.y,p.x);
            float m = 0.001 * p.z;
            float mn = 0.01 * time;
            float gt = m * pow(h*m, time) + mn;
            float gh = h *cos(a*(3.088 + gt) + (time* p.z));
            vec3 v = vec3(atan(p.y, p.x * p.z));
            a *= sqrt(fract(min(a,smoothstep(a, gt, gh)))) ;
        
            float f = cos(v.z*a*3.688)*-r - sin(2.+a * gh * p.z + time)*2.200+.1;
            f += fract(a* gh * v.z + time);
            // f += min(f, gh);
            
            // f = abs(cos(a*2.264));//Duck//
            // f = abs(cos(a*2.5))*.5+.3;// Bird
            // f = abs(cos(a*12.192)*sin(a*3.))*.8+.1;// Butterfly
            // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
        
            float duck = 1.-smoothstep(f,f+0.02,r);
            return duck;
          }
        
        
        float sandySpring(vec3 p, float r, float h){
            r *= length(p)*2.0;
            h *= atan(
              p.y * p.z, 
              atan(
                p.z, 
                fract(p.y)
              ))*length(p)*2.816;
            float a = atan(p.y,p.x);
            float m = 0.001 * p.z;
            float mn = 0.01 * time;
            float gt = m * pow(h*m, time) + mn;
            float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
            vec3 v = vec3(atan(p.y,p.x* p.z));
            a /= min(a,smoothstep(a, gt, gh));
        
            float f = cos(a*3.688)*-r - sin(2.+a * gh * p.z + time)*2.200+.1;
            f += fract(a* gh * v.z + time); // SandySprings
            // f += min(f, gh);
            
            // f = abs(cos(a*3.));// SandOrbits
            // f = abs(cos(a*2.5))*.5+.3;//
            // f = abs(cos(a*12.)*sin(a*3.))*.8+.1; //SandyPlane
            // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;//SandWorld
            return 1.-smoothstep(f,f+0.02,r);
          }
        
        
        float sandPlain(vec3 p, float r, float h){
            r *= length(p)*2.0;
            h *= 
            atan(
              p.y * p.z, 
              atan(
                p.z, 
                fract(p.y)
              )
            )*length(p)*2.816;
            float a = atan(p.y,p.x);
            float v = atan(p.y, p.x * p.z);
            float m = 0.001 * p.z;
            float mn = 0.01 * time;
            float gt = m * pow(h*m, time) + mn;
            float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
            a = min(a,gh) ;

            float f = cos(a*3.688)*-r - sin(2.+a * gh * p.z + time)*2.200+.1;
            f += fract(a* gh * p.z + time);
            // f += min(f, gh);
            
            // f = abs(cos(a*3.));
            // f = abs(cos(a*2.5))*.5+.3;
            // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
            // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
        
            float plane = 1.-smoothstep(f,f+0.02,r);
            return plane;
        }

        vec3 rollingBug(vec2 u) {
          vec3 p = vec3(0.0, 0.0, -9.0 * time);
        
          vec2 pos = vec2(0.5)-u;
        
          float xs = 0.001 * time;
          float sm = 0.01 * time;
            
          float r = length(pos)*2.0;
          float smr = smoothstep(r* tan(pow(pos.x, pos.y)), r+pos.x, atan(tan(r * sm), pos.y));
          float h = sin(r) * sin(smr);
          float a = atan(pos.y,pos.x) - smr;
          float pol = atan(pos.y,pos.x) - smr *h;
          float cyc = atan(pos.y,pos.x) - smr -h *a;

          pol *= atan(cyc, pol);// Horse Runner
          // a  = atan(pos.y,pos.x) - smr - (time + tan(pos.y)); wheel circus
          a += pol; // Dirty Bug
          a *= pol; //* sqrt(a * time); // Dirty Bug
          // a = pol; //* sqrt(a * time); // Motion Flower

          float csn = a*pol;
          a += csn * fract (sin(a* p.z *time) ) + time;
 
          float rollMill = a + (csn * fract (sin(a* p.z *time) ) + time);
          // float fan = a + (csn * fract (sin(a+ p.z *time) ) + time);
          // a = fan;
          // a = rollMill;

          float ac = cos(cyc-a*3.+ pow(cyc, pol)) / pol * csn;
          float ad = sin(cyc-a*3.+ pow(cyc, pol));
          float f = ad - cos(a*3.+ pow(cyc * tan(0.6), pol)) * 21.976*(ad / pol) * csn;

          f = min(ad,ac+tan(pol* 13.0));
          // f = abs(cos(a*3.));
          // f = abs(sin(a*2.5))*0.652+.3;
          // f = abs(cos(a*12.)*sin(a*3.296))*0.904+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.264+0.580;
        
          return vec3( 1.-smoothstep(f,f+0.02,r) );
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
              float shadowDist = mapTerrain(shadowPoint);
      
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
            float shadowDist = mapTerrain(shadowPoint);
                
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
              float shadowDist = mapTerrain(shadowPoint);
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
              mapTerrain(p + vec3(epsilon, 0, 0)) - mapTerrain(p - vec3(epsilon, 0, 0)),
              mapTerrain(p + vec3(0, epsilon, 0)) - mapTerrain(p - vec3(0, epsilon, 0)),
              mapTerrain(p + vec3(0, 0, epsilon)) - mapTerrain(p - vec3(0, 0, epsilon))
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
      
        float blendShapeFactor(float uvx, float factor, float timeMod) {
          float raw = fract(factor * uvx);
          float st = smoothstep(0.0, 1.0, raw); // or your custom S()
          float animated = st * sin(timeMod + uvx * factor);
          return animated;
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
        float smoothTime(float t) {
          float u = t * t * (3.0 - 2.0 * t); // Standard smoothstep easing
          float blend = smoothstep(
            S(u + (t *  time)), 
            sqrt(u + sin(t * time)), 
            sqrt(u)
          );
          return blend;
        }

        float smoothFloatTime(float t) {
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
          float s = sdSphere(p, smoothTime(mv));
          float blend = smoothstep(
            S(time * (t + mv)), 
            S(pow(u, sin(t + u))), 
            s
          );

          return blend * sqrt(blend * time);
        }
        
        float dancingSpider(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(0.0, 0.0, -9.0 );
      
          float r = length(pos)*2.0;
          float h = atan(
                    sin(pos.y * tan(r + p.z + (sin(3. * time)) ) * sin(p.z * time)), 
                    atan(
                      p.z, 
                      fract(pos.y * r)
                    )
                  )*length(p)*2.888;
      
          float a = atan(pos.y,pos.x) * h;// * time;
          float m = 0.001 * p.z;
          float mn = 0.01 * time;
          float gt = m * pow(h*m, time) + mn;
          float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
                  vec3 v = vec3(atan(p.y,p.x* p.z));
      
          float f = cos(a*3.);
          float k = 0.092 * (cos(h*a*3.*-1.680)+ (0.412+ sin(a*-0.592)) -r);
          float ks = 0.043 * sin(sqrt(k * r));
          f = cos(a*3.*-1.680)+ (0.412+ sin(a*0.2)) -r;
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          return 1.-smoothstep(f,f+0.02,r) ;
        }

        float bouncingSpider(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(0.0, 0.0, -9.0 );

          float r = length(pos)*2.0;
          float h = atan(
                    sin(pos.y * tan(r + p.z + (sin(3. * time)) ) * sin(p.z * time)), 
                    atan(
                      p.z * r, 
                      fract(pos.y * r)
                    )
                  )*length(p)*.888;

          float a = atan(pos.y,pos.x) * h;// * time;
          float m = 0.001 * p.z;
          float mn = 0.01 * time;
          float gt = m * pow(h*m, time) + mn;
          float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
                  vec3 v = vec3(atan(p.y,p.x* p.z));

          float f = cos(a*3.);
          f = cos(h*a*3.*-1.680)+ (0.412+ sin(a*-0.592)) -r;
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          float spider =  1.-smoothstep(f,f+0.02,r);
          return spider;  
        }

        float whiteSpider(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(0.0, 0.0, -9.0);

          float r = length(pos)*2.0;
          float h = atan(
                    pos.y * p.z, 
                    atan(
                      p.z, 
                      fract(pos.y)
                    )
                  )*length(p)*2.816;

          float a = atan(pos.y,pos.x) * h;

          float f = cos(a*3.);
          f = cos(a*3.*-1.680)+ (0.412+ sin(a*0.2)) -r;
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          return  1.-smoothstep(f,f+0.02,r);
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range// either works
          vec3 color = vec3(0.0);
          float spider = whiteSpider(vec3(mouse*uv, -time * 8.0), uv);
          color = vec3(spider);
          color = mix(color, vec3(uv * mouse, spider), uv.x * time);
          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(time));
            // dist +=  absT;
            
            // Use the distance to influence the color (make mouse position cause a color shift)
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            
            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            
            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color *= vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
      
      `
    }

    this.sandGalaxyMaterial = new THREE.ShaderMaterial(this.sandGalaxyShader);
  }

  useDancingCreatureShader() {
    this.dancingCreatureShader = {
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
      // CreatureParams waspParams = CreatureParams(2.616, 3.0, 2.5, 12.0, 0.0);
      // CreatureParams spiderParams = CreatureParams(3.4, 8.0, 2.2, 15.0, 0.7);
      // CreatureParams snailParams = CreatureParams(1.2, 1.0, 1.5, 4.0, 0.4);
      
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

        float sdHourGlass(vec3 p, vec2 a, float h) {
            vec3 q = abs(p) - (a.x * a.y * h); 
          return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        } 
   
        float dancingCreature(vec3 p, vec2 u) {
          vec2 pos = vec2(0.5)-u;
          p += vec3(0.0, 0.0, -9.0 );
              
          float r = length(pos)*2.0;
          float h = atan(
            sin(pos.y * tan(r + p.z + (sin(3. * time)) ) * sin(p.z * time)), 
            atan(
              p.z, 
              fract(pos.y * r)
            )
          )*length(p)*2.888;
              
          float a = atan(pos.y,pos.x) * h * .12;// * time;
          float m = 0.001 * p.z;
          float mn = 0.01 * time;
          float gt = m * pow(h*m, time) + mn;
          float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
          vec3 v = vec3(atan(p.y,p.x* p.z));
              
          float f = cos(a*3.);
          f = cos(a*3.*-1.680)+ (0.412+ sin(a*0.2)) -r*gh;
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
            return 1.-smoothstep(f,f+0.02,r) ;
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

        float dragonSpider(vec3 p) {
          vec2 drg = p.xz;
          float r = length(drg) * 2.616;
          float a = fract(atan(drg.y * p.z, fract(drg.x) - 0.2 * sin(drg.x * drg.y * p.z))) - r;
        
          float f = abs(cos(a * 2.5)) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
        
          float d = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
          return d - 0.5;
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
          vec2 proj = p.xz;
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float sh = smoothstep(f, sin(f + r) - 0.25, r);
          float spider =  1.0 - sh;
          return spider;
        }

        float waterFront(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          // vec2 pos = vec2(0.5)-uv;
          // float r = length(p)*2.0;
          // float a = atan(p.y,(p.x));
          // a = atan(u, fract(v + r)) - r;
      
          // float f = cos(a*(3.0 + m));
          // // f = abs(cos(a*3.));
          // // f = abs(cos(a*(2.5+ m)))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          // f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;

          float r = length(p)*2.0;
          float a = atan(atan(p.y, p.z),(p.x * p.z));
          a = atan(u, fract(v + r)) - r;
          a = atan(fract(p.y * p.z) - 0.2 * cos(p.x * p.z), sin(p.z * p.y));

          float f = cos(a*(3.0 + m));
          // f = abs(cos(a*3.));
          // f = abs(cos(a*(2.5+ m)))*.5+.3;
          f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;
          float waterFront = 1.-smoothstep(f,f+0.02,r);
          return waterFront;
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
                
      // float dancingCreature(vec3 p, vec2 u) {
      //   vec2 pos = vec2(0.5)-u;
      //   p += vec3(0.0, 0.0, -9.0 );
              
      //   float r = length(pos)*2.0;
      //   float h = 
      //     atan(
      //       sin(pos.y * tan(r + p.z + (sin(3. * time)) ) * sin(p.z * time)), 
      //       atan(
      //         p.z, 
      //         fract(pos.y * r)
      //       )
      //     )*length(p)*2.888;
              
      //     float a = atan(pos.y,pos.x) * h * .12;// * time;
      //     float m = 0.001 * p.z;
      //     float mn = 0.01 * time;
      //     float gt = m * pow(h*m, time) + mn;
      //     float gh = h *cos(a*(3.088 + gt) + ((time) * p.z));
      //     vec3 v = vec3(atan(p.y,p.x* p.z));
              
      //     float f = cos(a*3.);
      //     f = cos(a*3.*-1.680)+ (0.412+ sin(a*0.2)) -r*gh;
      //     // f = abs(cos(a*3.));
      //     // f = abs(cos(a*2.5))*.5+.3;
      //     // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
      //     // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      //     return 1.-smoothstep(f,f+0.02,r) ;
      //   }

        vec3 computeNormal(vec3 p) {
          float epsilon = 0.001;
          return normalize(vec3(
              mapTerrain(p + vec3(epsilon, 0, 0)) - mapTerrain(p - vec3(epsilon, 0, 0)),
              mapTerrain(p + vec3(0, epsilon, 0)) - mapTerrain(p - vec3(0, epsilon, 0)),
              mapTerrain(p + vec3(0, 0, epsilon)) - mapTerrain(p - vec3(0, 0, epsilon))
          ));
        }

        vec3 computeCameraPosition(float time) {
          float radius = 5.0; // Adjust for larger or smaller movement
          float speed = 0.5; // Adjust rotation speed
      
          float camX = radius * cos(time * speed);
          float camZ = radius * sin(time * speed);
          
          return vec3(camX, 1.5, camZ - 3.0); // Y-position can be adjusted for height
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
                
        float ripple(vec2 uv, float t) {
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

        float smoothFloatTime(float t) {
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
          float s = sdSphere(p, smoothTime(mv));
          float blend = smoothstep(
            S(time * (t + mv)), 
            S(pow(u, sin(t + u))), 
            s
          );

          return blend * sqrt(blend * time);
        }

        vec3 colorPallete(vec3 p, vec3 color, vec2 u, vec2 m, float shadowIntensity, float rayPower) {
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

          vec3 uvt = vec3(uv, smoothstep(mouse.x, mouse.y, (uv.x/uv.y )* sin(time)));

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = dancingCreature(p, uv); // Current distance to the scene
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, ro);
              // shadowIntensity = computeSoftShadow(p, ro); // Call function
              break;
            }
        
            t += d; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey White Color
        
            if (d < 0.001 || t > 100.0) break;
          }

          // Depth FactordragonSpiderColor(uvt) // Compute if (d < 0.001) 
          float rayPower = t * 0.2 * depthFactor;
          float creature = dancingCreature(vec3(uv, t * rayPower), uv);
          float redBlend = blendView(uvt, fract(creature));
          float blueButter = shadowIntensity + rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;
          float bt = smoothTime(blueButter + time);
          float greenMoney = smoothstep(bt, sin(time + bt), sqrt(time + uv.x));
          float rgR = smoothstep(shadowIntensity, (rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) ), shadowIntensity); 
          float rgG = sqrt(shadowIntensity + rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * smoothTime(shadowIntensity));
          float rgB = smoothTime(blueButter + time);
          vec3 colorBlend = vec3(rgR, rgG, rgB);
          vec3 colorDust = vec3(smoothTime(redBlend), time + mouse.x, sqrt(redBlend));
          vec3 colorButter = mix(colorBlend, colorDust, redBlend * blueButter);

          // // Aspect ratio correction for final rendering only, not for distance
          // vec2 aspectUV = uv;
          // aspectUV.x *= resolution.x / resolution.y;
          // // Center and scale position
          // vec2 p = vec2(0.55, 0.54) - uv;

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
  
            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            // vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
      
            // // Call your effect function
            color = mix(color, vec3(creature), time * absT);//fract( * absT); //, sin(dist * (uv.x + time)));
            color *= vec3(smoothstep(creature, greenMoney, dist));

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
            color += mix(color, colorPallete, absT);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.dancingCreatureMaterial = new THREE.ShaderMaterial(this.dancingCreatureShader);
  }

  useFlyingDragonTerrainShader() {
    this.flyingDragonTerrainShader = {
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
      // CreatureParams waspParams = CreatureParams(2.616, 3.0, 2.5, 12.0, 0.0);
      // CreatureParams spiderParams = CreatureParams(3.4, 8.0, 2.2, 15.0, 0.7);
      // CreatureParams snailParams = CreatureParams(1.2, 1.0, 1.5, 4.0, 0.4);
      
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

        float sdFlowers(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          float r = length(p)*2.0;
          float a = atan(atan(p.y,p.x), p.z);
      
          float f = cos(a*3.);
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          float sh = smoothstep(f, f + 0.02, r);
      
          float shape = 1.0 - sh;

          return shape;
        }

        float sdFlowerVortex(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          float r = length(p)*2.0;
          float a = atan(atan(p.y,p.x), p.z);
      
          float f = cos(a*3.);
          // f = abs(cos(a*3.));
          // f = abs(cos(a*2.5))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;

          float smh = smoothstep(f, f + 0.02, r);
      
          float shape = 1.0 - smh;

          return shape;
        }

        float dragonSpider(vec3 p) {
          vec2 drg = p.xz;
          float r = length(drg) * 2.616;
          float a = fract(atan(drg.y * p.z, fract(drg.x) - 0.2 * sin(drg.x * drg.y * p.z))) - r;
        
          float f = abs(cos(a * 2.5)) * 0.5 + 0.3;
          f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float softness = smoothstep(-0.5, 1.0, cos(a * 10.0)) * 0.2 + 0.5;
        
          float d = 1.0 - smoothstep(f, sin(f + r) - 0.25, r);
          return d - 0.5;
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
          vec2 proj = p.xz;
          float r = length(proj) * 2.616;
          float a = fract(atan(proj.y, fract(proj.x) - 0.2)) - r;
        
          float f = abs(cos(a * 12.0) * sin(a * 3.0)) * 0.8 + 0.1;
          float sh = smoothstep(f, sin(f + r) - 0.25, r);
          float spider =  1.0 - sh;
          return spider;
        }

        float waterFront(vec3 p) {
          float t = 0.01;
          float u = 0.001 + time;
          float v = 0.001 + (0.1 * time);
          float m = (0.088 + v)+ (time * t);

          // vec2 pos = vec2(0.5)-uv;
          // float r = length(p)*2.0;
          // float a = atan(p.y,(p.x));
          // a = atan(u, fract(v + r)) - r;
      
          // float f = cos(a*(3.0 + m));
          // // f = abs(cos(a*3.));
          // // f = abs(cos(a*(2.5+ m)))*.5+.3;
          // f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          // f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;

          float r = length(p)*2.0;
          float a = atan(atan(p.y, p.z),(p.x * p.z));
          a = atan(u, fract(v + r)) - r;
          a = atan(fract(p.y * p.z) - 0.2 * cos(p.x * p.z), sin(p.z * p.y));

          float f = cos(a*(3.0 + m));
          // f = abs(cos(a*3.));
          // f = abs(cos(a*(2.5+ m)))*.5+.3;
          f = abs(cos(a*12.)*sin(a*(3. + u)+ time))*.8+.1;
          f = abs(cos(a*12.)*tan(a*(3. + u)+ time))*.8+.1;
          float waterFront = 1.-smoothstep(f,f+0.02,r);
          return waterFront;
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
              float shadowDist = mapTerrain(shadowPoint);
      
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
            float shadowDist = mapTerrain(shadowPoint);
                
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
              float shadowDist = mapTerrain(shadowPoint);
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
              mapTerrain(p + vec3(epsilon, 0, 0)) - mapTerrain(p - vec3(epsilon, 0, 0)),
              mapTerrain(p + vec3(0, epsilon, 0)) - mapTerrain(p - vec3(0, epsilon, 0)),
              mapTerrain(p + vec3(0, 0, epsilon)) - mapTerrain(p - vec3(0, 0, epsilon))
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
      
        float blendShapeFactor(float uvx, float factor, float timeMod) {
          float raw = fract(factor * uvx);
          float st = smoothstep(0.0, 1.0, raw); // or your custom S()
          float animated = st * sin(timeMod + uvx * factor);
          return animated;
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
        float smoothTime(float t) {
          float u = t * t * (3.0 - 2.0 * t); // Standard smoothstep easing
          float blend = smoothstep(
            S(u + (t *  time)), 
            sqrt(u + sin(t * time)), 
            sqrt(u)
          );
          return blend;
        }

        float smoothFloatTime(float t) {
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
          float s = sdSphere(p, smoothTime(mv));
          float blend = smoothstep(
            S(time * (t + mv)), 
            S(pow(u, sin(t + u))), 
            s
          );

          return blend * sqrt(blend * time);
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

          for (int i = 0; i < 80; i++) {
            vec3 p = ro + rd * t; // Position along the ray
            float d = mapDragons(p); // Current distance to the scene
            float ds = dragonSpider(p); // Current distance to the scene
            // rd = normalize(ro - p); 
            d += waspSpider(p);
            d += dragonSpider(p);
                
            // Compute Shadows and reflections
            if (d < 0.001) {  
              normal = computeNormal(p); // ✅ Compute surface normal here vec3 p, vec3 lightPos
              float shadow = computeSoftShadow(p + normal * 0.02, ro);
              shadowIntensity = computeSoftShadow(p, ro); // Call function
              // color *= shadowIntensity; // Apply shadow effect
              break;
            }
        
            t += d; // March the distance
            t += ds; // March the distance
        
            color = vec3(i) / 80.0; // Depth Grey White Color
        
            if (d < 0.001 || t > 100.0) break;
          }

          // Depth FactordragonSpiderColor(uvt) // Compute if (d < 0.001) 
          vec3 uvt = vec3(uv, smoothstep(mouse.x, mouse.y, time));
          float rayPower = t * 0.2 * depthFactor;
          float redBlend = blendView(uvt, fract(dragonSpider(uvt * time)));
          float blueButter = shadowIntensity + rayPower + S(noise(uv.xy * 2.0 + time * 0.7)) * shadowIntensity;
          float bt = smoothTime(blueButter + time);
          float greenMoney = smoothstep(bt, sin(time + bt), sqrt(time + uv.x));
          float rgR = smoothstep(shadowIntensity, (rayPower + S(noise(uv.xy * 4.0 + time * 0.3)) ), shadowIntensity); 
          float rgG = sqrt(shadowIntensity + rayPower + S(noise(uv.yx * 3.0 + time * 0.5)) * smoothTime(shadowIntensity));
          float rgB = smoothTime(blueButter + time);
          vec3 colorBlend = vec3(rgR, rgG, rgB);
          vec3 colorDust = vec3(smoothTime(redBlend), time + mouse.x, sqrt(redBlend));
          vec3 colorButter = mix(colorBlend, colorDust, redBlend * blueButter);

          // // Aspect ratio correction for final rendering only, not for distance
          // vec2 aspectUV = uv;
          // aspectUV.x *= resolution.x / resolution.y;
          // // Center and scale position
          // vec2 p = vec2(0.55, 0.54) - uv;

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
  
            // Optionally, add time-based animation for extra dynamics
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
      
            // // Call your effect function
            color += mix(color, colorPallete, time);//fract( * absT); //, sin(dist * (uv.x + time)));
            color *= vec3(smoothstep(dragonSpider(color), greenMoney, dist));

            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            vec3 colorPallete = mix(color, colorBlend, smoothstep(redBlend, blueButter, greenMoney));
            color += mix(color, colorPallete, absT);
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.flyingDragonTerrainMaterial = new THREE.ShaderMaterial(this.flyingDragonTerrainShader);
  }

  getShaders() {
    this.shaders = [
      this.sandGalaxyShader, 
      this.dancingCreatureShader,
      this.flyingDragonTerrainShader
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
export default SandyPlainShaderMaterials;
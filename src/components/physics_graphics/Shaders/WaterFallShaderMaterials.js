import * as THREE from 'three';

export class WaterFallShaderMaterials {
  constructor(params, mouse) {
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
    this.mouse = mouse;
    this.mousePosition = this.mouse;

    this.useMilkyWaterFallShader();
    this.useBlueWaterFallShader();
    this.usePurpleSpringShader();

    this.updateEvents();
    this.getShaders();
  }

  useBlueWaterFallShader() {
    this.blueWaterFallShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        u_velocity: { value: this.params.customShaderUniforms.u_velocity }, 
        u_rippleTime: { value: this.params.customShaderUniforms.u_rippleTime }, 
        u_rippleOrigin: { value: this.params.customShaderUniforms.u_rippleOrigin }, 
        u_terrainElevation: { value: this.params.customShaderUniforms.u_terrainElevation }, 

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        climateCondition: { value: this.params.customShaderUniforms.climateCondition }, 
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
        uniform vec2 resolution;
        uniform vec2 mousePosition;
        uniform float time;
        uniform float hovered;
        uniform float sineTime;
        uniform float shapeFactor;
        uniform float explodeIntensity;

        #define MAX_STEPS 100
        #define MAX_DIST 100.0
        #define SURF_DIST 0.001
        vec3 dgv;
        
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

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 78.233);
          return fract(p.x * p.y);
        }

        float ripple(float t) {
          return 0.5 + 0.5 * sin(t * 2.0 * 3.14159); // repeats every 1.0
        }

        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }

        vec3 path (vec3 startPos, vec3 endPos, float t){
          return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
        }

        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.x);
          return p.y - h; // above = positive, below = negative
        }

        // 3D terrain SDF
        float terrainSDF(vec3 p) {
          float h = terrainHeight(p.xz);
          return p.y - h;
        }

        float terrainVolumeSDF(vec3 p) {
          float h = terrainHeight(p.xz); 
          return p.y - h;
        }

        float sdCylinder(vec3 p, float h, float r) {
          vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h * 0.5);
          return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }

        float treeSDF(vec3 p) {
          vec3 q = fract(p);
          float lt = linearTerrainSDF(p);

          // Distribute trees periodically over terrain
          vec2 cell = floor(p.xz * 2.0); // spacing
          vec3 localP = p - vec3(cell.x + 0.5, 0.0 , cell.y + 0.5);
          localP.y -= terrainHeight(cell + 0.5); // offset by terrain

          float trunk = sdCylinder(localP,  0.5, 0.05); // trunk
          return trunk;
        }

        float foliageSDF(vec3 p, vec3 base, float rnd) {
          float foliageHeight = 0.2 + 0.1 * fract(rnd * 60.0);
          vec3 canopyCenter = base + vec3(0.0, foliageHeight, 0.0);
          return length(p - canopyCenter) - 0.15; // sphere canopy
        }

        float sceneSDF(vec3 p) {
          vec3 q = fract(p);
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float foliage = min(foliageSDF(q, (log(q)), tree), tree);
          return min(min(terrain, tree), foliage);
        }

        // Estimate normal from SDF
        vec3 computeNormal(vec3 p) {
          float d = terrainVolumeSDF(p);
          vec2 e = vec2(0.001, 0.0);

          return normalize(vec3(
            terrainVolumeSDF(p + e.xyy) - d,
            terrainVolumeSDF(p + e.yxy) - d,
            terrainVolumeSDF(p + e.yyx) - d
          ));
        }

        vec3 terrainColor(vec3 p, float d) {
          // Shading
          vec3 color = vec3(0.6, 0.85, 0.4); 
          // default grass color
          if (d < MAX_DIST) {
            vec3 normal = computeNormal(p);
            float diff = clamp(dot(normal, vec3(0.3, 1.0, 0.5)), 0.0, 1.0);
            color = vec3(0.3, 0.6, 0.2) * diff;
          } else {
            color = vec3(0.6, 0.8, 1.0); // sky
          }
            return color;
        }

        float rayPower(vec3 p, float d, float t) {
          float depthFactor = 0.064;
          float ray = t * 0.2 * depthFactor;
          vec3 color;
        
          if (d < MAX_DIST) {
            vec3 normal = computeNormal(p);
            float diff = clamp(dot(normal, normalize(vec3(0.3, 1.0, 0.5))), 0.0, 1.0);
            color = vec3(0.3, 0.6, 0.2) * diff;
        
            float treeDist = treeSDF(p);
            if (treeDist < 0.02) {
              color = vec3(0.25, 0.1, 0.05);
            }

            float canopy = foliageSDF(p, vec3(0.0), hash21(p.xz));
            if (canopy < 0.03) {
              color = vec3(0.1, 0.4, 0.1);
            }

          } else {
            color = vec3(0.6, 0.8, 1.0); // base sky tint
          }

          return ray;
        }

        vec2 raymarch(vec3 ro, vec3 rd) {
          float t = 0.0; // Total Distance Travelled By Ray
          dgv = vec3(t);
          vec3 p; // declared outside loop so it's accessible after
          float d = 0.0;
        
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            d = min(terrainVolumeSDF(p), sceneSDF(p));
            if (d < 0.001 || t > 100.0) break;
        
            t += d;
            dgv = vec3(i) / 80.0;
          }

          float ray = rayPower(p, d, t);
          return vec2(t, ray);
        }

        vec4 borders(vec2 u) {
          return vec4(
            u.x,             // distance from left
            1.0 - u.x,       // distance from right
            u.y,             // distance from bottom
            1.0 - u.y        // distance from top
          );
        }

        vec4 deviceDepthPixelDimension(vec2 u) {
          vec2 p = vec2(0.5) - u;
        
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float f = cos(a * 3.0);

          vec4 wall = borders(u);  // NEW: How close to left/right or top/bottom
          float depth = min(wall.x, wall.y);  // use closest edge

          return vec4(r, a, f, depth);  // now you have screen-depth too!
        }

        float computeGlowFactor(float s) {
          return s * 0.1;
        }

        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;
          vec3 color = vec3(0.0);

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
      
          float glow = computeGlowFactor(3.67);
          vec4 device = deviceDepthPixelDimension(uv);
          float d = device.w;
          float r = device.x;
          float a = device.y;
          float f = device.z;
        
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
        
          // March
          vec2 renderer = raymarch(ro, rd);
          float t = renderer.x;
          float ray = renderer.y;
          vec3 p = ro + rd * t+(time)*sin(d);
          vec3 terrain = terrainColor(p, t); //+dgv;
            
          color = vec3( 1.-smoothstep(f,f+0.02,r) );
          vec3 shape = vec3(terrain.x, (terrain.y*terrain.x), terrain.z+r/time)/r*(glow);
          color = shape;

          float absT =  abs(sin(sineTime));
          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mousePosition, uv);
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
            // color = shape; // Sliding movement 
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }  
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.blueWaterFallMaterial = new THREE.ShaderMaterial(this.blueWaterFallShader);
  } 

  useMilkyWaterFallShader() {
    this.milkyWaterFallShader = {
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
        uniform float sineTime;
        
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
      
        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;

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
        
          // March
          vec4 renderer = raymarch(ro, rd);
          // float d = renderer(ro, rd+time);
          // float dist = march.w;
          // vec3 p = ro + rd * dist;
        
          vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );
          // color *= d;
          
          color = r-vec3(renderer.w-r, renderer.y, renderer.z)-renderer.z/(sun);
          // color = sunLight(uv);

          float absT =  abs(sin(sineTime));
          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mousePosition, uv);
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
            // color = shape; // Sliding movement 
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.milkyWaterFallMaterial = new THREE.ShaderMaterial(this.milkyWaterFallShader);
  }

  usePurpleSpringShader() {
    this.purpleSpringShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },
        u_velocity: { value: this.params.customShaderUniforms.u_velocity }, 
        u_rippleTime: { value: this.params.customShaderUniforms.u_rippleTime }, 
        u_rippleOrigin: { value: this.params.customShaderUniforms.u_rippleOrigin }, 
        u_terrainElevation: { value: this.params.customShaderUniforms.u_terrainElevation }, 

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        climateCondition: { value: this.params.customShaderUniforms.climateCondition }, 
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
        uniform vec2 resolution;
        uniform vec2 mousePosition;
        uniform float time;
        uniform float hovered;
        uniform float sineTime;
        uniform float shapeFactor;
        uniform float explodeIntensity;

        #define MAX_STEPS 100
        #define MAX_DIST 100.0
        #define SURF_DIST 0.001
        vec3 dgv;
        
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

        float hash21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 78.233);
          return fract(p.x * p.y);
        }

        float ripple(float t) {
          return 0.5 + 0.5 * sin(t * 2.0 * 3.14159); // repeats every 1.0
        }

        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }

        vec3 path (vec3 startPos, vec3 endPos, float t){
          return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
        }

        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.x);
          return p.y - h; // above = positive, below = negative
        }

        // 3D terrain SDF
        float terrainSDF(vec3 p) {
          float h = terrainHeight(p.xz);
          return p.y - h;
        }

        float terrainVolumeSDF(vec3 p) {
          float h = terrainHeight(p.xz); 
          return p.y - h;
        }

        float sdCylinder(vec3 p, float h, float r) {
          vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h * 0.5);
          return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
        }

        float treeSDF(vec3 p) {
          vec3 q = fract(p);
          float lt = linearTerrainSDF(p);

          // Distribute trees periodically over terrain
          vec2 cell = floor(p.xz * 2.0); // spacing
          vec3 localP = p - vec3(cell.x + 0.5, 0.0 , cell.y + 0.5);
          localP.y -= terrainHeight(cell + 0.5); // offset by terrain

          float trunk = sdCylinder(localP,  0.5, 0.05); // trunk
          return trunk;
        }

        float foliageSDF(vec3 p, vec3 base, float rnd) {
          float foliageHeight = 0.2 + 0.1 * fract(rnd * 60.0);
          vec3 canopyCenter = base + vec3(0.0, foliageHeight, 0.0);
          return length(p - canopyCenter) - 0.15; // sphere canopy
        }

        float sceneSDF(vec3 p) {
          vec3 q = fract(p);
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float foliage = min(foliageSDF(q, (log(q)), tree), tree);
          return min(min(terrain, tree), foliage);
        }

        // Estimate normal from SDF
        vec3 computeNormal(vec3 p) {
          float d = terrainVolumeSDF(p);
          vec2 e = vec2(0.001, 0.0);

          return normalize(vec3(
            terrainVolumeSDF(p + e.xyy) - d,
            terrainVolumeSDF(p + e.yxy) - d,
            terrainVolumeSDF(p + e.yyx) - d
          ));
        }

        vec3 terrainColor(vec3 p, float d) {
          // Shading
          vec3 color = vec3(0.6, 0.85, 0.4); 
          // default grass color
          if (d < MAX_DIST) {
            vec3 normal = computeNormal(p);
            float diff = clamp(dot(normal, vec3(0.3, 1.0, 0.5)), 0.0, 1.0);
            color = vec3(0.3, 0.6, 0.2) * diff;
          } else {
            color = vec3(0.6, 0.8, 1.0); // sky
          }
            return color;
        }

        float rayPower(vec3 p, float d, float t) {
          float depthFactor = 0.064;
          float ray = t * 0.2 * depthFactor;
          vec3 color;
        
          if (d < MAX_DIST) {
            vec3 normal = computeNormal(p);
            float diff = clamp(dot(normal, normalize(vec3(0.3, 1.0, 0.5))), 0.0, 1.0);
            color = vec3(0.3, 0.6, 0.2) * diff;
        
            float treeDist = treeSDF(p);
            if (treeDist < 0.02) {
              color = vec3(0.25, 0.1, 0.05);
            }

            float canopy = foliageSDF(p, vec3(0.0), hash21(p.xz));
            if (canopy < 0.03) {
              color = vec3(0.1, 0.4, 0.1);
            }

          } else {
            color = vec3(0.6, 0.8, 1.0); // base sky tint
          }

          return ray;
        }

        vec2 raymarch(vec3 ro, vec3 rd) {
          float t = 0.0; // Total Distance Travelled By Ray
          dgv = vec3(t);
          vec3 p; // declared outside loop so it's accessible after
          float d = 0.0;
        
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            d = min(terrainVolumeSDF(p), sceneSDF(p));
            if (d < 0.001 || t > 100.0) break;
        
            t += d;
            dgv = vec3(i) / 80.0;
          }

          float ray = rayPower(p, d, t);
          return vec2(t, ray);
        }

        vec4 borders(vec2 u) {
          return vec4(
            u.x,             // distance from left
            1.0 - u.x,       // distance from right
            u.y,             // distance from bottom
            1.0 - u.y        // distance from top
          );
        }

        vec4 deviceDepthPixelDimension(vec2 u) {
          vec2 p = vec2(0.5) - u;
        
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float f = cos(a * 3.0);

          vec4 wall = borders(u);  // NEW: How close to left/right or top/bottom
          float depth = min(wall.x, wall.y);  // use closest edge

          return vec4(r, a, f, depth);  // now you have screen-depth too!
        }

        float computeGlowFactor(float s) {
          return s * 0.1;
        }

        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;
          vec3 color = vec3(0.0);

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
      
          float glow = computeGlowFactor(3.67);
          vec4 device = deviceDepthPixelDimension(uv);
          float d = device.w;
          float r = device.x;
          float a = device.y;
          float f = device.z;
        
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
        
          // March
          vec2 renderer = raymarch(ro, rd);
          float t = renderer.x;
          float ray = renderer.y;
          vec3 p = ro + rd * t+(time)*sin(d);
          vec3 terrain = terrainColor(p, t); //+dgv;
            
          color = vec3( 1.-smoothstep(f,f+0.02,r) );
          vec3 shape = vec3(terrain.x, (terrain.y*terrain.x), terrain.z+r/time)/r*(glow);
          color = shape;

          float absT =  abs(sin(sineTime));
          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mousePosition, uv);
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
            // color = shape; // Sliding movement 
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color *= 0.5 + 0.5 * sin(sineTime + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }  
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.purpleSpringMaterial = new THREE.ShaderMaterial(this.purpleSpringShader);
  }

  getShaders() {
    this.shaders = [
      this.blueWaterFallShader,
      this.milkyWaterFallShader,
      this.purpleSpringShader,
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
export default WaterFallShaderMaterials;
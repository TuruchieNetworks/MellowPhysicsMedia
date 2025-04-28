import * as THREE from 'three';

export class MarienBedShaderMaterials {
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

    this.useMarineSnakesShader();
    this.useMarineBedShader();
    this.useMarineMillWorkShader()

    this.updateEvents();
    this.getShaders();
  }

  useMarineBedShader() {
    this.marineBedShader = {
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
        
        vec3 dimensions(vec2 u) {
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(pos, -9.0+time);
          float dx = distance(p.x, 0.0);
          float dy = distance(p.y, 0.0);
          float dz = distance(p.z, 0.0);
      
          float r = length(pos)*2.0; 
          float pzt = p.z*(time*0.00051);
          float a = atan(pos.y,tan(p.z+fract(pos.x+p.z)));
            
          float tdy = dy*cos(0.3*atan(pzt, a)); 
            
          // float ap = atan(p.y,atan(dx,tan(atan(a, atan(pzt, a)) )));
          //   a=ap-(p.z);
        
          float f = cos(a*3.)*sin(a*3.);
          // f = abs(cos(a*3.));
          f = abs(cos(a*5.5))*.5+.3-r/2.;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5; 		 
         float s = 1.-smoothstep(f,f+0.02,r);
          return vec3(r, a, s);
        }
        
        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }
        
        vec3 getPath (vec3 startPos, vec3 endPos, float t){
          return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
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

        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
            
          float r = ripples(h);
          h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          // float h = fractalHill(p.y+(time*0.1)+ treeSDF(fract(1.-p)));
          // h=r;
          return p.y - h; // above = positive, below = negative
        }

        float forestSDF(vec3 p) {
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          float foliage = min(foliageSDF(p, (vec3(tree)), terrain), tree+h);
          // foliage = min(foliageSDF(p, -log(p), terrain), tree);
          return min((terrain, tree+h), foliage);
          // return min(min(terrain, tree), foliage);
          // return min((terrain, tree), foliage);
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
          float ripple;
          float d = 0.0;
          vec3 path = getPath(ro, rd, t) ;
          
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            float d = terrainVolumeSDF(p)* linearTerrainSDF(p+path);// LandScape;
            d = terrainVolumeSDF(p)+ linearTerrainSDF(p+path);// Coniferous Forests
            // d = terrainVolumeSDF(p)* linearTerrainSDF(p+path)+hillTerrain(p.y); // Riparian Forest 
            // d = getPath(ro, rd, p.x).y;
            d += linearTerrainSDF(p +path)+treeSDF(p); 
            d = forestSDF(p);
            // d = treeSDF(p);
            d/=forestSDF(p+path)+forestSDF(p)+linearTerrainSDF(p+path);// MillworkOceanBed
            // d /= terrainVolumeSDF(p)+ linearTerrainSDF(p+path); //Snow Grassland
            // d /= (terrainVolumeSDF(p)+ linearTerrainSDF(p+path)+hillTerrain(p.z)); // Plain Field
            if (d < 0.001 || t > 100.0) break;
        
            t += d;
            depthGreyValue = vec3(i) / 80.0;
          }
        
          float ray = t * 0.912 * depthFactor;
          ripple = ripples(ray*sin(time+0.7));
          
          // 🌿 Base shading — default grass tint
          vec3 color = depthGreyValue * vec3(0.6, .85, 0.4);
          vec3 landScape = terrainColor(p, t);
          // color = depthGreyValue * landScape;
          // vec3 cloudyLandScape = terrainColor(p, t*ripple);
          // vec3 foggyLandScape = terrainColor(p, t/ripple);
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

        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range

          vec3 specs = dimensions(uv);
          float r = specs.x;
          float a = specs.y;
          float v = specs.z;
          float sun = sdSun(uv);
            
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
            vec3 color;
        
          // March
          vec4 renderer = raymarch(ro, rd);
          // float d = renderer(ro, rd+time);
          // float dist = march.w;
          // vec3 p = ro + rd * dist;
        
        
          // vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );
          // color *= d;
          
          vec3 shape = r-vec3((renderer.w-r), renderer.y, renderer.z)-renderer.z/(sun);
          color = shape;
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
            color *= 0.5 + (0.95) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
                
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color = shape; // Sliding movement 
            color *= (0.1371+v/a)+ (0.975) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }  
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.marineBedMaterial = new THREE.ShaderMaterial(this.marineBedShader);
  } 

  useMarineSnakesShader() {
    this.marineSnakesShader = {
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
        
        vec3 dimensions(vec2 u) {
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(pos, -9.0+time);
          float dx = distance(p.x, 0.0);
          float dy = distance(p.y, 0.0);
          float dz = distance(p.z, 0.0);
      
          float r = length(pos)*2.0; 
          float pzt = p.z*(time*0.00051);
          float a = atan(pos.y,tan(p.z+fract(pos.x+p.z)));
            
          float tdy = dy*cos(0.3*atan(pzt, a)); 
            
          // float ap = atan(p.y,atan(dx,tan(atan(a, atan(pzt, a)) )));
          //   a=ap-(p.z);
        
          float f = cos(a*3.)*sin(a*3.);
          // f = abs(cos(a*3.));
          f = abs(cos(a*5.5))*.5+.3-r/2.;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5; 		 
         float s = 1.-smoothstep(f,f+0.02,r);
          return vec3(r, a, s);
        }
        
        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }
        
        vec3 getPath (vec3 startPos, vec3 endPos, float t){
          return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
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

        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
            
          float r = ripples(h);
          h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          // float h = fractalHill(p.y+(time*0.1)+ treeSDF(fract(1.-p)));
          // h=r;
          return p.y - h; // above = positive, below = negative
        }

        float forestSDF(vec3 p) {
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          float foliage = min(foliageSDF(p, (vec3(tree)), terrain), tree+h);
          // foliage = min(foliageSDF(p, -log(p), terrain), tree);
          return min((terrain, tree+h), foliage);
          // return min(min(terrain, tree), foliage);
          // return min((terrain, tree), foliage);
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
          float ripple;
          float d = 0.0;
          vec3 path = getPath(ro, rd, t) ;
          
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            float d = terrainVolumeSDF(p)* linearTerrainSDF(p+path);// LandScape;
            d = terrainVolumeSDF(p)+ linearTerrainSDF(p+path);// Coniferous Forests
            // d = terrainVolumeSDF(p)* linearTerrainSDF(p+path)+hillTerrain(p.y); // Riparian Forest 
            // d = getPath(ro, rd, p.x).y;
            d += linearTerrainSDF(p +path)+treeSDF(p); 
            d = forestSDF(p);
            // d = treeSDF(p);
            // d/=forestSDF(p+path)+forestSDF(p)+linearTerrainSDF(p+path);// MillworkOceanBed
            d /= terrainVolumeSDF(p)+ linearTerrainSDF(p+path); //Snow Grassland
            // d /= (terrainVolumeSDF(p)+ linearTerrainSDF(p+path)+hillTerrain(p.z)); // Plain Field
            if (d < 0.001 || t > 100.0) break;
        
            t += d;
            depthGreyValue = vec3(i) / 80.0;
          }
        
          float ray = t * 0.912 * depthFactor;
          ripple = ripples(ray*sin(time+0.7));
          
          // 🌿 Base shading — default grass tint
          vec3 color = depthGreyValue * vec3(0.6, .85, 0.4);
          vec3 landScape = terrainColor(p, t);
          // color = depthGreyValue * landScape;
          // vec3 cloudyLandScape = terrainColor(p, t*ripple);
          // vec3 foggyLandScape = terrainColor(p, t/ripple);
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
        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range

          vec3 specs = dimensions(uv);
          float r = specs.x;
          float a = specs.y;
          float v = specs.z;
          float sun = sdSun(uv);
            
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
            vec3 color;
        
          // March
          vec4 renderer = raymarch(ro, rd);
          // float d = renderer(ro, rd+time);
          // float dist = march.w;
          // vec3 p = ro + rd * dist;
        
        
          // vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );
          // color *= d;
          
          vec3 shape = r-vec3((renderer.w-r), renderer.y, renderer.z)-renderer.z/(sun);
          color = shape;
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
            color *= 0.5 + (0.95) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
                
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color = shape; // Sliding movement 
            color *= (0.1371+v/a)+ (0.975) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }  
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.marineSnakesMaterial = new THREE.ShaderMaterial(this.marineSnakesShader);
  } 

  useMarineMillWorkShader() {
    this.marineMillworkShader = {
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
        
        vec3 dimensions(vec2 u) {
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(pos, -9.0+time);
          float dx = distance(p.x, 0.0);
          float dy = distance(p.y, 0.0);
          float dz = distance(p.z, 0.0);
      
          float r = length(pos)*2.0; 
          float pzt = p.z*(time*0.00051);
          float a = atan(pos.y,tan(p.z+fract(pos.x+p.z)));
            
          float tdy = dy*cos(0.3*atan(pzt, a)); 
            
          // float ap = atan(p.y,atan(dx,tan(atan(a, atan(pzt, a)) )));
          //   a=ap-(p.z);
        
          float f = cos(a*3.)*sin(a*3.);
          // f = abs(cos(a*3.));
          f = abs(cos(a*5.5))*.5+.3-r/2.;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5; 		 
          float sh = 1.-smoothstep(f,f+0.02,r);
          return vec3(r, a, sh);
        }
        
        float hillTerrain(float t) {
          return abs(sin(t * 2.0 * 3.14159)); // double bump per cycle
        }
        
        vec3 getPath (vec3 startPos, vec3 endPos, float t){
          return mix(startPos, endPos, hillTerrain(t)); // rises, then falls
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

        float linearTerrainSDF(vec3 p) {
          // simulate terrain along X
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
            
          float r = ripples(h);
          h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          // float h = fractalHill(p.y+(time*0.1)+ treeSDF(fract(1.-p)));
          // h=r;
          return p.y - h; // above = positive, below = negative
        }

        float forestSDF(vec3 p) {
          float terrain = terrainVolumeSDF(p);
          float tree = treeSDF(p);
          float h = fractalHill(p.y+(time*0.21)+ terrainVolumeSDF((p)));// Atlantic Deltas
          float foliage = min(foliageSDF(p, (vec3(tree)), terrain), tree+h);
          // foliage = min(foliageSDF(p, -log(p), terrain), tree);
          return min((terrain, tree+h), foliage);
          // return min(min(terrain, tree), foliage);
          // return min((terrain, tree), foliage);
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
          float ripple;
          float d = 0.0;
          vec3 path = getPath(ro, rd, t) ;
          
          for (int i = 0; i < 80; i++) {
            p = ro + rd * t;
            float d = terrainVolumeSDF(p)* linearTerrainSDF(p+path);// LandScape;
            d = terrainVolumeSDF(p)+ linearTerrainSDF(p+path);// Coniferous Forests
            // d = terrainVolumeSDF(p)* linearTerrainSDF(p+path)+hillTerrain(p.y); // Riparian Forest 
            // d = getPath(ro, rd, p.x).y;
            d = linearTerrainSDF(p +path)+treeSDF(p); 
            d = forestSDF(p);
            d = treeSDF(p);
            // d+=forestSDF(p+path)+forestSDF(p)+linearTerrainSDF(p+path);
            // d = terrainVolumeSDF(p)+ linearTerrainSDF(p+path); //Snow Grassland
            // d = (terrainVolumeSDF(p)+ linearTerrainSDF(p+path)+hillTerrain(p.z)); // Plain Field
  
            if (d < 0.001 || t > 100.0) break;
        
            t += d;

            depthGreyValue = vec3(i) / 80.0;
          }
        
          float ray = t * 0.912 * depthFactor;
          ripple = ripples(ray*sin(time+0.7));
          
          // 🌿 Base shading — default grass tint
          vec3 color = depthGreyValue * vec3(0.6, .85, 0.4);
          vec3 landScape = terrainColor(p, t);
          // color = depthGreyValue * landScape;
          // vec3 cloudyLandScape = terrainColor(p, t*ripple);
          // vec3 foggyLandScape = terrainColor(p, t/ripple);
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
        void main(){
          vec2 uv = gl_FragCoord.xy/resolution.xy;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range

          vec3 specs = dimensions(uv);
          float r = specs.x;
          float a = specs.y;
          float v = specs.z;
          float sun = sdSun(uv);
            
          // Camera setup
          vec3 ro = vec3(0.0, 1.0, -3.5); // camera origin
          vec3 lookAt = vec3(0.0, 0.0, 0.0);
          vec3 forward = normalize(lookAt - ro);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
          vec3 up = cross(forward, right);
          vec3 rd = normalize(uv.x * right + uv.y * up + 1.5 * forward);
          vec3 color;
        
          // March
          vec4 renderer = raymarch(ro, rd);
          // float d = renderer(ro, rd+time);
          // float dist = march.w;
          // vec3 p = ro + rd * dist;
        
        
          // vec3 color = vec3( 1.-smoothstep(f,f+0.02,r) );
          // color *= d;
          
          vec3 shape = r-vec3((renderer.w-r), renderer.y, renderer.z)-renderer.z/(sun);
          color = shape;
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
            color *= 0.5 + (0.95) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
                
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-bacoloring
            color = shape; // Sliding movement 
            color *= (0.1371+v/a)+ (0.975) * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and sineTime
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }  
          // gl_FragColor = vec4(color, 1.0);
        }
      `
    }

    this.marineMillworkMaterial = new THREE.ShaderMaterial(this.marineMillworkShader);
  } 

  getShaders() {
    this.shaders = [
      this.marineSnakesShader,
      this.marineBedShader,
      this.marineMillworkShader
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
export default MarienBedShaderMaterials;
import * as THREE from 'three';

export class SwampShaderMaterials {
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
    this.customUniforms = this.params.customShaderUniforms;

    // Mouse Utils
    this.mouse = mouse;
    this.mousePosition = this.mouse;

    this.useBurningClouds();
    this.usePurpleSwampShader()
    this.useFernoBlazingShaders();
    this.useBurningCreekShader();
    this.updateEvents();
    this.getShaders();
  }

  useBurningClouds() {
    this.burningCloudShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.customUniforms }, 
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

        // Digit-based growth term
        float gt(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
        }

        float computeAbn(float sd, float pz) {
          return min(min(sd, sd), pz * sin(2.0));
        }
        
        float computeAtn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeReno(float sd, float abn, float posY, float pz) {
            return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAcn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAfn(float sd, float abn, float pz) {
            return atan(min(sd * fract(abn), sd), pz * sin(2.0));
        }
        
        float computeA(float posY, float atn) {
            return atan(posY, atn);
        }
        
        float computeB(float posY, float abn, float atn) {
            return atan(posY, abn * atn);
        }
        
        float computeBf(float posY, float abn, float atn) {
            return atan(posY, abn + atn);
        }
        
        vec3 burningClouds(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.y * sin(0.1 * time)-(r);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
          // sd /=shimmer-p.y;
          // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
          // r *= p.z;
      
          float abn = computeAbn(sd, p.z);
          float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
          float atm = computeAtn(sd, abn, pos.x, p.z);
          float reno = computeReno(sd, abn, pos.y, p.z);
          float acn = computeAcn(sd, abn, pos.y, p.z);
          float afn = computeAfn(sd, abn, p.z);
          float bch = (+1.+fract(reno));
      
          float a = computeA(pos.y, atn);
          float at = computeA(pos.y, atn );
          a =at;
          float b = computeB(pos.y, abn, atn);
          float bf = computeBf(pos.y, abn, atn);
      
          // a += a + p.z; 
          // float h = atan(pos.y,pos.x);
          float ab = cos(a*2.280)*( time); //-r;
          float abt = cos(a*tan(a)*4.968);
          vec2 sdr = vec2(0.0, p.z)-u;
          float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));
      
          float f = (ab*abt);
          f = sin(ab*abt)-r-abt;
          // f = stripe;
          // f = abs(cos(a*3.));
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe/f)*a*-r*a;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          f = abs(cos(a*2.)*sin(a*3.))*1.8+.1+stripe*tan(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          f *= time;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 waterBed = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // waterBed = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // waterBed /= electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          waterBed = fract(fract(sungreen*a/r));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 bedFire= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          waterBed += bedFire;

          // vec3 waterBed =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          float shadowFactor =0.01;
          float shadowRingSize = 2.0;
          waterBed *= bubbleTarget-(0.09 + (shadowRingSize*shadowFactor));
          return waterBed;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range

          vec3 clouds = burningClouds(uv);
          vec3 color = vec3(clouds);

          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(time));
            dist +=  absT;
            
            // Use the distance to influence the color (make mouse position cause a color shift)
            // color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            
            // Use distance to control the opacity
            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            
            // Optionally, add time-based animation for extra dynamics
            color /= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = vec3(clouds);
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.burningCloudsMaterial = new THREE.ShaderMaterial(this.burningCloudsShader);
  }

  usePurpleSwampShader() {
    this.purpleSwampShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.customUniforms }, 
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

        // Digit-based growth term
        float gt(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
        }

        float computeAbn(float sd, float pz) {
          return min(min(sd, sd), pz * sin(2.0));
        }
        
        float computeAtn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeReno(float sd, float abn, float posY, float pz) {
            return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAcn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAfn(float sd, float abn, float pz) {
            return atan(min(sd * fract(abn), sd), pz * sin(2.0));
        }
        
        float computeA(float posY, float atn) {
            return atan(posY, atn);
        }
        
        float computeB(float posY, float abn, float atn) {
            return atan(posY, abn * atn);
        }
        
        float computeBf(float posY, float abn, float atn) {
            return atan(posY, abn + atn);
        }
        

        vec3 driveCityParkway(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.y * sin(0.1 * time)-(r);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
          // sd /=shimmer-p.y;
          // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
          // r *= p.z;
      
          float abn = computeAbn(sd, p.z);
          float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
          float atm = computeAtn(sd, abn, pos.x, p.z);
          float reno = computeReno(sd, abn, pos.y, p.z);
          float acn = computeAcn(sd, abn, pos.y, p.z);
          float afn = computeAfn(sd, abn, p.z);
          float bch = (+1.+fract(reno));
      
          float a = computeA(pos.y, atn);
          float at = computeA(pos.y, atn );
          a =at;
          float b = computeB(a-pos.y, abn, atn);
          float bf = computeBf(pos.y, abn, atn);
      
          // a += a + p.z; 
          // float h = atan(pos.y,pos.x);
          float ab = (b)- cos(a*b*2.280)*( time); //-r;
          float abt = cos(a*tan(a)*4.968);
          vec2 sdr = vec2(0.0, p.z)-u;
          float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));
      
          float f = (ab*abt);
          f = sin(ab*abt)-r-abt;
          // f = stripe;
          // f = abs(cos(a*3.));
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe/f)*a*-r*a;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          f = abs(cos(a*2.)*sin(a*3.))*1.8+.1+stripe*tan(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          f *= time;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // pkwy = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy /= electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          pkwy /= fract(fract(sungreen*a/r));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          pkwy = skyview;
          // vec3 pkwy =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          float shadowFactor =0.01;
          float ringSize = 2.0;
          pkwy *= bubbleTarget-(0.09 + (ringSize*shadowFactor));
          return pkwy;
      }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          // uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 clouds = electricClouds(uv);
          vec3 color = vec3(clouds);

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
            color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = vec3(pkwy);
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.purpleSwampMaterial = new THREE.ShaderMaterial(this.purpleSwampShader);
  }

  useFernoBlazingShaders() {
    this.fernoBlazingShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.customUniforms }, 
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

        // Digit-based growth term
        float gt(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
        }

        float computeAbn(float sd, float pz) {
          return min(min(sd, sd), pz * sin(2.0));
        }
        
        float computeAtn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeReno(float sd, float abn, float posY, float pz) {
            return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAcn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAfn(float sd, float abn, float pz) {
            return atan(min(sd * fract(abn), sd), pz * sin(2.0));
        }
        
        float computeA(float posY, float atn) {
            return atan(posY, atn);
        }
        
        float computeB(float posY, float abn, float atn) {
            return atan(posY, abn * atn);
        }
        
        float computeBf(float posY, float abn, float atn) {
            return atan(posY, abn + atn);
        }

        vec3 fernoBlazingSwamp(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.x * sin(0.1 * time)-(r);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
          // sd /=shimmer-p.y;
          // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
          // r *= p.z;
      
          float abn = computeAbn(sd, p.z);
          float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
          float atm = computeAtn(sd, abn, pos.y, p.z);
          float reno = computeReno(sd, abn, pos.y, p.z);
          float acn = computeAcn(sd, abn, pos.y, p.z);
          float afn = computeAfn(sd, abn, p.z);
          float bch = (+1.+fract(reno));
      
          float a = computeA(pos.y, atn);
          float at = computeA(pos.y, atn );
          a =at;
          float b = computeB(pos.y, abn, atn);
          float bf = computeBf(pos.y, abn, atn);
      
          // a += a + p.z; 
          // float h = atan(pos.y,pos.x);
          float ab = cos(a*2.280)*( time); //-r;
          float abt = cos(a*tan(a)*4.968);
          vec2 sdr = vec2(0.0, p.z)-u;
          float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));
      
          float f = (ab*abt);
          f = sin(ab*abt)-r-abt;
          // f = stripe;
          // f = abs(cos(a*3.));
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe/f)*a*-r*a;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          f *= time+a*ab;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // pkwy = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy = electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          pkwy += fract(fract(sungreen*a/r));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy += skyview;
          // vec3 pkwy =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          float shadowFactor =0.01;
          float k = 2.0;
          pkwy *= bubbleTarget-(0.09 + (k*shadowFactor));
          return pkwy;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          // uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 swamp = fernoBlazingSwamp(uv);
          vec3 color = vec3(swamp);

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
            color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.fernoBlazingMaterial = new THREE.ShaderMaterial(this.fernoBlazingShader);
  }

  useBurningCreekShader() {
    this.burningCreekShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.customUniforms }, 
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

        // Digit-based growth term
        float gt(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
        }

        float computeAbn(float sd, float pz) {
          return min(min(sd, sd), pz * sin(2.0));
        }
        
        float computeAtn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeReno(float sd, float abn, float posY, float pz) {
            return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAcn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAfn(float sd, float abn, float pz) {
            return atan(min(sd * fract(abn), sd), pz * sin(2.0));
        }
        
        float computeA(float posY, float atn) {
            return atan(posY, atn);
        }
        
        float computeB(float posY, float abn, float atn) {
            return atan(posY, abn * atn);
        }
        
        float computeBf(float posY, float abn, float atn) {
            return atan(posY, abn + atn);
        }

        vec3 burningCreek(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.x * sin(0.1 * time)-(r);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
          // sd /=shimmer-p.y;
          // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
          // r *= p.z;
      
          float abn = computeAbn(sd, p.z);
          float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
          float atm = computeAtn(sd, abn, pos.y, p.z);
          float reno = computeReno(sd, abn, pos.y, p.z);
          float acn = computeAcn(sd, abn, pos.y, p.z);
          float afn = computeAfn(sd, abn, p.z);
          float bch = (+1.+fract(reno));
      
          float a = computeA(pos.y, atn);
          float at = computeA(pos.y, atn );
          a =at;
          float b = computeB(pos.y, abn, atn);
          float bf = computeBf(pos.y, abn, atn);
      
          // a += a + p.z; 
          // float h = atan(pos.y,pos.x);
          float ab = cos(a*2.280)*( time); //-r;
          float abt = cos(a*tan(a)*4.968);
          vec2 sdr = vec2(0.0, p.z)-u;
          float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));
      
          float f = (ab*abt);
          f = sin(ab*abt)-r-abt;
          // f = stripe;
          // f = abs(cos(a*3.));
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe/f)*a*-r*a;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          f = abs(cos(a*12.)*sin(a*3.))*1.8+.1+stripe*sin(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          f *= time;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 creek = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // creek = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // creek = electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          creek += fract(fract(sungreen*a/r));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // creek += skyview;
          // vec3 creek =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          float shadowFactor =0.01;
          float k = 2.0;
          creek *= bubbleTarget-(0.09 + (k*shadowFactor));
          return creek;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          // uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 creek = burningCreek(uv);
          vec3 color = vec3(creek);

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
            color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = vec3(pkwy);
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.burningCreekShader = new THREE.ShaderMaterial(this.burningCreekShader);
  }

  useDistortedFurnaceShader() {
    this.distortedFurnaceShader = {
      uniforms: {
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: new THREE.Vector2(this.width, this.height) },

        // 🌧️ Add new uniform for weather effect toggle // 0: clear, 1: rain, 2: flood, 3: storm etc.
        customUniforms: { value: this.customUniforms }, 
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

        // Digit-based growth term
        float gt(float n, float h, float p, float time) {
            float base = pow(10.0, -n); // Scale for target decimal
            float amp = base * p; // Positional influence
            float osc = base * sin(time * 2.0); // Oscillating offset
            return amp * pow(h * amp, time) + osc;
        }

        float randomOsc(float t, float freq, float seed) {
            return fract(sin(t * freq + seed) * 43758.5453);
        }

        float computeAbn(float sd, float pz) {
          return min(min(sd, sd), pz * sin(2.0));
        }
        
        float computeAtn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeReno(float sd, float abn, float posY, float pz) {
            return min(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAcn(float sd, float abn, float posY, float pz) {
            return atan(min(sd * abn, sd / abn), posY * pz * sin(2.0));
        }
        
        float computeAfn(float sd, float abn, float pz) {
            return atan(min(sd * fract(abn), sd), pz * sin(2.0));
        }
        
        float computeA(float posY, float atn) {
            return atan(posY, atn);
        }
        
        float computeB(float posY, float abn, float atn) {
            return atan(posY, abn * atn);
        }
        
        float computeBf(float posY, float abn, float atn) {
            return atan(posY, abn + atn);
        }

        vec3 distortedSwampFurnace(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.y * sin(0.1 * time)-(r);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
          // sd /=shimmer-p.y;
          // u.x += shimmer * smoothstep(0.0, 0.2, pos.y);
          // r *= p.z;
      
          float abn = computeAbn(sd, p.z);
          float atn = computeAtn(sd, abn, pos.y, ((pos.y) * p.z));
          float atm = computeAtn(sd, abn, pos.x, p.z);
          float reno = computeReno(sd, abn, pos.y, p.z);
          float acn = computeAcn(sd, abn, pos.y, p.z);
          float afn = computeAfn(sd, abn, p.z);
          float bch = (+1.+fract(reno));
      
          float a = computeA(pos.y, atn);
          float at = computeA(pos.y, atn );
          a =at;
          float b = computeB(a-pos.y, abn, atn);
          float bf = computeBf(pos.y, abn, atn);
      
          // a += a + p.z; 
          // float h = atan(pos.y,pos.x);
          float ab = (b)- cos(a*b*2.280)*( time); //-r;
          float abt = cos(a*tan(a)*4.968);
          vec2 sdr = vec2(0.0, p.z)-u;
          float stripe = sin(distance(sin(sdr.y * abt)*abt, p.z+2.*bf*12.));
      
          float f = (ab*abt);
          f = sin(ab*abt)-r-abt;
          // f = stripe;
          // f = abs(cos(a*3.));
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe/f)*a*-r*a;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          f = abs(cos(a*2.)*sin(a*3.))*1.8+.1+stripe*tan(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
          f *= time;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 swampFurnace = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // swampFurnace = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // swampFurnace /= electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          swampFurnace /= fract(fract(sungreen*a/r));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          swampFurnace = skyview;
          // vec3 swampFurnace =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          float shadowFactor =0.01;
          float ringSize = 2.0;
          swampFurnace *= bubbleTarget-(0.09 + (ringSize*shadowFactor));
          return swampFurnace;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = fragCoord / resolution; // Proper UV mapping
          // uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 furnace = distortedSwampFurnace(uv);
          vec3 color = vec3(furnace);

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
            color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = vec3(pkwy);
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
        
      `
    };

    this.distortedFurnaceMaterial = new THREE.ShaderMaterial(this.distortedFurnaceShader);
  }

  getShaders() {
    this.shaders = [
      this.purpleSwampShader,
      this.burningCloudShader,
      this.fernoBlazingShader, 
      this.burningCreekShader,
      this.distortedFurnaceShader
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
  

  updateShaderUniforms(meshObj, collisionPoint = null) {
    const material = meshObj.material;
    if (!material?.uniforms?.customUniforms?.value) return;

    const u = material.uniforms.customUniforms.value;
    const now = performance.now();
    const cooldownMs = 300;

    const position = collisionPoint || meshObj.position;

    if (u.u_meshPosition?.set) {
        u.u_meshPosition.set(position.x, position.y, position.z);
    }

    if (u.u_velocity?.set) {
        u.u_velocity.set(meshObj.velocity.x, meshObj.velocity.y, meshObj.velocity.z);
    }

    if (u.u_rippleOrigin?.set) {
        u.u_rippleOrigin.set(position.x, position.y, position.z);
    }

    if (u.u_intersectionPoint?.set) {
        u.u_intersectionPoint.set(position.x, position.y, position.z);
    }

    if (typeof u.u_rippleTime !== 'undefined') {
        u.u_rippleTime = now * 0.001;
    }

    if (typeof u.u_collisionDetected !== 'undefined') {
        u.u_collisionDetected = 1.0;

        const id = meshObj.uuid || meshObj.id;
        if (this.rippleCooldowns.has(id)) clearTimeout(this.rippleCooldowns.get(id));

        const timeoutId = setTimeout(() => {
            if (typeof u.u_collisionDetected !== 'undefined') {
                u.u_collisionDetected = 0.0;
            }
            this.rippleCooldowns.delete(id);
        }, cooldownMs);

        this.rippleCooldowns.set(id, timeoutId);
    }
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
export default SwampShaderMaterials;
import * as THREE from 'three';

export class GrailShaderMaterials {
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

    this.useHolyGrailShaders();
    this.useMagnetoShader();
    this.useFernoBubblesShader()
    this.updateEvents();
    this.getShaders();
  }

  useHolyGrailShaders() {
    this.holyGrailShader = {
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

        vec3 fortressMansion(vec2 u){
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.x * sin(0.1 * time);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
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
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe)*a*-r;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      
          float renodrive = 1.-smoothstep(f,f+0.02,r) ;
          float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
      
          // Optional: depth fade
          float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
          
          vec3 grail = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // grail = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // grail = electricCloud;
          vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          grail += fract(fract(sungreen*a));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // grail += skyview;
          // vec3 grail =vec3(renodrive);
          grail *= fract(sin(sun));
          return grail;
        }

        void main() {
          // UV Mapping
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 uv = (fragCoord / 6.0)/ resolution; // Proper UV mapping
          // uv.x *= resolution.x / resolution.y;

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 grail = fortressMansion(uv);
          vec3 color = grail;

          // // Check if hovered is active or not
          // if (hovered > 0.0) {
          //   // Mouse is hovering, apply mouse interaction effects
          //   float dist = distance(mouse, uv);
          //   float absT =  abs(sin(time));
          //   // dist +=  absT;
            
            
          //   // Use the distance to influence the color (make mouse position cause a color shift)
          //   color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            
          //   // Use distance to control the opacity
          //   float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            
          //   // Optionally, add time-based animation for extra dynamics
          //   color += 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
        
          //   gl_FragColor = vec4(color, opacity);
          // } else {
          //   // Mouse is not hovering, apply default effect based on UV coordinates and distance
          //   float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

          //   color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
          //   color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
          //   float opacity = smoothstep(0.6, 0.8, 1.0);
          //   gl_FragColor = vec4(color, opacity); // Default behavior
          // }
        color = vec3(grail);
        gl_FragColor = vec4(color, 1.0);
        }
      `
    };
    
    this.wiredHolyGrailMaterial = new THREE.ShaderMaterial({
      uniforms: this.holyGrailShader.uniforms,
      vertexShader: this.holyGrailShader.vertexShader,
      fragmentShader: this.holyGrailShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.holyGrailMaterial = new THREE.ShaderMaterial(this.holyGrailShader);
  }

  useMagnetoShader() {
    this.magnetoShader = {
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

        vec3 magneto(vec2 u){
            vec2 pos = vec2(0.5)-u;
            vec3 p = vec3(-90.0+time);
        
            float r = length(pos)*2.0;
            float rp =length(p)*2.0;
            float sd = pos.x * sin(0.1 * time);
            float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
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
            // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe)*a*-r;
            // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
            // f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
            // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
        
            float renodrive = 1.-smoothstep(f,f+0.02,r) ;
            float lampdrive = 1.-smoothstep(a+time,f*renodrive+0.02,r-a) ;
        
            // Optional: depth fade
            float sun = exp(-r * 1.5*b); /// This has added a beautiful glowing SUN 
            
            vec3 riverBed = vec3(renodrive*time, lampdrive, 0.0+a+sin(a*p.z));
            vec3 color =vec3(renodrive);
            color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
            // riverBed = vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
            vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
            // riverBed = electricCloud;
            vec3 sungreen = vec3((a*f)+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
            
            riverBed += cos(fract(sungreen*a));
            // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                        
            vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
            // riverBed += skyview;
           // vec3 riverBed =vec3(renodrive);
            riverBed *= fract(sun)/stripe;
            return riverBed;
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

    this.wiredMagnetoMaterial = new THREE.ShaderMaterial({
      uniforms: this.magnetoShader.uniforms,
      vertexShader: this.magnetoShader.vertexShader,
      fragmentShader: this.magnetoShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.magnetoMaterial = new THREE.ShaderMaterial(this.magnetoShader);
  }

  useFernoBubblesShader() {
    this.fernoBubblesShader = {
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

        vec3 fernoBubbles(vec2 u){
          float time = u_time;
          vec2 pos = vec2(0.5)-u;
          vec3 p = vec3(-90.0+time);
      
          float r = length(pos)*2.0;
          float rp =length(p)*2.0;
          float sd = pos.x * sin(0.1 * time);
          float shimmer = sin(pos.y* 40.0 + time * 8.0)*0.005;
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
          // f = abs(cos(abt*a*2.5))*.5+.3*sin(time+stripe)*a*-r;
          // f = abs(cos(a*2.5*time))*.5+.3*fract(stripe*afn)*-r;
          // f = abs(cos(a*12.)*sin(a*3.))*.8+.1+stripe*cos(bf+8.)-r;
          // f = smoothstep(-.5,1., cos(a*10.))*0.2+0.5;
      
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
          
          pkwy += fract(fract(sungreen*a));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy += skyview;
          // vec3 pkwy =vec3(renodrive);
          float bubbleTarget = fract(fract(sin(sun)-r)-r+time);
          pkwy *= fract(fract(sin(sun)-r)-r+time);
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

          vec3 clouds = fernoBubbles(uv);
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

    this.wiredFernoBubblesMaterial = new THREE.ShaderMaterial({
      uniforms: this.fernoBubblesShader.uniforms,
      vertexShader: this.fernoBubblesShader.vertexShader,
      fragmentShader: this.fernoBubblesShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.fernoBubblesMaterial = new THREE.ShaderMaterial(this.fernoBubblesShader);
  }

  getShaders() {
    this.shaders = [
      this.holyGrailShader, 
      this.magnetoShader,
      this.fernoBubblesShader,
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
      if (uniforms.explodeIntensity) uniforms.explodeIntensity.value = Math.sin(this.explodeIntensity + this.time);
      if (uniforms.shapeFactor) uniforms.shapeFactor.value = this.shapeFactor + (this.time * Math.sin(0.001 + this.time));
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
        shader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
        shader.uniforms.sineTime.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
        shader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
      }
    });
  }
}
export default GrailShaderMaterials;
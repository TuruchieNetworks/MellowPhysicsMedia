import * as THREE from 'three';

export class ParkCityShaderMaterials {
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

    this.useBlueSkyShaders();
    this.useSwampHighwayShaders();
    this.useFortressMansionShaders();
    this.useElectricCloudShader();
    this.updateEvents();
    this.getShaders();
  }

  useBlueSkyShaders() {
    this.blueSkyShader = {
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

        
        vec3 blueSkyCity(vec2 u){
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
          pkwy += vec3(f*abn+renodrive*time, lampdrive*a*cos((reno*cos(abn*ab)*abn/a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy += electricCloud;
          vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          pkwy =sungreen;
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy += skyview;
          // vec3 pkwy =vec3(renodrive);
          pkwy *= sun;
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

          vec3 clouds = blueSkyCity(uv);
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

    this.blueSkyMaterial = new THREE.ShaderMaterial(this.blueSkyShader);
  }

  useElectricCloudShader() {
    this.electricCloudShader = {
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
        uniform float zoom;
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

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
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

        vec3 electricClouds(vec2 u) {
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
          f = sin(ab*abt);
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
          
          vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0);
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // pkwy = vec3(f+renodrive*time, lampdrive*a*cos((reno*(abn*ab)*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          pkwy = electricCloud;
          // vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          // vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 pkwy =vec3(renodrive);
          pkwy *= sun;
          return pkwy;
        }

        void main() {
          // UV Mapping
          // vec2 uv = computeAspectRatio(vUv, resolution);
          // uv = uv * (2.5 + 2.5);
          // vec2 bigFrag = gl_FragCoord.xy;
          // bigFrag *= 4.;
          // vec2 uv = bigFrag/resolution;

          vec2 fragCoord = gl_FragCoord.xy;
          fragCoord /= 4.0;
          vec2 uv = fragCoord / resolution;
          uv = uv * (4.0 + 4.0);
          
          // vec2 uv = fragCoord / resolution; // Proper UV mapping
          // uv = uv * 2.0 - 1.0; // convert to [-1, 1]
          // uv.x *= resolution.x / resolution.y;
          // vec2 uv = (2.0 * gl_FragCoord.xy - resolution.xy) / resolution.y;
          // uv = uv * 2.0 - 1.0; // convert to [-1, 1]

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 clouds = electricClouds(uv);
          vec3 color = clouds;

          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(time));
            // dist +=  absT;
            color = clouds;

            // color = mix(
            //   clouds * dist*time,
            //   color + dist,
            //   smoothstep(
            //     absT, 
            //     atan(
            //       absT,
            //       clouds.z
            //     ),
            //     sin(clouds.x  * time)
            //   )
            // );
 
            // Optionally, add time-based animation for extra dynamics
            vec3 blur = vec3(1.0 - dist, 1.0 - dist, 1.0); // Makes the area closer to the mouse lighter (for visible effect)
            float glaze = 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            color *= glaze;

            // vec3 glazeCoat = mix(color, min(blur*color, glaze * clouds), atan(glaze*blur.x, blur.z+color.z+time) );
            // // Use distance to control the opacity

            float opacity = smoothstep(0.0, 0.5, dist); // Opacity decreases with distance from the mouse position
            color += blur * clouds;

            // Use the distance to influence the color (make mouse position cause a color shift)
  
            gl_FragColor = vec4(color, opacity);
          } else {
            // Mouse is not hovering, apply default effect based on UV coordinates and distance
            float dist = distance(uv, vec2(0.5, 0.5)); // Default base distance, could be replaced with your original calculation

            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring
            color = clouds;
            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
          // gl_FragColor = vec4(uv, 0.5 + 0.5*sin(time), 1.0);
        }
        
      `
    };
 
    this.wiredElectricCloudMaterial = new THREE.ShaderMaterial({
      uniforms: this.electricCloudShader.uniforms,
      vertexShader: this.electricCloudShader.vertexShader,
      fragmentShader: this.electricCloudShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.electricCloudMaterial = new THREE.ShaderMaterial(this.electricCloudShader);
  }

  useSwampHighwayShaders() {
    this.swampHighwayShader = {
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

        vec3 swampHighway(vec2 u)
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
          // vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // pkwy = electricCloud;
          vec3 mirage = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          pkwy = mirage;
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 pkwy =vec3(renodrive);
          pkwy *= sun;
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

    this.wiredSwampHighwayMaterial = new THREE.ShaderMaterial({
      uniforms: this.swampHighwayShader.uniforms,
      vertexShader: this.swampHighwayShader.vertexShader,
      fragmentShader: this.swampHighwayShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.swampHighwayMaterial = new THREE.ShaderMaterial(this.swampHighwayShader);
  }

  useFortressMansionShaders() {
    // const resolution = new THREE.Vector2(width, height);
  
    this.fortressMansionShader = {
      uniforms: {
        zoom: { value: 3.6 } ,
        hovered: { value: this.hovered },
        sineTime: { value: this.sineTime },
        shapeFactor: { value: this.shapeFactor },
        time: { value: this.clock.getElapsedTime() },
        mousePosition: { value: this.mousePosition },
        explodeIntensity: { value: this.explodeIntensity },
        resolution: { value: this.resolution },
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

        vec2 computeAspectRatio(vec2 vUv, vec2 resolution) {
          float aspectRatio = resolution.x / resolution.y;
          return (vUv - 0.5) * vec2(aspectRatio, 1.0);
        }
      
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

        vec3 fortressMansions(vec2 u){
          vec2 pos = vec2(2.)-u;
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
          f = sin(ab*abt);
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
          
          vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0);
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          pkwy = vec3(f+renodrive*time, lampdrive*a*cos((reno*(abn*ab)*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          // vec3 tunnel = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 pkwy =vec3(renodrive);
          pkwy *= sun;
          return pkwy;
        }

        vec3 fortressMansion(vec2 u) {
          vec2 pos = vec2( 0.5)-(u);
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
          f = sin(ab*abt);
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
          
          vec3 pkwy = vec3(renodrive*time, lampdrive, 0.0);
          vec3 color =vec3(renodrive);
          color = mix(color, vec3(f*time, (bf-r), 0.0), ab*abt)  ;
          // pkwy = vec3(f+renodrive*time, lampdrive*a*cos((reno*(abn*ab)*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          
          vec3 electricCloud = vec3(f+renodrive*time, lampdrive*a*cos((reno*time)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          pkwy = electricCloud;
          // vec3 sungreen = vec3(f+renodrive*time, lampdrive*a*cos((reno*a)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 ivy = vec3(f+renodrive*time, lampdrive*a*cos((reno*ab)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
                    
          // vec3 skyview= vec3(f+renodrive*time, lampdrive*a*cos((reno*abn)), lampdrive*cos(a*sin(a*cos(a*0.011111*time))));
          // vec3 pkwy =vec3(renodrive);
          pkwy *= sun;
          return pkwy;
        }

        // vec2 bgRes = resolution;
        // vec2 bgFrg = gl_FragCoord.xy;
        // bgFrg *= 18.0;
        // bgRes /= 8.0;
        // uv.x *= resolution.x / resolution.y;
        // vec2 uv = (gl_FragCoord.xy * 4. )/ resolution.xy;
        // // uv = computeAspectRatio(vUv, resolution);
        // uv = (( 3.6 * gl_FragCoord.xy )- resolution.xy) / resolution.y;
        // uv = uv / 2.0 + 1.0;//1250;
          // vec2 uv = (( fragCoord.xy) - resolution.xy) / (resolution.y);

        void main() {
          // UV Mapping
          vec2 uv = computeAspectRatio(vUv, resolution);
          uv = uv * (2.5 + 2.5);
          uv.x *= resolution.x / resolution.y;
          // vec2 fragCoord = gl_FragCoord.xy;
          // fragCoord *=  5.0; 
          // vec2 uv = fragCoord / resolution;
          // uv = uv * (5.0 + 5.0);

          vec3 grail = fortressMansion(uv );

          // Normalize Mouse normalized to same space (assuming it's passed in already as [0, res])
          vec2 mouse = (mousePosition * 2.0 - 1.0); // Convert to [-1, 1] range
          // vec2 mouseUV = mousePosition / resolution;

          vec3 color = grail;
          gl_FragColor = vec4(color, 1.0); // Default behavior
          // Check if hovered is active or not
          if (hovered > 0.0) {
            // Mouse is hovering, apply mouse interaction effects
            float dist = distance(mouse, uv);
            float absT =  abs(sin(time));
            // dist +=  absT;
            color = grail;

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
            color += grail;
            color += vec3(1.0 - dist, 1.0 - dist, 1.0); // Use original UV-distance-based coloring

            color *= 0.5 + 0.5 * sin(time + dist * 10.0); // Add a dynamic oscillating effect based on distance and time
            float opacity = smoothstep(0.6, 0.8, 1.0);
            gl_FragColor = vec4(color, opacity); // Default behavior
          }
        }
      `
    };
    
    this.wiredFortressMansionMaterial = new THREE.ShaderMaterial({
      uniforms: this.fortressMansionShader.uniforms,
      vertexShader: this.fortressMansionShader.vertexShader,
      fragmentShader: this.fortressMansionShader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    });
    this.fortressMansionMaterial = new THREE.ShaderMaterial(this.fortressMansionShader);
  }

  getShaders() {
    this.shaders = [
      this.blueSkyShader, 
      this.fortressMansionShader, 
      this.swampHighwayShader, 
      this.electricCloudShader
    ];
  }

  updateResolution(shader, width, height) {
    if (!shader || !shader.uniforms) return;  // Guard clause in case shader or uniforms are not available
    
    // Ensure resolution is available before updating
    const { resolution } = shader.uniforms;
    if (resolution && resolution.value) {
      resolution.value.set(width, height);
    } else {
      console.warn("Shader is missing resolution uniform");
    }
  }
  
  handleResize(width = window.innerWidth, height = window.innerHeight) {
    // Check if shaders array is populated
    if (!Array.isArray(this.shaders) || this.shaders.length === 0) {
      console.warn("No shaders available to update");
      return;
    }
  
    // Iterate over shaders and update resolution
    this.shaders.forEach((shader, index) => {
      if (shader) {
        this.updateResolution(shader, width, height);
      } else {
        console.warn(`Shader at index ${index} is undefined or null`);
      }
    });
  }

  // updateResolution(shader, width, height) {
  //   if (shader && shader.uniforms && shader.uniforms.resolution) {
  //     shader.uniforms.resolution.value.set(width, height);
  //   }
  // }

  // handleResize(width = window.innerWidth, height = window.innerHeight) {
  //   // Each shader handles its own resolution updates
  //   this.shaders.forEach(shader => {if (shader) this.updateResolution(shader, width, height)});
  // }
  
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
export default ParkCityShaderMaterials;

// Update other uniforms if necessary
// if (this.fortressMansionShader) {
//   this.fortressMansionShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
//   // this.fortressMansionShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
//   this.fortressMansionShader.uniforms.time.value =  this.time; //+Date.now();
//   this.fortressMansionShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
// }

// // Update other uniforms if necessary
// if (this.fortressMansionShader) {
//   this.fortressMansionShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
//   // this.fortressMansionShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
//   this.fortressMansionShader.uniforms.time.value =  this.time; //+Date.now();
//   this.fortressMansionShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
// }

// if (this.electricCloudShader) {
//   this.electricCloudShader.uniforms.shapeFactor.value = this.time * Math.sin(0.001 + this.time);
//   this.electricCloudShader.uniforms.time.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
//   this.electricCloudShader.uniforms.explodeIntensity.value = (Math.sin(this.time) * 0.5) + 0.5 + Math.cos(0.1 + this.time);
// }
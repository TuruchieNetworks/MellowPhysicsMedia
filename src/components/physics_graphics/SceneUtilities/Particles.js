import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Particles {
    constructor(scene, world, shaderManager, mouseUtil, textureLoader, texturedMaterials, texturedShaderMaterial, particleCount = 100) {
        this.scene = scene;
        this.world = world;
        this.mouseUtil = mouseUtil;
        this.textureLoader = textureLoader;
        this.shaderManager = shaderManager;
        this.particleCount = particleCount;
        this.texturedMaterials = texturedMaterials;
        this.texturedShaderMaterial = texturedShaderMaterial;
        this.defaultShaderMaterial = this.shaderManager.convolutionMaterial;

        // Initialize ImageUtils and raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Initializes an empty array to hold the particle meshes
        this.particleMeshes = [];
        this.particleBodies = [];

        this.particleMeshes = [];
        this.particleBodies = [];

        // Initializes an empty array to hold the Cannon.js bodies for particles
        this.noiseParticleMeshes = [];
        this.noiseParticleBodies = [];

        this.ghostParticleMeshes = [];
        this.ghostParticleBodies = [];

    }

    randomHexColor() {
        return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }

    createRandomPoints() {
        const x = (Math.random() - 0.5) * 10;
        const y = Math.random() * 10 + 10;
        const z = (Math.random() - 0.5) * 10;
        return { x, y, z }
    }

    addRandomForce() {
        const randomForce = new CANNON.Vec3(
            Math.random() * 5 - 2.5,
            Math.random() * 5 + 10,
            Math.random() * 5 - 2.5
        );

        return randomForce;
    }

    createParticles(radius = 1.6, mass = 13.1, sleepSpeedLimit = 3.1, sleepTimeLimit = 3, linearDamping = 0.1, particleCount = this.particleCount) {   
        let mat;
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        for (let i = 0; i < particleCount; i++) {
          if (i % 2 === 0) {
            mat = this.shaderManager.tubeCityMaterial;
          } else {
            mat = this.texturedShaderMaterial;
          }
    
          // Create Mesh For Particle
          const particle = new THREE.Mesh(geo, mat);
          const pos = this.createRandomPoints();
          particle.position.set(pos.x, pos.y, pos.z);
          particle.castShadow = true;
          particle.receiveShadow = true;
    
          // Add Particle To Scene and Store for Physics
          this.scene.add(particle);
          this.particleMeshes.push(particle);
    
          // Cannon.js body for physics
          const shape = new CANNON.Sphere(radius);
          const body = new CANNON.Body({
            mass,
            position: new CANNON.Vec3(particle.position.x, particle.position.y, particle.position.z),
            allowSleep: true,  // Allow particles to sleep when at rest
            sleepSpeedLimit,// Lower speed threshold for sleeping
            sleepTimeLimit, // Time required to enter sleep state
            linearDamping, // Reduced damping for more natural fall
          });
    
          // Include Random Force And Add Shape
          const randomForce = this.createRandomPoints();
          body.applyForce(randomForce, body.position);
          body.addShape(shape);
    
          // Add Body To World
          this.world.addBody(body);
          this.particleBodies.push(body);
        }
    }

    createTexturedParticles(radius = 1.6, mass = 13.1, sleepSpeedLimit = 3.1, sleepTimeLimit = 3, linearDamping = 0.1, particleCount = this.particleCount) {   
        let mat;
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        for (let i = 0; i < particleCount; i++) {
          if (i % 2 === 0) {
            const randomIdx = Math.floor(Math.random() * this.texturedMaterials.length);
            mat = this.texturedMaterials[randomIdx]
          } else {
            mat = this.texturedShaderMaterial;
          }
    
          // Create Mesh For Particle
          const particle = new THREE.Mesh(geo, mat);
          const pos = this.createRandomPoints();
          particle.position.set(pos.x, pos.y, pos.z);
          particle.castShadow = true;
          particle.receiveShadow = true;
    
          // Add Particle To Scene and Store for Physics
          this.scene.add(particle);
          this.particleMeshes.push(particle);
    
          // Cannon.js body for physics
          const shape = new CANNON.Sphere(radius);
          const body = new CANNON.Body({
            mass,
            position: new CANNON.Vec3(particle.position.x, particle.position.y, particle.position.z),
            allowSleep: true,  // Allow particles to sleep when at rest
            sleepSpeedLimit,// Lower speed threshold for sleeping
            sleepTimeLimit, // Time required to enter sleep state
            linearDamping, // Reduced damping for more natural fall
          });
    
          // Include Random Force And Add Shape
          const randomForce = this.createRandomPoints();
          body.applyForce(randomForce, body.position);
          body.addShape(shape);
    
          // Add Body To World
          this.world.addBody(body);
          this.particleBodies.push(body);
        }
    }
    // createColoredParticles(count = this.particleCount, radius = 0.2) {
    //     let mat;
    //     const geo = new THREE.SphereGeometry(radius, 16, 16);
    //     for (let i = 0; i < count; i++) {
    //         // Create Three.js mesh
    //         if (i % 3 === 0) {
    //             mat = new THREE.MeshStandardMaterial({ color: this.randomHexColor() });
    //         } else if (i % 3 === 1) {
    //             mat = this.shaderManager.sawMaterial;
    //         } else if (i % 3 === 2) {
    //             // material = shaderManager.explosiveMaterial;
    //             mat = this.shaderManager.wrinkledMaterial;
    //         }

    //         const particle = new THREE.Mesh(geo, mat);
    //         particle.castShadow = true;
    //         particle.receiveShadow = true;

    //         // Set random position
    //         const pos = this.createRandomPoints();
    //         particle.position.set(pos.x, pos.y, pos.z);

    //         this.scene.add(particle);
    //         this.particleMeshes.push(particle);

    //         // Create Cannon.js body
    //         const shape = new CANNON.Sphere(radius);
    //         const body = new CANNON.Body({
    //             mass: 0.5, // Adjust mass for better fall behavior
    //             position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
    //             allowSleep: true,
    //             sleepSpeedLimit: 1.0,  // Adjust sleeping speed
    //             sleepTimeLimit: 5,    // 1; // Allow sleep to take a bit longer
    //             linearDamping: 0.1, // Reduced damping for more natural fall
    //         });

    //         // Add Random Force
    //         const randomForce = this.addRandomForce();
    //         body.applyForce(randomForce, body.position);
    //         body.addShape(shape);

    //         this.particleBodies.push(body);
    //         this.world.addBody(body);
    //     }
    // }

    // Method to create the particles
    createNoiseParticles(count = this.particleCount, radius = 1.6, material = this.shaderManager.terrainCityMaterial, defMat = this.defaultShaderMaterial) {
        let mat;
        const geo = new THREE.SphereGeometry(radius, 16, 16);
        for (let i = 0; i < count; i++) {
            // Create Three.js particle
            i % 2 === 0 ?
                mat = defMat :
                mat = material;

            const particle = new THREE.Mesh(geo, mat);
            particle.castShadow = true;
            particle.receiveShadow = true;

            // Set random position
            const pos = this.createRandomPoints();
            particle.position.set(pos.x, pos.y, pos.z);

            this.scene.add(particle);
            this.noiseParticleMeshes.push(particle);

            // Create Cannon.js body
            const shape = new CANNON.Sphere(radius);
            const body = new CANNON.Body({
                mass: 13.1,
                position: new CANNON.Vec3(particle.position.x, particle.position.y, particle.position.z),
                allowSleep: true,
                sleepSpeedLimit: 1.0,  // Adjust sleeping speed
                sleepTimeLimit: 5,    // 1; // Allow sleep to take a bit longer
                linearDamping: 0.1, // Reduced damping for more natural fall
            });

            // Add Random Force
            const randomForce = this.addRandomForce();
            body.applyForce(randomForce, body.position);
            body.addShape(shape);

            // Add the particle body to the world
            this.world.addBody(body);
            this.noiseParticleBodies.push(body);
        }
    }

    // Method to create the particles
    createGhostParticles(count = this.particleCount, radius = 1.6, material = this.shaderManager.tunnelCityMaterial) {
        let mat;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        for (let i = 0; i < count; i++) {
            i % 2 === 0 ?
                mat = this.defaultShaderMaterial :
                mat = material;

            const mesh = new THREE.Mesh(geometry, mat);
            mesh.castShadow = true;

            const pos = this.createRandomPoints();

            // Set random position
            mesh.position.set(pos.x, pos.y, pos.z);

            // Add particle mesh to the scene
            this.scene.add(mesh);
            this.ghostParticleMeshes.push(mesh);

            // Create Cannon.js physics body
            const shape = new CANNON.Sphere(1.6);
            const body = new CANNON.Body({
                mass: 13.1,
                position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
                allowSleep: true,  // Allow particles to sleep when at rest
                sleepSpeedLimit: 3.1, // Lower speed threshold for sleeping
                sleepTimeLimit: 3,  // Time required to enter sleep state
            });

            body.addShape(shape);

            // Add the particle body to the world
            this.world.addBody(body);
            this.ghostParticleBodies.push(body);
        }
    }

    // Call this method to initialize raycast listeners
    enableRaycast() {
        window.addEventListener('click', this.onMouseClick, false);
        window.addEventListener('mousemove', this.onMouseMove, false); // Add mousemove event listener
    }

    // Call this method to disable raycast listeners (e.g., on cleanup)
    disableRaycast() {
        window.removeEventListener('click', this.onMouseClick, false);
        window.removeEventListener('mousemove', this.onMouseMove, false); // Remove mousemove event listener
    }

    // Helper method for setting up raycaster
    setRaycasterFromMouse(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    // Handle mouse move to change cursor style and material
    onMouseMove(event) {
        this.setRaycasterFromMouse(event);

        const intersects = this.raycaster.intersectObjects(this.scene.children);
        if (intersects.length > 0 && intersects[0].object.userData.clickable) {
            document.body.style.cursor = 'pointer';

            // Check if textMesh exists and has a material before setting it
            if (this.textMesh && this.textMesh.material !== this.shaderManager.noiseMaterial) {
                this.textMesh.material = this.shaderManager.noiseMaterial;
            }
        } else {
            document.body.style.cursor = 'default';
            if (this.textMesh) {
                this.textMesh.material = new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.textureURL) });
            }
        }
    }

    // Helper Method to update mesh and body
    updateBodyAndMeshWithPhysics(mesh, body) {
        if (mesh && body) {
            mesh.position.copy(body.position);
            mesh.quaternion.copy(body.quaternion);
        }
    }

    // Main standalone method to update meshes and bodies
    updateAllBodiesAndMeshesWithPhysics(meshes, bodies) {
        if (meshes && bodies) {
            meshes.forEach((mesh, index) => {
                const body = bodies[index];
                if (body) {
                    this.updateBodyAndMeshWithPhysics(mesh, body)
                } else {
                    console.warn(`Cannon body not found for mesh at index ${index}`);
                };
            });
        }
    }

    updateParticles() {
        if (this.particleMeshes.length > 0 && this.particleBodies.length > 0) {
            this.particleMeshes.forEach((mesh, i) => {
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
                mesh.rotation.z += 0.2;
                const body = this.particleBodies[i]; // Get the corresponding Cannon body
                body ?
                    this.updateBodyAndMeshWithPhysics(mesh, body) :
                    console.warn(`Cannon body not found for mesh at index ${i}`);
            });
        } else {
            console.warn("Mismatch in the number of particle meshes and particle bodies");
        }
    }

    updateNoiseParticles() {
        if (this.noiseParticles.length > 0 && this.noiseParticleBodies.length > 0) {
            this.noiseParticles.forEach((mesh, i) => {
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
                mesh.rotation.z += 0.2;
                const body = this.noiseParticleBodies[i]; // Fixed reference
                body ?
                    this.updateBodyAndMeshWithPhysics(mesh, body) :
                    console.warn(`Cannon body not found for noise particle at index ${i}`);
            });
        } else {
            console.warn("Mismatch in the number of noise particle meshes and noise particle bodies");
        }
    }

    updateGhostParticles() {
        if (this.ghostParticles.length > 0 && this.ghostParticleBodies.length > 0) {
            this.ghostParticles.forEach((mesh, i) => {
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
                mesh.rotation.z += 0.2;
                const body = this.ghostParticleBodies[i]; // Fixed reference
                body ?
                    this.updateBodyAndMeshWithPhysics(mesh, body) :
                    console.warn(`Cannon body not found for ghost particle at index ${i}`);
            });
        } else {
            console.warn("Mismatch in the number of ghost particle meshes and ghost particle bodies");
        }
    }

    // update() {
    //     if (this.particleMeshes.length > 0) this.updateParticles();
    //     if (this.noiseParticleMeshes.length > 0) this.updateNoiseParticles();
    //     if (this.ghostParticleMeshes.length > 0) this.updateGhostParticles();
    // }
    update() {
        if (Array.isArray(this.particleMeshes) && this.particleMeshes.length > 0) this.updateParticles();
        if (Array.isArray(this.noiseParticleMeshes) && this.noiseParticleMeshes.length > 0) this.updateNoiseParticles();
        if (Array.isArray(this.ghostParticleMeshes) && this.ghostParticleMeshes.length > 0) this.updateGhostParticles();
    }

    // Cleanup method to remove all particles and bodies from the scene and world
    dispose() {
        try {
            // Remove sand particles and their Cannon bodies
            if (this.particleMeshes && this.particleMeshes.length) {
                this.particleMeshes.forEach((mesh) => {
                    this.scene.remove(mesh);
                    if (mesh.material) mesh.material.dispose();  // Dispose material if present
                    if (mesh.geometry) mesh.geometry.dispose(); // Dispose geometry if present
                });
            }
            if (this.particleBodies && this.particleBodies.length) {
                this.particleBodies.forEach((body) => this.world.removeBody(body));
            }

            // Remove ghost particles and their Cannon bodies
            if (this.ghostParticleMeshes && this.ghostParticleMeshes.length) {
                this.ghostParticleMeshes.forEach((mesh) => {
                    this.scene.remove(mesh);
                    if (mesh.material) mesh.material.dispose();
                    if (mesh.geometry) mesh.geometry.dispose();
                });
            }
            if (this.ghostParticleBodies && this.ghostParticleBodies.length) {
                this.ghostParticleBodies.forEach((body) => this.world.removeBody(body));
            }

            // Dispose of materials and geometries for noise particles if needed
            if (this.noiseParticleMeshes && this.noiseParticleMeshes.length) {
                this.noiseParticleMeshes.forEach((mesh) => {
                    mesh.geometry.dispose();
                    mesh.material.dispose();
                });
            }
            if (this.noiseParticleBodies && this.noiseParticleBodies.length) {
                this.noiseParticleBodies.forEach((body) => this.world.removeBody(body));
            }
        } catch (error) {
            console.error("Error during disposal:", error);
        }
    }
}

export default Particles;

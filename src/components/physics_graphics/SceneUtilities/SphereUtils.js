import * as THREE from 'three';
import * as CANNON from "cannon-es";


class SphereUtils {
    constructor(scene, world, textureLoader, texturedMaterials, mouseUtils, imageUtils, shaderManager, physicsEngine, gaussianDistribution, mat = null, sceneMeshes, boundaryObj) {
        this.scene = scene;
        this.world = world;
        this.physics = physicsEngine;
        this.imageUtils = imageUtils;
        this.mouseUtils = mouseUtils;
        this.textureLoader = textureLoader;
        this.shaderManager = shaderManager;
        this.texturedMaterials = texturedMaterials;
        this.gaussianDistribution = gaussianDistribution;
        this.boundaryObj = boundaryObj;
        this.mat = mat;

        // Intersection, raycasting, and hover preview
        this.mouse = this.mouseUtils.mouse;
        this.camera = this.mouseUtils.camera;
        this.rayCaster = this.mouseUtils.rayCaster;
        this.planeNormal = this.mouseUtils.planeNormal;
        this.intersectionPlane = this.mouseUtils.intersectionPlane;
        this.intersectionPoint = this.mouseUtils.intersectionPoint;
        this.gravityEnabled = this.physics.gravityEnabled;
        this.gravity = this.physics.gravity;
        this.sceneMeshes = sceneMeshes;

        // Spheres and animations
        this.spheres = [];
        this.geometries = [];
        this.sphereCanonMeshes = [];
        this.sphereBodies = [];

        // Target Controls
        this.previewSphere = this.createPreviewSphere();
        this.scene.add(this.previewSphere);

        // Events and Controls
        this.updateEvents();
        this.controlBtns(this.shaderManager, this.physics);
    }

    createRandomHexColor = () => {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    createCannonSphere(specs = { r: 4, w: 50, h: 50 }, color = this.createRandomHexColor(), position = { x: -10, y: 10, z: -80 }, mass = this.gaussianDistribution.getMass() * 50, shadedTexture = this.shader.shaderMaterials().northStarMaterial) {
        // Geometry and Material
        const sphereGeometry = new THREE.SphereGeometry(specs.r, specs.w, specs.h);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color,
            wireframe: false
        });

        // Mesh
        const sphere = new THREE.Mesh(sphereGeometry, shadedTexture || sphereMaterial);
        this.scene.add(sphere);
        sphere.position.set(position.x, position.y, position.z);
        sphere.castShadow = true;
        this.sphereCanonMeshes.push(sphere);

        // Cannon.js body for physics
        const sphereShape = new CANNON.Sphere(specs.r);
        const sphereBody = new CANNON.Body({
            mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.1, // Add damping for more realistic inertia (slower stopping)
            angularDamping: 0.1, // Optional: If you want to dampen angular momentum too
        });

        // Set restitution (bounciness) and friction for realistic collisions
        sphereBody.material = new CANNON.Material();
        const contactMaterial = new CANNON.ContactMaterial(
            sphereBody.material,
            sphereBody.material,
            {
                friction: 0.1, // Adjust friction for realistic movement
                restitution: 0.6 // Adjust restitution for realistic bounciness
            }
        );

        if (this.world !== null) {
            this.world.addContactMaterial(contactMaterial);

            sphereBody.addShape(sphereShape);
            this.world.addBody(sphereBody);

            // Store references
            this.sphereBodies.push(sphereBody);
        }

        return { sphere, sphereBody }; // Return references if needed
    }

    createPreviewSphere() {
        // document.body.style.cursor = 'pointer';
        // Get a random image for the sphere texture
        const randomIndx = this.gaussianDistribution.generateRandomIndex(this.texturedMaterials.length); // Corrected category name

        const geometry = new THREE.SphereGeometry(2, 20, 20);
        const material = this.texturedMaterials[randomIndx];

        const sphere = new THREE.Mesh(geometry, material);
        sphere.material.color = 0x00ff00;
        sphere.material.transparent = true;
        sphere.material.opacity = 0.5;
        sphere.visible = false;
        // const sphere = new THREE.Mesh(geometry, this.Shaders.shaderMaterials().starryMaterial);
        // document.body.style.cursor = 'pointer';
        this.previewSphere = sphere;
        return sphere;
    }

    handleClick() {
        // Use GaussianDistribution to generate mass and velocity
        const mass = this.gaussianDistribution.getMass() + 150;
        const velocity = this.gaussianDistribution.getVelocity(); // + 50; //* 150;

        // Get a random image for the sphere texture

        const newSphere = this.createSphere(mass, velocity, this.mat, 2);
        this.spheres.push(newSphere);

        // Set a timeout to remove the sphere after 30 seconds
        const timeoutId = setTimeout(() => {
            this.scene.remove(newSphere.mesh); // Remove the sphere from the scene
            this.spheres = this.spheres.filter(s => s.sphereId !== newSphere.sphereId); // Clean up from array
        }, 59999); // 30 seconds

        // Store the timeout ID in the sphere object to clear it later if necessary
        newSphere.timeoutId = timeoutId;
    }

    createSphere(mass, velocity, mat = this.mat, radius = 2) {
        const geometry = new THREE.SphereGeometry(radius, 20, 20);
        let material;
        // const randomIndex = this.generateRandomIndex(2);
        if (mat === null) {
            const randomIndx = this.gaussianDistribution.generateRandomIndex(this.texturedMaterials.length);

            material = this.texturedMaterials[randomIndx];

        } else {
            material = mat;
        }

        this.sphereMesh = new THREE.Mesh(geometry, material);

        // this.sphereMesh.material.map = this.textureLoader.load(textureURL);
        this.sphereMesh.castShadow = true;
        this.sphereMesh.receiveShadow = true;
        this.sphereMesh.position.copy(this.intersectionPoint);
        this.scene.add(this.sphereMesh);

        return {
            mass,
            radius,
            velocity,
            mesh: this.sphereMesh,
            // radius: geometry.parameters.radius,
            position: this.sphereMesh.position.clone(),
            sphereId: this.sphereMesh.id,
            timeoutId: null, // Store timeout ID
        };
    }

    controlBtns(shaderManager, physics) { 
        const keyActions = {
        a: () => this.handleClick(shaderManager.cityTerrainMaterial),
        l: () => this.handleClick(shaderManager.cityTerrainMaterial),
        i: () => this.handleClick(shaderManager.terrestialDragonMaterial),
        c: () => this.handleClick(shaderManager.terrestialDragonMaterial),
        e: () => this.handleClick(shaderManager.explosiveMaterial),
        q: () => this.handleClick(shaderManager.explosiveMaterial),
        x: () => this.handleClick(shaderManager.explosiveMaterial),
        s: () => this.handleClick(shaderManager.sawMaterial),
        w: () => this.handleClick(shaderManager.sawMaterial),
        f: () => this.handleClick(shaderManager.ceasersShaderMaterial),
        r: () => this.handleClick(shaderManager.ceasersShaderMaterial),
        h: () => this.handleClick(shaderManager.ceasersShaderMaterial),
        g: () => this.toggleGravity(physics),
      };
    
      window.addEventListener('keydown', (event) => {
        const action = keyActions[event.key.toLowerCase()];
        if (action) action();
      });
    }

    copyCameraPosition(scene = this.scene, mesh = this.previewSphere,
        camera = this.camera, intersectionPlane = this.intersectionPlane,
        intersectionPoint = this.intersectionPoint, planeNormal = this.planeNormal,
        rayCaster = this.rayCaster, mouse = this.mouse) {
        planeNormal.copy(camera.position).normalize();
        intersectionPlane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);
        rayCaster.setFromCamera(mouse, camera);

        if (rayCaster.ray.intersectPlane(intersectionPlane, intersectionPoint)) {
            mesh.position.copy(intersectionPoint);
            mesh.visible = true;
        }
    }

    updateHover(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.copyCameraPosition(this.scene, this.previewSphere, this.camera,
            this.intersectionPlane, this.intersectionPoint, this.planeNormal,
            this.rayCaster, this.mouse)
    }

    updateEvents() {
        window.addEventListener('mousemove', (event) => {
            this.updateHover(event);
        });

        window.addEventListener('click', () => {
            this.handleClick();
        });
    }

    hideHover() {
        this.previewSphere.visible = false;
    }

    updateSpheres() {
        if (this.previewSphere) {
            this.previewSphere.rotation.x += 0.12;
            this.previewSphere.rotation.y += 0.14;
            this.previewSphere.rotation.z += 0.16;
        }

        if (this.spheres.length > 0) {
            this.spheres.forEach((sphereObj, i) => {
                if (sphereObj && sphereObj.mesh) {
                    sphereObj.mesh.rotation.x += 0.12;
                    sphereObj.mesh.rotation.y += 0.14;
                    sphereObj.mesh.rotation.z += 0.16;

                    this.physics.updatePhysicsEngine(sphereObj, this.spheres, this.sceneMeshes, this.boundaryObj); 
                }
            });
        }
    }

    // Central update method to be called each frame
    update() {
        this.updateSpheres();
    }

    dispose() {
        if (this.spheres) {
            // Remove and dispose of spheres
            this.spheres.forEach(sphere => {
                if (sphere.timeoutId) clearTimeout(sphere.timeoutId);
                this.scene.remove(sphere.mesh);
                sphere.mesh.geometry.dispose();
                if (sphere.mesh.material.map) sphere.mesh.material.map.dispose();
                sphere.mesh.material.dispose();
            });
            this.spheres = [];
        }
    }
}
export default SphereUtils;
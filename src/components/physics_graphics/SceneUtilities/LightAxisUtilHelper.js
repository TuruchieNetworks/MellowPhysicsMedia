import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class LightAxisUtilHelper {
    constructor(scene, camera, renderer, axesSize = 5, gridSize = 30, gridDivisions = 100) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.axesSize = axesSize;
        this.gridSize = gridSize;
        this.gridDivisions = gridDivisions;
        this.axesHelper = null; // Store the axes helper
        this.gridHelper = null; // Store the grid helper
        this.lightHelpers = []; // Array to store light helpers
        this.lightCameraHelpers = []; // Array to store light camera helpers
        this.lightShadowCameraHelpers = []; // Array to store light shadow camera helpers

        // Create initial helpers
        this.initializeAxesGridAndControls(this.axisSize, this.gridSize, this.gridDivisions);
    }

    initializeAxesGridAndControls(axesSize, gridSize, gridDivisions) {
        this.addAxesHelper(axesSize); // Add axes helper with axes Size 5
        this.addGridHelper(gridSize, gridDivisions); // Add grid helper with size 30 and gridDivisions 30
        this.addOrbitControls(); // Add orbit controls
    }

    // Add Axis Helper
    addAxesHelper(axesSize = 5) {
        this.axesHelper = new THREE.AxesHelper(axesSize); // Store the helper for disposal
        // this.axesHelper.position.y = -1.7;
        this.scene.add(this.axesHelper);
    }

    // Add Grid Helper
    addGridHelper(gridSize = this.gridSize, gridDivisions = this.gridDivisions) {
        this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions); // Store the helper for disposal
        this.gridHelper.position.y = 0.01;
        this.scene.add(this.gridHelper);
    }

    // Add helper for Directional Light
    addDirectionalLightHelper(directionalLight, size = 5) {
        this.directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, size);
        this.scene.add(this.directionalLightHelper);

        // Add Directional Light Shadow Camera
        this.directionalLightShadowCameraHelper = this.addShadowCameraHelper(directionalLight);
        this.lightHelpers.push(this.directionalLightHelper); // Store the helper for disposal
    }

    // Add helper for Camera
    addCameraHelper(camera) {
        const cameraHelper = new THREE.CameraHelper(camera);
        this.scene.add(cameraHelper);
        this.lightCameraHelpers.push(cameraHelper); // Store the helper for disposal
    }

    // Add helper for Shadow Camera
    addShadowCameraHelper(light) {
        if (light.castShadow) {
            const shadowCameraHelper = new THREE.CameraHelper(light.shadow.camera);
            this.scene.add(shadowCameraHelper);
            this.lightShadowCameraHelpers.push(shadowCameraHelper); // Store the helper for disposal
        }
    }

    // Add Ambient Light Helper
    addAmbientLightHelper(light) {
        if (!light) {
            console.error("Light object is undefined.");
            return;
        }

        const helperGeometry = new THREE.SphereGeometry(0.1, 8, 8); // Small sphere to represent ambient light
        const helperMaterial = new THREE.MeshBasicMaterial({ color: light.color });
        const helperMesh = new THREE.Mesh(helperGeometry, helperMaterial);

        // Default position if light.position is not set
        const position = light.position || new THREE.Vector3(0, 0, 0);
        helperMesh.position.copy(position); // Position it at the light's position
        this.scene.add(helperMesh);
        this.lightShadowCameraHelpers.push(helperMesh); // Store for cleanup
    }

    // Add Spot Light Helper
    addSpotLightHelper(light) {
        this.spotLightHelper = new THREE.SpotLightHelper(light);
        this.scene.add(this.spotLightHelper);
        this.lightHelpers.push(this.spotLightHelper); // Store for cleanup

        // Add Spot Light Shadow Helper
        this.spotLightShadowHelper = this.addShadowCameraHelper(light);
        this.scene.add(this.spotLightShadowHelper);
        this.lightShadowCameraHelpers.push(this.spotLightShadowHelper); // Store for cleanup
    }

    // Add Hemisphere Light Helper
    addHemisphereLightHelper(light) {
        const skyGeometry = new THREE.SphereGeometry(5, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({ color: light.color, side: THREE.BackSide, opacity: 0.5, transparent: true });
        const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
        skyMesh.position.set(0, 10, 0); // Position it above the scene
        this.scene.add(skyMesh);

        const groundGeometry = new THREE.SphereGeometry(5, 32, 32);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: light.groundColor, side: THREE.BackSide, opacity: 0.5, transparent: true });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.position.set(0, 0, 0); // Position it at the ground level
        this.scene.add(groundMesh);
        this.lightHelpers.push(skyMesh, groundMesh); // Store for cleanup
    }

    // Add Orbit Controls
    addOrbitControls() {
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.enableDamping = true; // Enable damping for smooth controls
        this.orbitControls.dampingFactor = 0.25; // Damping factor for controls
        this.orbitControls.screenSpacePanning = true; // Disable screen space panning
        this.orbitControls.maxPolarAngle = Math.PI / 2; // Limit vertical rotation

        this.orbitControls.update(); // Call update initially
    }

    // Optional update method for the orbit controls
    update() {
        if (this.orbitControls) {
            this.orbitControls.update(); // Call update in your animation loop if needed
        }
    }

    dispose() {
        // Remove and dispose axes helpers
        if (this.axesHelper) {
            this.scene.remove(this.axesHelper);
            this.axesHelper.geometry.dispose();
            this.axesHelper.material.dispose();
            this.axesHelper = null; // Clear reference
        }

        // Remove and dispose grid helpers
        if (this.gridHelper) {
            this.scene.remove(this.gridHelper);
            this.gridHelper.geometry.dispose();
            this.gridHelper.material.dispose();
            this.gridHelper = null; // Clear reference
        }

        // Remove and dispose light helpers
        if (this.lightHelpers) {
            this.lightHelpers.forEach(helper => {
                this.scene.remove(helper);
                if (helper.geometry) {
                    helper.geometry.dispose();
                }
                if (helper.material) {
                    helper.material.dispose();
                }
            });
            this.lightHelpers = []; // Clear the array
        }

        // Remove and dispose light camera helpers
        if (this.lightCameraHelpers) {
            this.lightCameraHelpers.forEach(helper => {
                this.scene.remove(helper);
                if (helper.geometry) {
                    helper.geometry.dispose();
                }
                if (helper.material) {
                    helper.material.dispose();
                }
            });
            this.lightCameraHelpers = []; // Clear the array
        }

        // Remove and dispose light shadow camera helpers
        if (this.lightShadowCameraHelpers) {
            this.lightShadowCameraHelpers.forEach(helper => {
                this.scene.remove(helper);
                if (helper.geometry) {
                    helper.geometry.dispose();
                }
                if (helper.material) {
                    helper.material.dispose();
                }
            });
            this.lightShadowCameraHelpers = []; // Clear the array
        }
    }
}


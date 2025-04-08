import * as THREE from 'three';
import { LightAxisUtilHelper } from './LightAxisUtilHelper';

export class Lighting {
    constructor(scene, camera, speed = 5, renderer = null, speedFactor = 1, withHelpers = true, axesSize = 5, gridSize = 30, gridDivisions = 100) {
        this.scene = scene;
        this.speed = speed;
        this.camera = camera;
        this.renderer = renderer;
        this.withHelpers = withHelpers;
        this.speedFactor = speedFactor;  // New factor to control speed
        this.axesSize = axesSize;
        this.gridSize = gridSize;
        this.gridDivisions = gridDivisions;

        this.cameraPathPoints = [
            new THREE.Vector3(60, 10, -135),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 20, -30),
            new THREE.Vector3(60, 44, -95),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 20, -30),

            new THREE.Vector3(60, 10, -135),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 20, -30),
            new THREE.Vector3(60, 10.4, -195),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 18, -30),
        ];
        
        this.extendedCameraPathPoints = [
            new THREE.Vector3(60, 10, -135),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(91, 20, -30),
            new THREE.Vector3(-60, 4.4, -115),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(91.00, 20, -93.0),

            // Opp Values except for Z Values
            new THREE.Vector3(-60, 10, 195),
            new THREE.Vector3(20, 2, -98),
            new THREE.Vector3(-81.00, 20, 230),
            new THREE.Vector3(20, 11, 95),
            new THREE.Vector3(60, 2, -80),
            new THREE.Vector3(-91.00, 20, 30)
        ]

        this.doubleExtendedCameraPathPointLLs = [
            new THREE.Vector3(60, 10, -135),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 20, -30),

            new THREE.Vector3(60, 44, -95),
            new THREE.Vector3(32, 34, -95),
            new THREE.Vector3(-32, 34, -95),

            new THREE.Vector3(-64, 44, -95),
            new THREE.Vector3(6, 29, -30),
            new THREE.Vector3(-20, 2, 80),

            // ext4reA
            new THREE.Vector3(-50, 29, 80),
            new THREE.Vector3(20, 29, 80),
            new THREE.Vector3(100, 20, -30),
            new THREE.Vector3(60, 44, -95),
            new THREE.Vector3(32, 34, -95),
            new THREE.Vector3(-32, 24, -95),

            new THREE.Vector3(60, 4, -95),
            new THREE.Vector3(-20, 2, 80),
            new THREE.Vector3(100, 20, -30),
        ];

        // Create a camera path with yet another color
        this.oneCameraPath = [
            new THREE.Vector3(60, 5, -35),
            new THREE.Vector3(-10, 20, 30),
            new THREE.Vector3(-20, 30, -30),
        ];

        this.fogPathPoints = [
            new THREE.Vector3(60, 5, -135),
            new THREE.Vector3(-30, 2, 80),
            // new THREE.Vector3(-10, 20, 130),
            new THREE.Vector3(20, 13, -30),
        ];

        this.helpers = new LightAxisUtilHelper(this.scene, this.camera, this.renderer, this.axesSize, this.gridSize, this.gridDivisions);


        this.reset();
        this.initializeLights();
    }

    // Initialize lights and helpers
    initializeLights() {
        if (this.renderer !== null) {
            this.addSpotLight();
            this.addAmbientLight();
            this.addDirectionalLight();
        }
    } 

    // Add an Ambient Light
    addAmbientLight({ color = 0x333333, intensity = 1 } = {}) {
        this.ambientLight = new THREE.AmbientLight(color, intensity);
        this.scene.add(this.ambientLight);
    }

    // Add a Directional Light
    addDirectionalLight({ color = 0xFFFFFF, intensity = 1.2, position = { x: 80, y: 110, z: 11.0 }, castShadow = true, withHelpers = this.withHelpers} = {}) {
        this.directionalLight = new THREE.DirectionalLight(color, intensity);
        this.directionalLight.position.set(position.x, position.y, position.z);
        this.directionalLight.castShadow = castShadow;
        this.directionalLight.shadow.camera.bottom = -16.4;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(this.directionalLight);
        if (withHelpers) this.helpers.addDirectionalLightHelper(this.directionalLight, 5);
    }

    // Add a Spot Light
    addSpotLight({ color = 0xFFFFFF, intensity = 1, position = { x: -100, y: 100, z: 0 }, angle = 0.2, castShadow = true, receiveShadow = true , withHelpers = !this.withHelpers } = {}) {
        this.spotLight = new THREE.SpotLight(color, intensity);
        this.spotLight.position.set(position.x, position.y, position.z);
        this.spotLight.angle = angle;
        this.spotLight.castShadow = castShadow;
        this.spotLight.receiveShadow = receiveShadow;
        this.scene.add(this.spotLight);
        if (withHelpers) this.helpers.addSpotLightHelper(this.spotLight);
    }

    // Create a Path (for moving objects)
    createPath(points, color = 0xff0000) {
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const pathMaterial = new THREE.LineBasicMaterial({ color: color });
        this.pathLine = new THREE.Line(pathGeometry, pathMaterial);
        this.scene.add(this.pathLine);
    }

    // Create a Camera Path
    createCameraPath(color = 0xff0000) {
        const pathGeometry = new THREE.BufferGeometry().setFromPoints(this.extendedCameraPathPoints);
        const pathMaterial = new THREE.LineBasicMaterial({ color: color });
        const pathLine = new THREE.Line(pathGeometry, pathMaterial);
        this.scene.add(pathLine);
        return pathLine;
    }

    // Create Random Hex Color
    createRandomHexColor = () => {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    }

    // Create Fog
    createFog() {
        this.scene.fog = new THREE.Fog(0xFFFFFF, 0, 200);
        this.scene.fog = new THREE.FogExp2(this.randomColor, 0.01);
    }

    // Update the camera path with speed factor
    updateCameraPath() {
        // Calculate the index of the current point in the camera path
        const elapsedTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        const totalPoints = this.cameraPathPoints.length;

        //  Calculate the index of the current point and the next point
        const pointIndex = Math.floor(elapsedTime / this.speed) % totalPoints; 
        const nextPointIndex = (pointIndex + 1) % totalPoints;

        // Interpolation factor 't' between 0 and 1
        const t = (elapsedTime % this.speed) / this.speed; // Value between 0 and 1 over 'speed' seconds
        const currentPoint = this.cameraPathPoints[pointIndex];
        const nextPoint = this.cameraPathPoints[nextPointIndex];

        // Smoothly Interpolate between the current and next point
        this.camera.position.lerpVectors(currentPoint, nextPoint, t);

        // Keep the camera looking at the center of the scene
        this.camera.lookAt(this.scene.position);
        this.camera.updateProjectionMatrix(); // Ensure the projection matrix is updated
        this.camera.aspect = window.innerWidth / window.innerHeight; // Make sure the camera aspect ratio stays correct
      
    }

    update() {
        this.updateCameraPath();
    }

    reset() {
        this.startTime = Date.now(); // Reset the timer to restart the path
    }

    // Dispose of all resources (lights, helpers, etc.)
    dispose() {
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
            this.directionalLight.dispose();
            this.directionalLight = null;
        }
        if (this.spotLight) {
            this.scene.remove(this.spotLight);
            this.spotLight.dispose();
            this.spotLight = null;
        }
        if (this.helpers) {
            this.helpers.dispose(); // If your helper has dispose method
            this.helpers = null;
        }
    }
}
import * as THREE from 'three';

class MouseUtils {
    constructor(camera) {
        this.camera = camera;
        this.loadMouseParams();
        this.loadMousePosition();
        // Listen for mouse movement
        this.floatMouse = {
            x: 0.0,
            y: 0.0,
        };
        window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    }

    onMouseMove(event) {
        // Normalize mouse position to the range of [-1, 1]
        this.floatMouse.x = (event.clientX / window.innerWidth) * 2 - 1; // Horizontal position [-1, 1]
        this.floatMouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // Vertical position [-1, 1]
    }

    loadMouseParams() {
        this.mouse = new THREE.Vector2();               // normalized mouse from event
        this.mousePosition = new THREE.Vector2();       // "official" current position for shaders
        this.rayCaster = new THREE.Raycaster();
        this.planeNormal = new THREE.Vector3();
        this.intersectionPlane = new THREE.Plane();
        this.intersectionPoint = new THREE.Vector3();
    }

    loadMousePosition() {
        window.addEventListener('mousemove', e => this.updateMouse(e));
    }

    /**
     * Updates both internal and official mouse position.
     */
    updateMouse(event) {
        if (event) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Set official mousePosition as a copy
            this.mousePosition = new THREE.Vector2(this.mouse.x, this.mouse.y);
            // return mousePosition;
        }
    }

    /**
     * Gets a clone of the official mousePosition.
     */
    getMousePosition() {
        return this.mousePosition.clone(); // prevent mutation from outside
    }

    /**
     * (Optional) Gets raw normalized mouse (reference — mutate with caution).
     */
    getRawMouse() {
        return this.mouse;
    }
}

export default MouseUtils;
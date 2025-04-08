import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';

export class DatGui {
    constructor(shaderManager) {
        this.shaderManager = shaderManager; // Link to shader manager
        this.scene = new THREE.Scene();
        this.world = new CANNON.World();
        this.gui = new GUI();
        this.options = {
            color: '#ffea00',
            positionX: 0,
            positionY: 0,
            positionZ: 0,
            size: 1,
            explodeIntensity: 0.5,
            shapeFactor: 1,
            wireframe: false,
            speed: 0.05, // Controls the animation speed
        };
        this.step = 0;

        // Bind methods for better control
        this.updatePosition = this.updatePosition.bind(this);
        this.updateSize = this.updateSize.bind(this);
        this.updateExplodeIntensity = this.updateExplodeIntensity.bind(this);
        this.updateShapeFactor = this.updateShapeFactor.bind(this);
    }

    initializeGUI(mesh) {
        this.mesh = mesh;

        // Add GUI controls with event listeners
        this.gui.addColor(this.options, "color").onChange(this.changeColor.bind(this));

        // Position controls
        this.gui.add(this.options, "positionX", -10, 10, 0.1).onChange(this.updatePosition);
        this.gui.add(this.options, "positionY", -10, 10, 0.1).onChange(this.updatePosition);
        this.gui.add(this.options, "positionZ", -10, 10, 0.1).onChange(this.updatePosition);

        // Size control
        this.gui.add(this.options, "size", 0.1, 5, 0.1).onChange(this.updateSize);

        // Explode intensity control
        this.gui.add(this.options, "explodeIntensity", 0, 10, 0.1).onChange(this.updateExplodeIntensity);

        // Shape factor control
        this.gui.add(this.options, "shapeFactor", 0.1, 5, 0.1).onChange(this.updateShapeFactor);

        // Speed control
        this.gui.add(this.options, "speed", 0.01, 0.5, 0.01).onChange((value) => {
            this.shaderManager.setSpeed(value);
        });
    }

    // GUI control functions
    changeColor(value) {
        if (this.mesh) {
            this.mesh.material.color.set(value);
            this.updateShaderUniform('color', new THREE.Color(value));
        }
    }

    updatePosition() {
        if (this.mesh) {
            this.mesh.position.set(this.options.positionX, this.options.positionY, this.options.positionZ);
            this.updateShaderUniform('position', this.mesh.position);
        }
    }

    updateSize() {
        if (this.mesh) {
            this.mesh.scale.set(this.options.size, this.options.size, this.options.size);
            this.updateShaderUniform('scale', this.mesh.scale);
        }
    }

    updateExplodeIntensity(value) {
        console.log("Explode Intensity:", value);
        // Update shader uniform for explosion
        this.updateShaderUniform('explodeIntensity', value);
    }

    updateShapeFactor(value) {
        console.log("Shape Factor:", value);
        // Update shader uniform for shape factor
        this.updateShaderUniform('shapeFactor', value);
    }

    updateShaderUniform(param, value) {
        // Update the shader uniform (centralized method)
        if (this.shaderManager && this.shaderManager.shaders) {
            Object.keys(this.shaderManager.shaders).forEach(key => {
                const shader = this.shaderManager.shaders[key];
                if (shader && shader.material && shader.material.uniforms) {
                    shader.material.uniforms[param].value = value;
                }
            });
        }
    }

    // Update the mesh's animation or other attributes based on GUI state
    update() {
        if (this.mesh) {
            this.step += this.options.speed;
            this.mesh.position.y = 10 * Math.abs(Math.sin(this.step));
        }
    }

    // Dispose of the scene objects, materials, and resources when done
    dispose(scene, renderer, camera) {
        if (!scene || !renderer || !camera) return;

        scene.traverse((object) => {
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object.geometry) object.geometry.dispose();
        });

        scene.clear();
        scene.remove(camera);
        this.camera = null;

        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }

        this.world = null;
        renderer.dispose();
    }
}

export default DatGui;

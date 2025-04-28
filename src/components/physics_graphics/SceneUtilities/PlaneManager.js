import * as THREE from 'three';
import * as CANNON from "cannon-es";

export class PlaneManager {
  constructor(scene, world, width = 30, height = 30, thickness = 1, side = THREE.DoubleSide, shaderManager, texturedMaterial, withFiniteGround = false, withPlanePad = true, withPlaneBox = true) {
    this.scene = scene;
    this.world = world; // Ensure world is passed here
    this.width = width;
    this.height = height;
    this.side = side;
    this.thickness = thickness;
    this.shaderManager = shaderManager;
    this.withPlanePad = withPlanePad;
    this.withPlaneBox = withPlaneBox;
    this.world.gravity.set(0, -9.81, 0);
    this.withFiniteGround = withFiniteGround;
    this.texturedMaterial = texturedMaterial;
    this.mat = shaderManager.dragonCityTerrainMaterial;
    this.color = '#' + Math.floor(Math.random() * 16777215).toString(16);

    this.createFlatPlane(this.mat);
    this.createCuboidPlane(this.width, this.thickness, this.color, this.side);
  }

  createFlatPlane(shaderMaterial = this.mat) {
    this.flatPlaneGeometry = new THREE.PlaneGeometry(this.width, this.height);

    // Use the shader material if it exists, otherwise fallback to a default material
    this.material = shaderMaterial || new THREE.MeshPhongMaterial({
      color: this.color,
      side: this.side,
      flatShading: true,
    });

    // Create the mesh and add it to the scene
    this.flatPlaneMesh = new THREE.Mesh(this.flatPlaneGeometry, this.material);
    this.flatPlaneMesh.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    this.flatPlaneMesh.position.y = -0.1;//.7;
    this.flatPlaneMesh.receiveShadow = true; // Enable shadow receiving
    this.scene.add(this.flatPlaneMesh);
  }

  createCuboidPlane(size = this.width, thickness = this.thickness, color = this.color, side = this.side) {
    // Create sides using BoxGeometry
    this.cuboidGeometry = new THREE.BoxGeometry(size, thickness, size);
    this.cuboidMaterial = this.texturedMaterial
      || new THREE.MeshPhongMaterial({
        side,
        color,
        flatShading: true,
      });

    // Create side mesh
    this.cuboidPlaneMesh = new THREE.Mesh(this.cuboidGeometry, this.cuboidMaterial);
    this.cuboidPlaneMesh.position.y = -0.369; //-=thickness /// 2; // Move the sides up to be in line with the plane
    this.cuboidPlaneMesh.receiveShadow = true; // Enable shadow receiving for sides
    this.scene.add(this.cuboidPlaneMesh);

    this.withFiniteGround ?
      this.createFiniteGround(this.cuboidPlaneMesh) :
      this.createInfiniteGround();
  }

  createExplosivePlane(mat = this.shaderManager.explosiveMaterial) {
    const geo = new THREE.PlaneGeometry(20, 20, 32, 32);
    // mat.side = THREE.DoubleSide; // Ensure both sides are visible
    this.explosivePlane = new THREE.Mesh(geo, mat);
    this.explosivePlane.rotation.x = -Math.PI / 2;
    this.explosivePlane.position.y = -0.131; // Reappear -0.13; // -0.02; Freshly Boilin // 0.073; // Plain View
    this.explosivePlane.receiveShadow = true;
    this.scene.add(this.explosivePlane);
  }

  createPlanePad(l = 60, b = 60, h = 0.60, mat = new THREE.MeshPhongMaterial({ color: 0x00ff00 })) {
    const geo = new THREE.PlaneGeometry(l, b, h);
    this.planePad = new THREE.Mesh(geo, mat);
    this.planePad.rotation.x = -Math.PI / 2;
    this.planePad.position.y = -0.131; 
    this.planePad.receiveShadow = true;
    this.scene.add(this.planePad);
  }

  createFiniteGround(mesh = this.cuboidPlaneMesh, width = 60, height = 60, thickness = 1) {
    if (mesh) {
      const halfExtents = new CANNON.Vec3(width / 2, thickness / 2, height / 2);
      const shape = new CANNON.Box(halfExtents);

      this.finitePlaneBody = new CANNON.Body({
        mass: 0, // Static plane
        shape: shape,
        position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z)
      });

      this.world.broadphase = new CANNON.SAPBroadphase(this.world); // Better for objects on a plane
      this.world.allowSleep = true; // Enable sleeping for particles that come to rest
      this.finitePlaneBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate using Cannon.js
      this.world.addBody(this.finitePlaneBody);
    }
  }

  createInfiniteGround() {
    const shape = new CANNON.Plane();
    this.infiniteGround = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0.0, -0.0913, 0.0)
    });

    this.infiniteGround.addShape(shape);
    this.infiniteGround.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Rotate to lie flat
    this.world.broadphase = new CANNON.SAPBroadphase(this.world); // Better for objects on a plane
    this.world.allowSleep = true; // Enable sleeping for particles that come to rest
    this.world.addBody(this.infiniteGround); // Use this.infiniteGround
  }

  createContactMaterial() {
    const sandMaterial = new CANNON.Material("sandMaterial");
    const groundMaterial = new CANNON.Material("groundMaterial");

    // Step 2: Set up contact materials for particle-ground and particle-particle interactions
    const groundContactMaterial = new CANNON.ContactMaterial(sandMaterial, groundMaterial, {
      friction: 0.3,     // Ground friction
      restitution: 0.1   // Minimal bounciness on ground
    });
    const particleContactMaterial = new CANNON.ContactMaterial(sandMaterial, sandMaterial, {
      friction: 0.2,     // Friction between particles
      restitution: 0.1   // Minimal bounciness between particles
    });

    this.world.addContactMaterial(groundContactMaterial);
    this.world.addContactMaterial(particleContactMaterial);

    // Step 3: Configure collision detection for better performance with many particles
    this.world.broadphase = new CANNON.SAPBroadphase(this.world); // Better for objects on a plane
    this.world.allowSleep = true; // Enable sleeping for particles that come to rest
  }

  // Method to set the position of the plane
  setPosition(x, y, z) {
    this.flatPlaneMesh.position.set(x, y, z);
  }

  // Method to set the rotation of the plane
  setRotation(x, y, z) {
    this.flatPlaneMesh.rotation.set(x, y, z);
  }

  // Method to resize the plane
  setSize(mesh, width, height) {
    if (!mesh) return;
    mesh.geometry.dispose(); // Dispose of old geometry
    const planeGeometry = new THREE.PlaneGeometry(width, height); // Create new geometry
    return planeGeometry;
  }

  // Method to change the color of the plane's material
  setColor(color) {
    this.material.color.set(color);
  }

  // Dispose method to clean up resources
  dispose() {
    // Remove the plane mesh from the scene
    if (this.flatPlaneMesh) {
      this.scene.remove(this.flatPlaneMesh);
      this.flatPlaneMesh.geometry.dispose(); // Dispose of the geometry
      this.flatPlaneMesh.material.dispose(); // Dispose of the material 
    }

    // Remove the cuboid plane mesh from the scene
    if (this.cuboidPlaneMesh) {
      this.scene.remove(this.cuboidPlaneMesh);
      this.cuboidPlaneMesh.geometry.dispose(); // Dispose of the geometry
      this.cuboidPlaneMesh.material.dispose(); // Dispose of the material
    }

    // Remove the explosive plane mesh from the scene
    if (this.explosivePlane) {
      this.scene.remove(this.explosivePlane);
      this.explosivePlane.geometry.dispose(); // Dispose of the geometry
      this.explosivePlane.material.dispose(); // Dispose of the material
    }

    // Remove the plane pad from the scene
    if (this.planePad) {
      this.scene.remove(this.planePad);
      this.planePad.geometry.dispose(); // Dispose of the geometry
      this.planePad.material.dispose(); // Dispose of the material
    }

    // Remove any bodies in the world if they exist
    if (this.finitePlaneBody) {
      this.world.removeBody(this.finitePlaneBody);
    }
    if (this.infinitePlaneBody) {
      this.world.removeBody(this.infinitePlaneBody);
    }
  }
}

export default PlaneManager;
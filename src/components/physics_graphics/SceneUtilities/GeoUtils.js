import * as THREE from 'three';
import * as CANNON from "cannon-es";

class GeoUtils {
  constructor(scene, world, textureLoader, gtlfLoader, texturesManager, shaderManager, imageUtils) {
    this.scene = scene;
    this.world = world;
    this.gtlfLoader = gtlfLoader;
    this.textureLoader = textureLoader;
    this.texturesManager = texturesManager; // Assuming texturesManager is passed or created
    this.shader = shaderManager;
    this.imageUtils = imageUtils;

    this.gltfModels = [];

    this.geoBoxMeshes = [];
    this.geoBoxBodies = [];

    this.geoMultiboxMeshes = [];
    this.geoMultiboxBodies = [];

    this.geo3DObjBoxMeshes = [];
    this.geo3DObjBoxBodies = [];

    this.cubeBoundaryMeshes = [];
    this.cubeBoundaryBodies = [];

    this.wiredBoundaryMeshes = [];
    this.wiredBoundaryBodies = [];
  }

  // Create physics body and add it to the world
  createPhysicsBody(mesh, mass = 0) {
    const geometry = mesh.geometry;

    // Access mesh's geometry parameters to create CANNON.Box
    const dimensions = new CANNON.Vec3(
      geometry.parameters.width,
      geometry.parameters.height,
      geometry.parameters.depth
    );

    const shape = new CANNON.Box(dimensions);
    const body = new CANNON.Body({
      mass: mass,
      position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z),
      angularDamping: 0.5,
    });

    body.addShape(shape);
    this.world.addBody(body);

    return body;
  }

  randomHexColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  // BASIC BOXES
  createBasicBox(specs = { x: 6, y: 8, z: 10 }, mass = 0) {
    const boxGeometry = new THREE.BoxGeometry(specs.x, specs.y, specs.z);
    const boxMaterial = [
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.nebula),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      // shader.shaderMaterials().sawMaterial,
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(stars) }),
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.nebula),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      // shader.shaderMaterials().sawMaterial,
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.nebula),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      // shader.shaderMaterials().sawMaterial,
      // shader.shaderMaterials().explosiveMaterial,
      // shader.shaderMaterials().sawMaterial,
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.crowd_angle),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.nebula) }),
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.concert_lights),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      // new THREE.ShaderMaterial(
      //   this.shader.sawManager.sawShader
      // ),
      this.shader.sawMaterial,
      // new THREE.MeshPhongMaterial({ map: textureLoader.load(this.imageUtils.images.concerts['concert_lights']) }),
    ]

    this.basicBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.basicBox.position.set(10, 4, -8);
    this.basicBox.castShadow = true;
    this.basicBox.receiveShadow = true;
    this.scene.add(this.basicBox);
    this.geoBoxMeshes.push(this.basicBox);

    // Physics And Storage
    // const dimensions = new CANNON.Vec3(specs.x, specs.y, specs.z);
    const basicBoxBody = this.createPhysicsBody(this.basicBox, mass);
    this.geoBoxBodies.push(basicBoxBody);
  }

  // MULTIBOXES
  createMultiBox(specs = { x: 6, y: 8, z: 10 }, mass = 0) {
    const multiBoxGeometry = new THREE.BoxGeometry(specs.x, specs.y, specs.z);

    // Using getTexturedMaterialByName to retrieve textures based on their names
    const multiBoxMaterial = [
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.bright_stage) }),
      // shader.shaderMaterials().sawMaterial,
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.stars) }),
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.nebula) }),
      // shader.shaderMaterials().explosiveMaterial,
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.concert_lights) }),
      // shader.shaderMaterials().sawMaterial,
      this.shader.explosiveMaterial,
      // shader.shaderMaterials().sawMaterial,
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.crowd_angle) }),
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.nebula) }),
      // this.shader.sawMaterial,
      // new THREE.ShaderMaterial(
      this.shader.sawMaterial
      // ),
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.concert_lights) }),
    ];


    this.multiBox = new THREE.Mesh(multiBoxGeometry, multiBoxMaterial);
    this.multiBox.position.set(-10, 4, -8);
    this.multiBox.castShadow = true;
    this.multiBox.receiveShadow = true;
    this.scene.add(this.multiBox);
    this.geoBoxMeshes.push(this.multiBox);

    // const dimensions = new CANNON.Vec3(specs.x, specs.y, specs.z);
    const multiboxBody = this.createPhysicsBody(this.multiBox, mass);
    this.geoBoxBodies.push(multiboxBody);
    // Ensure arrays exist before pushing
    // if (!this.geoMultiBoxBodies) this.geoMultiBoxBodies = [];
    // if (!this.geoMultiBoxMeshes) this.geoMultiBoxMeshes = [];
    // Store references for update loop
  }

  create3DBoxObject(specs = { x: 6, y: 8, z: 10 }, mass = 0) {
    const boxGeometry = new THREE.BoxGeometry(specs.x, specs.y, specs.z);

    // Using getTexturedMaterialByName to retrieve textures based on their names
    const boxMaterial = [
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.bright_stage) }),
      // shader.shaderMaterials().sawMaterial,
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.stars) }),
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.nebula) }),
      // shader.shaderMaterials().explosiveMaterial,
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.concert_lights) }),
      // shader.shaderMaterials().sawMaterial,
      this.shader.explosiveMaterial,
      // shader.shaderMaterials().sawMaterial,
      new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.crowd_angle) }),
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.nebula) }),
      // this.shader.sawMaterial,
      // new THREE.ShaderMaterial(
      this.shader.sawMaterial
      // ),
      // new THREE.MeshPhongMaterial({ map: this.textureLoader.load(this.imageUtils.concert_lights) }),
    ];

    this.boxObj = new THREE.Mesh(boxGeometry, boxMaterial);
    this.boxObj.position.set(10, 6.5, -8);
    this.boxObj.castShadow = true;
    this.boxObj.receiveShadow = true;
    const obj = new THREE.Object3D();
    obj.add(this.boxObj);
    this.scene.add(this.boxObj);

    // const dimensions = new CANNON.Vec3(specs.x, specs.y, specs.z);
    const boxObjBody = this.createPhysicsBody(this.boxObj, mass);  // Use mesh directly

    this.geo3DObjBoxMeshes.push(this.boxObj);
    this.geo3DObjBoxBodies.push(boxObjBody);
  }

  // GLTF MODELS
  createGLTFModel() {
    const url = this.imageUtils.images.gltfModels[0];
    this.gtlfLoader.load(url, (gltf) => {
      const model = gltf.scene;
      //model.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
      model.position.set(-12, 5, 10);
      model.castShadow = model.receiveShadow = true;
      this.scene.add(model);
      this.gltfModels.push(model);
    }, undefined, function (error) {
      console.error(error);
    });

  }

  // Wired Box Boundary 
  createWiredBoundaryBox(boundary, mass = 0, shader = this.shader.terrainManager.wiredCityTerrainShader) {
    const geo = new THREE.BoxGeometry(boundary, boundary, boundary);
    const mat = new THREE.ShaderMaterial({
      uniforms: shader.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      // color: randomHexColor(),
      side: THREE.BackSide,  // Ensures the inside of the cube is rendered
      wireframe: false,
      // map: textureLoader.load(blue_concert),
    });

    this.wiredBoundary = new THREE.Mesh(geo, mat);
    this.scene.add(this.wiredBoundary);
    this.wiredBoundaryMeshes.push(this.wiredBoundary);

    // Physics And Storage
    // const dimensions = new CANNON.Vec3(specs.x, specs.y, specs.z);
    const body = this.createPhysicsBody(this.wiredBoundary, mass);
    this.wiredBoundaryBodies.push(body);
  }

  createMultifacedBoundaryBox(boundary, mass = 0, {
    top = this.shader.terrainManager.wiredCityTerrainSDFShader,
    bottom = this.shader.terrainManager.wiredCityTerrainSDFShader,
    left = this.shader.tunnelManager.tubeCityShader,
    right = this.shader.skylineManager.ceasarsShader,
    front = this.shader.lucentManager.blendedLucentShader,
    back = this.shader.lucentManager.blendedLucentShader,
  } = {}) {
    // Ensure shaders exist before applying
    if (!this.shader) {
      console.error("Shader manager not initialized!");
      return;
    }

    const geometry = new THREE.BoxGeometry(boundary, boundary, boundary);
    const materials = [
      // Left Face
      new THREE.ShaderMaterial({
        uniforms: left.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: left.vertexShader,
        fragmentShader: left.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),

      // Right Face
      new THREE.ShaderMaterial({
        uniforms: right.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: right.vertexShader,
        fragmentShader: right.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),

      // Right Face
      // new THREE.ShaderMaterial({
      //   uniforms: this.shader.skylineManager.glassSkylineShshaders.ader.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
      //   vertexShader: this.shader.skylineManager.glassSkylineShader.vertexShader,
      //   fragmentShader: this.shader.skylineManager.glassSkylineShader.fragmentShader,
      //   side: THREE.BackSide,
      //   wireframe: false,
      // }),

      // Top Face
      new THREE.ShaderMaterial({
        uniforms: top.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: top.vertexShader,
        fragmentShader: top.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),

      // Bottom
      new THREE.ShaderMaterial({
        uniforms: bottom.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: bottom.vertexShader,
        fragmentShader: bottom.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),

      // Front Face
      new THREE.ShaderMaterial({
        uniforms: front.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: front.vertexShader,
        fragmentShader: front.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),

      // Back Face
      new THREE.ShaderMaterial({
        uniforms: back.uniforms, color: { value: new THREE.Color(this.randomHexColor()) },
        vertexShader: back.vertexShader,
        fragmentShader: back.fragmentShader,
        side: THREE.BackSide,
        wireframe: false,
      }),
    ];

    this.multifacedBoundaryBox = new THREE.Mesh(geometry, materials);
    this.scene.add(this.multifacedBoundaryBox);
    this.cubeBoundaryMeshes.push(this.multifacedBoundaryBox);

    const body = this.createPhysicsBody(this.multifacedBoundaryBox, mass);
    this.cubeBoundaryBodies.push(body);
  }

  // Ensure update is called inside the animation loop
  // update() {
  //   this.updateMeshesPhysics();
  // }

  activateMeshBody(mesh, body) {
    if (!mesh || !body) return;
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  updateMeshesOutOfBoundaryWithPhysics() {
    for (let i = 0; i < this.geoMeshes.length; i++) {
      const mesh = this.geoMeshes[i];
      const body = this.geoBodies[i];

      if (!mesh || !body) continue;

      // Sync physics & render
      this.activateBody(mesh, body);

      // Auto-remove objects that fall out of bounds
      if (body.position.y < -50) {
        console.warn(`Removing mesh & body at index ${i} (fell too far)`);
        this.scene.remove(mesh);
        this.world.removeBody(body);
        this.geoMeshes.splice(i, 1);
        this.geoBodies.splice(i, 1);
        i--;
      }
    }
  }

  updateBodyAndMeshWithPhysics(mesh, body) {
    if (mesh && body) {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
  }

  updateBodiesAndMeshesWithPhysics(meshes, bodies) {
    meshes.forEach((mesh, index) => {
      const body = bodies[index];
      this.updateBodyAndMeshWithPhysics(mesh, body);
    });
  }

  updateBasicBoxPhysics() {
    if (this.basicBox && this.geoBoxBodies) {
      for (let i = 0; i < this.geoBoxMeshes.length; i++) {
        this.updateBodyAndMeshWithPhysics(this.geoBoxMeshes[i], this.geoBoxBodies[i]);
      }
    }
  }

  updateMultiBoxPhysics() {
    if (this.multiBox && this.geoMultiBoxBodies) {
      for (let i = 0; i < this.geoMultiBoxMeshes.length; i++) {
        this.updateBodyAndMeshWithPhysics(this.geoMultiBoxMeshes[i], this.geoMultiBoxBodies[i]);
      }
    }
  }

  update3DObjBoxPhysics() {
    if (this.boxObj && this.geo3DObjBoxBodies) {
      for (let i = 0; i < this.geo3DObjBoxMeshes.length; i++) {
        this.updateBodyAndMeshWithPhysics(this.geo3DObjBoxMeshes[i], this.geo3DObjBoxBodies[i]);
      }
    }
  }

  update() {
    this.updateBasicBoxPhysics();
    this.updateMultiBoxPhysics();
    this.update3DObjBoxPhysics();
  }

  dispose() {
    // Dispose textures and materials
    // if (Array.isArray(this.geoBoxMeshes)) {
    //   this.geoBoxMeshes.forEach(mesh => {
    //     if (mesh.material) {
    //       mesh.material.forEach(material => {
    //         if (material.dispose) {
    //           material.dispose();
    //         }
    //       });
    //     }
    //     if (mesh.geometry) {
    //       mesh.geometry.dispose();
    //     }
    //   });
    // }

    // if (Array.isArray(this.geoMultiBoxMeshes)) {
    //   this.geoMultiBoxMeshes.forEach(mesh => {
    //     if (mesh.material) {
    //       mesh.material.forEach(material => {
    //         if (material.dispose) {
    //           material.dispose();
    //         }
    //       });
    //     }
    //     if (mesh.geometry) {
    //       mesh.geometry.dispose();
    //     }
    //   });
    // }

    // if (Array.isArray(this.geo3DObjBoxMeshes)) {
    //   this.geo3DObjBoxMeshes.forEach(mesh => {
    //     if (mesh.material) {
    //       mesh.material.forEach(material => {
    //         if (material.dispose) {
    //           material.dispose();
    //         }
    //       });
    //     }
    //     if (mesh.geometry) {
    //       mesh.geometry.dispose();
    //     }
    //   });
    // }

    // Remove meshes from the scene
    if (Array.isArray(this.geoBoxMeshes)) {
      this.geoBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }

    if (Array.isArray(this.geoMultiBoxMeshes)) {
      this.geoMultiBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }

    if (Array.isArray(this.geo3DObjBoxMeshes)) {
      this.geo3DObjBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }

    // Remove physics bodies from the world
    if (Array.isArray(this.geoBoxBodies)) {
      this.geoBoxBodies.forEach(body => this.world.removeBody(body));
    }

    if (Array.isArray(this.geoMultiBoxBodies)) {
      this.geoMultiBoxBodies.forEach(body => this.world.removeBody(body));
    }

    if (Array.isArray(this.geo3DObjBoxBodies)) {
      this.geo3DObjBoxBodies.forEach(body => this.world.removeBody(body));
    }

    // Clear arrays
    this.geoBoxMeshes = [];
    this.geoBoxBodies = [];
    this.geoMultiBoxMeshes = [];
    this.geoMultiBoxBodies = [];
    this.geo3DObjBoxMeshes = [];
    this.geo3DObjBoxBodies = [];
  }

}
export default GeoUtils;

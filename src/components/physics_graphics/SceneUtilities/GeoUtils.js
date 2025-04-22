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
      geometry.parameters.width / 2,
      geometry.parameters.height / 2,
      geometry.parameters.depth / 2
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
      // new THREE.MeshPhongMaterial({
      //   map: this.textureLoader.load(this.imageUtils.nebula),
      //   color: 0x00FF00 * Math.random(0x00FF00)
      // }),
      // shader.shaderMaterials().sawMaterial,
      // shader.shaderMaterials().explosiveMaterial,
      // shader.shaderMaterials().sawMaterial,
      // Top
      // this.shader.blendedLucentMaterial,
      new THREE.MeshPhongMaterial({
        map: this.textureLoader.load(this.imageUtils.concert_lights),
        color: 0x00FF00 * Math.random(0x00FF00)
      }),
      this.shader.dragonCityMaterial,
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

  createShaderCoordinates(l, b, scale = 1.0) {
    // Direct use with optional scaling
    const resolution = new THREE.Vector2(
      Math.floor(l * scale),
      Math.floor(b * scale)
    );
  
    return resolution;
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
    this.wiredBoundaryObj = {mesh: this.multifacedBoundaryBox, mass};
  }

  createMultifacedBoundaryBox(boundary, mass = 0, {
    top = this.shader.terrainManager.wiredCityTerrainSDFShader,
    bottom = this.shader.terrainManager.wiredCityTerrainSDFShader,
    left = this.shader.tunnelManager.tubeCityShader,
    right = this.shader.skylineManager.ceasarsShader, // skylineManager.glassSkylineShshaders.// front = this.shader.lucentManager.blendedLucentShader,
    front = this.shader.mangroveManager.mangroveSwampShader, // mangroveSwampShader, //dragonCityManager.dragonCityTerrainShader,// tropicalRainForestShaderlakeManager.blueHavenShader, // bugManager.metalBugShader, // dragonCityManager.dragonCityTerrainShader, // ldragonCityManager.dragonCityTerrainShader, // lakeManager.giantRipplesShader,//parkCityManager.electricCloudShader, //fortressMansionShader, //landScapeManager.landScapeShader, //sandyPlainManager.dancingCreatureShader,//sandGalaxyMaterial,// //lucentManager.blendedLucentShader, // dragonCityManager.flyingDragonTerrainShader, //dragonCityTerrainShader, //terrestialManager.terrestialDragonShader,
    back = this.shader.terrestialManager.terrestialDragonShader,//terrestialMosaicShader//terrestialDragonShader, //lucentManager.blendedLucentShader,
  } = {}){
    // Ensure shaders exist before applying
    if (!this.shader) {
      console.error("Shader manager not initialized!");
      return;
    }
  
    const geometry = new THREE.BoxGeometry(boundary, boundary, boundary);
  
    const shaderFaces = [left, right, top, bottom, front, back];
    const materials = shaderFaces.map(shader => new THREE.ShaderMaterial({
      uniforms: shader.uniforms,
      color: { value: new THREE.Color(this.randomHexColor()) },
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      wireframe: false,
    }));
  
    this.multifacedBoundaryBox = new THREE.Mesh(geometry, materials);
    this.scene.add(this.multifacedBoundaryBox);
    this.cubeBoundaryMeshes.push(this.multifacedBoundaryBox);
 
    const pos = this.multifacedBoundaryBox.position;
    const velocity = 0.0;
    const sides = {
      top: pos.clone().add(new THREE.Vector3(0, boundary / 2, 0)),
      bottom: pos.clone().add(new THREE.Vector3(0, -boundary / 2, 0)),
      left: pos.clone().add(new THREE.Vector3(-boundary / 2, 0, 0)),
      right: pos.clone().add(new THREE.Vector3(boundary / 2, 0, 0)),
      front: pos.clone().add(new THREE.Vector3(0, 0, boundary / 2)),
      back: pos.clone().add(new THREE.Vector3(0, 0, -boundary / 2))
    };
  
    // Store position and sides information
    this.boundaryObj = { 
      mesh: this.multifacedBoundaryBox, 
      mass,
      position: pos,
      sides,
      velocity
    };

    const body = this.createPhysicsBody(this.multifacedBoundaryBox, mass);
    this.cubeBoundaryBodies.push(body);
  }

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
    // Wired Boundary Meshes
    if (Array.isArray(this.wiredBoundaryMeshes)) {
      this.wiredBoundaryMeshes.forEach(mesh => {
        if (mesh.material && mesh.material.dispose) {
          mesh.material.dispose();
        }
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        this.scene.remove(mesh);
      });
    }
  
    // Multifaced Boundary Meshes
    if (Array.isArray(this.cubeBoundaryMeshes)) {
      this.cubeBoundaryMeshes.forEach(mesh => {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => {
            if (mat && mat.dispose) {
              mat.dispose();
            }
          });
        } else if (mesh.material && mesh.material.dispose) {
          mesh.material.dispose();
        }
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        this.scene.remove(mesh);
      });
    }
  
    // Remove physics bodies
    if (Array.isArray(this.wiredBoundaryBodies)) {
      this.wiredBoundaryBodies.forEach(body => this.world.removeBody(body));
    }
  
    if (Array.isArray(this.cubeBoundaryBodies)) {
      this.cubeBoundaryBodies.forEach(body => this.world.removeBody(body));
    }
  
    // Clear arrays
    this.wiredBoundaryMeshes = [];
    this.wiredBoundaryBodies = [];
    this.cubeBoundaryMeshes = [];
    this.cubeBoundaryBodies = [];
  
    // Existing cleanup (if still needed)
    if (Array.isArray(this.geoBoxMeshes)) {
      this.geoBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }
  
    if (Array.isArray(this.geoMultiBoxMeshes)) {
      this.geoMultiBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }
  
    if (Array.isArray(this.geo3DObjBoxMeshes)) {
      this.geo3DObjBoxMeshes.forEach(mesh => this.scene.remove(mesh));
    }
  
    if (Array.isArray(this.geoBoxBodies)) {
      this.geoBoxBodies.forEach(body => this.world.removeBody(body));
    }
  
    if (Array.isArray(this.geoMultiBoxBodies)) {
      this.geoMultiBoxBodies.forEach(body => this.world.removeBody(body));
    }
  
    if (Array.isArray(this.geo3DObjBoxBodies)) {
      this.geo3DObjBoxBodies.forEach(body => this.world.removeBody(body));
    }
  
    this.geoBoxMeshes = [];
    this.geoBoxBodies = [];
    this.geoMultiBoxMeshes = [];
    this.geoMultiBoxBodies = [];
    this.geo3DObjBoxMeshes = [];
    this.geo3DObjBoxBodies = [];
  }  

}
export default GeoUtils;

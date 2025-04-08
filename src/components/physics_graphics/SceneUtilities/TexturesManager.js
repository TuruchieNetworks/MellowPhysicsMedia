import * as THREE from 'three';

class TexturesManager {
  constructor(imageUtils, textureLoader, urls) {
    this.urls = urls;
    this.imageUtils = imageUtils;
    this.textureLoader = textureLoader;
    this.texturedMaterials = [];

    this.loadTexturedMaterials();
  }

  // Load Textured Materials
  loadTexturedMaterial(URL) {
    const mat = new THREE.MeshPhongMaterial({ map: this.textureLoader.load(URL) });
    return mat;
  }

  // Load Textured Materials
  loadTexturedMaterials() {
    const randomIndex = Math.floor(Math.random() * this.urls.length);
    // const URLs = this.imageUtils.images.concerts;
    this.urls.forEach(url => {
      const mat  = new THREE.MeshPhongMaterial({ map: this.textureLoader.load(url) });
      this.texturedMaterials.push(mat);
    });
    this.randomTexturedMaterial = this.texturedMaterials[randomIndex];
  }

  getTexturedMaterialByName(name){
    const url = this.imageUtils.images.concerts[name];
    const texturedMaterial = this.loadTexturedMaterial(url);
    return texturedMaterial;
  }

  // Dispose of Textures and Materials
  dispose() {
    this.texturedMaterials.forEach(material => {
      if (material && material.map) {
        material.map.dispose();  // Dispose of texture
      }
      if (material && material.dispose) {
        material.dispose();  // Dispose of material
      }
    });
    // this.texturedMaterials.length = 0;  // Clear the array after disposal
  }
}
export default TexturesManager;
class ListPopulator {
  constructor(shaderManager) {
    this.shaderManager = shaderManager || {};
  
  this.defaultKeys = [
    'wiredCityTerrainSDFShader', 
    'tubeCityShader',
    'ceasarsShader',
    'purpleStormShader',
    'terrestialDragonShader'
  ];

  this.defaultFaces = ['top', 'bottom', 'left', 'right', 'front', 'back'];
  
}


  getDefaultList() {
    const keys = [
      this.shaderManager.wiredCityTerrainSDFShader, // top
      this.shaderManager.wiredCityTerrainSDFShader, // bottom
      this.shaderManager.tubeCityShader,            // left
      this.shaderManager.ceasarsShader,             // right
      this.shaderManager.purpleStormShader,         // front
      this.shaderManager.terrestialDragonShader     // back
    ];

    this.defaultKeys = keys;
    return keys;

  }

  getList(source = this.shaderManager, keys = this.defaultKeys, fallback = null) {
    if (!source || typeof source !== 'object') {
      console.warn("getList: Invalid source provided. Returning empty array.");
      return [];
    }
    if (!Array.isArray(keys)) throw new Error("Expected an array of keys.");
    
    const faces = keys.map(key => {
      const value = source[key];
      if (!value && fallback !== null) console.warn(`Key '${key}' not found. Using fallback.`);
      return value || fallback;
    });
    return faces;
  }

  getMappedList(source = this.shaderManager, keys = this.defaultKeys, labels = this.defaultFaces, fallback = null) {
    if (!source || typeof source !== 'object') {
      console.warn("getMappedList: Invalid source provided. Returning empty object.");
      return {};
    }
    if (!Array.isArray(keys) || !Array.isArray(labels))
      throw new Error("Keys and labels must be arrays.");
    if (keys.length !== labels.length)
      throw new Error("Keys and labels must match in length.");

    const result = {};
    for (let i = 0; i < labels.length; i++) {
      const value = source[keys[i]];
      if (!value && fallback !== null) console.warn(`Key '${keys[i]}' not found. Using fallback.`);
      result[labels[i]] = value || fallback;
    }
    return result;
  }

  getRandomList(source = this.shaderManager, count = 6, fallback = null) {
    if (!source || typeof source !== 'object') {
      console.warn("getRandomList: Invalid source provided. Returning empty array.");
      return [];
    }
    const keys = Object.keys(source);
    const shuffled = [...keys].sort(() => 0.5 - Math.random());
    return this.getList(source, shuffled.slice(0, count), fallback);
  }

  getById(source = this.shaderManager, index, fallback = null) {
    if (!source || typeof source !== 'object') {
      console.warn("getById: Invalid source provided. Returning fallback.");
      return fallback;
    }
    const keys = Object.keys(source);
    if (index < 0 || index >= keys.length) {
      console.warn(`Index '${index}' out of bounds. Using fallback.`);
      return fallback;
    }
    const key = keys[index];
    return source[key] || fallback;
  }

  getByName(source = this.shaderManager, name, fallback = null) {
    if (!source || typeof source !== 'object') {
      console.warn("getByName: Invalid source provided. Returning fallback.");
      return fallback;
    }
    const value = source[name];
    if (!value && fallback !== null) console.warn(`Key '${name}' not found. Using fallback.`);
    return value || fallback;
  }
}

export default ListPopulator;
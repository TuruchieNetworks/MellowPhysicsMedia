class Params {
  constructor() {
    this.loadParams();
  }
  loadParams(){
    this.speed = 5.0; 
    this.speedFactor = 1;
    this.deltaTime = 1 / 60;
    this.shapeFactor = 0.5;
    this.explodeIntensity = 0.1;
    this.boundary = 80;
    this.thickness = 4.2;
    this.flatShading = true;
    this.u_frequency = 0.0;
    this.withFiniteGround = false;
    this.withPlanePad = true;
    this.withPlaneBox = true;
    this.mass = 13.1; 
    this.radius = 1.6;
    this.cubeSize = 50;
    this.sleepTimeLimit = 3;
    this.linearDamping = 0.1;
    this.sleepSpeedLimit = 3.1;
    this.time = Date.now();
  
    // light params
    this.axesSize = 5;
    this.gridSize = 30; 
    this.gridDivisions = 80;
    this.withHelpers = true;
  }

}

export default Params;

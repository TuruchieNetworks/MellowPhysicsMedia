import * as THREE from 'three';
import * as CANNON from "cannon-es";

class GaussianDistribution {
  constructor() {
    this.meanVelocity = 0;
    this.stdDevVelocity = 1.943;

    this.meanMass = 2;
    this.stdDevMass = 0.5;
  }

  generateRandomIndex(index = 3) {
    return Math.floor(Math.random(index) * index);
  }

  randomGaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  addRandomForce() {
      const randomForce = new CANNON.Vec3(
          Math.random() * 5 - 2.5, 
          Math.random() * 5 + 10, 
          Math.random() * 5 - 2.5
      );

      this.randomForce = randomForce;
      return randomForce;
  }

  addRandomOffsetForce(range = { x: 5, y: 10, z: 5 }, offset = { x: -2.5, y: 10, z: -2.5 }) {
    return new CANNON.Vec3(
        Math.random() * range.x + offset.x, 
        Math.random() * range.y + offset.y, 
        Math.random() * range.z + offset.z
    );
}

  generateRandomPositions() {
    const x = (Math.random() - 0.5) * 10;
    const y = Math.random() * 10 + 10;
    const z = (Math.random() - 0.5) * 10;
    return {x, y, z};
  }

  generateGaussianRandomPositions() {
    const x = (Math.random() - 0.5 + this.stdDevVelocity * this.randomGaussian()) * 10;
    const y = Math.random() * 10 + 10 + this.stdDevVelocity * this.randomGaussian();
    const z = (Math.random() - 0.5 + this.stdDevVelocity * this.randomGaussian()) * 10;
    return {x, y, z};
  }

  getVelocity() {
    return new THREE.Vector3(
      this.meanVelocity + this.stdDevVelocity * this.randomGaussian(),
      this.meanVelocity + this.stdDevVelocity * this.randomGaussian(),
      this.meanVelocity + this.stdDevVelocity * this.randomGaussian()
    );
  }

  // Generate a 1/x² distributed random number in the range [min, max]
  randomInverseSquare(min, max) {
    const A = 1 / (min * min);
    const B = 1 / (max * max);
    const r = Math.random();
    return 1 / Math.sqrt(A + r * (B - A));
  }

  // Generate velocity with 1/x² distribution
  getInverseSquareVelocity(min = 1, max = 10) {
    return new THREE.Vector3(
      (Math.random() > 0.5 ? 1 : -1) * this.randomInverseSquare(min, max),
      (Math.random() > 0.5 ? 1 : -1) * this.randomInverseSquare(min, max),
      (Math.random() > 0.5 ? 1 : -1) * this.randomInverseSquare(min, max)
    );
  }

  getMass() {
    return Math.max(this.meanMass + this.stdDevMass * this.randomGaussian(), 0.1);
  }

  generateGaussianValues(count) {
    const gaussianValues = [];

    for (let i = 0; i < count; i++) {
      const mass = this.getMass();
      const velocity = this.getVelocity();
      gaussianValues.push({
        mass,
        velocity,
      });
    }

    return gaussianValues;
  }
}

export default GaussianDistribution;

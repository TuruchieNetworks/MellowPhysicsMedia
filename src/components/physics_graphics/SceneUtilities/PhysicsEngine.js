import * as THREE from 'three';

class PhysicsEngine {
    constructor(mouseUtil, shaderManager) {
        this.mouseUtil = mouseUtil;
        this.shaderManager = shaderManager;
        this.dampingFactor = 0.99;
        this.gravity = new THREE.Vector3(0, -0.1, 0);
        this.gravityEnabled = true;

        // 🔥 Define bounce factor
        this.bounceFactor = 0.8;
    }

    // Handle Wall Collision
    checkWallCollision(meshObj) {
        const halfCube = this.cubeSize / 2;
        const { x, y, z } = meshObj.position;

        // Check collisions in each axis and reverse velocity if collision occurs
        if (x - meshObj.radius < -halfCube || x + meshObj.radius > halfCube) {
            meshObj.velocity.x *= -1;
        }
        if (y - meshObj.radius < -halfCube || y + meshObj.radius > halfCube) {
            meshObj.velocity.y *= -1;
        }
        if (z - meshObj.radius < -halfCube || z + meshObj.radius > halfCube) {
            meshObj.velocity.z *= -1;
        }
    }

    // Adjust the ground collision method to reflect velocity and include bounce damping
    checkGroundCollision(meshObj) {
        // Assuming ground plane is at y = 0
        if (meshObj.mesh.position.y - meshObj.radius <= 0) {
            meshObj.mesh.position.y = meshObj.radius; // Set meshObj above the ground
            meshObj.velocity.y *= -0.8; // Reflect velocity on collision with ground (bounce)

            // Apply damping to simulate energy loss
            meshObj.velocity.x *= 0.98 * this.bounceFactor; // Damping factor for x velocity
            meshObj.velocity.z *= 0.98 * this.bounceFactor; // Damping factor for z velocity
        }
    }

    // Handle Sphere Collision
    handleSphereCollision(objA, objB) {
        if (objA && objB) {
            const posA = objA.mesh.position;
            const posB = objB.mesh.position;
            const distVec = new THREE.Vector3().subVectors(posA, posB);
            const distance = distVec.length();

            const minDistance = objA.radius + objB.radius;

            if (distance < minDistance) {
                distVec.normalize();
                const overlap = minDistance - distance;

                // Push spheres apart stronger using bounce factor
                posA.add(distVec.clone().multiplyScalar(overlap / 2 * this.bounceFactor));
                posB.sub(distVec.clone().multiplyScalar(overlap / 2 * this.bounceFactor));

                // Calculate impulse
                const relVel = new THREE.Vector3().subVectors(objA.velocity, objB.velocity);
                const velAlongDist = relVel.dot(distVec);

                if (velAlongDist > 0) return; // Prevent unnecessary repelling

                // Apply bounce factor to the impulse force
                const impulse = (2.9 * velAlongDist * this.bounceFactor) / (objA.mass + objB.mass);
                objA.velocity.sub(distVec.clone().multiplyScalar(impulse * objB.mass));
                objB.velocity.add(distVec.clone().multiplyScalar(impulse * objA.mass));
            }
        }
    }

    // handleSphereCollision(objA, objB) {
    //     if (objA && objB) {
    //         const posA = objA.mesh.position;
    //         const posB = objB.mesh.position;
    //         const distVec = new THREE.Vector3().subVectors(posA, posB);
    //         const distance = distVec.length();

    //         // Calculate minimum distance for collision (sum of radii)
    //         const minDistance = objA.radius + objB.radius;

    //         if (distance < minDistance) {
    //             distVec.normalize();
    //             const overlap = minDistance - distance;

    //             // Push spheres apart to resolve overlap
    //             posA.add(distVec.clone().multiplyScalar(overlap / 2));
    //             posB.sub(distVec.clone().multiplyScalar(overlap / 2));

    //             // Calculate and apply impulse to simulate collision response
    //             const relVel = new THREE.Vector3().subVectors(objA.velocity, objB.velocity);
    //             const velAlongDist = relVel.dot(distVec);

    //             if (velAlongDist > 0) return; // Prevent spheres moving apart from colliding again

    //             const impulse = (2.9 * velAlongDist) / (objA.mass + objB.mass);
    //             objA.velocity.sub(distVec.clone().multiplyScalar(impulse * objB.mass));
    //             objB.velocity.add(distVec.clone().multiplyScalar(impulse * objA.mass));
    //         }
    //     }
    // }
    handleStaticCollision(sphereObj, staticObj) {
        if (!sphereObj || !staticObj) return;

        const spherePos = sphereObj.mesh.position;
        const sphereRadius = sphereObj.radius;

        // Get bounding box of the static object
        const staticBoundingBox = new THREE.Box3().setFromObject(staticObj);

        if (staticBoundingBox.distanceToPoint(spherePos) < sphereRadius) {
            console.log("Sphere hit a static object!");

            // Calculate collision normal (approximate)
            const boxCenter = staticBoundingBox.getCenter(new THREE.Vector3());
            const collisionNormal = new THREE.Vector3().subVectors(spherePos, boxCenter).normalize();

            // Smoothly reflect velocity instead of an instant flip
            const velocityDotNormal = sphereObj.velocity.dot(collisionNormal);
            const reflection = collisionNormal.multiplyScalar(-1.8 * velocityDotNormal); // Less harsh reflection
            sphereObj.velocity.lerp(reflection, 0.4); // Interpolate for smooth response

            // Apply a controlled bounce factor (not a full reversal)
            sphereObj.velocity.multiplyScalar(0.85); // Gentle damping

            // Reduce push-out force to prevent overcorrection
            sphereObj.mesh.position.add(collisionNormal.clone().multiplyScalar(sphereRadius * 0.95));

            // Handle energy loss during collision (friction, inelasticity, etc.)
            // this.handleEnergyLoss(sphereObj);  // Energy loss for object A
        }
    }

    // Handle Dynamic Collisions
    handleDynamicCollision(objA, objB) {
        if (!objA || !objB) return;

        const posA = objA.mesh.position;
        const posB = objB.mesh.position;
        const velocityA = objA.velocity;
        const velocityB = objB.velocity;
        const radiusA = objA.radius;
        const radiusB = objB.radius;

        // Calculate the vector between the two objects
        const distVec = new THREE.Vector3().subVectors(posA, posB);
        const distance = distVec.length();

        // Calculate the minimum distance for a collision (sum of radii)
        const minDistance = radiusA + radiusB;

        // If they are colliding
        if (distance < minDistance) {
            distVec.normalize();

            // Calculate relative velocity
            const relativeVelocity = new THREE.Vector3().subVectors(velocityA, velocityB);
            const velocityAlongDist = relativeVelocity.dot(distVec);

            // If the relative velocity is positive, they are moving away and no further collision occurs
            if (velocityAlongDist > 0) return;

            // Calculate impulse (force applied during collision) based on mass and velocity
            const impulse = (2 * velocityAlongDist) / (objA.mass + objB.mass);

            // Apply impulse to both objects (conserving momentum)
            velocityA.sub(distVec.clone().multiplyScalar(impulse * objB.mass));
            velocityB.add(distVec.clone().multiplyScalar(impulse * objA.mass));

            // After collision, apply angular momentum to simulate spin (if off-center collision)
            const normal = distVec.clone();
            const tangentialA = velocityA.clone().sub(normal.clone().multiplyScalar(normal.dot(velocityA)));
            const tangentialB = velocityB.clone().sub(normal.clone().multiplyScalar(normal.dot(velocityB)));

            // Apply rotational effect based on tangential velocity
            objA.angularVelocity.add(tangentialA.multiplyScalar(0.1));  // Apply some fraction of energy to spin
            objB.angularVelocity.add(tangentialB.multiplyScalar(0.1));

            // Apply damping or friction to reduce spin over time
            velocityA.multiplyScalar(0.98);
            velocityB.multiplyScalar(0.98);

            // Handle energy loss during collision (friction, inelasticity, etc.)
            this.handleEnergyLoss(objA);  // Energy loss for object A
            this.handleEnergyLoss(objB);  // Energy loss for object B
        }
    }

    // Assuming energy loss through friction or other factors
    handleEnergyLoss(sphereObj) {
        const originalVelocity = sphereObj.velocity.clone();

        // Simulate energy loss: Friction or damping
        const frictionLoss = 0.98; // Example friction or damping factor
        sphereObj.velocity.multiplyScalar(frictionLoss); // Apply loss

        // Calculate energy loss in kinetic energy
        const energyLoss = 0.5 * sphereObj.mass * (originalVelocity.lengthSq() - sphereObj.velocity.lengthSq());

        // Adjust energy redistribution (could be used for spin, heat, etc.)
        this.redistributeEnergy(energyLoss, sphereObj);
    }

    // Redistribute energy, for example into rotational energy or minor adjustments
    redistributeEnergy(energyLoss, meshObj) {
        // For example, slightly increase rotational energy based on energy loss
        if (energyLoss > 0) {
            // Use energy loss to create spin or add slight force to surrounding objects
            console.log("Energy Loss:", energyLoss);
            // Example: increase angular velocity
            this.addSpinToObject(energyLoss, meshObj);
        }
    }

    // Add slight spin (could be randomized or based on collision angle)
    addSpinToObject(energyLoss, sphereObj) {
        if (sphereObj) {
            const spinFactor = energyLoss * 0.1; // Some factor to convert energy to spin
            const spinDirection = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
            sphereObj.angularVelocity.add(spinDirection.multiplyScalar(spinFactor));
        }
    }

    // Handle Plane Collisions
    handlePlaneCollision(obj, mouseUtil = this.mouseUtil) {
        if (!mouseUtil || !mouseUtil.interactionPlane) return;

        // Use the plane normal from MouseUtils
        const planeNormal = mouseUtil.planeNormal;
        const planePoint = mouseUtil.intersectionPoint; // Assuming this represents a valid point on the plane

        const objToPlane = new THREE.Vector3().subVectors(obj.mesh.position, planePoint);
        const distanceToPlane = objToPlane.dot(planeNormal);

        // Ensure bounce only happens within plane dimensions
        const withinPlaneBounds =
            Math.abs(obj.mesh.position.x) < obj.mesh.geometry.parameters.width / 2 &&
            Math.abs(obj.mesh.position.z) < obj.mesh.geometry.parameters.depth / 2;

        if (Math.abs(distanceToPlane) < obj.radius && withinPlaneBounds) {
            obj.mesh.position.addScaledVector(planeNormal, obj.radius - distanceToPlane);
            obj.velocity.reflect(planeNormal);
            obj.material = this.shaderManager.explosiveMaterial;
        }
    }

    // Toggle gravity on or off
    toggleGravity() {
        this.gravityEnabled = !this.gravityEnabled;
    }

}

export default PhysicsEngine;









//   static checkGroundCollision(mesh, velocity, radius) {
//       if ((mesh.position.y + 1) - radius <= 0) {
//           mesh.position.y = mesh.position.y + 2.0;
//           velocity.y *= -0.8; 
//           velocity.x *= 0.98;
//           velocity.z *= 0.98;
//       }
//   }

//   static handleSphereCollision(meshA, velocityA, radiusA, massA, meshB, velocityB, radiusB, massB) {
//       const posA = meshA.position;
//       const posB = meshB.position;
//       const distVec = new THREE.Vector3().subVectors(posA, posB);
//       const distance = distVec.length();
//       const minDistance = radiusA + radiusB;

//       if (distance < minDistance) {
//           distVec.normalize();
//           const overlap = minDistance - distance;
//           posA.add(distVec.clone().multiplyScalar(overlap / 2));
//           posB.sub(distVec.clone().multiplyScalar(overlap / 2));

//           const relVel = new THREE.Vector3().subVectors(velocityA, velocityB);
//           const velAlongDist = relVel.dot(distVec);
//           if (velAlongDist > 0) return;

//           const impulse = (2.9 * velAlongDist) / (massA + massB);
//           velocityA.sub(distVec.clone().multiplyScalar(2 * impulse * massB));
//           velocityB.add(distVec.clone().multiplyScalar(2 * impulse * massA));
//       }
//   }

//   static handleSceneMeshCollision(mesh, velocity, radius, sceneMeshes) {
//       sceneMeshes.forEach(sceneMesh => {
//           const meshPos = sceneMesh.position;
//           const distVec = new THREE.Vector3().subVectors(mesh.position, meshPos);
//           const distance = distVec.length();
//           const combinedRadius = radius + sceneMesh.geometry.boundingSphere.radius;

//           if (distance < combinedRadius) {
//               distVec.normalize();
//               const overlap = combinedRadius - distance;
//               mesh.position.add(distVec.clone().multiplyScalar(overlap));
//               velocity.reflect(distVec);
//           }
//       });
//   }

//   static handlePlaneCollision(mesh, velocity, radius, planeNormal, planePoint) {
//       const sphereToPlane = new THREE.Vector3().subVectors(mesh.position, planePoint);
//       const distanceToPlane = sphereToPlane.dot(planeNormal);

//       if (Math.abs(distanceToPlane) < radius) {
//           mesh.position.addScaledVector(planeNormal, radius - distanceToPlane);
//           velocity.reflect(planeNormal);
//       }
//   }

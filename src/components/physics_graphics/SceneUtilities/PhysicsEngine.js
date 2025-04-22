import * as THREE from 'three';

class PhysicsEngine {
    constructor(mouseUtil, shaderManager) {
        this.mouseUtil = mouseUtil;
        this.shaderManager = shaderManager;
        this.gravity = new THREE.Vector3(0, -0.1, 0);
        this.gravityEnabled = true;

        // 🔥 Define bounce factor
        this.deltaTime = 0.015625;
        this.shotsFactor = 0.8; // 0.015625;
        this.bounceFactor = 0.8;
        this.dampingFactor = 0.99;
    }

    triggerShaderUniforms(meshObj, collisionPoint = null) {
        const material = meshObj.material;
        if (!material?.uniforms?.customUniforms?.value) return;

        const u = material.uniforms.customUniforms.value;
        const now = performance.now();
        const cooldownMs = 300;

        const position = collisionPoint || meshObj.position;

        if (u.u_meshPosition?.set) {
            u.u_meshPosition.set(position.x, position.y, position.z);
        }

        if (u.u_velocity?.set) {
            u.u_velocity.set(meshObj.velocity.x, meshObj.velocity.y, meshObj.velocity.z);
        }

        if (u.u_rippleOrigin?.set) {
            u.u_rippleOrigin.set(position.x, position.y, position.z);
        }

        if (u.u_intersectionPoint?.set) {
            u.u_intersectionPoint.set(position.x, position.y, position.z);
        }

        if (typeof u.u_rippleTime !== 'undefined') {
            u.u_rippleTime = now * 0.001;
        }

        if (typeof u.u_collisionDetected !== 'undefined') {
            u.u_collisionDetected = 1.0;

            const id = meshObj.uuid || meshObj.id;
            if (this.rippleCooldowns.has(id)) clearTimeout(this.rippleCooldowns.get(id));

            const timeoutId = setTimeout(() => {
                if (typeof u.u_collisionDetected !== 'undefined') {
                    u.u_collisionDetected = 0.0;
                }
                this.rippleCooldowns.delete(id);
            }, cooldownMs);

            this.rippleCooldowns.set(id, timeoutId);
        }
    }

    // Handle Wall Collision
    handleWallCollision(mobileObj, staticObj) {
        if (mobileObj && staticObj) {
            const mobilePosition = mobileObj.mesh.position;
            const staticPosition = staticObj.mesh.position;

            const distVec = new THREE.Vector3().subVectors(mobilePosition, staticPosition);
            const distance = distVec.length();
            const minDistance = mobileObj.radius + staticObj.radius;

            // Check for collision
            const collisionDetected = distance < minDistance;

            if (collisionDetected) {
                distVec.normalize();

                // 🛎️ Capture the hit position BEFORE any movement
                const hitPoint = mobilePosition.clone(); // Capture the exact collision point

                // 🧠 Trigger shader ONLY for the static object (wall) at the hit point
                if (staticObj.material?.isShaderMaterial) this.triggerShaderUniforms(staticObj, hitPoint); // Pass the cloned hitPoint to the wall's material}

                // 🌟 Now resolve the overlap (physical response)
                const overlap = minDistance - distance;

                // Push the mobile object apart using the bounce factor (apply correction)
                mobilePosition.add(distVec.clone().multiplyScalar(overlap / 2 * this.bounceFactor));

                // Calculate impulse for the collision response
                const relVel = new THREE.Vector3().subVectors(mobileObj.velocity, staticObj.velocity);
                const velAlongDist = relVel.dot(distVec);

                if (velAlongDist > 0) return; // Avoid unnecessary repelling if objects are moving apart

                // Apply the bounce factor to the impulse
                const impulse = (2.9 * velAlongDist * this.bounceFactor) / (mobileObj.mass + staticObj.mass);
                mobileObj.velocity.sub(distVec.clone().multiplyScalar(impulse * staticObj.mass));
            }
        }
    }


    detectCollision(sphere, mesh) {
        // Simple bounding box collision check (can expand for more complex shapes)
        const box = new THREE.Box3().setFromObject(mesh);
        return box.intersectsSphere(sphere.mesh.geometry.boundingSphere);
    }

    handleCollision(sphereObj, mesh) {
        // Adjust the position and velocity based on collision
        // For example, reflect the velocity or apply damping
        const collisionNormal = new THREE.Vector3().subVectors(sphereObj.mesh.position, mesh.position).normalize();
        const velocityDot = sphereObj.velocity.dot(collisionNormal);
        const reflection = collisionNormal.multiplyScalar(-1.8 * velocityDot);
        sphereObj.velocity.lerp(reflection, 0.4); // Smooth response

        // Prevent overlapping by adjusting position
        const pushOut = collisionNormal.multiplyScalar(sphereObj.radius * 0.95);
        sphereObj.mesh.position.add(pushOut);
    }

    checkWallCollision(meshObj, boundaryMeshObj) {
        if (!boundaryMeshObj || !meshObj) return;

        const p = meshObj.mesh.position;
        const v = meshObj.velocity;
        const r = meshObj.radius || 1;

        // Directly use the geometry's size if it's a fixed cube
        const geometry = boundaryMeshObj.mesh.geometry;
        let halfCubeX = 0, halfCubeY = 0, halfCubeZ = 0;

        if (geometry instanceof THREE.BoxGeometry) {
            halfCubeX = geometry.parameters.width / 2;
            halfCubeY = geometry.parameters.height / 2;
            halfCubeZ = geometry.parameters.depth / 2;
        } else {
            // Fallback to Box3 for other shapes or dynamic objects
            const cubeSize = new THREE.Vector3();
            new THREE.Box3().setFromObject(boundaryMeshObj.mesh).getSize(cubeSize);
            halfCubeX = cubeSize.x / 2;
            halfCubeY = cubeSize.y / 2;
            halfCubeZ = cubeSize.z / 2;
        }

        // Check for collision and apply bounce
        if (p.x - r < -halfCubeX || p.x + r > halfCubeX) {
            v.x *= -0.9;  // Reverse and apply damping in X
            p.x = THREE.MathUtils.clamp(p.x, -halfCubeX + r, halfCubeX - r); // Prevent object from going through walls
        }
        if (p.y - r < -halfCubeY || p.y + r > halfCubeY) {
            v.y *= -0.9;  // Reverse and apply damping in Y
            p.y = THREE.MathUtils.clamp(p.y, -halfCubeY + r, halfCubeY - r); // Prevent object from going through walls
        }
        if (p.z - r < -halfCubeZ || p.z + r > halfCubeZ) {
            v.z *= -0.9;  // Reverse and apply damping in Z
            p.z = THREE.MathUtils.clamp(p.z, -halfCubeZ + r, halfCubeZ - r); // Prevent object from going through walls
        }
    }

    // Adjust the ground collision method to reflect velocity and include bounce damping
    checkGroundCollision(meshObj) {
        // Assuming ground plane is at y = 0
        if (meshObj.mesh.position.y - meshObj.radius <= 0.0) {
            meshObj.mesh.position.y = meshObj.radius; // Set meshObj above the ground
            meshObj.velocity.y *= -0.98 * this.bounceFactor; // Reflect velocity on collision with ground (bounce)

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

                // Trigger shader uniforms if either object has a shader material
                if (objA.material?.isShaderMaterial) this.triggerShaderUniforms(objA);
                if (objB.material?.isShaderMaterial) this.triggerShaderUniforms(objB);
            }
        }
    }

    // triggerShaderUniforms(meshObj) {
    //     const material = meshObj.material;
    //     if (!material?.uniforms) return;

    //     const u = material.uniforms;
    //     const now = performance.now();
    //     const cooldownMs = 300;

    //     // Set initial collision flags
    //     if (u.u_meshPosition?.value?.set) {
    //         u.u_meshPosition.value.set(
    //             meshObj.position.x,
    //             meshObj.position.y,
    //             meshObj.position.z
    //         );
    //     }

    //     if (u.u_velocity?.value?.set) {
    //         u.u_velocity.value.set(
    //             meshObj.velocity.x,
    //             meshObj.velocity.y,
    //             meshObj.velocity.z
    //         );
    //     }

    //     if (u.u_rippleOrigin?.value?.set) {
    //         u.u_rippleOrigin.value.set(
    //             meshObj.position.x,
    //             meshObj.position.y,
    //             meshObj.position.z
    //         );
    //     }

    //     if (u.u_rippleTime?.value !== undefined) {
    //         u.u_rippleTime.value = now * 0.001;
    //     }

    //     if (u.u_collisionDetected?.value !== undefined) {
    //         // Trigger collision ripple
    //         u.u_collisionDetected.value = 1.0;

    //         // Reset after a delay (debounced by object id)
    //         const id = meshObj.uuid || meshObj.id;
    //         if (this.rippleCooldowns.has(id)) clearTimeout(this.rippleCooldowns.get(id));

    //         const timeoutId = setTimeout(() => {
    //             if (u.u_collisionDetected?.value !== undefined) {
    //                 u.u_collisionDetected.value = 0.0;
    //             }
    //             this.rippleCooldowns.delete(id);
    //         }, cooldownMs);

    //         this.rippleCooldowns.set(id, timeoutId);
    //     }
    // }

    // triggerShaderUniforms(meshObj) {
    //     const material = meshObj.material;

    //     if (!material?.uniforms) return;

    //     const u = material.uniforms;

    //     if (u.u_meshPosition?.value?.set) {
    //         u.u_meshPosition.value.set(
    //             meshObj.position.x,
    //             meshObj.position.y,
    //             meshObj.position.z
    //         );
    //     }

    //     if (u.u_velocity?.value?.set) {
    //         u.u_velocity.value.set(
    //             meshObj.velocity.x,
    //             meshObj.velocity.y,
    //             meshObj.velocity.z
    //         );
    //     }

    //     if (u.u_rippleOrigin?.value?.set) {
    //         u.u_rippleOrigin.value.set(
    //             meshObj.position.x,
    //             meshObj.position.y,
    //             meshObj.position.z
    //         );
    //     }

    //     if (u.u_rippleTime?.value !== undefined) {
    //         u.u_rippleTime.value = performance.now() * 0.001;
    //     }

    //     // Optional: pass custom flags, like collision intensity
    //     if (u.u_collisionDetected?.value !== undefined) {
    //         u.u_collisionDetected.value = 1.0;
    //     }
    // }

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

    // Handle Static Collisions
    // handleStaticCollision(mobileObj, staticObj) {
    //     if (!mobileObj || !staticObj) return;

    //     const spherePos = mobileObj.mesh.position;
    //     const sphereRadius = mobileObj.radius;

    //     // Bounding box for the static object
    //     const staticBoundingBox = new THREE.Box3().setFromObject(staticObj);

    //     const distance = staticBoundingBox.distanceToPoint(spherePos);
    //     if (distance < sphereRadius) {
    //         console.log("Sphere hit a static object!");

    //         // Approximate collision normal
    //         const boxCenter = staticBoundingBox.getCenter(new THREE.Vector3());
    //         const collisionNormal = new THREE.Vector3().subVectors(spherePos, boxCenter).normalize();

    //         // Reflect velocity smoothly
    //         const velocityDotNormal = mobileObj.velocity.dot(collisionNormal);
    //         const reflection = collisionNormal.clone().multiplyScalar(-1.8 * velocityDotNormal);
    //         mobileObj.velocity.lerp(reflection, 0.4); // Smooth reflection

    //         // Damping the result velocity slightly
    //         mobileObj.velocity.multiplyScalar(0.85);

    //         // Soft push-out to avoid interpenetration
    //         mobileObj.mesh.position.add(collisionNormal.clone().multiplyScalar(sphereRadius * 0.95));

    //         // Apply energy loss
    //         this.handleEnergyLoss(mobileObj);

    //         // Optional: trigger sound/particle/uniform effect here
    //     }
    // }


    // handleStaticCollision(mobileObj, staticObj) {
    //     if (mobileObj && staticObj) {
    //         const mobilePosition = mobileObj.mesh.position;
    //         const staticPosition = staticObj.mesh.position;
    //         const distVec = new THREE.Vector3().subVectors(mobilePosition, staticPosition);
    //         const distance = distVec.length();

    //         const minDistance = mobileObj.radius + staticObj.radius;

    //         if (distance < minDistance) {
    //             distVec.normalize();
    //             const overlap = minDistance - distance;

    //             // Push spheres apart stronger using bounce factor
    //             mobilePosition.add(distVec.clone().multiplyScalar(overlap / 2 * this.bounceFactor));
    //             staticPosition.sub(distVec.clone().multiplyScalar(overlap / 2 * this.bounceFactor));

    //             // Calculate impulse
    //             const relVel = new THREE.Vector3().subVectors(mobileObj.velocity, staticObj.velocity);
    //             const velAlongDist = relVel.dot(distVec);

    //             if (velAlongDist > 0) return; // Prevent unnecessary repelling

    //             // Apply bounce factor to the impulse force
    //             const impulse = (2.9 * velAlongDist * this.bounceFactor) / (mobileObj.mass + staticObj.mass);
    //             mobileObj.velocity.sub(distVec.clone().multiplyScalar(impulse * staticObj.mass));
    //             staticObj.velocity.add(distVec.clone().multiplyScalar(impulse * mobileObj.mass));

    //             // Trigger shader uniforms if either object has a shader material
    //             if (mobileObj.material?.isShaderMaterial) this.triggerShaderUniforms(mobileObj);
    //             if (staticObj.material?.isShaderMaterial) this.triggerShaderUniforms(staticObj);
    //         }
    //     }
    // }
    // Handle Sphere Box collision
    handleStaticCollision(sphereObj, boxObj) {
        if (!sphereObj || !boxObj) return;

        const p = sphereObj.mesh.position.clone();
        const v = sphereObj.velocity.clone();
        const r = sphereObj.radius || 1;
        const m = sphereObj.mass || 1;

        const box = boxObj;
        const boxPos = box.position.clone();

        const boxSize = new THREE.Vector3();
        new THREE.Box3().setFromObject(box).getSize(boxSize);
        const halfSize = boxSize.clone().multiplyScalar(0.5);

        const localPoint = p.clone().sub(boxPos);
        const clamped = new THREE.Vector3(
            THREE.MathUtils.clamp(localPoint.x, -halfSize.x, halfSize.x),
            THREE.MathUtils.clamp(localPoint.y, -halfSize.y, halfSize.y),
            THREE.MathUtils.clamp(localPoint.z, -halfSize.z, halfSize.z)
        );
        const closestPoint = clamped.add(boxPos);

        const distVec = p.clone().sub(closestPoint);
        const distance = distVec.length();

        if (distance < r) {
            const n = distVec.clone().normalize();  // Normal
            const overlap = r - distance;

            // Push sphere out of box
            sphereObj.mesh.position.add(n.clone().multiplyScalar(overlap * this.bounceFactor));

            // Calculate relative velocity (assuming box is static, otherwise subtract its velocity too)
            const relVel = v.clone(); // - boxObj.velocity if dynamic
            const velAlongNormal = relVel.dot(n);

            if (velAlongNormal < 0) {
                // Calculate impulse: J = -(1+e) * (v⋅n) / (1/m1 + 1/m2)
                const e = this.bounceFactor;
                const j = -(1 + e) * velAlongNormal / (1 / m);  // No m2, box is static

                // Amplify impulse if collision is near edge or corner (less surface area)
                const edgeFactor = 1 + 2 * (1 - this.getFlatnessFactor(localPoint, halfSize)); // range: 1 to ~3
                const finalImpulse = j * edgeFactor;

                // Apply impulse to velocity
                const impulseVec = n.clone().multiplyScalar(finalImpulse);
                sphereObj.velocity.add(impulseVec.negate());

                if (sphereObj.material?.isShaderMaterial) this.triggerShaderUniforms(sphereObj);
            }
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

    applyDamping(meshObj) {
        const damping = 0.98; // Or tweak this per object/material
        meshObj.velocity.multiplyScalar(damping);

        // Optional: Add rotational/angular damping
        if (meshObj.angularVelocity) {
            meshObj.angularVelocity.multiplyScalar(damping);
        }
    }

    // Ground collision with bounce and damping
    // checkGroundCollision(meshObj) {
    //     const groundY = 0.0;
    //     const yOverlap = meshObj.mesh.position.y - meshObj.radius;

    //     if (yOverlap <= 0.001) {
    //         // Resolve penetration
    //         meshObj.mesh.position.y = meshObj.radius;

    //         // Invert and dampen vertical velocity
    //         meshObj.velocity.y *= -0.98 * this.bounceFactor;

    //         // Apply horizontal damping
    //         meshObj.velocity.x *= 0.98 * this.bounceFactor;
    //         meshObj.velocity.z *= 0.98 * this.bounceFactor;
    //     }
    // }
    // Function to apply gravity, update positions and apply damping
    applyGravityAndUpdatePositions = (meshObj, deltaTime) => {
        // Apply gravity
        meshObj.velocity.add(this.gravity);

        // Dampen the velocity
        meshObj.velocity.multiplyScalar(this.dampingFactor);

        // Update position based on velocity
        meshObj.mesh.position.add(meshObj.velocity.clone().multiplyScalar(deltaTime));
    };

    // Assuming energy loss through friction or other factors
    handleEnergyLoss(meshObj) {
        const originalVelocity = meshObj.velocity.clone();

        // Simulate energy loss: Friction or damping
        const frictionLoss = 0.98; // Example friction or damping factor
        meshObj.velocity.multiplyScalar(frictionLoss); // Apply loss

        // Calculate energy loss in kinetic energy
        const energyLoss = 0.5 * meshObj.mass * (originalVelocity.lengthSq() - meshObj.velocity.lengthSq());

        // Adjust energy redistribution (could be used for spin, heat, etc.)
        this.redistributeEnergy(energyLoss, meshObj);
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
    addSpinToObject(energyLoss, meshObj) {
        if (meshObj) {
            const spinFactor = energyLoss * 0.1; // Some factor to convert energy to spin
            const spinDirection = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
            meshObj.velocity.add(spinDirection.multiplyScalar(spinFactor));
        }
    }

    updatePhysicsEngine(meshObj, meshObjs, sceneObjs, boundaryMeshObj) {
        if (!meshObj || !boundaryMeshObj) return;

        // Apply gravity and update positions
        this.applyGravityAndUpdatePositions(meshObj, this.shotsFactor / 1.2);

        // Update position based on velocity
        meshObj.mesh.position.add(meshObj.velocity.clone().multiplyScalar(0.016));

        // ✅ Check boundary collision
        this.checkWallCollision(meshObj, boundaryMeshObj);

        // ✅ Ground collision
        this.checkGroundCollision(meshObj);

        // ✅ Sphere-to-sphere collisions
        if (meshObjs?.length > 0) {
            meshObjs.forEach(otherSphere => {
                if (meshObj !== otherSphere && otherSphere.mesh) {
                    this.handleSphereCollision(meshObj, otherSphere);
                }
            });
        }

        // ✅ Static object collisions
        if (sceneObjs?.length > 0) {
            sceneObjs.forEach(sceneMeshObj => {
                this.handleStaticCollision(meshObj, sceneMeshObj);
            });
        }

        // ✅ Energy loss & extra collisions
        // this.handleEnergyLoss(meshObj);
        // this.handlePlaneCollision(meshObj, this.mouseUtils);
    }

    // updatePhysicsEngine(meshObj, meshObjs, sceneObjs, boundaryMeshObj) {
    //     if (!meshObj || meshObjs.length < 1 || sceneObjs.length < 1) return;

    //     // Apply gravity and update positions
    //     this.applyGravityAndUpdatePositions(meshObj, this.shotsFactor / 1.2);

    //     // Update position based on velocity
    //     meshObj.mesh.position.add(meshObj.velocity.clone().multiplyScalar(0.016));

    //     // ✅ Use boundaryMeshObj here
    //     this.checkWallCollision(meshObj, boundaryMeshObj);

    //     this.checkGroundCollision(meshObj);

    //     meshObjs.forEach(otherSphere => {
    //         if (meshObj !== otherSphere && otherSphere.mesh) {
    //             this.handleSphereCollision(meshObj, otherSphere);
    //         }
    //     });

    //     // ✅ Static Interactions
    //     if (sceneObjs.length > 0) {
    //         sceneObjs.forEach(sceneMeshObj => {
    //             this.handleStaticCollision(meshObj, sceneMeshObj);
    //         });
    //     }

    //     this.handleEnergyLoss(meshObj);
    //     this.handlePlaneCollision(meshObj, this.mouseUtils); // Handle plane collision
    // }


    // Toggle gravity on or off
    toggleGravity() {
        this.gravityEnabled = !this.gravityEnabled;
    }
}

export default PhysicsEngine;













    // Handle Wall Collision
    // checkWallCollision(meshObj) {
    //     const halfCube = this.cubeSize / 2;
    //     const { x, y, z } = meshObj.position;

    //     // Check collisions in each axis and reverse velocity if collision occurs
    //     if (x - meshObj.radius < -halfCube || x + meshObj.radius > halfCube) {
    //         meshObj.velocity.x *= -1;
    //     }
    //     if (y - meshObj.radius < -halfCube || y + meshObj.radius > halfCube) {
    //         meshObj.velocity.y *= -1;
    //     }
    //     if (z - meshObj.radius < -halfCube || z + meshObj.radius > halfCube) {
    //         meshObj.velocity.z *= -1;
    //     }
    // }
    // checkWallCollision(meshObj) {
    //     const halfCube = 120/ 2;
    //     const r = meshObj.radius || 1;
    //     const p = meshObj.position;
    //     const v = meshObj.velocity;

    //     let collided = false;

    //     if (p.x - r < -halfCube || p.x + r > halfCube) {
    //         v.x *= -this.bounceFactor;
    //         collided = true;
    //     }
    //     if (p.y - r < -halfCube || p.y + r > halfCube) {
    //         v.y *= -this.bounceFactor;
    //         collided = true;
    //     }
    //     if (p.z - r < -halfCube || p.z + r > halfCube) {
    //         v.z *= -this.bounceFactor;
    //         collided = true;
    //     }

    //     // 🌟 All objects should react physically
    //     if (collided) {
    //         this.applyDamping(meshObj); // optional

    //         // 🧠 Only trigger shader responses if it's using a shader material
    //         if (meshObj.material?.isShaderMaterial) {
    //             this.triggerShaderUniforms(meshObj);
    //         }
    //     }
    // }
//   static checkGroundCollision(mesh, velocity, radius) {
//     if ((mesh.position.y + 1) - radius <= 0) {
//         mesh.position.y = mesh.position.y + 2.0;
//         velocity.y *= -0.8;
//         velocity.x *= 0.98;
//         velocity.z *= 0.98;
//     }
// }

//   static handleSphereCollision(meshA, velocityA, radiusA, massA, meshB, velocityB, radiusB, massB) {
//     const posA = meshA.position;
//     const posB = meshB.position;
//     const distVec = new THREE.Vector3().subVectors(posA, posB);
//     const distance = distVec.length();
//     const minDistance = radiusA + radiusB;

//     if (distance < minDistance) {
//         distVec.normalize();
//         const overlap = minDistance - distance;
//         posA.add(distVec.clone().multiplyScalar(overlap / 2));
//         posB.sub(distVec.clone().multiplyScalar(overlap / 2));

//         const relVel = new THREE.Vector3().subVectors(velocityA, velocityB);
//         const velAlongDist = relVel.dot(distVec);
//         if (velAlongDist > 0) return;

//         const impulse = (2.9 * velAlongDist) / (massA + massB);
//         velocityA.sub(distVec.clone().multiplyScalar(2 * impulse * massB));
//         velocityB.add(distVec.clone().multiplyScalar(2 * impulse * massA));
//     }
// }

//   static handleSceneMeshCollision(mesh, velocity, radius, sceneMeshes) {
//     sceneMeshes.forEach(sceneMesh => {
//         const meshPos = sceneMesh.position;
//         const distVec = new THREE.Vector3().subVectors(mesh.position, meshPos);
//         const distance = distVec.length();
//         const combinedRadius = radius + sceneMesh.geometry.boundingSphere.radius;

//         if (distance < combinedRadius) {
//             distVec.normalize();
//             const overlap = combinedRadius - distance;
//             mesh.position.add(distVec.clone().multiplyScalar(overlap));
//             velocity.reflect(distVec);
//         }
//     });
// }

//   static handlePlaneCollision(mesh, velocity, radius, planeNormal, planePoint) {
//     const sphereToPlane = new THREE.Vector3().subVectors(mesh.position, planePoint);
//     const distanceToPlane = sphereToPlane.dot(planeNormal);

//     if (Math.abs(distanceToPlane) < radius) {
//         mesh.position.addScaledVector(planeNormal, radius - distanceToPlane);
//         velocity.reflect(planeNormal);
//     }
// }
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

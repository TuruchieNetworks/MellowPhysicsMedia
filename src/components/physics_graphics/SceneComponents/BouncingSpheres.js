import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const BouncingSpheres = () => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Set up scene, camera, renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();

        // Set renderer size and append it to the container
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);

        // Create spheres inside a bounding cube
        const spheres = [];
        const numSpheres = 50;
        const radius = 0.9;
        const cubeSize = 0.5;
        const gravity = new THREE.Vector3(0, -0.1, 0); // Gravity vector
        const dampingFactor = 0.99; // Damping factor for velocity

        for (let i = 0; i < numSpheres; i++) {
            const geometry = new THREE.SphereGeometry(radius, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
            const sphere = new THREE.Mesh(geometry, material);

            const mass = Math.random() * 2 + 1;  // Mass between 1 and 3
            const velocity = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.01);

            sphere.position.set(
                (Math.random() - 0.5) * cubeSize,
                (Math.random() - 0.5) * cubeSize,
                (Math.random() - 0.5) * cubeSize
            );

            spheres.push({ mesh: sphere, velocity: velocity, mass: mass });
            scene.add(sphere);
        }

        // Create the cube boundary
        const boundaryGeom = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const boundaryMat = new THREE.MeshBasicMaterial({
            color: 0x888888,
            wireframe: true,
        });
        const boundary = new THREE.Mesh(boundaryGeom, boundaryMat);
        scene.add(boundary);

        camera.position.z = 10;

        // Function to handle sphere collision using mass and velocity
        function handleCollision(sphereA, sphereB) {
            const posA = sphereA.mesh.position;
            const posB = sphereB.mesh.position;

            const distVec = new THREE.Vector3().subVectors(posA, posB);
            const distance = distVec.length();
            const minDistance = radius * 2;

            if (distance < minDistance) {
                const overlap = minDistance - distance;

                // Normalize the distance vector
                distVec.normalize();

                // Relative velocity
                const relVel = new THREE.Vector3().subVectors(sphereA.velocity, sphereB.velocity);

                // Velocity along the line of collision
                const velAlongDist = relVel.dot(distVec);

                if (velAlongDist > 0) return;  // They are moving apart, no need for collision response

                // Calculate impulse scalar
                const impulse = (2 * velAlongDist) / (sphereA.mass + sphereB.mass);

                // Update velocities based on mass and impulse
                sphereA.velocity.sub(distVec.clone().multiplyScalar(impulse * sphereB.mass));
                sphereB.velocity.add(distVec.clone().multiplyScalar(impulse * sphereA.mass));
            }
        }

        // Function to handle wall collision
        function checkWallCollision(sphere) {
            const pos = sphere.mesh.position;
            const v = sphere.velocity;

            // Check for collisions with the walls
            if (pos.x - radius < -cubeSize / 2 || pos.x + radius > cubeSize / 2) {
                v.x *= -1;  // Reverse velocity in X
            }
            if (pos.y - radius < -cubeSize / 2 || pos.y + radius > cubeSize / 2) {
                v.y *= -1;  // Reverse velocity in Y
            }
            if (pos.z - radius < -cubeSize / 2 || pos.z + radius > cubeSize / 2) {
                v.z *= -1;  // Reverse velocity in Z
            }
        }

        // Function to apply gravity, update positions, and apply damping
        function applyGravityAndUpdatePositions(deltaTime) {
            for (const sphere of spheres) {
                // Apply gravity
                sphere.velocity.add(gravity);

                // Dampen the velocity
                sphere.velocity.multiplyScalar(dampingFactor);

                // Update position based on velocity
                sphere.mesh.position.add(sphere.velocity.clone().multiplyScalar(deltaTime));
                
                // Check for wall collisions
                checkWallCollision(sphere);
            }
        }

        // Update function with substeps and momentum
        function updatePhysics(deltaTime, substeps) {
            const timeStep = deltaTime / substeps;

            for (let step = 0; step < substeps; step++) {
                // Check collisions and apply repulsion for all pairs of spheres
                for (let i = 0; i < spheres.length; i++) {
                    for (let j = i + 1; j < spheres.length; j++) {
                        handleCollision(spheres[i], spheres[j]);
                    }
                }

                applyGravityAndUpdatePositions(timeStep);
            }
        }

        function animate() {
            const deltaTime = 0.016; // Approx. 60 FPS
            const substeps = 10; // Increase for more precision

            updatePhysics(deltaTime, substeps);
            renderer.render(scene, camera);

            requestAnimationFrame(animate);
        }

        animate();

        // Clean up on unmount
        return () => {
            renderer.dispose();
            containerRef.current.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default BouncingSpheres;
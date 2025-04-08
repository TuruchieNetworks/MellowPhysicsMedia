import React, { useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Component to load textures
export function LoadedModels ({ texturePath, color }) {
  const texture = useLoader(THREE.TextureLoader, texturePath);

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} color={color} />
    </mesh>
  );
}

// Component to spin the box
export function SpinningBox() {
  const mesh = useRef();

  useFrame(() => {
    mesh.current.rotation.x += 0.01;
    mesh.current.rotation.y += 0.01;
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}

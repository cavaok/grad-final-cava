'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const PCAVisualization = () => {
  const containerRef = useRef(null);
  const [model, setModel] = useState('auto64_1');
  const [loading, setLoading] = useState(true);
  
  // Create refs for Three.js objects
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const pointsGroupRef = useRef(null);
  const linesGroupRef = useRef(null);
  const raycasterRef = useRef(null);
  const mouseRef = useRef(new THREE.Vector2());
  const hoveredObjectRef = useRef(null);
  
  // Setup Three.js when component mounts
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize Three.js scene, camera, renderer, etc.
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    sceneRef.current = scene;
    
    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Create object groups
    const pointsGroup = new THREE.Group();
    const linesGroup = new THREE.Group();
    scene.add(pointsGroup);
    scene.add(linesGroup);
    pointsGroupRef.current = pointsGroup;
    linesGroupRef.current = linesGroup;
    
    // Setup raycaster for mouse interaction
    raycasterRef.current = new THREE.Raycaster();
    
    // Add grids
    addGrids(scene);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Add info panel for hover details
    createInfoPanel();
    
    // Handle mouse movement
    setupMouseInteraction();
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
    
    animate();
    
    // Load initial data
    loadData(model);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose of Three.js resources
      disposeScene();
    };
  }, []);
  
  // Effect to reload data when model changes
  useEffect(() => {
    if (sceneRef.current) {
      loadData(model);
    }
  }, [model]);
  
  // Function to add grid lines
  const addGrids = (scene) => {
    const gridSize = 30;
    const gridDivisions = 30;
    const gridColor = 0x333333;
    
    // XZ plane grid (horizontal)
    const gridXZ = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    gridXZ.position.y = 0;
    scene.add(gridXZ);
    
    // XY plane grid (vertical)
    const gridXY = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    gridXY.position.z = 0;
    gridXY.rotation.x = Math.PI / 2;
    scene.add(gridXY);
    
    // YZ plane grid (vertical)
    const gridYZ = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    gridYZ.position.x = 0;
    gridYZ.rotation.z = Math.PI / 2;
    scene.add(gridYZ);
    
    // Add axis labels
    addAxisLabels();
  };
  
  // Function to add axis labels
  const addAxisLabels = () => {
    if (!containerRef.current) return;
    
    // Remove any existing labels
    const existingLabels = containerRef.current.querySelectorAll('.axis-label');
    existingLabels.forEach(label => label.remove());
    
    // X-axis label
    const xLabel = document.createElement('div');
    xLabel.className = 'axis-label';
    xLabel.textContent = 'PC1';
    xLabel.style.position = 'absolute';
    xLabel.style.color = '#666666';
    xLabel.style.fontSize = '12px';
    xLabel.style.fontWeight = 'bold';
    xLabel.style.bottom = '10px';
    xLabel.style.right = '10px';
    containerRef.current.appendChild(xLabel);
    
    // Y-axis label
    const yLabel = document.createElement('div');
    yLabel.className = 'axis-label';
    yLabel.textContent = 'PC2';
    yLabel.style.position = 'absolute';
    yLabel.style.color = '#666666';
    yLabel.style.fontSize = '12px';
    yLabel.style.fontWeight = 'bold';
    yLabel.style.top = '10px';
    yLabel.style.left = '10px';
    containerRef.current.appendChild(yLabel);
    
    // Z-axis label
    const zLabel = document.createElement('div');
    zLabel.className = 'axis-label';
    zLabel.textContent = 'PC3';
    zLabel.style.position = 'absolute';
    zLabel.style.color = '#666666';
    zLabel.style.fontSize = '12px';
    zLabel.style.fontWeight = 'bold';
    zLabel.style.top = '10px';
    zLabel.style.right = '10px';
    containerRef.current.appendChild(zLabel);
  };
  
  // Create info panel for hover details
  const createInfoPanel = () => {
    if (!containerRef.current) return;
    
    // Remove existing info panel if any
    const existingPanel = document.getElementById('info-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    infoPanel.style.position = 'absolute';
    infoPanel.style.display = 'none';
    infoPanel.style.background = 'rgba(0, 0, 0, 0.8)';
    infoPanel.style.color = '#ffffff';
    infoPanel.style.padding = '8px 12px';
    infoPanel.style.borderRadius = '4px';
    infoPanel.style.fontSize = '14px';
    infoPanel.style.fontFamily = 'monospace';
    infoPanel.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
    infoPanel.style.zIndex = '1000';
    infoPanel.style.pointerEvents = 'none';
    containerRef.current.appendChild(infoPanel);
  };
  
  // Setup mouse interaction
  const setupMouseInteraction = () => {
    if (!containerRef.current) return;
    
    let containerRect = containerRef.current.getBoundingClientRect();
    
    const handleMouseMove = (event) => {
      // Calculate mouse position relative to container
      const x = event.clientX - containerRect.left;
      const y = event.clientY - containerRect.top;
      
      // Convert to normalized device coordinates
      mouseRef.current.x = (x / containerRef.current.clientWidth) * 2 - 1;
      mouseRef.current.y = -(y / containerRef.current.clientHeight) * 2 + 1;
      
      updateRaycasting(event);
    };
    
    const handleScroll = () => {
      containerRect = containerRef.current.getBoundingClientRect();
    };
    
    const handleMouseLeave = () => {
      // Reset hover effect when mouse leaves container
      if (hoveredObjectRef.current) {
        hoveredObjectRef.current.scale.set(1, 1, 1);
        hoveredObjectRef.current = null;
      }
      
      // Hide info panel
      const infoPanel = document.getElementById('info-panel');
      if (infoPanel) {
        infoPanel.style.display = 'none';
      }
    };
    
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    
    // Store clean-up functions
    containerRef.current._cleanup = () => {
      containerRef.current.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
    };
  };
  
  // Update raycasting (hover effects)
  const updateRaycasting = (event) => {
    if (!raycasterRef.current || !cameraRef.current || !pointsGroupRef.current) return;
    
    // Update the picking ray with the camera and mouse position
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Calculate objects intersecting the ray
    const intersects = raycasterRef.current.intersectObjects(pointsGroupRef.current.children, true);
    
    // Get info panel
    const infoPanel = document.getElementById('info-panel');
    if (!infoPanel) return;
    
    if (intersects.length > 0) {
      // Find the first object with userData
      let intersectedObject = null;
      
      for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        if (object.parent && object.parent.userData && object.parent.userData.id) {
          intersectedObject = object.parent;
          break;
        } else if (object.userData && object.userData.id) {
          intersectedObject = object;
          break;
        }
      }
      
      if (intersectedObject) {
        const pointData = intersectedObject.userData;
        
        // If we hover a new object
        if (hoveredObjectRef.current !== intersectedObject) {
          // Reset previous hover effect
          if (hoveredObjectRef.current) {
            hoveredObjectRef.current.scale.set(1, 1, 1);
          }
          
          // Apply hover effect to new object
          intersectedObject.scale.set(1.5, 1.5, 1.5);
          
          // Update hover reference
          hoveredObjectRef.current = intersectedObject;
          
          // Update info panel
          infoPanel.style.display = 'block';
          
          infoPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">ID: ${pointData.id}</div>
            <div>Type: ${pointData.type}</div>
            <div>PCA: [${pointData.pc1.toFixed(2)}, ${pointData.pc2.toFixed(2)}, ${pointData.pc3.toFixed(2)}]</div>
            <div>Label: ${pointData.label}</div>
          `;
          
          if (pointData.type === 'adversarial' && pointData.kld !== undefined) {
            infoPanel.innerHTML += `
              <div>KL Divergence: ${pointData.kld.toFixed(4)}</div>
              <div>MSE: ${pointData.mse.toFixed(6)}</div>
            `;
          }
          
          // Position info panel relative to mouse
          const containerRect = containerRef.current.getBoundingClientRect();
          infoPanel.style.left = `${event.clientX - containerRect.left + 15}px`;
          infoPanel.style.top = `${event.clientY - containerRect.top + 15}px`;
          
          // Keep panel within container bounds
          const panelRect = infoPanel.getBoundingClientRect();
          if (panelRect.right > containerRect.right) {
            infoPanel.style.left = `${event.clientX - containerRect.left - panelRect.width - 15}px`;
          }
          if (panelRect.bottom > containerRect.bottom) {
            infoPanel.style.top = `${event.clientY - containerRect.top - panelRect.height - 15}px`;
          }
        }
      }
    } else {
      // Reset hover effect if not hovering over an object
      if (hoveredObjectRef.current) {
        hoveredObjectRef.current.scale.set(1, 1, 1);
        hoveredObjectRef.current = null;
      }
      
      // Hide info panel
      infoPanel.style.display = 'none';
    }
  };
  
  // Function to load data
  const loadData = async (modelName) => {
    setLoading(true);
    clearVisualization();
    
    try {
      console.log(`Loading data for model: ${modelName}`);
      // Fetch the data
      const response = await fetch(`/${modelName}_pca.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Loaded ${data.length} points for ${modelName}`);
      
      // Create pairs
      const pairs = createPairs(data);
      
      // Calculate data bounds
      const bounds = calculateBounds(data);
      
      // Create visualization
      createVisualization(data, pairs, bounds);
      
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Use fallback sample data if real data can't be loaded
      const sampleData = [
        {"id": "93", "case_idx": 0, "model_name": modelName, "type": "original", "pc1": 4.75, "pc2": -0.19, "pc3": 3.05, "label": 0, "prediction": 0},
        {"id": "93_adv", "case_idx": 0, "model_name": modelName, "type": "adversarial", "pc1": 4.34, "pc2": 0.10, "pc3": 2.68, "label": 0, "prediction": 0, "kld": 0.02, "mse": 0.005},
        {"id": "138", "case_idx": 1, "model_name": modelName, "type": "original", "pc1": -2.5, "pc2": 1.7, "pc3": -0.8, "label": 1, "prediction": 1},
        {"id": "138_adv", "case_idx": 1, "model_name": modelName, "type": "adversarial", "pc1": -2.1, "pc2": 1.2, "pc3": -1.3, "label": 1, "prediction": 1, "kld": 0.06, "mse": 0.012}
      ];
      
      // Create fallback visualization
      const pairs = createPairs(sampleData);
      const bounds = calculateBounds(sampleData);
      createVisualization(sampleData, pairs, bounds);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to clear visualization
  const clearVisualization = () => {
    if (!pointsGroupRef.current || !linesGroupRef.current) return;
    
    // Clear points
    while(pointsGroupRef.current.children.length > 0) {
      const object = pointsGroupRef.current.children[0];
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
      pointsGroupRef.current.remove(object);
    }
    
    // Clear lines
    while(linesGroupRef.current.children.length > 0) {
      const line = linesGroupRef.current.children[0];
      if (line.geometry) line.geometry.dispose();
      if (line.material) line.material.dispose();
      linesGroupRef.current.remove(line);
    }
  };
  
  // Dispose of Three.js scene
  const disposeScene = () => {
    clearVisualization();
    
    // Clean up event listeners
    if (containerRef.current && containerRef.current._cleanup) {
      containerRef.current._cleanup();
    }
    
    // Remove DOM elements
    const labels = document.querySelectorAll('.axis-label');
    labels.forEach(label => label.remove());
    
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.remove();
    
    // Dispose of renderer
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
  };
  
  // Helper function to create pairs
  const createPairs = (data) => {
    const pairs = [];
    const originals = data.filter(d => d.type === 'original');
    
    originals.forEach(original => {
      const adversarial = data.find(d => 
        d.type === 'adversarial' && 
        d.case_idx === original.case_idx
      );
      
      if (adversarial) {
        pairs.push({ original, adversarial });
      }
    });
    
    return pairs;
  };
  
  // Helper function to calculate bounds
  const calculateBounds = (data) => {
    const bounds = {
      pc1: { min: Infinity, max: -Infinity },
      pc2: { min: Infinity, max: -Infinity },
      pc3: { min: Infinity, max: -Infinity }
    };
    
    data.forEach(d => {
      bounds.pc1.min = Math.min(bounds.pc1.min, d.pc1);
      bounds.pc1.max = Math.max(bounds.pc1.max, d.pc1);
      bounds.pc2.min = Math.min(bounds.pc2.min, d.pc2);
      bounds.pc2.max = Math.max(bounds.pc2.max, d.pc2);
      bounds.pc3.min = Math.min(bounds.pc3.min, d.pc3);
      bounds.pc3.max = Math.max(bounds.pc3.max, d.pc3);
    });
    
    return bounds;
  };
  
  // Helper function to create visualization
  const createVisualization = (data, pairs, bounds) => {
    if (!pointsGroupRef.current || !linesGroupRef.current) return;
    
    const scale = 12; // Scale factor for visualization
    
    // Normalize function
    const normalize = (val, min, max) => {
      return ((val - min) / (max - min) * 2 - 1) * scale;
    };
    
    // Draw connecting lines first
    pairs.forEach(pair => {
      const x1 = normalize(pair.original.pc1, bounds.pc1.min, bounds.pc1.max);
      const y1 = normalize(pair.original.pc2, bounds.pc2.min, bounds.pc2.max);
      const z1 = normalize(pair.original.pc3, bounds.pc3.min, bounds.pc3.max);
      
      const x2 = normalize(pair.adversarial.pc1, bounds.pc1.min, bounds.pc1.max);
      const y2 = normalize(pair.adversarial.pc2, bounds.pc2.min, bounds.pc2.max);
      const z2 = normalize(pair.adversarial.pc3, bounds.pc3.min, bounds.pc3.max);
      
      // Create line geometry
      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array([
        x1, y1, z1,
        x2, y2, z2
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      
      // Create line material - gray line for all connections
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x888888,
        opacity: 0.5,
        transparent: true
      });
      
      // Create line and add to group
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroupRef.current.add(line);
    });
    
    // Draw data points
    data.forEach(d => {
      const x = normalize(d.pc1, bounds.pc1.min, bounds.pc1.max);
      const y = normalize(d.pc2, bounds.pc2.min, bounds.pc2.max);
      const z = normalize(d.pc3, bounds.pc3.min, bounds.pc3.max);
      
      let object;
      
      if (d.type === 'original') {
        // Black spheres with white outline for originals
        const geometry = new THREE.SphereGeometry(0.4, 24, 24);
        const material = new THREE.MeshPhongMaterial({
          color: 0x000000,
          specular: 0x111111,
          shininess: 30,
          transparent: false
        });
        
        object = new THREE.Mesh(geometry, material);
        
        // Add white outline
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.BackSide
        });
        const outlineMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 24, 24),
          outlineMaterial
        );
        object.add(outlineMesh);
        
      } else {
        // White semi-transparent spheres for adversarials
        const geometry = new THREE.SphereGeometry(0.4, 24, 24);
        const material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          specular: 0x222222,
          shininess: 30,
          transparent: true,
          opacity: 0.6
        });
        object = new THREE.Mesh(geometry, material);
      }
      
      // Position the object
      object.position.set(x, y, z);
      
      // Store data with the object for hover display
      object.userData = d;
      
      // Add to scene
      pointsGroupRef.current.add(object);
    });
  };
  
  // Handle window resize
  const handleResize = () => {
    if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    
    rendererRef.current.setSize(width, height);
  };
  
  // Reset view function
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    cameraRef.current.position.set(20, 20, 20);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  };
  
  // Handle model change
  const handleModelChange = (e) => {
    setModel(e.target.value);
  };
  
  // Handle reset view button click
  const handleResetView = () => {
    resetView();
  };
  
  return (
    <div className="relative" style={{ width: '100%', height: '600px', borderRadius: '8px', overflow: 'hidden' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="text-white">Loading...</div>
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <select 
          value={model}
          onChange={handleModelChange}
          className="px-3 py-2 bg-black bg-opacity-70 text-white border border-gray-700 rounded"
        >
          <option value="auto64_1">auto64_1</option>
          <option value="auto64_2">auto64_2</option>
          <option value="auto64_3">auto64_3</option>
          <option value="auto64_4">auto64_4</option>
        </select>
        
        <button 
          onClick={handleResetView}
          className="px-3 py-2 bg-black bg-opacity-70 text-white border border-gray-700 rounded"
        >
          Reset View
        </button>
      </div>
      
      <div 
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
};

export default PCAVisualization;
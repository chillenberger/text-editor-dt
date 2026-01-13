import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

// themes: detachment leads to fulfillment, eternal endurance, selfless service
// visualization: A delicate structure that endures through transparency and interconnection

const PineconeDelicate = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const pineConeRef = useRef<THREE.Group | null>(null)
  const lightsRef = useRef<THREE.Light[]>([])
  const resourcesRef = useRef({
    geometries: [] as THREE.BufferGeometry[],
    materials: [] as THREE.Material[],
    meshes: [] as THREE.Mesh[],
    lineSegments: [] as THREE.LineSegments[],
    scaleGroups: [] as THREE.Group[],
    instancedMeshes: [] as THREE.InstancedMesh[]
  })

  useEffect(() => {
    if (!containerRef.current) return

    const { geometries, materials, meshes, lineSegments, scaleGroups, instancedMeshes } =
      resourcesRef.current

    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = null

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    cameraRef.current = camera
    camera.position.z = 16
    camera.position.y = 0

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    rendererRef.current = renderer
    renderer.setSize(550, 550)
    // ensure not children yet, fix unintended multiple appends
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }
    containerRef.current.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    lightsRef.current.push(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight.position.set(5, 10, 7.5)
    scene.add(directionalLight)
    lightsRef.current.push(directionalLight)

    const pineCone = new THREE.Group()
    pineConeRef.current = pineCone

    // Create glass-like translucent scales - detachment made visible through transparency
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(0.2, 0.7)
    shape.lineTo(0.5, 1.4)
    shape.lineTo(0, 1.7)
    shape.lineTo(-0.5, 1.4)
    shape.lineTo(-0.7, 0.7)
    shape.closePath()

    const extrudeSettings = {
      depth: 0.05,
      bevelEnabled: true,
      bevelSegments: 4, // Reduced from 8
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02
    }

    const scaleGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometries.push(scaleGeometry)

    // Create materials once
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: '#e0ded8',
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.1,
      side: THREE.DoubleSide
    })
    materials.push(glassMaterial)

    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: '#666666',
      transparent: true,
      opacity: 0.3
    })
    materials.push(wireframeMaterial)

    // Create edge geometry once
    const edgesGeometry = new THREE.EdgesGeometry(scaleGeometry)
    geometries.push(edgesGeometry)

    const layers = 38
    const scalesPerLayer = 8
    const totalScales = layers * scalesPerLayer

    // Use InstancedMesh for better performance
    const instancedMesh = new THREE.InstancedMesh(scaleGeometry, glassMaterial, totalScales)
    instancedMeshes.push(instancedMesh)

    // Create a separate instanced mesh for wireframes using LineSegments geometry
    const wireframePositions: number[] = []
    const wireframeColors: number[] = []

    let scaleIndex = 0
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()
    const rotation = new THREE.Euler()
    const quaternion = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    for (let layer = 0; layer < layers; layer++) {
      const yPosition = (layer / layers) * 18 - 9 - 0.9
      let layerRadius

      if (layer < 10) {
        layerRadius = Math.sin((layer / 10) * Math.PI * 0.5) * 2
      } else {
        layerRadius = 2 + Math.sin(((layer - 10) / (layers - 10)) * Math.PI) * 2.5
      }

      const taper = 1 - (layer / layers) * 0.3

      for (let i = 0; i < scalesPerLayer; i++) {
        const angle = (i / scalesPerLayer) * Math.PI * 2 + layer * 0.25

        // Set position
        position.set(
          Math.cos(angle) * layerRadius * taper,
          yPosition,
          Math.sin(angle) * layerRadius * taper
        )

        // Set rotation
        rotation.set(Math.PI / 3, angle, 0)
        quaternion.setFromEuler(rotation)

        // Set scale
        scale.set(0.8, 0.8, 0.8)

        // Compose matrix
        matrix.compose(position, quaternion, scale)
        instancedMesh.setMatrixAt(scaleIndex, matrix)

        scaleIndex++
      }
    }

    instancedMesh.instanceMatrix.needsUpdate = true
    pineCone.add(instancedMesh)

    // Create wireframe lines separately for better performance
    const wireframeGroup = new THREE.Group()
    for (let layer = 0; layer < layers; layer++) {
      const yPosition = (layer / layers) * 18 - 9 - 0.9
      let layerRadius

      if (layer < 10) {
        layerRadius = Math.sin((layer / 10) * Math.PI * 0.5) * 2
      } else {
        layerRadius = 2 + Math.sin(((layer - 10) / (layers - 10)) * Math.PI) * 2.5
      }

      const taper = 1 - (layer / layers) * 0.3

      for (let i = 0; i < scalesPerLayer; i++) {
        const angle = (i / scalesPerLayer) * Math.PI * 2 + layer * 0.25

        const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial)
        wireframe.rotation.x = Math.PI / 3
        wireframe.rotation.y = angle
        wireframe.position.x = Math.cos(angle) * layerRadius * taper
        wireframe.position.z = Math.sin(angle) * layerRadius * taper
        wireframe.position.y = yPosition
        wireframe.scale.set(0.8, 0.8, 0.8)

        lineSegments.push(wireframe)
        wireframeGroup.add(wireframe)
      }
    }

    pineCone.add(wireframeGroup)

    scene.add(pineCone)

    let time = 0
    let animationFrameId: number

    function animate() {
      animationFrameId = requestAnimationFrame(animate)

      time += 0.005

      pineCone.rotation.y = time * 0.3
      pineCone.rotation.x = Math.sin(time * 0.5) * 0.05
      pineCone.rotation.z = Math.cos(time * 0.7) * 0.03

      const breathe = 1 + Math.sin(time * 0.5) * 0.02
      pineCone.scale.set(breathe, breathe, breathe)

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      console.log('Cleaning up Three.js scene...')
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }

      if (sceneRef.current) {
        lightsRef.current.forEach((light) => {
          sceneRef.current!.remove(light)
        })

        if (pineConeRef.current) {
          sceneRef.current.remove(pineConeRef.current)
        }
      }

      resourcesRef.current.scaleGroups.forEach((group) => {
        if (pineConeRef.current) {
          pineConeRef.current.remove(group)
        }
        while (group.children.length > 0) {
          group.remove(group.children[0])
        }
      })

      resourcesRef.current.meshes.forEach((mesh) => {
        if (mesh.parent) {
          mesh.parent.remove(mesh)
        }
      })

      resourcesRef.current.lineSegments.forEach((line) => {
        if (line.parent) {
          line.parent.remove(line)
        }
      })

      resourcesRef.current.instancedMeshes.forEach((instancedMesh) => {
        if (instancedMesh.parent) {
          instancedMesh.parent.remove(instancedMesh)
        }
        instancedMesh.dispose()
      })

      resourcesRef.current.geometries.forEach((geometry) => {
        geometry.dispose()
      })

      resourcesRef.current.materials.forEach((material) => {
        material.dispose()
      })

      if (rendererRef.current) {
        rendererRef.current.dispose()

        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }

      sceneRef.current = null
      rendererRef.current = null
      cameraRef.current = null
      pineConeRef.current = null
      lightsRef.current = []
      resourcesRef.current = {
        geometries: [],
        materials: [],
        meshes: [],
        lineSegments: [],
        scaleGroups: [],
        instancedMeshes: []
      }
    }
  }, [])

  return (
    <div className="w-full h-full flex justify-center items-center bg-[transparent]">
      <div ref={containerRef} className="bg-[transparent]" />
    </div>
  )
}

export default PineconeDelicate

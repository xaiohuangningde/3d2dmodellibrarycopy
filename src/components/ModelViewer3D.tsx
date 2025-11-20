import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows,
  Stage,
  Bounds,
  useBounds,
  MeshReflectorMaterial
} from '@react-three/drei'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { X } from 'lucide-react'

interface Model3DProps {
  url: string
}

function Model({ url }: Model3DProps) {
  const { scene } = useGLTF(url)
  const modelRef = useRef<THREE.Group>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    if (modelRef.current) {
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(modelRef.current)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 2 / maxDim
      
      modelRef.current.position.sub(center)
      modelRef.current.scale.setScalar(scale)

      // Enhance materials for better rendering
      modelRef.current.traverse((child: any) => {
        if (child.isMesh) {
          // Enable shadows
          child.castShadow = true
          child.receiveShadow = true

          // Enhance material properties
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: THREE.Material) => {
                enhanceMaterial(mat)
              })
            } else {
              enhanceMaterial(child.material)
            }
          }
        }
      })
    }
  }, [scene])

  const enhanceMaterial = (material: THREE.Material) => {
    if (material instanceof THREE.MeshStandardMaterial) {
      material.envMapIntensity = 1.5
      material.needsUpdate = true
    }
  }

  useFrame(() => {
    if (modelRef.current && autoRotate) {
      modelRef.current.rotation.y += 0.003
    }
  })

  return <primitive ref={modelRef} object={scene} />
}

function SelectToZoom({ children }: { children: React.ReactNode }) {
  const api = useBounds()
  return (
    <group onClick={(e) => {
      e.stopPropagation()
      e.delta <= 2 && api.refresh(e.object).fit()
    }}>
      {children}
    </group>
  )
}

export function ModelViewer3D({ url }: Model3DProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [wireframe, setWireframe] = useState(false)

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300">加载3D模型中...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 max-w-md mx-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <X className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-red-400 font-medium mb-1">无法加载3D模型</h3>
                <p className="text-red-400/80 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        onCreated={() => setLoading(false)}
        onError={(err) => {
          setError(`加载3D模型失败: ${err.message}`)
          setLoading(false)
        }}
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        {/* Gradient background with fog */}
        <color attach="background" args={['#0a0e1a']} />
        <fog attach="fog" args={['#0a0e1a', 10, 25]} />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.5} 
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.8} color="#fb923c" />
        <spotLight 
          position={[0, 5, 0]} 
          intensity={0.5} 
          angle={0.6} 
          penumbra={1} 
          castShadow 
        />
        <hemisphereLight intensity={0.3} groundColor="#1e293b" color="#cbd5e1" />

        {/* Rim light for edge highlighting */}
        <directionalLight position={[0, 0, -5]} intensity={0.5} color="#3b82f6" />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Main scene */}
        <Bounds fit clip observe margin={1.2}>
          <SelectToZoom>
            <Model url={url} />
          </SelectToZoom>
        </Bounds>

        {/* Reflective ground plane */}
        <ReflectiveGround />

        {/* Decorative grid */}
        <gridHelper 
          args={[20, 20, '#475569', '#1e293b']} 
          position={[0, -1.49, 0]} 
        />

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={15}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Controls info */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-5 h-5 bg-orange-500/20 rounded flex items-center justify-center">🖱️</span>
            <span>左键拖拽：旋转</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-5 h-5 bg-orange-500/20 rounded flex items-center justify-center">🖱️</span>
            <span>右键拖拽：平移</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-5 h-5 bg-orange-500/20 rounded flex items-center justify-center">🔍</span>
            <span>滚轮：缩放</span>
          </div>
        </div>
      </div>

      {/* Stats info */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-slate-300">3D 实时渲染</span>
        </div>
      </div>
    </div>
  )
}

function ReflectiveGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#1e293b"
        metalness={0.5}
        mirror={0.3}
      />
    </mesh>
  )
}
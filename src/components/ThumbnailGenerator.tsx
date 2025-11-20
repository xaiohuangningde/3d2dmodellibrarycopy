import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

interface ThumbnailGeneratorProps {
  url: string
  type: '3d' | '2d'
  onThumbnailGenerated: (dataUrl: string) => void
}

function Model3D({ url, onReady }: { url: string; onReady: () => void }) {
  const { scene } = useGLTF(url)
  const modelRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (modelRef.current && scene) {
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(scene)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 1.5 / maxDim
      
      modelRef.current.position.sub(center)
      modelRef.current.scale.setScalar(scale)
      
      // Signal that model is ready
      setTimeout(() => onReady(), 100)
    }
  }, [scene, onReady])

  return <primitive ref={modelRef} object={scene} />
}

function Scene3D({ url, onCapture }: { url: string; onCapture: () => void }) {
  const { gl, scene, camera } = useThree()
  const [modelReady, setModelReady] = useState(false)

  useEffect(() => {
    if (modelReady) {
      // Wait a moment for rendering to complete
      setTimeout(() => {
        gl.render(scene, camera)
        onCapture()
      }, 200)
    }
  }, [modelReady, gl, scene, camera, onCapture])

  return (
    <>
      <PerspectiveCamera makeDefault position={[2, 2, 2]} fov={50} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.5} />
      <hemisphereLight intensity={0.5} groundColor="#444" />
      <Model3D url={url} onReady={() => setModelReady(true)} />
    </>
  )
}

export function ThumbnailGenerator({ url, type, onThumbnailGenerated }: ThumbnailGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [captured, setCaptured] = useState(false)

  const handleCapture = () => {
    if (canvasRef.current && !captured) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png')
        onThumbnailGenerated(dataUrl)
        setCaptured(true)
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
      }
    }
  }

  // For 2D images, create thumbnail directly
  useEffect(() => {
    if (type === '2d' && url && !captured) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 400
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Fill with white background
          ctx.fillStyle = '#f9fafb'
          ctx.fillRect(0, 0, size, size)
          
          // Calculate dimensions to fit and center
          const scale = Math.min(size / img.width, size / img.height)
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          const x = (size - scaledWidth) / 2
          const y = (size - scaledHeight) / 2
          
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
          
          const dataUrl = canvas.toDataURL('image/png')
          onThumbnailGenerated(dataUrl)
          setCaptured(true)
        }
      }
      img.onerror = () => {
        console.error('Failed to load image for thumbnail')
      }
      img.src = url
    }
  }, [url, type, captured, onThumbnailGenerated])

  if (type === '2d') {
    return null // 2D thumbnails are generated in useEffect
  }

  return (
    <div style={{ position: 'absolute', left: '-9999px', width: '400px', height: '400px' }}>
      <Canvas
        ref={canvasRef}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={2}
      >
        <color attach="background" args={['#f9fafb']} />
        <Scene3D url={url} onCapture={handleCapture} />
      </Canvas>
    </div>
  )
}

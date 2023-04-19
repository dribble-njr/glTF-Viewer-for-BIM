import {
  AmbientLight,
  AxesHelper,
  Box3,
  BufferGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  LinearEncoding,
  LoaderUtils,
  LoadingManager,
  LOD,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
} from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 提供参数设置
import { GUI } from 'dat.gui'

import { throttle, traverseMaterials } from '../utils'

// glTF texture types. `envMap` is deliberately omitted, as it's used internally
// by the loader but not part of the glTF format.
const MAP_NAMES = [
  'map',
  'aoMap',
  'emissiveMap',
  'glossinessMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
]

// TODO add background
// https://github.com/rc-bellergy/three-vignette-background
// import { createBackground } from 'three-vignette-background-esm/dist/noise-background'

class Viewer {
  constructor(el) {
    this.el = el

    // 循环渲染和非循环渲染交替控制
    this.renderEnable = false
    this.timeOut = null

    this.lights = []
    this.content = null
    // 面板
    this.gui = null

    this.state = {
      playbackSpeed: 1.0,
      actionStates: {},
      wireframe: false,
      grid: false,

      // Lights
      addLights: true,
      ambientIntensity: 1.0,
      ambientColor: 0xffffff,
      directIntensity: 0.8 * Math.PI, // TODO(#116)
      directColor: 0xffffff,
    }

    // 性能监控
    this.stats = new Stats()
    this.stats.dom.height = '48px'
    Array.prototype.forEach.call(
      this.stats.dom.children,
      (child) => (child.style.display = '')
    )

    this.scene = new Scene()

    this.camera = new PerspectiveCamera(
      60,
      el.clientWidth / el.clientHeight,
      0.01,
      1000
    )
    this.scene.add(this.camera)

    this.renderer = new WebGLRenderer({ antialias: true }) // 抗锯齿
    this.renderer.physicallyCorrectLights = true // 使用正确的照明模式
    this.renderer.outputEncoding = sRGBEncoding // 输出 sRGB
    this.renderer.setClearColor(0xffffff) // 设置颜色
    this.renderer.setPixelRatio(window.devicePixelRatio) // 设置屏幕像素比
    this.renderer.setSize(el.clientWidth, el.clientHeight) // 调整 canvas 大小

    // 轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = -10
    this.controls.screenSpacePanning = true
    // 交互时循环渲染
    this.controls.addEventListener('start', () => {
      this.timeRender(1000)
    })
    this.controls.addEventListener('end', () => {
      this.timeRender(1000)
    })

    // TODO 添加背景 https://github.com/rc-bellergy/three-vignette-background

    this.el.appendChild(this.renderer.domElement)

    // dat.gui
    this.cameraCtrl = null
    this.cameraFolder = null
    this.gridHelper = null
    this.axesHelper = null

    // 射线相交
    this.mouse = new Vector2()
    this.raycaster = new Raycaster()
    this.intersected
    this.originMaterial
    this.json

    // lod
    this.lod = null

    this.addAxesHelper()
    this.addGUI()

    this.animate = this.animate.bind(this)
    requestAnimationFrame(this.animate)

    // 节流
    window.addEventListener(
      'resize',
      throttle(this.onWindowResize.bind(this), 50, {
        leading: true,
        trailing: true,
      })
    )

    // 点击选中
    window.addEventListener('click', this.onMouseClick.bind(this))
  }

  animate() {
    requestAnimationFrame(this.animate)

    this.controls.update()
    this.stats.update()

    if (this.renderEnable) {
      this.render()
    }
  }

  timeRender(time) {
    this.renderEnable = true

    if (this.timeOut) {
      clearTimeout(this.timeOut)
    }
    this.timeOut = setTimeout(() => {
      this.renderEnable = false
      this.renderer.render(this.scene, this.camera)
    }, time)
  }

  render() {
    this.renderer.render(this.scene, this.camera)
    if (this.state.grid) {
      this.axesCamera.position.copy(this.camera.position)
      this.axesCamera.lookAt(this.axesScene.position)
      this.axesRenderer.render(this.axesScene, this.axesCamera)
    }
  }

  onWindowResize() {
    const { clientHeight, clientWidth } = this.el.parentElement

    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight)

    this.axesCamera.aspect =
      this.axesDiv.clientWidth / this.axesDiv.clientHeight
    this.axesCamera.updateProjectionMatrix()
    this.axesRenderer.setSize(
      this.axesDiv.clientWidth,
      this.axesDiv.clientHeight
    )

    this.timeRender(1000)
  }

  /**
   * 点击交互
   */
  onMouseClick(e) {
    // 二维坐标转换为空间坐标
    // 点击偏移问题
    // https://blog.csdn.net/u013090676/article/details/77188088
    const canvas = document.querySelector('.viewer')
    this.mouse.x =
      ((e.clientX - canvas.getBoundingClientRect().left) / canvas.offsetWidth) *
        2 -
      1
    this.mouse.y =
      -(
        (e.clientY - canvas.getBoundingClientRect().top) /
        canvas.offsetHeight
      ) *
        2 +
      1

    // 通过鼠标点的位置和当前相机的矩阵计算出raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera)
    // 获取与射线相交的对象数组
    const intersects = this.raycaster.intersectObjects(this.scene.children)

    // FIXME LOD 时选中只有在最高等级才生效
    // console.log(this.intersected === intersects[0].object)
    // console.log(this.intersected)

    if (intersects.length > 0) {
      if (this.intersected != intersects[0].object) {
        // 点击其他构件，恢复之前材质
        if (this.intersected) this.intersected.material = this.originMaterial

        // 更新当前选中构件
        this.intersected = intersects[0].object
        this.originMaterial = this.intersected.material
        const material = new MeshLambertMaterial({
          color: 0xff0000,
          opacity: 0.8,
        })
        this.intersected.material = material

        if (this.json) {
          for (let i = 0; i < this.json.length; i++) {
            if (this.intersected.userData.UniqueId === this.json[i].UniqueId) {
              console.log(this.json[i].Parameters)
            }
          }
        }
      }
    } else {
      // 点击空白处 取消选中
      if (this.intersected) this.intersected.material = this.originMaterial
      this.intersected = null
    }
  }

  load(url, rootPath, assetMap) {
    const baseURL = LoaderUtils.extractUrlBase(url)

    return new Promise((resolve, reject) => {
      const manager = new LoadingManager()

      // Intercept and override relative URLs.
      // This behavior can be used to load assets from .ZIP files, drag-and-drop APIs, and Data URIs.
      manager.setURLModifier((url, path) => {
        // URIs in a glTF file may be escaped, or not. Assume that assetMap is
        // from an un-escaped source, and decode all URIs before lookups.
        // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
        const normalizedURL =
          rootPath +
          decodeURI(url)
            .replace(baseURL, '')
            .replace(/^(\.?\/)/, '')

        if (assetMap.has(normalizedURL)) {
          const blob = assetMap.get(normalizedURL)
          const blobURL = URL.createObjectURL(blob)
          blobURLs.push(blobURL)

          return blobURL
        }

        return (path || '') + url
      })

      const loader = new GLTFLoader(manager)
      loader.setCrossOrigin('anonymous')

      // A loader for geometry compressed with the Draco library.
      // 如用 draco 压缩，则必须设置 dracoLoader
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/draco/')
      loader.setDRACOLoader(dracoLoader)

      const blobURLs = []

      loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene || gltf.scenes[0]

          if (!scene) {
            // Valid, but not supported by this viewer.
            throw new Error(
              'This model contains no scene, and cannot be viewed here. However,' +
                ' it may contain individual 3D resources.'
            )
          }

          this.setContent(scene)

          blobURLs.forEach(URL.revokeObjectURL)

          // See: https://github.com/google/draco/issues/349
          // DRACOLoader.releaseDecoderModule();

          resolve(gltf)

          // 解析属性
          let file
          if (assetMap.size === 2) {
            for (const [key, value] of assetMap) {
              if (key.indexOf('json') != -1) file = value
            }

            const reader = new FileReader()
            reader.addEventListener('loadend', (e) => {
              this.json = JSON.parse(e.target.result)
            })
            reader.readAsText(file)
            console.log(this.json)
          }
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
        },
        reject
      )
    })
  }

  loadLod() {
    this.lod = new LOD()
    const levels = [
      { distance: 0, lod: [0, 1, 2] },
      { distance: 100000, lod: [1, 2] },
      { distance: 200000, lod: [2] },
    ]
    // 3 个等级的细节层次
    const details = new Array(3).fill(new Object3D())

    return new Promise((resolve) => {
      const loader = new GLTFLoader()
      loader.setCrossOrigin('anonymous')

      // A loader for geometry compressed with the Draco library.
      // 如用 draco 压缩，则必须设置 dracoLoader
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/draco/')
      loader.setDRACOLoader(dracoLoader)

      loader.load('models/lod3.glb', (gltf) => {
        details[0] = gltf.scene || gltf.scenes[0]

        loader.load('models/lod2.glb', (gltf) => {
          details[1] = gltf.scene || gltf.scenes[0]
          
          loader.load('models/lod1.glb', (gltf) => {
            details[2]= gltf.scene || gltf.scenes[0]

            // 将不同层级的模型添加到 LOD 对象中
            this.lod.addLevel(details[2], 200000)
            this.lod.addLevel(details[1], 100000)
            this.lod.addLevel(details[0], 0)

            window.lod = this.lod
            
            // 禁用自动更新
            this.lod.autoUpdate = false

            // 监听相机位置变化
            this.controls.addEventListener('change', () => {
              const distance = this.camera.position.distanceTo(this.scene.position)
              console.log('相机视点距离', distance)
              let levelIndex = 0

              for (let i = 0; i < levels.length; i++) {
                if (distance > levels[i].distance) {
                  levelIndex = i
                } else {
                  break
                }
              }

              const lodIndexes = levels[levelIndex].lod
              console.log('需要渲染的层级', lodIndexes)

              for (let i = 0; i < levels.length; i++) {
                this.lod.levels[i].object.visible = lodIndexes.indexOf(i) !== -1
              }
            })

            this.setContent(this.lod)

            resolve(this.lod)
          })
        })
      })
    })
  }

  /**
   * @param {THREE.Object3D} object
   */
  setContent(object) {
    this.clear()

    // AABB 包围盒
    const box = new Box3().setFromObject(object)
    const size = box.getSize(new Vector3()).length()
    const center = box.getCenter(new Vector3())

    this.controls.reset()

    object.position.x += object.position.x - center.x
    object.position.y += object.position.y - center.y
    object.position.z += object.position.z - center.z
    this.controls.maxDistance = size * 10 // 最长拉远距离
    this.camera.near = size / 100
    this.camera.far = size * 100
    this.camera.updateProjectionMatrix()

    // 根据包围盒设置相机位置
    this.camera.position.copy(center)
    this.camera.position.x += size * 1.0
    this.camera.position.y += size * 1.0
    this.camera.position.z += size * 1.0
    this.camera.lookAt(center)

    this.axesCamera.position.copy(this.camera.position)
    this.axesCamera.lookAt(this.axesScene.position)
    this.axesCamera.near = size / 100
    this.axesCamera.far = size * 100
    this.axesCamera.updateProjectionMatrix()
    this.axesCorner.scale.set(size, size, size)

    this.controls.saveState()

    this.scene.add(object)
    this.content = object

    this.state.addLights = true

    // Executes the callback on this object and all descendants.
    this.content.traverse((node) => {
      if (node.isLight) {
        this.state.addLights = false
      } else if (node.isMesh) {
        // https://github.com/mrdoob/three.js/pull/18235 Clean up.
        node.material.depthWrite = !node.material.transparent
        // node.material.alphaTest = 0.5
      }
    })

    this.updateLights()
    this.updateTextureEncoding()
    this.updateDisplay()
  }

  /**
   * 更新灯光设置
   */
  updateLights() {
    const state = this.state
    const lights = this.lights

    if (state.addLights && !lights.length) {
      this.addLights()
    } else if (!state.addLights && lights.length) {
      this.removeLights()
    }

    if (lights.length === 2) {
      lights[0].intensity = state.ambientIntensity
      lights[0].color.setHex(state.ambientColor)
      lights[1].intensity = state.directIntensity
      lights[1].color.setHex(state.directColor)
    }
  }

  removeLights() {
    this.lights.forEach((light) => light.parent.remove(light))
    this.lights.length = 0
  }

  addLights() {
    const state = this.state

    // 环境光
    const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity)
    light1.name = 'ambient_light'
    this.camera.add(light1)

    // 平行光
    const light2 = new DirectionalLight(
      state.directColor,
      state.directIntensity
    )
    light2.position.set(0.5, 0, 0.866) // ~60º
    light2.name = 'main_light'
    this.camera.add(light2)

    this.lights.push(light1, light2)
  }

  updateTextureEncoding() {
    // 输入 sRGB
    const encoding = sRGBEncoding
    traverseMaterials(this.content, (material) => {
      if (material.map) material.map.encoding = encoding
      if (material.emissiveMap) material.emissiveMap.encoding = encoding
      // 指定的材料需要重新编译
      if (material.map || material.emissiveMap) material.needsUpdate = true
    })
  }

  /**
   * 添加辅助坐标系
   */
  addAxesHelper() {
    this.axesDiv = document.createElement('div')
    this.el.appendChild(this.axesDiv)
    this.axesDiv.classList.add('axes')

    const { clientWidth, clientHeight } = this.axesDiv

    this.axesScene = new Scene()
    this.axesCamera = new PerspectiveCamera(
      50,
      clientWidth / clientHeight,
      0.1,
      10
    )
    this.axesScene.add(this.axesCamera)

    this.axesRenderer = new WebGLRenderer({ alpha: true })
    this.axesRenderer.setPixelRatio(window.devicePixelRatio)
    this.axesRenderer.setSize(
      this.axesDiv.clientWidth,
      this.axesDiv.clientHeight
    )

    this.axesCamera.up = this.camera.up

    this.axesCorner = new AxesHelper(5)
    this.axesScene.add(this.axesCorner)
    this.axesDiv.appendChild(this.axesRenderer.domElement)
  }

  /**
   * 更新渲染
   */
  updateDisplay() {
    traverseMaterials(this.content, (material) => {
      material.wireframe = this.state.wireframe
    })

    if (this.state.grid !== Boolean(this.gridHelper)) {
      if (this.state.grid) {
        this.gridHelper = new GridHelper()
        this.axesHelper = new AxesHelper()
        this.axesHelper.renderOrder = 999
        this.axesHelper.onBeforeRender = (renderer) => renderer.clearDepth()
        this.scene.add(this.gridHelper)
        this.scene.add(this.axesHelper)
      } else {
        this.scene.remove(this.gridHelper)
        this.scene.remove(this.axesHelper)
        this.gridHelper = null
        this.axesHelper = null
        this.axesRenderer.clear()
      }
    }
  }

  /**
   * 添加监控面板
   */
  addGUI() {
    const gui = (this.gui = new GUI({
      autoPlace: false,
      width: 260,
      hideable: true,
    }))

    // Display controls.
    const dispFolder = gui.addFolder('Display')
    const wireframeCtrl = dispFolder.add(this.state, 'wireframe')
    wireframeCtrl.onChange(() => this.updateDisplay())
    const gridCtrl = dispFolder.add(this.state, 'grid')
    gridCtrl.onChange(() => this.updateDisplay())
    dispFolder.add(this.controls, 'autoRotate')

    // Lighting controls.
    const lightFolder = gui.addFolder('Lighting')
    lightFolder
      .add(this.renderer, 'outputEncoding', {
        sRGB: sRGBEncoding,
        Linear: LinearEncoding,
      })
      .onChange(() => {
        this.renderer.outputEncoding = Number(this.renderer.outputEncoding)
        traverseMaterials(this.content, (material) => {
          material.needsUpdate = true
        })
      })
    ;[
      lightFolder.add(this.state, 'addLights').listen(),
      lightFolder.add(this.state, 'ambientIntensity', 0, 2),
      lightFolder.addColor(this.state, 'ambientColor'),
      lightFolder.add(this.state, 'directIntensity', 0, 4), // TODO(#116)
      lightFolder.addColor(this.state, 'directColor'),
    ].forEach((ctrl) => ctrl.onChange(() => this.updateLights()))

    // Stats.
    const perfFolder = gui.addFolder('Performance')
    const perfLi = document.createElement('li')
    this.stats.dom.style.position = 'static'
    perfLi.appendChild(this.stats.dom)
    perfLi.classList.add('gui-stats')
    perfFolder.__ul.appendChild(perfLi)

    const guiWrap = document.createElement('div')
    this.el.appendChild(guiWrap)
    guiWrap.classList.add('gui-wrap')
    guiWrap.appendChild(gui.domElement)
    gui.open()
  }

  clear() {
    if (!this.content) return

    this.scene.remove(this.content)

    // dispose geometry
    this.content.traverse((node) => {
      if (!node.isMesh) return
      node.geometry.dispose()
    })

    // dispose textures
    traverseMaterials(this.content, (material) => {
      MAP_NAMES.forEach((map) => {
        if (material[map]) material[map].dispose()
      })
    })
  }
}

export default Viewer

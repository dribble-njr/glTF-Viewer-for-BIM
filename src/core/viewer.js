import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import throttle from "@/utils/throttle";

class Viewer {
  constructor(el) {
    this.el = el;

    this.content = null;
    
    this.stats = new Stats();
    Array.prototype.forEach.call(this.stats.dom.children, (child) => (child.style.display = ''));

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.01, 1000);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({antialias: true});   // 抗锯齿
    this.renderer.physicallyCorrectLights = true;                 // 使用正确的照明模式
    this.renderer.outputEncoding = THREE.sRGBEncoding;            // 输出 sRGB
    this.renderer.setClearColor(0xcccccc);                        // 设置颜色
    this.renderer.setPixelRatio(window.devicePixelRatio);         // 设置屏幕像素比
    this.renderer.setSize(el.clientWidth, el.clientHeight);       // 调整 canvas 大小
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.el.appendChild(this.renderer.domElement);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener(
      "resize",
      throttle(this.onWindowResize.bind(this), 50, {
        leading: true,
        trailing: true,
      })
    );
  }

  animate() {
    requestAnimationFrame(this.animate);

    this.controls.update();
    this.stats.update();
    this.render();
  }

  render() {
    this.renderer.render( this.scene, this.camera );
  }

  onWindowResize() {
    const {clientHeight, clientWidth} = this.el.parentElement;

    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  load(url) {
    // const baseURL = THREE.LoaderUtils.extractUrlBase(url);

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();

      loader.load(url, gltf => {
        const scene = gltf.scene || gltf.scenes[0];
        
        this.setContent(scene);

        resolve(gltf);
      }, xhr => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      }, reject)
    });
  }

  setContent(object) {
    // AABB 包围盒
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    this.controls.reset();

    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);
    this.controls.maxDistance = size * 10; // 最长拉远距离
    this.camera.near = size / 100;
    this.camera.far = size * 100;
    this.camera.updateProjectionMatrix();

    // 根据包围盒设置相机位置
    this.camera.position.copy(center);
    this.camera.position.x += size / 2.0;
    this.camera.position.y += size / 5.0;
    this.camera.position.z += size / 2.0;
    this.camera.lookAt(center);

    this.controls.saveState();

    this.scene.add(object);
    this.content = object;

    // Executes the callback on this object and all descendants.
    this.content.traverse(node => {
      if (node.isMesh) {
        // https://github.com/mrdoob/three.js/pull/18235
        node.material.depthWrite = !node.material.transparent;
        node.material.alphaTest = 0.5;
      }
    });

    this.addLight();
    this.updateTextureEncoding();
  }

  addLight() {
    // 环境光
    const ambLight = new THREE.AmbientLight(0xFFFFFF, 0.3);
    this.camera.add(ambLight);

    // 平行光
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8 * Math.PI);
    dirLight.position.set(0.5, 0, 0.866); // ~60º
    this.camera.add(dirLight);
  }

  updateTextureEncoding () {
    // 输入 sRGB
    const encoding = THREE.sRGBEncoding;
    traverseMaterials(this.content, (material) => {
      if (material.map) material.map.encoding = encoding;
      if (material.emissiveMap) material.emissiveMap.encoding = encoding;
      
      // 指定的材料需要重新编译
      if (material.map || material.emissiveMap) material.needsUpdate = true;
    });
  }
}

function traverseMaterials (object, callback) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    materials.forEach(callback);
  });
}

export default Viewer;

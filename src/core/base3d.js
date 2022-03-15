import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import throttle from "@/utils/throttle";

class Base3d {
  constructor(id) {
    this.container = document.getElementById(id);
    this.scene;
    this.camera;
    this.renderer;
    this.model;

    // TODO 状态监控
    // this.stats = document.getElementById(statsId);
    this.init();
    this.animate();
  }

  init() {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();

    // 添加物体
    this.addMesh();

    // 监听场景大小改变，调整渲染尺寸
    window.addEventListener("resize", throttle(this.onWindowResize.bind(this), 50, {
      leading: true,
      trailing: true
    }));
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xbfe3dd );
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(5, 2, 8);
  }

  initRenderer() {
    this.renderer = new THREE.WebGL1Renderer({ antialias: true });
    // 设置屏幕像素比
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // 渲染尺寸大小
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.container.appendChild(this.renderer.domElement);
  }

  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set( 0, 0.5, 0 );
    controls.update();
    controls.enablePan = false;
    controls.enableDamping = true;
  }

  setModel(modelName) {
    const loader = new GLTFLoader().setPath("files/gltf/");
    loader.load(modelName, gltf => {
      this.model = gltf.scene.children[0];
      this.scene.add(this.model);
    })
  }
  
  addMesh() {
    this.setModel("bag2.glb");
  }

  animate() {
    this.renderer.setAnimationLoop(this.render.bind(this));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export default Base3d;

import * as THREE from "three";
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
// import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
// import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

import throttle from "@/utils/throttle";
// import { getExtension } from "@/utils/common.js";

class Base3d {
  constructor(id) {
    this.container = document.getElementById(id);
    this.scene;
    this.camera;
    this.renderer;
    this.stats;

    this.init();
    this.animate();
  }

  init() {
    this.initScene();
    this.initCamera();
    this.initLight();
    this.initAxes();
    this.initRenderer();
    this.initControls();
    this.initStats();

    // 监听场景大小改变，调整渲染尺寸
    window.addEventListener("resize", throttle(this.onWindowResize.bind(this), 50, {
      leading: true,
      trailing: true
    }));
  }

  initScene() {
    this.scene = new THREE.Scene();
    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
		this.scene.add(mesh);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(100, 200, -300);
    this.camera.lookAt(0, 1, 0);
  }

  initLight() {
    // 环境光
    const ambLight = new THREE.AmbientLight(0xcccccc);
    this.scene.add(ambLight);

    // 平行光
    const dirLight = new THREE.DirectionalLight(0xaabbff, 0.3);
    dirLight.position.set(-3, 10, -10);
    this.scene.add(dirLight);
  }

  initAxes() {
    const axes = new THREE.AxesHelper(30);
    this.scene.add(axes);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // 设置屏幕像素比
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // 渲染尺寸大小
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.target.set( 0, 0.5, 0 );
    controls.update();
    controls.enablePan = false;
    controls.enableDamping = true;
    // controls.maxPolarAngle = 0.9 * Math.PI / 2;
		// controls.enableZoom = false;
  }

  initStats() {
    this.stats = new Stats();
		this.container.appendChild(this.stats.dom);
  }

  loadModel() {
    // const suffix = getExtension(name);
    let loader = new THREE.ObjectLoader();

    // switch(suffix) {
    //   case "json": {
    //     loader = new THREE.ObjectLoader().setPath("files/json/");
    //     break;
    //   }
      
    //   case "glb": {
    //     loader = new GLTFLoader().setPath("files/glb/");
    //     break;
    //   }

    //   case "obj": {
    //     loader = new OBJLoader().setPath("files/obj");
    //     break;
    //   }

    //   default:
    //     break;
    // }
    
    loader.load("files/json/bim.json", obj => {
      obj.scale.multiplyScalar(0.01);
      console.log(obj);
      this.scene.add(obj);
      // this.scene.traverse(children => {
      //   obj.push(children)
      // })
    }, xhr => {
      console.log( (xhr.loaded / xhr.total) * 100 + '% loaded');
    }, err => {
      console.log(err);
    })
  }

  animate() {
    this.renderer.setAnimationLoop(this.render.bind(this));
    this.stats.update();
  }

  render() {
    this.stats.begin();
    this.renderer.render(this.scene, this.camera);
    this.stats.end();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

export default Base3d;

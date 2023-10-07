# glTF Viewer for BIM

首先使用 Revit 二次开发技术将 revit 模型转换为 glTF 2.0 格式，对其进行数模分离、Draco 压缩，然后使用 Three.js 渲染 BIM 模型。

## 快速开始

本项目使用 pnpm 作为包管理工具，需确保安装了 pnpm：

```shell
npm install -g pnpm
```

启动项目：

```shell
pnpm install
pnpm dev
```

目录结构：

```shell
├── README.md
├── node_modules
├── package.json
├── pnpm-lock.yaml
├── public
│   └── index.html
├── src
│   ├── assets
│   │   ├── css
│   │   │   └── common.css
│   │   ├── draco - draco 依赖
│   │   │   ├── draco_decoder.js
│   │   │   ├── draco_decoder.wasm
│   │   │   ├── draco_encoder.js
│   │   │   └── draco_wasm_wrapper.js
│   │   └── models - 模型文件，LOD 加载时需要按此方式命名
│   │       ├── all.glb
│   │       ├── lod1.glb
│   │       ├── lod2.glb
│   │       └── lod3.glb
│   ├── core - 核心代码
│   │   ├── app.js - app
│   │   ├── viewer.js - three.js viewer
│   │   └── worker.js
│   ├── index.js
│   └── utils	- 工具函数
│       └── index.js
└── webpack.config.js
```

渲染模型：将转换后的 gltf 文件或 glb 文件拖拽进拖拽区域，等待片刻即可，**如不出现模型，点击一下屏幕即可（已知 bug）**。

## 特点

- [X] LOD
- [x] 非实时渲染
- [ ] Web Worker

## 参考资源

- [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer)
- [THREE.GLTFLoader](https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js)
- [glTF 2.0 Specification](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md)

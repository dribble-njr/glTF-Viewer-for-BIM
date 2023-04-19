# glTF Viewer for BIM

首先使用 Revit 二次开发技术将 revit 模型转换为 glTF 2.0 格式，对其进行数模分离、Draco 压缩，然后使用 Three.js 渲染 BIM 模型。

## 快速开始

```shell
pnpm install
npm run dev
```

## 特点

- [X] LOD
- [x] 非实时渲染
- [ ] Web Worker

## 参考资源

- [three-gltf-viewer](https://github.com/donmccurdy/three-gltf-viewer)
- [THREE.GLTFLoader](https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/GLTFLoader.js)
- [glTF 2.0 Specification](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md)
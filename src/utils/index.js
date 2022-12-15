import { Mesh, BufferGeometry } from 'three'

/**
 * 获取场景内模型数量、顶点数及面片数
 * 计算了重复顶点数？
 * @param {Scene} view ：需要计算的场景视图即scene
 */
export function getSceneModelFaceNum(view) {
  let scene = view
  let vertices = 0 //模型顶点
  let triangles = 0 // 模型面片
  let meshs = 0

  for (let index = 0; index < scene.children.length; index++) {
    let object = scene.children[index]

    object.traverseVisible(function(object) {
      if (object instanceof Mesh) {
        let geometry = object.geometry
        meshs++
        
        if (geometry instanceof BufferGeometry && geometry.attributes.position) {
          vertices += geometry.attributes.position.count
          if (geometry.index !== null) {
            triangles += geometry.index.count / 3
          } else {
            triangles += geometry.attributes.position.count / 3
          }
        }
      }
    })
  }

  console.log('模型顶点数: ' + vertices, '模型面片数: ' + triangles, 'mesh数：' + meshs)
}

/**
 * 遍历材质
 * @param {*} object
 * @param {*} callback
 */
export function traverseMaterials(object, callback) {
  object.traverse((node) => {
    if (!node.isMesh) return
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material]
    materials.forEach(callback)
  })
}

/**
 * 节流
 * @param {*} fn
 * @param {*} interval
 * @param {boolean} [options={ leading: true, trailing: false}]
 * @return {*} 
 */
export function throttle(fn, interval, options = { leading: true, trailing: false}) {
  const { leading, trailing } = options

  // 上次执行的时间
  let preTime = 0

  // 控制最后执行函数的定时器
  let timer = null

  const _throttle = function(...args) {
    // 当前时间戳
    const nowTime = new Date().getTime()

    // 控制首次执行
    // 若 leading 为 false，则表示首次不执行
    // 将 preTime 设置为 nowTime，表示上次已经执行过了，不需再次执行
    if (!leading && !preTime) preTime = nowTime

    // 剩余时间
    const remainTime = interval - (nowTime - preTime)

    if (remainTime <= 0) {
      // 清除定时器
      if (timer) {
        clearTimeout(timer)
        timer = null
      }

      // 执行函数
      fn.apply(this, args)

      // 记录执行时间
      preTime = nowTime

      return
    }
    
    // 控制最后执行
    if (trailing && !timer) {
      timer = setTimeout(() => {
        timer = null
        
        // 当设置 { leading: false } 时
        // 每次触发回调函数后设置 preTime 为 0
        // 不然为当前时间
        // 防止中间执行两次
        preTime = !leading ? 0 : new Date().getTime()

        // 执行函数
        fn.apply(this, args)
      }, remainTime)
    }
  };

  _throttle.cancel = function() {
    if (timer) clearTimeout(timer)
    timer = null
    preTime = 0
  }

  return _throttle
}

/**
 * 防抖
 * @param {*} fn 
 * @param {*} delay 
 * @param {*} immediate 
 * @returns 
 */
export function debounce(fn, delay, immediate = false) {
  let timer = null
  let isInvoke = false

  const _debounce = function(...args) {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  
    if (immediate && !isInvoke) {
      fn.apply(this, args)
      isInvoke = true
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args)
        timer = null
        isInvoke = false
      }, delay)
    }
  }

  _debounce.cancel = function() {
    if (timer) clearTimeout(timer)
    timer = null
    isInvoke = false
  }

  return _debounce
}

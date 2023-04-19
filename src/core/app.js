import Viewer from './viewer.js'

import { getSceneModelFaceNum } from '../utils'

class App {
  constructor(el) {
    this.el = el
    this.viewer = null
    this.viewerEl = null
    this.spinnerEl = document.querySelector('.spinner')
    this.dropEl = document.querySelector('.dropzone')
    this.lodLinkEl = document.querySelector('#lod-link')
    this.lodViewerEl = null
    this.workerLinkEl = document.querySelector('#worker-link')
    this.workerViewerEl = null
    
    this.createDropzone()
    this.hideSpinner()

    this.lodLinkEl.addEventListener('click', () => {
      this.createLod()
    })
    this.workerLinkEl.addEventListener('click', () => {
      this.createWorker()
    })
  }

  createDropzone() {
    // https://github.com/mdn/dom-examples/blob/main/drag-and-drop/File-drag.html
    
    // 必须先添加 dragover 事件并禁用默认操作
    // 意思是允许下放事件
    this.dropEl.addEventListener('dragover', (ev) => {
      console.log('File(s) in drop zone')

      // Prevent default behavior (Prevent file from being opened)
      ev.preventDefault()
    })

    this.dropEl.addEventListener('drop', (ev) => {
      console.log('File(s) dropped')

      this.showSpinner()

      // Prevent default behavior (Prevent file from being opened)
      ev.preventDefault()

      const fileMap = new Map

      if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        for (let i = 0; i < ev.dataTransfer.items.length; i++) {
          // If dropped items aren't files, reject them
          if (ev.dataTransfer.items[i].kind === 'file') {
            const file = ev.dataTransfer.items[i].getAsFile()
            fileMap.set(file.name, file)
            console.log('... file[' + i + '].name = ' + file.name)
          }
        }
      } else {
        // Use DataTransfer interface to access the file(s)
        for (let i = 0; i < ev.dataTransfer.files.length; i++) {
          fileMap.set(file.name, file)
          console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name)
        }
      }

      // Pass event to removeDragData for cleanup
      removeDragData(ev)

      function removeDragData(ev) {
        console.log('Removing drag data')
  
        if (ev.dataTransfer.items) {
          // Use DataTransferItemList interface to remove the drag data
          ev.dataTransfer.items.clear()
        } else {
          // Use DataTransfer interface to remove the drag data
          ev.dataTransfer.clearData()
        }
      }

      this.loadFiles(fileMap)
    })
  }

  loadFiles(fileMap) {
    console.log(fileMap)

    let rootFile
    let rootPath

    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file
        rootPath = path.replace(file.name, '')
      }
    })

    if (!rootFile) {
      this.onError('No .gltf or .glb asset found.')
    }
    
    console.log(rootFile, rootPath)
    
    this.view(rootFile, rootPath, fileMap)
  }

  view(rootFile, rootPath, files) {
    if (this.viewer) this.viewer.clear()

    const viewer = this.viewer || this.createViewer()

    const fileURL = typeof rootFile === 'string'
      ? rootFile
      : URL.createObjectURL(rootFile)

    const cleanup = () => {
      this.hideSpinner()
      if (typeof rootFile === 'object') URL.revokeObjectURL(fileURL)
    }

    const preTime = new Date().getTime()

    viewer
      .load(fileURL, rootPath, files)
      .catch((e) => this.onError(e))
      .then((gltf) => {
        const curTime = new Date().getTime()
        console.log(`共耗费 ${(curTime - preTime) / 1000} s`)
        cleanup()

        const scene = gltf.scene || gltf.scenes[0]
        getSceneModelFaceNum(scene)
      })
  }

  createViewer() {
    this.viewerEl = document.createElement('div')
    this.viewerEl.classList.add('viewer')
    this.dropEl.innerHTML = ''
    this.dropEl.appendChild(this.viewerEl)
    this.viewer = new Viewer(this.viewerEl)

    return this.viewer;
  }

  createLod() {
    this.lodViewerEl = document.createElement('div')
    this.lodViewerEl.classList.add('viewer')
    this.dropEl.innerHTML = ''
    this.dropEl.appendChild(this.lodViewerEl)

    if (this.viewer) {
      this.viewer.clear()
      this.viewer = null
    }

    const viewer = new Viewer(this.lodViewerEl)

    this.showSpinner()

    const preTime = new Date().getTime()

    viewer
      .loadLod()
      .catch((e) => this.onError(e))
      .then((lod) => {
        const curTime = new Date().getTime()
        console.log(`基础 lod 共耗费 ${(curTime - preTime) / 1000} s`)

        console.log('-------')
        console.log(lod)
        this.hideSpinner()
      })
  }

  createWorker() {
    this.workerViewerEl = document.createElement('div')
    this.workerViewerEl.classList.add('viewer')
    this.dropEl.innerHTML = ''
    this.dropEl.appendChild(this.workerViewerEl)

    if (this.viewer) {
      this.viewer.clear()
      this.viewer = null
    }

    const viewer = new Viewer(this.workerViewerEl)

    this.showSpinner()

    const preTime = new Date().getTime()

    viewer
      .loadWorker()
      .catch((e) => this.onError(e))
      .then((lod) => {
        const curTime = new Date().getTime()
        console.log(`worker lod 共耗费 ${(curTime - preTime) / 1000} s`)

        console.log('-------')
        console.log(lod)
        this.hideSpinner()
      })
  }

  onError(error) {
    let message = (error||{}).message || error.toString();
    if (message.match(/ProgressEvent/)) {
      message = 'Unable to retrieve this file. Check JS console and browser network tab.'
    } else if (message.match(/Unexpected token/)) {
      message = `Unable to parse file content. Verify that this file is valid. Error: "${message}"`
    } else if (error && error.target && error.target instanceof Image) {
      message = 'Missing texture: ' + error.target.src.split('/').pop()
    }
    window.alert(message)
    console.error(error)
  }

  showSpinner() {
    this.spinnerEl.style.display = ''
  }

  hideSpinner() {
    this.spinnerEl.style.display = 'none'
  }
}

export default App

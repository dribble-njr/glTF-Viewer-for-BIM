<template>
  <div id="home"></div>
</template>

<script>
import Viewer from "@/core/viewer.js";

export default {
  name: "Home",
  data() {
    return {
      viewer: null,
      viewerEl: null
    }
  },
  mounted() {
    this.viewerEl = document.getElementById("home");
    this.viewer = new Viewer(this.viewerEl);
    this.viewer.load('files/gltf/NewProject.gltf');
  }
};
</script>

<style scoped>
#home {
  width: 100vw;
  height: 100vh;
}
</style>

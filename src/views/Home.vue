<template>
  <div id="home"></div>
</template>

<script>
import Base3d from "@/core/base3d";

export default {
  name: "Home",
  data() {
    return {
      base3d: null,
    }
  },
  mounted() {
    this.base3d = new Base3d("home");
    this.base3d.loadModel();
  }
};
</script>

<style></style>

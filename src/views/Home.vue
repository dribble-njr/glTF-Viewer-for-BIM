<template>
  <div id="home">s</div>
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
  }
};
</script>

<style></style>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 18 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="6.4" stroke="currentColor" stroke-width="1.6" />
    <path d="M15.8 15.8 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
  </svg>
</template>

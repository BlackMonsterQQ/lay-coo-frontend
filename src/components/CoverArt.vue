<script setup lang="ts">
import { computed } from 'vue'
import { categoryName, coverClass } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    code?: string | null
    icon?: string | null
    desc?: string | null
    variant?: 'card' | 'wide' | 'hero' | 'mini'
    label?: boolean
  }>(),
  {
    code: 'SPOT',
    icon: '⛰️',
    desc: '',
    variant: 'card',
    label: true
  }
)

const CHAR_MAP: Record<string, string> = {
  FOOD: '味',
  STAY: '宿',
  PLAY: '乐',
  SHOP: '购',
  SPOT: '景',
  HERITAGE: '迹',
  INTANGIBLE: '艺',
  FOLK: '俗',
  FIGURE: '史'
}

const char = computed(() => CHAR_MAP[props.code || 'SPOT'] || '岚')
const name = computed(() => categoryName(props.code))
</script>

<template>
  <div class="cover" :class="[coverClass(code), `cover--size-${variant}`]">
    <svg class="cover__art" viewBox="0 0 320 200" fill="none" aria-hidden="true">
      <g v-if="code === 'FOOD'">
        <path d="M96 104h128a64 64 0 0 1-128 0Z" />
        <path d="M120 88c-8-12 8-18 0-30M152 88c-8-12 8-18 0-30M184 88c-8-12 8-18 0-30" />
        <path d="M216 120l30-24M224 128l30-24" />
      </g>
      <g v-else-if="code === 'STAY'">
        <path d="M102 108 160 64l58 44" />
        <path d="M116 102v60h88v-60" />
        <path d="M146 162v-38h28v38" />
        <path d="M100 162h120" />
      </g>
      <g v-else-if="code === 'PLAY'">
        <circle cx="160" cy="88" r="30" />
        <path d="M92 150c24-18 46-18 68 0M160 150c22-18 44-18 68 0" />
        <path d="M160 118v32" />
        <path d="M116 62l10 12M204 62l-10 12" />
      </g>
      <g v-else-if="code === 'SHOP'">
        <path d="M112 84h96l8 80H104z" />
        <path d="M136 84a24 24 0 0 1 48 0" />
        <path d="M148 108v28M172 108v28" />
      </g>
      <g v-else-if="code === 'SPOT'">
        <circle cx="226" cy="62" r="20" />
        <path d="M64 158 128 78l40 48 24-30 64 62" />
        <path d="M56 166h208" />
        <path d="M96 140c12-10 24-10 36 0" />
      </g>
      <g v-else-if="code === 'HERITAGE'">
        <path d="M64 150c30-52 66-78 96-78s66 26 96 78" />
        <path d="M64 150h192" />
        <path d="M96 150c10-24 34-40 64-40s54 16 64 40" />
        <path d="M80 168h160" />
      </g>
      <g v-else-if="code === 'INTANGIBLE'">
        <path d="M86 150c26-4 36-28 30-48-6-18 8-34 28-30 22 4 28 26 18 40-10 14-6 34 14 40" />
        <path d="M110 72c18 30 44 50 84 56" />
        <circle cx="110" cy="72" r="5" />
        <circle cx="194" cy="128" r="5" />
      </g>
      <g v-else-if="code === 'FOLK'">
        <ellipse cx="160" cy="104" rx="36" ry="42" />
        <path d="M148 56h24M152 60v6M168 60v6M152 146v8M168 146v8M144 156h32" />
        <path d="M142 96h36M140 112h40" />
      </g>
      <g v-else>
        <rect x="100" y="64" width="120" height="96" rx="6" />
        <path d="M118 88h84M118 104h84M118 120h56" />
        <circle cx="192" cy="132" r="12" />
      </g>
    </svg>

    <span class="cover__char">{{ char }}</span>
    <span v-if="label" class="cover__label">{{ name }}</span>
    <span v-if="desc" class="cover__desc">{{ desc }}</span>
  </div>
</template>

<style scoped>
.cover--size-card {
  aspect-ratio: 16 / 10;
}

.cover--size-wide {
  aspect-ratio: 21 / 9;
}

.cover--size-hero {
  aspect-ratio: 16 / 8;
  border-radius: var(--radius-lg);
}

.cover--size-mini {
  width: 84px;
  height: 84px;
  border-radius: 12px;
  flex-shrink: 0;
}

.cover--size-mini .cover__char {
  font-size: 3.4rem;
  right: 0;
  bottom: -8%;
}

.cover--size-mini .cover__label,
.cover--size-mini .cover__desc {
  display: none;
}

.cover--size-hero .cover__char {
  font-size: clamp(7rem, 18vw, 15rem);
  bottom: -18%;
  right: 6%;
}

.cover--size-hero .cover__label {
  left: 32px;
  bottom: 26px;
  font-size: 13px;
}

.cover--size-hero .cover__desc {
  right: 32px;
  bottom: 28px;
  font-size: 14px;
}

.cover__art {
  position: absolute;
  left: 46%;
  top: 46%;
  width: 58%;
  max-height: 82%;
  transform: translate(-50%, -50%);
  color: rgba(255, 250, 240, 0.55);
  opacity: 0.62;
  pointer-events: none;
}

.cover__art path,
.cover__art circle,
.cover__art ellipse,
.cover__art rect {
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cover--size-hero .cover__art {
  width: 44%;
  left: 40%;
  opacity: 0.5;
}

.cover--size-mini .cover__art {
  width: 74%;
  left: 50%;
  opacity: 0.4;
}
</style>

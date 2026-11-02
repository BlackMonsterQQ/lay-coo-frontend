<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ source?: string | null }>()

interface Block {
  type: 'h2' | 'p' | 'li'
  text: string
}

const blocks = computed<Block[]>(() => {
  const result: Block[] = []
  const lines = (props.source || '').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      continue
    }
    if (line.startsWith('## ')) {
      result.push({ type: 'h2', text: line.slice(3).trim() })
    } else if (line.startsWith('### ')) {
      result.push({ type: 'h2', text: line.slice(4).trim() })
    } else if (line.startsWith('- ')) {
      result.push({ type: 'li', text: line.slice(2).trim() })
    } else {
      result.push({ type: 'p', text: line })
    }
  }
  return result
})
</script>

<template>
  <div class="markdown">
    <template v-for="(block, index) in blocks" :key="index">
      <h3 v-if="block.type === 'h2'" class="markdown__h2">{{ block.text }}</h3>
      <p v-else-if="block.type === 'li'" class="markdown__li">{{ block.text }}</p>
      <p v-else class="markdown__p">{{ block.text }}</p>
    </template>
  </div>
</template>

<style scoped>
.markdown {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 15.5px;
  line-height: 1.9;
  color: var(--ink-soft);
}

.markdown__h2 {
  margin-top: 18px;
  padding-left: 14px;
  border-left: 3px solid var(--cinnabar);
  font-size: 21px;
  color: var(--ink);
}

.markdown__h2:first-child {
  margin-top: 0;
}

.markdown__p {
  letter-spacing: 0.01em;
}

.markdown__li {
  position: relative;
  padding-left: 20px;
  color: var(--ink-soft);
}

.markdown__li::before {
  content: '·';
  position: absolute;
  left: 4px;
  color: var(--cinnabar);
  font-weight: 700;
}
</style>

<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
let previousOverflow = ''
let opener: HTMLElement | null = null
onMounted(() => {
  opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
})
onUnmounted(() => {
  if (opener?.isConnected) opener.focus({ preventScroll: true })
})
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog"
    aria-labelledby="dialog-title"
    @cancel.prevent="emit('close')"
    @click="$event.target === dialog && emit('close')"
  >
    <div class="dialog-body">
      <button
        class="dialog-close icon-button"
        aria-label="Close dialog"
        autofocus
        @click="emit('close')"
      >
        <AppIcon name="close" />
      </button>
      <h2 id="dialog-title" class="sr-only">{{ title }}</h2>
      <slot />
    </div>
  </dialog>
</template>

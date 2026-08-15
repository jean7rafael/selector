<template>
  <!-- Página de retorno para qualquer endereço não cadastrado. -->
  <div
    class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center"
  >
    <div>
      <div class="error-code">404</div>

      <div class="error-title text-h2">Esta página não existe.</div>

      <q-btn
        class="q-mt-xl"
        color="white"
        text-color="blue"
        unelevated
        to="/"
        label="Voltar ao início"
        no-caps
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ErrorNotFound',
});
</script>

<style scoped>
.error-code {
  font-size: clamp(7rem, 30vh, 18rem);
  line-height: 1;
}

.error-title {
  opacity: 0.4;
}

@media (max-width: 599px) {
  .error-title {
    font-size: 2rem;
    line-height: 1.2;
  }
}
</style>

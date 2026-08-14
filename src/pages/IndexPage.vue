<template>
  <q-page padding class="row items-center justify-center">
    <!-- Apresentação curta dos três fluxos principais do aplicativo. -->
    <div class="full-width" style="max-width: 960px">
      <div class="text-center q-mb-xl">
        <div class="text-h3">Vôlei Hub</div>
        <p class="text-h6 text-grey-7">
          Times equilibrados, jogos organizados e presença num só lugar.
        </p>
      </div>

      <div class="row q-col-gutter-lg">
        <div v-for="item in features" :key="item.title" class="col-12 col-md-4">
          <q-card flat bordered class="full-height">
            <q-card-section class="text-center">
              <q-icon :name="item.icon" color="primary" size="52px" />
              <div class="text-h6 q-mt-md">{{ item.title }}</div>
              <p class="text-body2 text-grey-7">{{ item.description }}</p>
              <q-btn
                flat
                color="primary"
                :to="item.link"
                :label="item.action"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
/* ===========================================================
   DESTAQUES DA PÁGINA INICIAL

   O conteúdo declarativo mantém texto, ícone e destino juntos e
   evita repetir três blocos quase idênticos no template.
=========================================================== */

const features = [
  {
    icon: 'groups',
    title: 'Selecionar times',
    description: 'Escolha de 8 a 21 atletas e forme equipes equilibradas.',
    action: 'Abrir atletas',
    link: '/atletas',
  },
  {
    icon: 'event_available',
    title: 'Confirmar presença',
    description: 'Acompanhe os próximos jogos e responda à chamada.',
    action: 'Ver jogos',
    link: '/jogos',
  },
  {
    icon: 'install_mobile',
    title: 'Usar em qualquer lugar',
    description:
      'Instale o Vôlei Hub pela opção “Adicionar à Tela de Início” do navegador.',
    action: 'Ajustes',
    link: '/ajustes',
  },
];
</script>

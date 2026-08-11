<template>
  <q-page padding>
    <div class="page-content q-gutter-lg">
      <!-- Resumo da conta e função atribuída no Firebase. -->
      <div>
        <div class="text-h4">Ajustes</div>
        <div class="text-body2 text-grey-7">Conta, delegação de presença e notificações.</div>
      </div>

      <!-- Permissão push é solicitada somente após este clique. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Sua conta</div>
          <div>{{ currentUser?.displayName ?? currentUser?.email }}</div>
          <q-badge color="primary" :label="roleLabel" />
        </q-card-section>
      </q-card>

      <!-- Delegações podem ser criadas e revogadas pelo titular. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Notificações de jogos</div>
          <p class="text-body2 text-grey-7">
            No iPhone ou iPad, adicione o Vôlei Hub à Tela de Início antes de permitir notificações.
          </p>
          <q-btn
            v-if="!pushEnabled"
            color="primary"
            icon="notifications_active"
            label="Ativar notificações"
            :loading="pushLoading"
            @click="enablePush"
          />
          <q-btn
            v-else
            outline
            color="negative"
            icon="notifications_off"
            label="Desativar neste aparelho"
            :loading="pushLoading"
            @click="disablePush"
          />
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Delegar minha presença</div>
          <p class="text-body2 text-grey-7">As pessoas escolhidas poderão responder “vou”, “talvez” ou “não vou” por você.</p>
          <div class="row items-start q-col-gutter-md">
            <div class="col-12 col-sm">
              <q-select
                v-model="selectedDelegateId"
                outlined
                emit-value
                map-options
                label="Escolher pessoa"
                :options="delegateOptions"
                :loading="loadingUsers"
              />
            </div>
            <div class="col-auto"><q-btn color="primary" label="Delegar" :disable="!selectedDelegate" @click="addDelegate" /></div>
          </div>
        </q-card-section>
        <q-list separator>
          <q-item v-for="delegate in delegates" :key="delegate.uid">
            <q-item-section>
              <q-item-label>{{ delegate.displayName }}</q-item-label>
              <q-item-label caption>{{ delegate.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn round flat icon="delete" color="negative" aria-label="Remover delegação" @click="removeDelegate(delegate)" />
            </q-item-section>
          </q-item>
          <q-item v-if="!delegates.length"><q-item-section class="text-grey-6">Nenhuma delegação cadastrada.</q-item-section></q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { currentRole, currentUser } from 'src/misc/auth';
import {
  delegatePresence,
  listDelegates,
  listUsers,
  removePresenceDelegate,
  type PresenceSubject,
} from 'src/misc/games';
import { disablePushNotifications, enablePushNotifications } from 'src/misc/notifications';

const $q = useQuasar();
const users = ref<PresenceSubject[]>([]);
const delegates = ref<PresenceSubject[]>([]);
const selectedDelegateId = ref('');
const loadingUsers = ref(true);
const pushLoading = ref(false);
const pushEnabled = ref(Boolean(localStorage.getItem('selector-push-subscription')));

/* ===========================================================
   OPÇÕES DERIVADAS DA CONTA ATUAL
=========================================================== */

const roleLabel = computed(() => ({ admin: 'Administrador', director: 'Diretoria', member: 'Membro' }[currentRole.value ?? 'member']));
const availableUsers = computed(() => users.value.filter((user) =>
  user.uid !== currentUser.value?.uid && !delegates.value.some((delegate) => delegate.uid === user.uid),
));
const delegateOptions = computed(() => availableUsers.value.map((user) => ({ label: `${user.displayName} (${user.email})`, value: user.uid })));
const selectedDelegate = computed(() => users.value.find((user) => user.uid === selectedDelegateId.value));

/* Carrega elenco e delegações em paralelo para reduzir a espera. */
onMounted(async () => {
  if (!currentUser.value) return;
  try {
    [users.value, delegates.value] = await Promise.all([
      listUsers(),
      listDelegates(currentUser.value.uid),
    ]);
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível carregar as delegações.' });
  } finally {
    loadingUsers.value = false;
  }
});

/* ===========================================================
   GESTÃO DE DELEGAÇÕES
=========================================================== */

async function addDelegate() {
  if (!currentUser.value || !selectedDelegate.value) return;
  const self: PresenceSubject = {
    uid: currentUser.value.uid,
    displayName: currentUser.value.displayName ?? currentUser.value.email ?? 'Membro',
    email: currentUser.value.email ?? '',
  };
  try {
    await delegatePresence(self, selectedDelegate.value);
    delegates.value.push(selectedDelegate.value);
    selectedDelegateId.value = '';
    $q.notify({ type: 'positive', message: 'Delegação salva.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível salvar a delegação.' });
  }
}

async function removeDelegate(delegate: PresenceSubject) {
  if (!currentUser.value) return;
  try {
    await removePresenceDelegate(currentUser.value.uid, delegate.uid);
    delegates.value = delegates.value.filter((item) => item.uid !== delegate.uid);
    $q.notify({ type: 'info', message: 'Delegação removida.' });
  } catch {
    $q.notify({ type: 'negative', message: 'Não foi possível remover a delegação.' });
  }
}

/* ===========================================================
   GESTÃO DAS NOTIFICAÇÕES NESTE APARELHO
=========================================================== */

async function enablePush() {
  if (!currentUser.value) return;
  pushLoading.value = true;
  try {
    await enablePushNotifications(currentUser.value);
    pushEnabled.value = true;
    $q.notify({ type: 'positive', message: 'Notificações ativadas neste aparelho.' });
  } catch (error) {
    $q.notify({ type: 'negative', message: error instanceof Error ? error.message : 'Não foi possível ativar notificações.' });
  } finally {
    pushLoading.value = false;
  }
}

async function disablePush() {
  if (!currentUser.value) return;
  pushLoading.value = true;
  try {
    await disablePushNotifications(currentUser.value);
    pushEnabled.value = false;
    $q.notify({ type: 'info', message: 'Notificações desativadas neste aparelho.' });
  } finally {
    pushLoading.value = false;
  }
}
</script>

<style scoped>
.page-content { max-width: 760px; margin: 0 auto; }
</style>

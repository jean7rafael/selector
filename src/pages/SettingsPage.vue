<template>
  <q-page padding>
    <div class="page-content q-gutter-lg">
      <!-- Resumo da conta e função atribuída no Firebase. -->
      <div>
        <div class="text-h4">Ajustes</div>
        <div class="text-body2 text-grey-7">
          Conta, delegação de presença e notificações.
        </div>
      </div>

      <!-- Permissão push é solicitada somente após este clique. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Sua conta</div>
          <div>{{ currentUser?.displayName ?? currentUser?.email }}</div>
          <q-badge color="primary" :label="roleLabel" />
        </q-card-section>
      </q-card>

      <!-- A administração centraliza funções sem expor telefones aos membros. -->
      <q-card v-if="currentRole === 'admin'" flat bordered>
        <q-card-section>
          <div class="text-h6">Usuários cadastrados</div>
          <p class="text-body2 text-grey-7">
            Consulte os contatos e defina quem é membro, diretoria ou
            administrador.
          </p>
        </q-card-section>

        <q-list separator>
          <q-item v-for="user in managedUsers" :key="user.uid">
            <q-item-section>
              <q-item-label>{{ user.displayName }}</q-item-label>
              <q-item-label caption>{{ user.email }}</q-item-label>
              <q-item-label caption>Usuário: {{ user.username }}</q-item-label>
              <q-item-label caption>{{
                user.phone || 'Telefone não informado'
              }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center no-wrap q-gutter-sm">
                <q-btn
                  round
                  flat
                  icon="edit"
                  :aria-label="`Editar ${user.email}`"
                  @click="openUserEditor(user)"
                />
                <q-btn
                  round
                  flat
                  icon="delete"
                  color="negative"
                  :aria-label="`Excluir ${user.email}`"
                  :disable="user.uid === currentUser?.uid"
                  :loading="deletingUserIds.includes(user.uid)"
                  @click="deleteUserProfile(user)"
                />
                <q-select
                  class="role-select"
                  dense
                  outlined
                  emit-value
                  map-options
                  :label="`Função de ${user.email}`"
                  :model-value="user.role"
                  :options="roleOptions"
                  :disable="user.uid === currentUser?.uid"
                  :loading="savingUserIds.includes(user.uid)"
                  @update:model-value="(role) => saveUserRole(user, role)"
                />
              </div>
              <q-item-label v-if="user.uid === currentUser?.uid" caption
                >Sua conta está protegida</q-item-label
              >
            </q-item-section>
          </q-item>
          <q-item v-if="loadingManagedUsers">
            <q-item-section class="text-grey-6"
              >Carregando usuários…</q-item-section
            >
          </q-item>
          <q-item v-else-if="!managedUsers.length">
            <q-item-section class="text-grey-6"
              >Nenhum usuário cadastrado.</q-item-section
            >
          </q-item>
        </q-list>
      </q-card>

      <!-- Delegações podem ser criadas e revogadas pelo titular. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Notificações de jogos</div>
          <p class="text-body2 text-grey-7">
            No iPhone ou iPad, adicione o Vôlei Hub à Tela de Início antes de
            permitir notificações.
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
          <p class="text-body2 text-grey-7">
            As pessoas escolhidas poderão responder “vou”, “talvez” ou “não vou”
            por você.
          </p>
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
            <div class="col-auto">
              <q-btn
                color="primary"
                label="Delegar"
                :disable="!selectedDelegate"
                @click="addDelegate"
              />
            </div>
          </div>
        </q-card-section>
        <q-list separator>
          <q-item v-for="delegate in delegates" :key="delegate.uid">
            <q-item-section>
              <q-item-label>{{ delegate.displayName }}</q-item-label>
              <q-item-label caption>{{ delegate.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                round
                flat
                icon="delete"
                color="negative"
                aria-label="Remover delegação"
                @click="removeDelegate(delegate)"
              />
            </q-item-section>
          </q-item>
          <q-item v-if="!delegates.length"
            ><q-item-section class="text-grey-6"
              >Nenhuma delegação cadastrada.</q-item-section
            ></q-item
          >
        </q-list>
      </q-card>
    </div>

    <!-- Um único editor atende todos os perfis listados para a administração. -->
    <q-dialog v-model="userEditorOpen">
      <q-card class="user-editor-card">
        <q-card-section>
          <div class="text-h6">Editar usuário</div>
          <div class="text-caption text-grey-7">{{ editingUser.email }}</div>
        </q-card-section>

        <q-form @submit.prevent="saveUserProfile">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model.trim="editingUser.displayName"
              filled
              label="Nome"
              :rules="[(value) => Boolean(value) || 'Informe o nome']"
            />
            <q-input
              v-model.trim="editingUser.username"
              filled
              label="Usuário"
              :rules="[(value) => Boolean(value) || 'Informe o usuário']"
            />
            <q-input
              v-model.trim="editingUser.email"
              filled
              type="email"
              label="E-mail"
              hint="Alterar o e-mail exige a função administrativa publicada."
              :rules="emailRules"
            />
            <q-input
              v-model="editingUser.phone"
              filled
              type="tel"
              label="Telefone"
              :mask="phoneMask"
              hint="Formato: (XX) XXX XXX XXX"
              :rules="phoneRules"
            />

            <q-separator />
            <q-banner rounded class="bg-blue-1 text-primary">
              A senha atual não pode ser exibida. Digite uma nova senha somente
              se quiser substituí-la.
            </q-banner>
            <q-input
              v-model="newPassword"
              filled
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              label="Nova senha"
              hint="Deixe vazio para manter a senha atual."
              :rules="newPasswordRules"
            >
              <template #append>
                <q-icon
                  :name="showNewPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="
                    showNewPassword
                      ? 'Ocultar nova senha'
                      : 'Mostrar nova senha'
                  "
                  @click="showNewPassword = !showNewPassword"
                />
              </template>
            </q-input>
            <q-input
              v-if="newPassword"
              v-model="newPasswordConfirmation"
              filled
              :type="showNewPassword ? 'text' : 'password'"
              autocomplete="new-password"
              label="Repita a nova senha"
              :rules="newPasswordConfirmationRules"
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn
              color="primary"
              label="Salvar"
              type="submit"
              :loading="savingUserProfile"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { currentRole, currentUser, type Role } from 'src/misc/auth';
import {
  delegatePresence,
  listDelegates,
  listUsers,
  removePresenceDelegate,
  type PresenceSubject,
} from 'src/misc/games';
import {
  disablePushNotifications,
  enablePushNotifications,
} from 'src/misc/notifications';
import { isValidPhone, phoneMask } from 'src/domain/user-profile';
import {
  deleteManagedUser,
  listManagedUsers,
  updateManagedUserProfile,
  updateManagedUserRole,
  type ManagedUser,
} from 'src/misc/users';

const $q = useQuasar();
const users = ref<PresenceSubject[]>([]);
const delegates = ref<PresenceSubject[]>([]);
const selectedDelegateId = ref('');
const loadingUsers = ref(true);
const managedUsers = ref<ManagedUser[]>([]);
const loadingManagedUsers = ref(false);
const savingUserIds = ref<string[]>([]);
const deletingUserIds = ref<string[]>([]);
const userEditorOpen = ref(false);
const editingUser = ref<ManagedUser>({
  uid: '',
  displayName: '',
  email: '',
  phone: '',
  role: 'member',
  username: '',
});
const newPassword = ref('');
const newPasswordConfirmation = ref('');
const showNewPassword = ref(false);
const savingUserProfile = ref(false);
const pushLoading = ref(false);
const pushEnabled = ref(
  Boolean(localStorage.getItem('selector-push-subscription')),
);

/* ===========================================================
   OPÇÕES DERIVADAS DA CONTA ATUAL
=========================================================== */

const roleLabel = computed(
  () =>
    ({ admin: 'Administrador', director: 'Diretoria', member: 'Membro' })[
      currentRole.value ?? 'member'
    ],
);
const availableUsers = computed(() =>
  users.value.filter(
    (user) =>
      user.uid !== currentUser.value?.uid &&
      !delegates.value.some((delegate) => delegate.uid === user.uid),
  ),
);
const delegateOptions = computed(() =>
  availableUsers.value.map((user) => ({
    label: `${user.displayName} (${user.email})`,
    value: user.uid,
  })),
);
const selectedDelegate = computed(() =>
  users.value.find((user) => user.uid === selectedDelegateId.value),
);
const roleOptions = [
  { label: 'Membro', value: 'member' },
  { label: 'Diretoria', value: 'director' },
  { label: 'Administrador', value: 'admin' },
];
const emailRules = [
  (value: string) => Boolean(value) || 'Informe o e-mail',
  (value: string) => /^\S+@\S+\.\S+$/.test(value) || 'Informe um e-mail válido',
];
const phoneRules = [
  (value: string) => isValidPhone(value) || 'Use o formato (XX) XXX XXX XXX',
];
const newPasswordRules = [
  (value: string) =>
    !value ||
    value.length >= 6 ||
    'A nova senha precisa ter pelo menos 6 caracteres',
];
const newPasswordConfirmationRules = [
  (value: string) => value === newPassword.value || 'As senhas não são iguais',
];

/* Carrega elenco e delegações em paralelo para reduzir a espera. */
onMounted(async () => {
  if (!currentUser.value) return;
  try {
    [users.value, delegates.value] = await Promise.all([
      listUsers(),
      listDelegates(currentUser.value.uid),
    ]);
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível carregar as delegações.',
    });
  } finally {
    loadingUsers.value = false;
  }

  /* Telefones e funções adicionais são buscados somente para administração. */
  if (currentRole.value === 'admin') {
    loadingManagedUsers.value = true;
    try {
      managedUsers.value = await listManagedUsers();
    } catch {
      $q.notify({
        type: 'negative',
        message: 'Não foi possível carregar os usuários.',
      });
    } finally {
      loadingManagedUsers.value = false;
    }
  }
});

/* ===========================================================
   GESTÃO DE FUNÇÕES

   A própria conta fica bloqueada na tela e também nas regras do
   Firestore, preservando ao menos um administrador conhecido.
=========================================================== */

async function saveUserRole(user: ManagedUser, role: Role) {
  if (user.uid === currentUser.value?.uid || user.role === role) return;
  savingUserIds.value.push(user.uid);
  try {
    await updateManagedUserRole(user.uid, role);
    user.role = role;
    $q.notify({
      type: 'positive',
      message: 'Função atualizada. Ela valerá no próximo acesso da pessoa.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível atualizar a função.',
    });
  } finally {
    savingUserIds.value = savingUserIds.value.filter(
      (userId) => userId !== user.uid,
    );
  }
}

/* Abre uma cópia para cancelar sem modificar a lista visível. */
function openUserEditor(user: ManagedUser) {
  editingUser.value = { ...user };
  newPassword.value = '';
  newPasswordConfirmation.value = '';
  showNewPassword.value = false;
  userEditorOpen.value = true;
}

async function saveUserProfile() {
  const original = managedUsers.value.find(
    (user) => user.uid === editingUser.value.uid,
  );
  if (!original || !isValidPhone(editingUser.value.phone)) return;
  if (newPassword.value !== newPasswordConfirmation.value) return;

  savingUserProfile.value = true;
  try {
    await updateManagedUserProfile(
      original,
      editingUser.value,
      newPassword.value,
    );
    Object.assign(original, editingUser.value);
    userEditorOpen.value = false;
    $q.notify({ type: 'positive', message: 'Usuário atualizado.' });
  } catch {
    const credentialChanged =
      original.email !== editingUser.value.email || Boolean(newPassword.value);
    $q.notify({
      type: 'negative',
      message: credentialChanged
        ? 'E-mail e senha exigem a função administrativa no plano Blaze.'
        : 'Não foi possível atualizar o usuário.',
    });
  } finally {
    savingUserProfile.value = false;
  }
}

async function deleteUserProfile(user: ManagedUser) {
  if (user.uid === currentUser.value?.uid) return;
  const confirmed = window.confirm(
    `Excluir permanentemente ${user.displayName} (${user.email}) e todos os dados da conta?`,
  );
  if (!confirmed) return;

  deletingUserIds.value.push(user.uid);
  try {
    await deleteManagedUser(user.uid);
    managedUsers.value = managedUsers.value.filter(
      (item) => item.uid !== user.uid,
    );
    users.value = users.value.filter((item) => item.uid !== user.uid);
    delegates.value = delegates.value.filter((item) => item.uid !== user.uid);
    $q.notify({ type: 'info', message: 'Usuário excluído.' });
  } catch {
    $q.notify({
      type: 'negative',
      message:
        'A exclusão segura exige a função administrativa no plano Blaze.',
    });
  } finally {
    deletingUserIds.value = deletingUserIds.value.filter(
      (userId) => userId !== user.uid,
    );
  }
}

/* ===========================================================
   GESTÃO DE DELEGAÇÕES
=========================================================== */

async function addDelegate() {
  if (!currentUser.value || !selectedDelegate.value) return;
  const self: PresenceSubject = {
    uid: currentUser.value.uid,
    displayName:
      currentUser.value.displayName ?? currentUser.value.email ?? 'Membro',
    email: currentUser.value.email ?? '',
  };
  try {
    await delegatePresence(self, selectedDelegate.value);
    delegates.value.push(selectedDelegate.value);
    selectedDelegateId.value = '';
    $q.notify({ type: 'positive', message: 'Delegação salva.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível salvar a delegação.',
    });
  }
}

async function removeDelegate(delegate: PresenceSubject) {
  if (!currentUser.value) return;
  try {
    await removePresenceDelegate(currentUser.value.uid, delegate.uid);
    delegates.value = delegates.value.filter(
      (item) => item.uid !== delegate.uid,
    );
    $q.notify({ type: 'info', message: 'Delegação removida.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível remover a delegação.',
    });
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
    $q.notify({
      type: 'positive',
      message: 'Notificações ativadas neste aparelho.',
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível ativar notificações.',
    });
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
    $q.notify({
      type: 'info',
      message: 'Notificações desativadas neste aparelho.',
    });
  } finally {
    pushLoading.value = false;
  }
}
</script>

<style scoped>
.page-content {
  max-width: 760px;
  margin: 0 auto;
}
.role-select {
  min-width: 170px;
}
.user-editor-card {
  width: 520px;
  max-width: 95vw;
}
</style>

<template>
  <q-page class="app-page">
    <div class="app-page-content app-page-content--narrow q-gutter-lg">
      <!-- Resumo da conta e função atribuída no Firebase. -->
      <div class="app-page-header">
        <div class="app-page-heading">
          <div class="app-page-title text-h4">Ajustes</div>
          <div class="text-body2 text-grey-7">
            Conta, delegação de presença e notificações.
          </div>
        </div>
      </div>

      <!-- Permissão push é solicitada somente após este clique. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Sua conta</div>
          <div>{{ currentUser?.displayName ?? currentUser?.email }}</div>
          <div class="app-wrap-actions q-mt-sm">
            <q-badge color="primary" :label="roleLabel" />
            <q-badge
              :color="emailVerified ? 'positive' : 'warning'"
              :label="emailVerified ? 'E-mail verificado' : 'E-mail pendente'"
            />
            <q-badge :color="accountStatusColor" :label="accountStatusLabel" />
          </div>
          <div class="q-mt-sm text-body2">
            Atleta vinculado: {{ currentPlayer?.name || 'Nenhum' }}
          </div>
          <q-banner
            v-if="!canUseMemberFeatures"
            rounded
            class="q-mt-md bg-orange-1 text-warning"
          >
            Confirme o e-mail e aguarde a aprovação da administração para usar
            presença, delegações e notificações.
          </q-banner>
          <div v-if="!emailVerified" class="app-wrap-actions q-mt-md">
            <q-btn
              outline
              color="primary"
              label="Enviar verificação"
              :loading="verificationLoading"
              @click="sendVerificationEmail"
            />
            <q-btn
              flat
              color="primary"
              label="Já verifiquei"
              :loading="verificationLoading"
              @click="refreshVerificationStatus"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- A administração centraliza funções sem expor telefones aos membros. -->
      <q-card v-if="isCurrentAdmin" flat bordered>
        <q-card-section>
          <div class="text-h6">Usuários cadastrados</div>
          <p class="text-body2 text-grey-7">
            Consulte os contatos e defina quem é membro, diretoria ou
            administrador.
          </p>
        </q-card-section>

        <q-list separator>
          <q-item
            v-for="user in managedUsers"
            :key="user.uid"
            class="managed-user-item"
          >
            <q-item-section>
              <q-item-label>{{ user.displayName }}</q-item-label>
              <q-item-label caption>{{ user.email }}</q-item-label>
              <q-item-label caption>Usuário: {{ user.username }}</q-item-label>
              <q-item-label caption>{{
                user.phone || 'Telefone não informado'
              }}</q-item-label>
              <q-item-label caption
                >Atleta: {{ user.playerName || 'Não vinculado' }}</q-item-label
              >
              <q-item-label caption
                >Situação: {{ accountStatusText(user.status) }}</q-item-label
              >
            </q-item-section>
            <q-item-section side class="managed-user-controls">
              <div class="managed-user-actions">
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
                  icon="lock_reset"
                  color="primary"
                  :aria-label="`Enviar redefinição para ${user.email}`"
                  @click="requestUserPasswordReset(user)"
                />
                <q-btn
                  round
                  flat
                  icon="person_off"
                  color="negative"
                  :aria-label="`Desativar ${user.email}`"
                  :disable="user.uid === currentUser?.uid"
                  :loading="deletingUserIds.includes(user.uid)"
                  @click="deactivateUser(user)"
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
                <q-select
                  class="status-select"
                  dense
                  outlined
                  emit-value
                  map-options
                  :label="`Situação de ${user.email}`"
                  :model-value="user.status"
                  :options="statusOptions"
                  :disable="user.uid === currentUser?.uid"
                  :loading="savingUserIds.includes(user.uid)"
                  @update:model-value="(status) => saveUserStatus(user, status)"
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

      <!-- A trilha é imutável e visível apenas para a administração. -->
      <q-card v-if="isCurrentAdmin" flat bordered>
        <q-card-section>
          <div class="text-h6">Histórico administrativo</div>
          <p class="text-body2 text-grey-7">
            Últimas alterações sensíveis, sem registrar senhas ou segredos.
          </p>
        </q-card-section>
        <q-list separator>
          <q-item v-for="entry in auditLogs" :key="entry.id" class="audit-item">
            <q-item-section>
              <q-item-label>{{ auditActionLabel(entry.action) }}</q-item-label>
              <q-item-label caption>
                {{ entry.actorEmail }} →
                {{ entry.targetName || entry.targetEmail }}
              </q-item-label>
              <q-item-label caption>
                Campos: {{ entry.changedFields.join(', ') || 'conta' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>{{
                formatAuditDate(entry.createdAt)
              }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="loadingAuditLogs">
            <q-item-section class="text-grey-6"
              >Carregando histórico…</q-item-section
            >
          </q-item>
          <q-item v-else-if="!auditLogs.length">
            <q-item-section class="text-grey-6"
              >Nenhuma ação administrativa registrada.</q-item-section
            >
          </q-item>
        </q-list>
      </q-card>

      <!-- Delegações podem ser criadas e revogadas pelo titular. -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6">Notificações de jogos</div>
          <p v-if="pushStatus === 'available'" class="text-body2 text-grey-7">
            Receba avisos de novos jogos e lembretes neste aparelho.
          </p>
          <q-banner
            v-else-if="pushStatus === 'install-required'"
            rounded
            class="q-mb-md bg-orange-1 text-warning"
          >
            <div class="text-subtitle2">Instale antes de ativar</div>
            <ol class="q-my-sm q-pl-lg">
              <li>
                No Safari ou Edge, toque em <strong>Compartilhar</strong>.
              </li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Abra o Vôlei Hub pelo novo ícone.</li>
              <li>Volte a Ajustes e ative as notificações.</li>
            </ol>
          </q-banner>
          <q-banner
            v-else-if="pushStatus === 'permission-denied'"
            rounded
            class="q-mb-md bg-orange-1 text-warning"
          >
            As notificações foram bloqueadas. Abra as configurações do navegador
            ou do aparelho, permita notificações para o Vôlei Hub e volte a esta
            tela.
          </q-banner>
          <q-banner
            v-else-if="pushStatus === 'unsupported'"
            rounded
            class="q-mb-md bg-grey-2 text-grey-8"
          >
            Este navegador ou aparelho não disponibiliza todas as APIs de Web
            Push. Confirme se ele está atualizado e tente novamente.
          </q-banner>
          <p v-else class="text-body2 text-grey-7">
            Verificando as notificações disponíveis neste aparelho…
          </p>
          <q-btn
            v-if="!pushEnabled && pushStatus === 'available'"
            color="primary"
            icon="notifications_active"
            label="Ativar notificações"
            :loading="pushLoading"
            :disable="!canUseMemberFeatures"
            @click="enablePush"
          />
          <q-btn
            v-else-if="!pushEnabled && pushStatus === 'checking'"
            color="primary"
            icon="notifications_active"
            label="Verificando notificações"
            loading
            disable
          />
          <q-btn
            v-else-if="pushEnabled"
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
                :disable="!canUseMemberFeatures"
              />
            </div>
            <div class="col-12 col-sm-auto">
              <q-btn
                class="app-mobile-full"
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
              <q-item-label>{{
                delegate.playerName || delegate.displayName
              }}</q-item-label>
              <q-item-label v-if="delegate.playerName" caption>
                Conta: {{ delegate.displayName }}
              </q-item-label>
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
      <q-card class="app-dialog-card">
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
              readonly
              hint="No plano gratuito, o endereço é alterado pelo próprio titular ou manualmente no Firebase."
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
            <q-select
              v-model="editingUser.playerId"
              filled
              clearable
              emit-value
              map-options
              label="Atleta vinculado"
              hint="Cada atleta pode pertencer a somente uma conta."
              :options="playerOptions"
            />

            <q-banner rounded class="bg-blue-1 text-primary">
              Senhas nunca são exibidas. Use o botão de redefinição na lista
              para enviar um link seguro ao e-mail da pessoa.
            </q-banner>
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
import { computed, onMounted, ref, watch } from 'vue';
import { reload, sendEmailVerification } from 'firebase/auth';
import { useQuasar } from 'quasar';
import {
  canUseMemberFeatures,
  currentAccountStatus,
  currentPlayer,
  currentRole,
  currentUser,
  refreshCurrentAccess,
  type AccountStatus,
  type Role,
} from 'src/misc/auth';
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
  pushAvailability,
} from 'src/misc/notifications';
import type { PushAvailability } from 'src/domain/push-support';
import { isValidPhone, phoneMask } from 'src/domain/user-profile';
import { readPlayers, type Player } from 'src/misc/database';
import {
  listAuditLogs,
  listManagedUsers,
  sendManagedUserPasswordReset,
  synchronizeMemberDirectory,
  updateManagedUserProfile,
  updateManagedUserRole,
  updateManagedUserStatus,
  type AuditAction,
  type AuditLog,
  type ManagedUser,
} from 'src/misc/users';

const $q = useQuasar();
const users = ref<PresenceSubject[]>([]);
const delegates = ref<PresenceSubject[]>([]);
const selectedDelegateId = ref('');
const loadingUsers = ref(true);
const managedUsers = ref<ManagedUser[]>([]);
const players = ref<Player[]>([]);
const auditLogs = ref<AuditLog[]>([]);
const loadingManagedUsers = ref(false);
const loadingAuditLogs = ref(false);
const savingUserIds = ref<string[]>([]);
const deletingUserIds = ref<string[]>([]);
const userEditorOpen = ref(false);
const editingUser = ref<ManagedUser>({
  uid: '',
  displayName: '',
  email: '',
  phone: '',
  playerId: '',
  playerName: '',
  role: 'member',
  status: 'pending',
  username: '',
});
const savingUserProfile = ref(false);
const verificationLoading = ref(false);
const emailVerified = ref(Boolean(currentUser.value?.emailVerified));
const pushLoading = ref(false);
const pushEnabled = ref(
  Boolean(localStorage.getItem('selector-push-subscription')),
);
const pushStatus = ref<PushAvailability | 'checking'>('checking');

/* ===========================================================
   OPÇÕES DERIVADAS DA CONTA ATUAL
=========================================================== */

const roleLabel = computed(
  () =>
    ({ admin: 'Administrador', director: 'Diretoria', member: 'Membro' })[
      currentRole.value ?? 'member'
    ],
);
const accountStatusLabel = computed(() =>
  accountStatusText(currentAccountStatus.value ?? 'pending'),
);
const accountStatusColor = computed(() =>
  currentAccountStatus.value === 'approved'
    ? 'positive'
    : currentAccountStatus.value === 'rejected'
      ? 'negative'
      : 'warning',
);
const isCurrentAdmin = computed(
  () => currentRole.value === 'admin' && canUseMemberFeatures.value,
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
    label: user.playerName
      ? `${user.playerName} (${user.displayName})`
      : user.displayName,
    value: user.uid,
  })),
);
const selectedDelegate = computed(() =>
  users.value.find((user) => user.uid === selectedDelegateId.value),
);
const playerOptions = computed(() =>
  players.value
    .filter((player) => Boolean(player.id))
    .map((player) => ({
      label: player.name,
      value: player.id,
      disable: managedUsers.value.some(
        (user) =>
          user.uid !== editingUser.value.uid && user.playerId === player.id,
      ),
    })),
);
const roleOptions = [
  { label: 'Membro', value: 'member' },
  { label: 'Diretoria', value: 'director' },
  { label: 'Administrador', value: 'admin' },
];
const statusOptions = [
  { label: 'Aguardando aprovação', value: 'pending' },
  { label: 'Aprovada', value: 'approved' },
  { label: 'Não aprovada', value: 'rejected' },
];

function accountStatusText(status: AccountStatus) {
  return (
    {
      approved: 'Aprovada',
      pending: 'Aguardando aprovação',
      rejected: 'Não aprovada',
    } satisfies Record<AccountStatus, string>
  )[status];
}
const emailRules = [
  (value: string) => Boolean(value) || 'Informe o e-mail',
  (value: string) => /^\S+@\S+\.\S+$/.test(value) || 'Informe um e-mail válido',
];
const phoneRules = [
  (value: string) => isValidPhone(value) || 'Use o formato (XX) XXX XXX XXX',
];

watch(
  currentUser,
  (user) => {
    emailVerified.value = Boolean(user?.emailVerified);
  },
  { immediate: true },
);

/* Contas pendentes não consultam o diretório interno. Depois da aprovação ou
   confirmação do e-mail, a observação abaixo carrega os dados automaticamente. */
async function loadDelegationData() {
  if (!currentUser.value || !canUseMemberFeatures.value) {
    users.value = [];
    delegates.value = [];
    loadingUsers.value = false;
    return;
  }
  loadingUsers.value = true;
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
}

onMounted(loadDelegationData);
watch(canUseMemberFeatures, loadDelegationData);

/* A orientação é recalculada ao abrir a tela e depois de uma tentativa. Isso
   permite trocar imediatamente o botão por instruções quando a pessoa nega a
   permissão ou quando abre a PWA no contexto correto do iPhone/iPad. */
async function refreshPushStatus() {
  pushStatus.value = await pushAvailability();
}

onMounted(refreshPushStatus);

/* A função pode chegar alguns instantes depois da sessão. Observar a mudança
   evita que um administrador precise recarregar a página para ver o painel. */
watch(
  isCurrentAdmin,
  async (isAdmin) => {
    if (!isAdmin) return;
    loadingManagedUsers.value = true;
    loadingAuditLogs.value = true;
    try {
      [managedUsers.value, auditLogs.value, players.value] = await Promise.all([
        listManagedUsers(),
        listAuditLogs(),
        readPlayers(),
      ]);
      /* Perfis criados antes do fluxo de aprovação são migrados sem expor
         e-mail ou telefone no diretório usado pelas delegações. */
      await synchronizeMemberDirectory(managedUsers.value);
      await loadDelegationData();
    } catch {
      $q.notify({
        type: 'negative',
        message: 'Não foi possível carregar a administração.',
      });
    } finally {
      loadingManagedUsers.value = false;
      loadingAuditLogs.value = false;
    }
  },
  { immediate: true },
);

async function refreshAuditLogs() {
  if (!isCurrentAdmin.value) return;
  auditLogs.value = await listAuditLogs();
}

function auditActionLabel(action: AuditAction) {
  return (
    {
      'user.credentials': 'Credenciais atualizadas',
      'user.delete': 'Usuário excluído',
      'user.playerLink': 'Vínculo com atleta alterado',
      'user.passwordReset': 'Redefinição de senha solicitada',
      'user.profile': 'Perfil atualizado',
      'user.role': 'Função alterada',
      'user.status': 'Situação da conta alterada',
    } satisfies Record<AuditAction, string>
  )[action];
}

function formatAuditDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    : 'agora';
}

/* ===========================================================
   VERIFICAÇÃO DO E-MAIL
=========================================================== */

async function sendVerificationEmail() {
  if (!currentUser.value) return;
  verificationLoading.value = true;
  try {
    await sendEmailVerification(currentUser.value);
    $q.notify({ type: 'positive', message: 'E-mail de verificação enviado.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível enviar a verificação agora.',
    });
  } finally {
    verificationLoading.value = false;
  }
}

async function refreshVerificationStatus() {
  if (!currentUser.value) return;
  verificationLoading.value = true;
  try {
    await reload(currentUser.value);
    await refreshCurrentAccess();
    emailVerified.value = currentUser.value.emailVerified;
    $q.notify({
      type: emailVerified.value ? 'positive' : 'info',
      message: emailVerified.value
        ? 'E-mail confirmado.'
        : 'A confirmação ainda não chegou.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível atualizar a verificação agora.',
    });
  } finally {
    verificationLoading.value = false;
  }
}

/* ===========================================================
   GESTÃO DE FUNÇÕES

   A própria conta fica bloqueada na tela e também nas regras do
   Firestore, preservando ao menos um administrador conhecido.
=========================================================== */

async function saveUserRole(user: ManagedUser, role: Role) {
  if (user.uid === currentUser.value?.uid || user.role === role) return;
  savingUserIds.value.push(user.uid);
  try {
    await updateManagedUserRole(user, role);
    user.role = role;
    await refreshAuditLogs();
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

async function saveUserStatus(user: ManagedUser, status: AccountStatus) {
  if (user.uid === currentUser.value?.uid || user.status === status) return;
  savingUserIds.value.push(user.uid);
  try {
    await updateManagedUserStatus(user, status);
    user.status = status;
    await Promise.all([refreshAuditLogs(), loadDelegationData()]);
    $q.notify({
      type: status === 'approved' ? 'positive' : 'info',
      message:
        status === 'approved'
          ? 'Conta aprovada.'
          : 'Situação da conta atualizada.',
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível atualizar a situação da conta.',
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
  userEditorOpen.value = true;
}

async function saveUserProfile() {
  const original = managedUsers.value.find(
    (user) => user.uid === editingUser.value.uid,
  );
  if (!original || !isValidPhone(editingUser.value.phone)) return;
  editingUser.value.playerId = editingUser.value.playerId || '';

  savingUserProfile.value = true;
  try {
    await updateManagedUserProfile(original, editingUser.value);
    Object.assign(original, editingUser.value);
    original.playerName =
      players.value.find((player) => player.id === original.playerId)?.name ??
      '';
    await refreshAuditLogs();
    userEditorOpen.value = false;
    $q.notify({ type: 'positive', message: 'Usuário atualizado.' });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message:
        error instanceof Error && error.message === 'PLAYER_ALREADY_LINKED'
          ? 'Este atleta já está vinculado a outra conta.'
          : error instanceof Error && error.message === 'EMAIL_REQUIRES_BACKEND'
            ? 'O e-mail deve ser alterado pelo próprio titular.'
            : 'Não foi possível atualizar o usuário.',
    });
  } finally {
    savingUserProfile.value = false;
  }
}

async function deactivateUser(user: ManagedUser) {
  if (user.uid === currentUser.value?.uid) return;
  const confirmed = window.confirm(
    `Desativar ${user.displayName} (${user.email})? A pessoa perderá acesso às funções do aplicativo.`,
  );
  if (!confirmed) return;

  deletingUserIds.value.push(user.uid);
  try {
    await updateManagedUserStatus(user, 'rejected');
    user.status = 'rejected';
    users.value = users.value.filter((item) => item.uid !== user.uid);
    delegates.value = delegates.value.filter((item) => item.uid !== user.uid);
    await refreshAuditLogs();
    $q.notify({ type: 'info', message: 'Conta desativada.' });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível desativar a conta.',
    });
  } finally {
    deletingUserIds.value = deletingUserIds.value.filter(
      (userId) => userId !== user.uid,
    );
  }
}

async function requestUserPasswordReset(user: ManagedUser) {
  try {
    await sendManagedUserPasswordReset(user);
    await refreshAuditLogs();
    $q.notify({
      type: 'positive',
      message: `Enviamos a redefinição para ${user.email}.`,
    });
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Não foi possível enviar a redefinição agora.',
    });
  }
}

/* ===========================================================
   GESTÃO DE DELEGAÇÕES
=========================================================== */

async function addDelegate() {
  if (!currentUser.value || !selectedDelegate.value) return;
  const self: PresenceSubject = {
    uid: currentUser.value.uid,
    displayName: currentUser.value.displayName ?? 'Membro',
    playerId: currentPlayer.value?.id ?? '',
    playerName: currentPlayer.value?.name ?? '',
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
    await refreshPushStatus();
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
.role-select {
  min-width: 170px;
}
.status-select {
  min-width: 195px;
}
.managed-user-actions {
  display: grid;
  grid-template-columns: auto auto auto minmax(170px, 1fr) minmax(195px, 1fr);
  align-items: center;
  gap: 8px;
}

.managed-user-controls {
  max-width: 100%;
  padding-left: 16px;
}

/* Em tablets, o menu lateral já reduz a largura útil; os controles passam
   para baixo dos dados da pessoa antes que a linha fique comprimida. */
@media (max-width: 1023px) {
  .managed-user-item,
  .audit-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .managed-user-controls {
    width: 100%;
    padding-left: 0;
    align-items: stretch;
  }

  .managed-user-actions {
    grid-template-columns: repeat(3, auto);
    justify-content: start;
  }

  .role-select,
  .status-select {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }

  .audit-item :deep(.q-item__section--side) {
    align-items: flex-start;
    padding-left: 0;
  }
}
</style>

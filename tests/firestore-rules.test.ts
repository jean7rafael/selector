import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

let environment: RulesTestEnvironment;

/* O ambiente aponta para o emulador iniciado pelo script test:rules. */
beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-selector',
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  });
});

/* Cada teste recebe os mesmos papéis e documentos, sem depender da ordem. */
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/admin'), {
      displayName: 'admin',
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
      status: 'approved',
    });
    await setDoc(doc(context.firestore(), 'users/director'), {
      displayName: 'director',
      email: 'director@example.com',
      username: 'director',
      role: 'director',
      status: 'approved',
    });
    await setDoc(doc(context.firestore(), 'users/member'), {
      displayName: 'member',
      email: 'member@example.com',
      username: 'member',
      role: 'member',
      status: 'approved',
    });
    await setDoc(doc(context.firestore(), 'users/delegate'), {
      displayName: 'delegate',
      email: 'delegate@example.com',
      username: 'delegate',
      role: 'member',
      status: 'approved',
    });
    await setDoc(doc(context.firestore(), 'memberDirectory/member'), {
      displayName: 'member',
      playerId: null,
      updatedAt: new Date(),
      userId: 'member',
    });
    await setDoc(doc(context.firestore(), 'memberDirectory/delegate'), {
      displayName: 'delegate',
      playerId: null,
      updatedAt: new Date(),
      userId: 'delegate',
    });
    await setDoc(doc(context.firestore(), 'userContacts/member'), {
      phone: '(41) 999 888 777',
    });
    await setDoc(doc(context.firestore(), 'players/ana'), { name: 'Ana' });
    await setDoc(doc(context.firestore(), 'games/sabado'), {
      title: 'Vôlei de sábado',
    });
    await setDoc(doc(context.firestore(), 'auditLogs/existing'), {
      action: 'user.role',
      actorEmail: 'admin@example.com',
      actorUid: 'admin',
      changedFields: ['role'],
      createdAt: new Date(),
      targetEmail: 'member@example.com',
      targetName: 'member',
      targetUid: 'member',
    });
    await setDoc(
      doc(context.firestore(), 'delegations/member/delegates/delegate'),
      {
        fromUserId: 'member',
        toUserId: 'delegate',
      },
    );
  });
});

afterAll(async () => environment.cleanup());

/* Verifica os quatro limites de autorização que protegem o produto. */
describe('regras do Firestore', () => {
  const verifiedContext = (uid: string, email = `${uid}@example.com`) =>
    environment.authenticatedContext(uid, {
      email,
      email_verified: true,
    });

  it('permite a leitura pública dos atletas', async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(database, 'players/ana')));
  });

  it('bloqueia alterações anônimas e de membros', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const member = verifiedContext('member').firestore();
    await assertFails(setDoc(doc(anonymous, 'players/nova'), { name: 'Nova' }));
    await assertFails(setDoc(doc(member, 'players/nova'), { name: 'Nova' }));
  });

  it('permite que diretoria e administração alterem atletas', async () => {
    const director = verifiedContext('director').firestore();
    const admin = verifiedContext('admin').firestore();
    await assertSucceeds(
      setDoc(doc(director, 'players/nova'), { name: 'Nova' }),
    );
    await assertSucceeds(
      setDoc(doc(admin, 'players/outra'), { name: 'Outra' }),
    );
  });

  it('permite que uma nova conta crie somente um perfil de membro e seu telefone', async () => {
    const newcomer = environment
      .authenticatedContext('new-member', {
        email: 'nova@example.com',
      })
      .firestore();
    const batch = writeBatch(newcomer);
    batch.set(doc(newcomer, 'users/new-member'), {
      displayName: 'nova',
      email: 'nova@example.com',
      username: 'nova',
      role: 'member',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(newcomer, 'userContacts/new-member'), {
      phone: '(41) 999 888 777',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('bloqueia promoção no cadastro e telefone fora do formato', async () => {
    const newcomer = environment
      .authenticatedContext('new-member', {
        email: 'nova@example.com',
      })
      .firestore();
    await assertFails(
      setDoc(doc(newcomer, 'users/new-member'), {
        displayName: 'nova',
        email: 'nova@example.com',
        username: 'nova',
        role: 'admin',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(newcomer, 'userContacts/new-member'), {
        phone: '41999888777',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('permite ao administrador consultar contatos e alterar a função de outra pessoa', async () => {
    const admin = verifiedContext('admin').firestore();
    await assertSucceeds(getDoc(doc(admin, 'userContacts/member')));
    await assertSucceeds(
      updateDoc(doc(admin, 'users/member'), {
        role: 'admin',
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it('permite ao administrador vincular um atleta e registrar a auditoria no mesmo lote', async () => {
    const admin = environment
      .authenticatedContext('admin', {
        email: 'admin@example.com',
        email_verified: true,
      })
      .firestore();
    const batch = writeBatch(admin);
    batch.update(doc(admin, 'users/member'), {
      playerId: 'ana',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(admin, 'playerLinks/ana'), {
      createdAt: serverTimestamp(),
      playerId: 'ana',
      updatedAt: serverTimestamp(),
      userId: 'member',
    });
    batch.set(doc(admin, 'auditLogs/link-ana'), {
      action: 'user.playerLink',
      actorEmail: 'admin@example.com',
      actorUid: 'admin',
      changedFields: ['playerId'],
      createdAt: serverTimestamp(),
      targetEmail: 'member@example.com',
      targetName: 'member',
      targetUid: 'member',
    });
    await assertSucceeds(batch.commit());
  });

  it('reserva vínculos e histórico somente para a administração', async () => {
    const member = verifiedContext('member').firestore();
    const admin = verifiedContext('admin').firestore();
    await assertFails(
      setDoc(doc(member, 'playerLinks/ana'), {
        playerId: 'ana',
        userId: 'member',
      }),
    );
    await assertSucceeds(getDoc(doc(admin, 'auditLogs/existing')));
    await assertFails(getDoc(doc(member, 'auditLogs/existing')));
    await assertFails(
      updateDoc(doc(admin, 'auditLogs/existing'), { targetName: 'alterado' }),
    );
  });

  it('impede membros de promoverem a si mesmos e protege a função do próprio administrador', async () => {
    const member = environment
      .authenticatedContext('member', {
        email: 'member@example.com',
        email_verified: true,
      })
      .firestore();
    const admin = environment
      .authenticatedContext('admin', {
        email: 'admin@example.com',
        email_verified: true,
      })
      .firestore();
    await assertFails(getDoc(doc(member, 'userContacts/admin')));
    await assertFails(
      updateDoc(doc(member, 'users/member'), { role: 'admin' }),
    );
    await assertFails(updateDoc(doc(admin, 'users/admin'), { role: 'member' }));
  });

  it('bloqueia exclusão direta de perfis para preservar o Authentication', async () => {
    const admin = verifiedContext('admin').firestore();
    await assertFails(deleteDoc(doc(admin, 'users/member')));
    await assertFails(deleteDoc(doc(admin, 'users/admin')));
  });

  it('bloqueia privilégios de administração sem e-mail verificado', async () => {
    const unverifiedAdmin = environment
      .authenticatedContext('admin', { email: 'admin@example.com' })
      .firestore();
    await assertFails(getDoc(doc(unverifiedAdmin, 'userContacts/member')));
    await assertFails(
      updateDoc(doc(unverifiedAdmin, 'users/member'), {
        status: 'rejected',
      }),
    );
  });

  it('permite que um membro responda apenas pela própria presença', async () => {
    const member = verifiedContext('member').firestore();
    await assertSucceeds(
      setDoc(doc(member, 'games/sabado/attendances/member'), {
        userId: 'member',
        status: 'going',
      }),
    );
    await assertFails(
      setDoc(doc(member, 'games/sabado/attendances/another-user'), {
        userId: 'another-user',
        status: 'going',
      }),
    );
  });

  it('permite que um delegado responda pela pessoa que o autorizou', async () => {
    const delegate = verifiedContext('delegate').firestore();
    await assertSucceeds(
      setDoc(doc(delegate, 'games/sabado/attendances/member'), {
        userId: 'member',
        status: 'going',
      }),
    );
  });

  it('bloqueia presença, diretório e push para conta pendente ou sem e-mail verificado', async () => {
    const unverified = environment.authenticatedContext('member').firestore();
    await assertFails(
      setDoc(doc(unverified, 'games/sabado/attendances/member'), {
        userId: 'member',
        status: 'going',
      }),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'users/member'), {
        status: 'pending',
      });
    });
    const pending = verifiedContext('member').firestore();
    await assertFails(getDoc(doc(pending, 'memberDirectory/delegate')));
    await assertFails(
      setDoc(doc(pending, 'users/member/pushSubscriptions/test'), {
        platform: 'web',
        token: 'token',
        userId: 'member',
      }),
    );
  });

  it('permite ao administrador aprovar a conta, publicar no diretório e auditar', async () => {
    const admin = verifiedContext('admin').firestore();
    const batch = writeBatch(admin);
    batch.update(doc(admin, 'users/member'), {
      status: 'approved',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(admin, 'memberDirectory/member'), {
      displayName: 'member',
      playerId: null,
      updatedAt: serverTimestamp(),
      userId: 'member',
    });
    batch.set(doc(admin, 'auditLogs/approve-member'), {
      action: 'user.status',
      actorEmail: 'admin@example.com',
      actorUid: 'admin',
      changedFields: ['status'],
      createdAt: serverTimestamp(),
      targetEmail: 'member@example.com',
      targetName: 'member',
      targetUid: 'member',
    });
    await assertSucceeds(batch.commit());
  });
});

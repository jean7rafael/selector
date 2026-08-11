import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    await setDoc(doc(context.firestore(), 'users/admin'), { role: 'admin' });
    await setDoc(doc(context.firestore(), 'users/director'), { role: 'director' });
    await setDoc(doc(context.firestore(), 'users/member'), { role: 'member' });
    await setDoc(doc(context.firestore(), 'players/ana'), { name: 'Ana' });
    await setDoc(doc(context.firestore(), 'games/sabado'), { title: 'Vôlei de sábado' });
    await setDoc(doc(context.firestore(), 'delegations/member/delegates/delegate'), {
      fromUserId: 'member',
      toUserId: 'delegate',
    });
  });
});

afterAll(async () => environment.cleanup());

/* Verifica os quatro limites de autorização que protegem o produto. */
describe('regras do Firestore', () => {
  it('permite a leitura pública dos atletas', async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(database, 'players/ana')));
  });

  it('bloqueia alterações anônimas e de membros', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const member = environment.authenticatedContext('member').firestore();
    await assertFails(setDoc(doc(anonymous, 'players/nova'), { name: 'Nova' }));
    await assertFails(setDoc(doc(member, 'players/nova'), { name: 'Nova' }));
  });

  it('permite que diretoria e administração alterem atletas', async () => {
    const director = environment.authenticatedContext('director').firestore();
    const admin = environment.authenticatedContext('admin').firestore();
    await assertSucceeds(setDoc(doc(director, 'players/nova'), { name: 'Nova' }));
    await assertSucceeds(setDoc(doc(admin, 'players/outra'), { name: 'Outra' }));
  });

  it('permite que um membro responda apenas pela própria presença', async () => {
    const member = environment.authenticatedContext('member').firestore();
    await assertSucceeds(setDoc(doc(member, 'games/sabado/attendances/member'), {
      userId: 'member',
      status: 'going',
    }));
    await assertFails(setDoc(doc(member, 'games/sabado/attendances/another-user'), {
      userId: 'another-user',
      status: 'going',
    }));
  });

  it('permite que um delegado responda pela pessoa que o autorizou', async () => {
    const delegate = environment.authenticatedContext('delegate').firestore();
    await assertSucceeds(setDoc(doc(delegate, 'games/sabado/attendances/member'), {
      userId: 'member',
      status: 'going',
    }));
  });
});

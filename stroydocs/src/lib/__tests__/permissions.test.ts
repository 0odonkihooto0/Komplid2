import { describe, it, expect } from 'vitest';
import { WorkspaceRole } from '@prisma/client';
import { hasPermission } from '../permissions/check';
import { ACTIONS } from '../permissions/actions';
import { PERMISSION_MATRIX } from '../permissions/matrix';
import type { GuestScope } from '../permissions/types';

// ---------------------------------------------------------------------------
// Базовые проверки матрицы
// ---------------------------------------------------------------------------

describe('hasPermission — OWNER', () => {
  it('разрешает все действия', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(hasPermission(WorkspaceRole.OWNER, action)).toBe(true);
    }
  });
});

describe('hasPermission — ADMIN', () => {
  it('разрешает управление участниками', () => {
    expect(hasPermission(WorkspaceRole.ADMIN, ACTIONS.WORKSPACE_MANAGE_MEMBERS)).toBe(true);
  });

  it('запрещает удаление workspace', () => {
    expect(hasPermission(WorkspaceRole.ADMIN, ACTIONS.WORKSPACE_DELETE)).toBe(false);
  });

  it('разрешает удаление проектов', () => {
    expect(hasPermission(WorkspaceRole.ADMIN, ACTIONS.PROJECT_DELETE)).toBe(true);
  });

  it('разрешает управление биллингом — нет (только OWNER)', () => {
    expect(hasPermission(WorkspaceRole.ADMIN, ACTIONS.WORKSPACE_MANAGE_BILLING)).toBe(false);
  });
});

describe('hasPermission — MANAGER', () => {
  it('разрешает просмотр проектов', () => {
    expect(hasPermission(WorkspaceRole.MANAGER, ACTIONS.PROJECT_VIEW)).toBe(true);
  });

  it('запрещает удаление проектов', () => {
    expect(hasPermission(WorkspaceRole.MANAGER, ACTIONS.PROJECT_DELETE)).toBe(false);
  });

  it('запрещает управление членами workspace', () => {
    expect(hasPermission(WorkspaceRole.MANAGER, ACTIONS.WORKSPACE_MANAGE_MEMBERS)).toBe(false);
  });

  it('разрешает подпись документов', () => {
    expect(hasPermission(WorkspaceRole.MANAGER, ACTIONS.DOCUMENT_SIGN)).toBe(true);
  });
});

describe('hasPermission — ENGINEER', () => {
  it('разрешает создание смет', () => {
    expect(hasPermission(WorkspaceRole.ENGINEER, ACTIONS.ESTIMATE_CREATE)).toBe(true);
  });

  it('разрешает просмотр цен', () => {
    expect(hasPermission(WorkspaceRole.ENGINEER, ACTIONS.ESTIMATE_VIEW_PRICES)).toBe(true);
  });

  it('запрещает управление членами проекта', () => {
    expect(hasPermission(WorkspaceRole.ENGINEER, ACTIONS.PROJECT_MANAGE_MEMBERS)).toBe(false);
  });

  it('запрещает удаление документов', () => {
    expect(hasPermission(WorkspaceRole.ENGINEER, ACTIONS.DOCUMENT_DELETE)).toBe(false);
  });
});

describe('hasPermission — FOREMAN', () => {
  it('разрешает создание документов', () => {
    expect(hasPermission(WorkspaceRole.FOREMAN, ACTIONS.DOCUMENT_CREATE)).toBe(true);
  });

  it('запрещает просмотр цен смет', () => {
    expect(hasPermission(WorkspaceRole.FOREMAN, ACTIONS.ESTIMATE_VIEW_PRICES)).toBe(false);
  });

  it('запрещает создание смет', () => {
    expect(hasPermission(WorkspaceRole.FOREMAN, ACTIONS.ESTIMATE_CREATE)).toBe(false);
  });

  it('разрешает загрузку фото', () => {
    expect(hasPermission(WorkspaceRole.FOREMAN, ACTIONS.PHOTO_UPLOAD)).toBe(true);
  });
});

describe('hasPermission — WORKER', () => {
  it('разрешает только загрузку фото и комментарии', () => {
    expect(hasPermission(WorkspaceRole.WORKER, ACTIONS.PHOTO_UPLOAD)).toBe(true);
    expect(hasPermission(WorkspaceRole.WORKER, ACTIONS.COMMENT_CREATE)).toBe(true);
  });

  it('запрещает создание документов', () => {
    expect(hasPermission(WorkspaceRole.WORKER, ACTIONS.DOCUMENT_CREATE)).toBe(false);
  });

  it('запрещает подпись актов', () => {
    expect(hasPermission(WorkspaceRole.WORKER, ACTIONS.DOCUMENT_SIGN)).toBe(false);
  });
});

describe('hasPermission — MEMBER (legacy)', () => {
  it('имеет те же права что WORKER', () => {
    for (const action of Object.values(ACTIONS)) {
      expect(hasPermission(WorkspaceRole.MEMBER, action)).toBe(
        hasPermission(WorkspaceRole.WORKER, action)
      );
    }
  });
});

// ---------------------------------------------------------------------------
// GUEST — контекстные правила через guestScope
// ---------------------------------------------------------------------------

describe('hasPermission — GUEST', () => {
  it('разрешает просмотр проектов без guestScope', () => {
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.PROJECT_VIEW)).toBe(true);
  });

  it('запрещает подпись актов без явного guestScope.canSignActs', () => {
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.DOCUMENT_SIGN)).toBe(false);
  });

  it('разрешает подпись актов если guestScope.canSignActs=true', () => {
    const guestScope: GuestScope = { permissions: { canSignActs: true } };
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.DOCUMENT_SIGN, { guestScope })).toBe(true);
  });

  it('запрещает подпись актов если guestScope.canSignActs=false', () => {
    const guestScope: GuestScope = { permissions: { canSignActs: false } };
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.DOCUMENT_SIGN, { guestScope })).toBe(false);
  });

  it('запрещает просмотр стоимостей без явного canViewCosts', () => {
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.DOCUMENT_VIEW_COSTS)).toBe(false);
  });

  it('разрешает просмотр стоимостей если guestScope.canViewCosts=true', () => {
    const guestScope: GuestScope = { permissions: { canViewCosts: true } };
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.DOCUMENT_VIEW_COSTS, { guestScope })).toBe(true);
  });

  it('запрещает создание смет', () => {
    expect(hasPermission(WorkspaceRole.GUEST, ACTIONS.ESTIMATE_CREATE)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CUSTOMER
// ---------------------------------------------------------------------------

describe('hasPermission — CUSTOMER', () => {
  it('разрешает создание проектов', () => {
    expect(hasPermission(WorkspaceRole.CUSTOMER, ACTIONS.PROJECT_CREATE)).toBe(true);
  });

  it('разрешает просмотр стоимостей', () => {
    expect(hasPermission(WorkspaceRole.CUSTOMER, ACTIONS.DOCUMENT_VIEW_COSTS)).toBe(true);
  });

  it('запрещает создание смет', () => {
    expect(hasPermission(WorkspaceRole.CUSTOMER, ACTIONS.ESTIMATE_CREATE)).toBe(false);
  });

  it('запрещает управление участниками', () => {
    expect(hasPermission(WorkspaceRole.CUSTOMER, ACTIONS.WORKSPACE_MANAGE_MEMBERS)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Покрытие: все роли × все действия — нет undefined
// ---------------------------------------------------------------------------

describe('PERMISSION_MATRIX — полнота', () => {
  it('содержит запись для каждой WorkspaceRole', () => {
    for (const role of Object.values(WorkspaceRole)) {
      expect(PERMISSION_MATRIX).toHaveProperty(role);
    }
  });

  it('все записи — массивы Action', () => {
    for (const [role, actions] of Object.entries(PERMISSION_MATRIX)) {
      expect(Array.isArray(actions), `${role} должен быть массивом`).toBe(true);
    }
  });

  it('OWNER имеет максимальный набор прав', () => {
    const ownerCount = PERMISSION_MATRIX[WorkspaceRole.OWNER].length;
    for (const [role, actions] of Object.entries(PERMISSION_MATRIX)) {
      expect(
        actions.length,
        `${role} не должен превышать OWNER по числу прав`
      ).toBeLessThanOrEqual(ownerCount);
    }
  });
});

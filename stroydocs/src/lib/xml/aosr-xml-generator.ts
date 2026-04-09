/**
 * Генератор XML для АОСР (Акт освидетельствования скрытых работ)
 * по схеме Минстроя (ГОСТ Р 70108-2025)
 */

import { create } from 'xmlbuilder2';
import { formatDateXml, PARTICIPANT_ROLE_LABELS_RU } from './xml-utils';
import type { ExecutionDocForXml } from './xml-utils';

/** Форматирование ФИО из полей пользователя */
function formatFio(user: { lastName: string; firstName: string; middleName: string | null }): string {
  const parts = [user.lastName, user.firstName];
  if (user.middleName) parts.push(user.middleName);
  return parts.join(' ');
}

/**
 * Генерирует XML-строку АОСР по схеме Минстроя.
 * Включает: реквизиты, объект, работы, участники, материалы, подписи.
 */
export function generateAosrXml(doc: ExecutionDocForXml): string {
  const { contract } = doc;
  const obj = contract.buildingObject;
  const wr = doc.workRecord;

  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('AOSR', { 'xmlns': 'urn:minstroyrf:aosr:1.0' });

  // Реквизиты акта
  root.ele('Номер').txt(doc.number).up();
  root.ele('Дата').txt(formatDateXml(doc.createdAt)).up();
  root.ele('Статус').txt(doc.status).up();

  // Объект строительства
  const objNode = root.ele('Объект');
  objNode.ele('Наименование').txt(obj.name).up();
  objNode.ele('Адрес').txt(obj.address ?? '').up();
  if (obj.cadastralNumber) {
    objNode.ele('КадастровыйНомер').txt(obj.cadastralNumber).up();
  }
  objNode.up();

  // Договор
  const contractNode = root.ele('Договор');
  contractNode.ele('Номер').txt(contract.number).up();
  contractNode.ele('Наименование').txt(contract.name).up();
  contractNode.up();

  // Работы (из WorkRecord + WorkItem)
  if (wr) {
    const workNode = root.ele('Работы');
    workNode.ele('Наименование').txt(wr.workItem.name).up();
    workNode.ele('Место').txt(wr.location).up();
    workNode.ele('Шифр').txt(wr.workItem.projectCipher ?? '').up();

    if (wr.workItem.ksiNode) {
      workNode.ele('КСИКод').txt(wr.workItem.ksiNode.code).up();
      workNode.ele('КСИНаименование').txt(wr.workItem.ksiNode.name).up();
    }

    if (wr.normative) {
      workNode.ele('Нормативы').txt(wr.normative).up();
    }
    if (wr.description) {
      workNode.ele('Описание').txt(wr.description).up();
    }

    workNode.ele('ДатаНачала').txt(formatDateXml(wr.startDate)).up();
    workNode.ele('ДатаОкончания').txt(formatDateXml(wr.date)).up();
    workNode.up();

    // Материалы (из списаний WorkRecord)
    if (wr.writeoffs.length > 0) {
      const materialsNode = root.ele('Материалы');
      for (const writeoff of wr.writeoffs) {
        const matNode = materialsNode.ele('Материал');
        matNode.ele('Наименование').txt(writeoff.material.name).up();

        // Документ качества (первый сертификат/паспорт)
        const certDoc = writeoff.material.documents[0];
        if (certDoc) {
          matNode.ele('Документ').txt(`${certDoc.type}, ${certDoc.fileName}`).up();
        }
        matNode.up();
      }
      materialsNode.up();
    }
  }

  // Участники строительства
  if (contract.participants.length > 0) {
    const participantsNode = root.ele('Участники');
    for (const p of contract.participants) {
      const pNode = participantsNode.ele('Участник', {
        роль: PARTICIPANT_ROLE_LABELS_RU[p.role] ?? p.role,
      });
      pNode.ele('Организация').txt(p.organization.name).up();
      if (p.organization.inn) {
        pNode.ele('ИНН').txt(p.organization.inn).up();
      }
      if (p.organization.ogrn) {
        pNode.ele('ОГРН').txt(p.organization.ogrn).up();
      }
      if (p.representativeName) {
        pNode.ele('Представитель').txt(p.representativeName).up();
      }
      if (p.position) {
        pNode.ele('Должность').txt(p.position).up();
      }
      if (p.appointmentOrder) {
        pNode.ele('Приказ').txt(p.appointmentOrder).up();
      }
      pNode.up();
    }
    participantsNode.up();
  }

  // Подписи
  if (doc.signatures.length > 0) {
    const signaturesNode = root.ele('Подписи');
    for (const sig of doc.signatures) {
      const sigNode = signaturesNode.ele('Подпись');
      sigNode.ele('ФИО').txt(formatFio(sig.user)).up();
      sigNode.ele('Дата').txt(formatDateXml(sig.signedAt)).up();
      sigNode.up();
    }
    signaturesNode.up();
  }

  root.up();
  return root.end({ prettyPrint: true });
}
